/**
 * وكيل المزامنة الصيدلاني المتقدم مع واجهة تحكم بصرية GUI
 * يعمل كخادم ويب محلي خفيف على http://localhost:4040
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const { exec } = require('child_process');

const PORT = process.env.GUI_PORT || 4040;
const ENV_FILE = path.join(__dirname, '.env');

// Memory Config
let config = {
  MSSQL_SERVER: '127.0.0.1',
  MSSQL_PORT: '1433',
  MSSQL_DATABASE: 'InfinityPharmacyDB',
  MSSQL_USER: 'sa',
  MSSQL_PASSWORD: '123',
  CLOUD_API_URL: 'https://at.baitak.mtapp.ly/api/pharmacy/sync',
  SYNC_API_KEY: 'PHARMACY_SYNC_KEY_2026',
  SYNC_INTERVAL_SEC: '60',
  AUTO_SYNC: 'true'
};

// Logs & Stats
const logs = [];
let isSyncing = false;
let autoSyncTimer = null;
let lastSyncStats = {
  timestamp: null,
  productsCount: 0,
  suppliersCount: 0,
  status: 'IDLE',
  error: null
};

function addLog(msg, type = 'info') {
  const time = new Date().toLocaleTimeString('ar-LY');
  const entry = { time, msg, type };
  logs.unshift(entry);
  if (logs.length > 200) logs.pop();
  console.log(`[${time}] ${msg}`);
}

// Load .env
function loadEnv() {
  if (fs.existsSync(ENV_FILE)) {
    try {
      const content = fs.readFileSync(ENV_FILE, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [k, ...v] = trimmed.split('=');
          const key = k.trim();
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          config[key] = val;
        }
      });
      addLog('تم تحميل الإعدادات من ملف .env بنجاح ✅', 'success');
    } catch (e) {
      addLog('خطأ في قراءة ملف .env: ' + e.message, 'error');
    }
  } else {
    saveEnv();
  }
}

// Save .env
function saveEnv() {
  try {
    const lines = Object.entries(config).map(([k, v]) => `${k}=${v}`);
    fs.writeFileSync(ENV_FILE, lines.join('\n'), 'utf8');
    addLog('تم حفظ الإعدادات الجديدة في ملف .env بنجاح 💾', 'success');
    return true;
  } catch (e) {
    addLog('خطأ في حفظ ملف .env: ' + e.message, 'error');
    return false;
  }
}

let dbPool = null;

function getDbConfig(customConfig) {
  const c = customConfig || config;
  const cfg = {
    user: c.MSSQL_USER || 'sa',
    password: c.MSSQL_PASSWORD || '123',
    server: c.MSSQL_SERVER || '127.0.0.1',
    port: parseInt(c.MSSQL_PORT || '1433', 10),
    database: c.MSSQL_DATABASE || 'InfinityPharmacyDB',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 10000
    }
  };

  // If server contains backslash instance name, let mssql parse it
  if (cfg.server.includes('\\')) {
    delete cfg.port;
  }
  return cfg;
}

async function closeDbPool() {
  if (dbPool) {
    try {
      await dbPool.close();
    } catch {}
    dbPool = null;
  }
}

async function getDbConnection(customConfig) {
  if (customConfig) {
    return await sql.connect(getDbConfig(customConfig));
  }
  if (!dbPool || !dbPool.connected) {
    await closeDbPool();
    dbPool = await sql.connect(getDbConfig());
  }
  return dbPool;
}

// Test DB Connection
async function testDbConnection(customConfig) {
  try {
    const testConn = await getDbConnection(customConfig);
    const result = await testConn.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Inventory.Data_Products WHERE IsInActive = 0) AS productsCount,
        (SELECT COUNT(*) FROM Purchase.Data_Suppliers WHERE IsActiveAccount = 1) AS suppliersCount
    `);
    const stats = result.recordset[0];
    if (customConfig) await testConn.close();
    return {
      success: true,
      message: `تم الاتصال بنجاح! تم العثور على ${stats.productsCount} صنف نشط و ${stats.suppliersCount} مورد.`,
      productsCount: stats.productsCount,
      suppliersCount: stats.suppliersCount
    };
  } catch (err) {
    return {
      success: false,
      error: `فشل الاتصال: ${err.message}`
    };
  }
}

// Perform Full Sync
async function performSync() {
  if (isSyncing) {
    addLog('جولة المزامنة جارية بالفعل...', 'warn');
    return;
  }

  isSyncing = true;
  lastSyncStats.status = 'SYNCING';
  addLog('🔄 بدء جولة المزامنة ونقل البيانات للسيرفر السحابي...', 'info');

  try {
    const db = await getDbConnection();

    // 1. قراءة الأصناف
    const stockQuery = `
      SELECT 
        p.ProductID_PK AS id,
        p.ProductCode AS code,
        p.ProductName AS name,
        p.StockOnHand AS stockOnHand,
        p.MinStockLevel AS minStockLevel,
        p.MaxStockLevel AS maxStockLevel,
        ISNULL(uom.UomCost, 0) AS costPrice,
        ISNULL(uom.UomPrice1, 0) AS sellPrice,
        p.MainSupplierID_FK AS supplierId,
        s.SupplierName AS supplierName,
        g.ProductGroupDescription AS groupName,
        ISNULL(p.TotalSoldQYT, 0) AS totalSoldQty,
        CONVERT(VARCHAR(10), p.LastSalesTransactionDate, 120) AS lastSalesDate,
        (
          SELECT TOP 1 CONVERT(VARCHAR(10), pi.ExpiryDate, 120) 
          FROM Inventory.Data_ProductInventories pi 
          WHERE pi.ProductID_FK = p.ProductID_PK AND pi.StockOnHand > 0 AND pi.ExpiryDate IS NOT NULL 
          ORDER BY pi.ExpiryDate ASC
        ) AS expiryDate
      FROM Inventory.Data_Products p
      LEFT JOIN Inventory.Data_ProductUOMs uom ON p.ProductID_PK = uom.ProductID_FK AND uom.UomID_FK = p.DefaultSellUomID_FK
      LEFT JOIN Purchase.Data_Suppliers s ON p.MainSupplierID_FK = s.SupplierID_PK
      LEFT JOIN Inventory.RefProductGroups g ON p.ProductGroupID_FK = g.ProductGroupID_PK
      WHERE p.IsInActive = 0
    `;
    const stockResult = await db.request().query(stockQuery);
    const products = stockResult.recordset;

    // 2. قراءة الموردين
    const suppliersQuery = `
      SELECT 
        s.SupplierID_PK AS id,
        CAST(s.SupplierID_PK AS VARCHAR(20)) AS code,
        s.SupplierName AS name,
        s.SupplierPhone AS phone,
        s.SupplierMobilePhone AS mobile,
        s.SupplierAddress AS address,
        ISNULL(s.SupplierAccountCurrentBalance, 0) AS outstandingBalance,
        (SELECT COUNT(*) FROM Purchase.Data_PurchaseInvoices pi WHERE pi.SupplierID_FK = s.SupplierID_PK) AS totalPurchasesCount,
        (SELECT ISNULL(SUM(pi.InvoiceNetTotal), 0) FROM Purchase.Data_PurchaseInvoices pi WHERE pi.SupplierID_FK = s.SupplierID_PK) AS totalPurchasesAmount
      FROM Purchase.Data_Suppliers s
      WHERE s.IsActiveAccount = 1
    `;
    const suppliersResult = await db.request().query(suppliersQuery);
    const suppliers = suppliersResult.recordset;

    addLog(`تم جلب ${products.length} صنف و ${suppliers.length} مورد من قاعدة البيانات المحلية. جاري الرفع...`, 'info');

    // 3. إرسال الموردين
    if (suppliers.length > 0) {
      try {
        const supRes = await fetch(config.CLOUD_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-api-key': config.SYNC_API_KEY
          },
          body: JSON.stringify({ timestamp: new Date().toISOString(), suppliers })
        });
        const supData = await supRes.json();
        if (supData.success) {
          addLog(`✅ تم تحديث ${suppliers.length} مورد بنجاح.`, 'success');
        }
      } catch (sErr) {
        addLog(`تنبيه في تحديث الموردين: ${sErr.message}`, 'warn');
      }
    }

    // 4. إرسال الأصناف على دفعات (300 صنف لكل دفعة)
    const BATCH_SIZE = 300;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);
    let totalSynced = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      const response = await fetch(config.CLOUD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-api-key': config.SYNC_API_KEY
        },
        body: JSON.stringify({ timestamp: new Date().toISOString(), products: batch })
      });

      const resText = await response.text();
      let resData = {};
      try {
        resData = JSON.parse(resText);
      } catch {
        addLog(`❌ خطأ استجابة السيرفر في الدفعة [${batchNum}/${totalBatches}]`, 'error');
        continue;
      }

      if (resData.success) {
        totalSynced += batch.length;
        addLog(`📤 الدفعة [${batchNum}/${totalBatches}]: تم نقل ${totalSynced} من ${products.length} صنف بنجاح.`, 'info');
      } else {
        addLog(`تحذير في الدفعة [${batchNum}/${totalBatches}]: ${resData.error}`, 'warn');
      }
    }

    lastSyncStats = {
      timestamp: new Date().toLocaleTimeString('ar-LY') + ' - ' + new Date().toLocaleDateString('ar-LY'),
      productsCount: totalSynced,
      suppliersCount: suppliers.length,
      status: 'SUCCESS',
      error: null
    };

    addLog(`🟢 اكتملت المزامنة بنجاح! تم نقل ${totalSynced} صنفاً و ${suppliers.length} مورداً للسيرفر السحابي.`, 'success');
  } catch (err) {
    lastSyncStats = {
      ...lastSyncStats,
      status: 'ERROR',
      error: err.message
    };
    addLog(`❌ خطأ أثناء المزامنة: ${err.message}`, 'error');
  } finally {
    isSyncing = false;
  }
}

function setupAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }

  const intervalSec = Math.max(10, parseInt(config.SYNC_INTERVAL_SEC || '60', 10));
  if (config.AUTO_SYNC === 'true') {
    addLog(`تم تفعيل المزامنة التلقائية كل ${intervalSec} ثانية ⏱️`, 'info');
    autoSyncTimer = setInterval(() => {
      performSync();
    }, intervalSec * 1000);
  } else {
    addLog('المزامنة التلقائية متوقفة حالياً ⏸️', 'warn');
  }
}

// HTML Dashboard Template
const HTML_PAGE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>وكيل المزامنة الصيدلاني | صيدلية بيتك</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
    body { background: #0f172a; color: #f8fafc; padding: 24px 16px; min-height: 100vh; }
    .container { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
    .header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #334155; padding-bottom: 20px; }
    .header-title { display: flex; items-center; gap: 12px; }
    .logo-badge { width: 48px; height: 48px; border-radius: 16px; background: #059669; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 12px; font-size: 12px; font-weight: 800; }
    .status-active { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-busy { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-group label { font-size: 12px; font-weight: 700; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
    .form-input { width: 100%; height: 44px; background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 0 14px; color: #f8fafc; font-weight: 700; font-size: 13px; outline: none; transition: all 0.2s; }
    .form-input:focus { border-color: #10b981; box-shadow: 0 0 0 2px rgba(16,185,129,0.2); }
    .btn { height: 44px; padding: 0 20px; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
    .btn-primary { background: #10b981; color: white; }
    .btn-primary:hover { background: #059669; }
    .btn-secondary { background: #3b82f6; color: white; }
    .btn-secondary:hover { background: #2563eb; }
    .btn-dark { background: #334155; color: #f8fafc; }
    .btn-dark:hover { background: #475569; }
    .btn-outline { background: transparent; border: 1px solid #475569; color: #cbd5e1; }
    .btn-outline:hover { background: #334155; color: white; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
    .stat-box { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 14px; }
    .stat-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(59, 130, 246, 0.15); color: #60a5fa; display: flex; align-items: center; justify-content: center; font-weight: 900; }
    .stat-val { font-size: 20px; font-weight: 900; font-family: monospace; color: #f8fafc; }
    .stat-label { font-size: 11px; font-weight: 700; color: #64748b; }
    .logs-box { background: #090d16; border: 1px solid #1e293b; border-radius: 16px; padding: 14px; height: 260px; overflow-y: auto; font-family: monospace; font-size: 12px; display: flex; flex-direction: column; gap: 6px; }
    .log-item { display: flex; gap: 10px; line-height: 1.5; }
    .log-time { color: #64748b; shrink-0; }
    .log-info { color: #93c5fd; }
    .log-success { color: #34d399; font-weight: bold; }
    .log-warn { color: #fbbf24; }
    .log-error { color: #f87171; font-weight: bold; }
    .alert-box { padding: 12px 16px; border-radius: 12px; font-size: 12px; font-weight: 700; margin-top: 10px; display: none; }
    .alert-success { background: rgba(16,185,129,0.2); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
    .alert-error { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
    .toggle-switch { position: relative; display: inline-block; width: 46px; height: 24px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; inset: 0; background-color: #334155; transition: .3s; border-radius: 24px; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: #10b981; }
    input:checked + .slider:before { transform: translateX(22px); }
  </style>
</head>
<body>

  <div class="container">
    
    <!-- Top Header -->
    <div class="card">
      <div class="header">
        <div class="header-title">
          <div class="logo-badge">🌿</div>
          <div>
            <h1 style="font-size: 18px; font-weight: 900; color: #f8fafc;">وكيل المزامنة السحابي لمنظومة الصيدلية</h1>
            <p style="font-size: 11px; font-weight: 600; color: #94a3b8;">نقل الأصناف، الأرصدة، النواقص، والموردين من قاعدة البيانات المحلية إلى السيرفر السحابي</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div id="statusIndicator" class="status-badge status-active">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #34d399;"></span>
            <span>جاهز للمزامنة</span>
          </div>

          <button id="btnSyncNow" onclick="triggerSyncNow()" class="btn btn-primary">
            <span>⚡ مزامنة فورية الآن</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="stats-grid" style="margin-top: 20px;">
        <div class="stat-box">
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #34d399;">📦</div>
          <div>
            <div id="statProducts" class="stat-val">0</div>
            <div class="stat-label">الأصناف المنقولة للسيرفر</div>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-icon" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">🏢</div>
          <div>
            <div id="statSuppliers" class="stat-val">0</div>
            <div class="stat-label">الموردون المعتمدون</div>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">⏱️</div>
          <div>
            <div id="statLastSync" class="stat-val" style="font-size: 13px; font-family: 'Cairo';">لم تبدأ بعد</div>
            <div class="stat-label">آخر مزامنة ناجحة</div>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">🔄</div>
          <div>
            <div id="statInterval" class="stat-val">60 ثانية</div>
            <div class="stat-label">تكرار المزامنة التلقائية</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Forms & Config -->
    <div class="grid-2">
      
      <!-- SQL Server Local Database Config -->
      <div class="card">
        <h2 style="font-size: 15px; font-weight: 900; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span>🗄️ إعدادات قاعدة بيانات الصيدلية (SQL Server)</span>
        </h2>

        <form id="dbForm" onsubmit="event.preventDefault();">
          <div class="form-group">
            <label>عنوان خادم SQL Server أو الـ IP (Server / Host)</label>
            <input type="text" id="MSSQL_SERVER" class="form-input" dir="ltr" placeholder="127.0.0.1 أو .\\SQLEXPRESS">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px;">
            <div class="form-group">
              <label>المنفذ (Port)</label>
              <input type="number" id="MSSQL_PORT" class="form-input" dir="ltr" placeholder="1433">
            </div>
            <div class="form-group">
              <label>اسم قاعدة البيانات (Database Name)</label>
              <input type="text" id="MSSQL_DATABASE" class="form-input" dir="ltr" placeholder="InfinityPharmacyDB">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label>اسم المستخدم (User)</label>
              <input type="text" id="MSSQL_USER" class="form-input" dir="ltr" placeholder="sa">
            </div>
            <div class="form-group">
              <label>كلمة المرور (Password)</label>
              <input type="password" id="MSSQL_PASSWORD" class="form-input" dir="ltr" placeholder="••••">
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button type="button" id="btnTestDb" onclick="testDb()" class="btn btn-secondary" style="flex: 1;">
              <span>🧪 اختبار الاتصال بالمنظومة</span>
            </button>
          </div>

          <div id="dbTestAlert" class="alert-box"></div>
        </form>
      </div>

      <!-- Cloud Target Portal Config -->
      <div class="card">
        <h2 style="font-size: 15px; font-weight: 900; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span>☁️ إعدادات السيرفر السحابي المستهدف (Cloud Target)</span>
        </h2>

        <form id="cloudForm" onsubmit="event.preventDefault();">
          <div class="form-group">
            <label>رابط نقطة المزامنة السحابية (API Endpoint URL)</label>
            <input type="url" id="CLOUD_API_URL" class="form-input" dir="ltr" placeholder="https://at.baitak.mtapp.ly/api/pharmacy/sync">
          </div>

          <div class="form-group">
            <label>مفتاح التشفير والأمان (Sync API Key)</label>
            <input type="text" id="SYNC_API_KEY" class="form-input" dir="ltr" placeholder="PHARMACY_SYNC_KEY_2026">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label>فترة المزامنة (بالثواني)</label>
              <input type="number" id="SYNC_INTERVAL_SEC" min="10" max="3600" class="form-input" dir="ltr" placeholder="60">
            </div>

            <div class="form-group">
              <label>المزامنة التلقائية في الخلفية</label>
              <div style="display: flex; align-items: center; gap: 10px; height: 44px;">
                <label class="toggle-switch">
                  <input type="checkbox" id="AUTO_SYNC">
                  <span class="slider"></span>
                </label>
                <span id="autoSyncLabel" style="font-size: 12px; font-weight: 800; color: #34d399;">مفعلة 🟢</span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button type="button" onclick="saveAllSettings()" class="btn btn-primary" style="flex: 1;">
              <span>💾 حفظ الإعدادات وتطبيقها فوراً</span>
            </button>
          </div>

          <div id="saveAlert" class="alert-box"></div>
        </form>
      </div>

    </div>

    <!-- Live Sync Console Logs -->
    <div class="card">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h3 style="font-size: 14px; font-weight: 900; display: flex; align-items: center; gap: 8px;">
          <span>📜 سجل المزامنة المباشر (Realtime Sync Logs)</span>
        </h3>

        <div style="display: flex; gap: 8px;">
          <button onclick="clearLogs()" class="btn btn-outline" style="height: 32px; font-size: 11px; padding: 0 12px;">
            <span>مسح السجل</span>
          </button>
        </div>
      </div>

      <div id="logsBox" class="logs-box">
        <div class="log-item"><span class="log-time">[--:--]</span><span class="log-info">جاري الاتصال بالوكيل المحلي...</span></div>
      </div>
    </div>

  </div>

  <script>
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.config) {
          document.getElementById('MSSQL_SERVER').value = data.config.MSSQL_SERVER || '127.0.0.1';
          document.getElementById('MSSQL_PORT').value = data.config.MSSQL_PORT || '1433';
          document.getElementById('MSSQL_DATABASE').value = data.config.MSSQL_DATABASE || 'InfinityPharmacyDB';
          document.getElementById('MSSQL_USER').value = data.config.MSSQL_USER || 'sa';
          document.getElementById('MSSQL_PASSWORD').value = data.config.MSSQL_PASSWORD || '123';
          document.getElementById('CLOUD_API_URL').value = data.config.CLOUD_API_URL || 'https://at.baitak.mtapp.ly/api/pharmacy/sync';
          document.getElementById('SYNC_API_KEY').value = data.config.SYNC_API_KEY || 'PHARMACY_SYNC_KEY_2026';
          document.getElementById('SYNC_INTERVAL_SEC').value = data.config.SYNC_INTERVAL_SEC || '60';
          
          const isAuto = data.config.AUTO_SYNC === 'true';
          document.getElementById('AUTO_SYNC').checked = isAuto;
          updateAutoSyncLabel(isAuto);
        }
      } catch (e) {
        console.error('Load config error:', e);
      }
    }

    function updateAutoSyncLabel(isAuto) {
      const label = document.getElementById('autoSyncLabel');
      if (isAuto) {
        label.textContent = 'مفعلة 🟢';
        label.style.color = '#34d399';
      } else {
        label.textContent = 'متوقفة ⏸️';
        label.style.color = '#f59e0b';
      }
    }

    document.getElementById('AUTO_SYNC').addEventListener('change', function(e) {
      updateAutoSyncLabel(e.target.checked);
    });

    async function testDb() {
      const btn = document.getElementById('btnTestDb');
      const alert = document.getElementById('dbTestAlert');
      btn.disabled = true;
      btn.innerHTML = '<span>جاري الاختبار...</span>';
      alert.style.display = 'none';

      const payload = {
        MSSQL_SERVER: document.getElementById('MSSQL_SERVER').value,
        MSSQL_PORT: document.getElementById('MSSQL_PORT').value,
        MSSQL_DATABASE: document.getElementById('MSSQL_DATABASE').value,
        MSSQL_USER: document.getElementById('MSSQL_USER').value,
        MSSQL_PASSWORD: document.getElementById('MSSQL_PASSWORD').value
      };

      try {
        const res = await fetch('/api/test-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert.style.display = 'block';
        if (data.success) {
          alert.className = 'alert-box alert-success';
          alert.textContent = '✅ ' + data.message;
        } else {
          alert.className = 'alert-box alert-error';
          alert.textContent = '❌ ' + data.error;
        }
      } catch (e) {
        alert.style.display = 'block';
        alert.className = 'alert-box alert-error';
        alert.textContent = '❌ خطأ في الاتصال: ' + e.message;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🧪 اختبار الاتصال بالمنظومة</span>';
      }
    }

    async function saveAllSettings() {
      const alert = document.getElementById('saveAlert');
      alert.style.display = 'none';

      const payload = {
        MSSQL_SERVER: document.getElementById('MSSQL_SERVER').value,
        MSSQL_PORT: document.getElementById('MSSQL_PORT').value,
        MSSQL_DATABASE: document.getElementById('MSSQL_DATABASE').value,
        MSSQL_USER: document.getElementById('MSSQL_USER').value,
        MSSQL_PASSWORD: document.getElementById('MSSQL_PASSWORD').value,
        CLOUD_API_URL: document.getElementById('CLOUD_API_URL').value,
        SYNC_API_KEY: document.getElementById('SYNC_API_KEY').value,
        SYNC_INTERVAL_SEC: document.getElementById('SYNC_INTERVAL_SEC').value,
        AUTO_SYNC: document.getElementById('AUTO_SYNC').checked ? 'true' : 'false'
      };

      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert.style.display = 'block';
        if (data.success) {
          alert.className = 'alert-box alert-success';
          alert.textContent = '✅ تم حفظ الإعدادات وتحديث جدول المزامنة بنجاح!';
        } else {
          alert.className = 'alert-box alert-error';
          alert.textContent = '❌ خطأ في الحفظ: ' + data.error;
        }
      } catch (e) {
        alert.style.display = 'block';
        alert.className = 'alert-box alert-error';
        alert.textContent = '❌ خطأ في الاتصال بالخادم المحلي';
      }
    }

    async function triggerSyncNow() {
      const btn = document.getElementById('btnSyncNow');
      btn.disabled = true;
      btn.innerHTML = '<span>جاري المزامنة... ⏳</span>';

      try {
        await fetch('/api/sync-now', { method: 'POST' });
      } catch (e) {
        console.error('Trigger sync error:', e);
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = '<span>⚡ مزامنة فورية الآن</span>';
        }, 2000);
      }
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();

        // Update stats
        document.getElementById('statProducts').textContent = data.lastSyncStats?.productsCount || 0;
        document.getElementById('statSuppliers').textContent = data.lastSyncStats?.suppliersCount || 0;
        document.getElementById('statLastSync').textContent = data.lastSyncStats?.timestamp || 'لم تبدأ بعد';
        document.getElementById('statInterval').textContent = (data.config?.SYNC_INTERVAL_SEC || 60) + ' ثانية';

        // Update Status indicator
        const ind = document.getElementById('statusIndicator');
        if (data.isSyncing) {
          ind.className = 'status-badge status-busy';
          ind.innerHTML = '<span style="width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; animation: pulse 1s infinite;"></span><span>جاري نقل البيانات 🔄</span>';
        } else if (data.lastSyncStats?.status === 'ERROR') {
          ind.className = 'status-badge';
          ind.style.background = 'rgba(239, 68, 68, 0.15)';
          ind.style.color = '#f87171';
          ind.style.border = '1px solid rgba(239, 68, 68, 0.3)';
          ind.innerHTML = '<span style="width: 8px; height: 8px; border-radius: 50%; background: #f87171;"></span><span>تنبيه خطأ ❌</span>';
        } else {
          ind.className = 'status-badge status-active';
          ind.innerHTML = '<span style="width: 8px; height: 8px; border-radius: 50%; background: #34d399;"></span><span>جاهز ومتصل 🟢</span>';
        }

        // Render Logs
        const logsBox = document.getElementById('logsBox');
        if (data.logs && data.logs.length > 0) {
          logsBox.innerHTML = data.logs.map(l => {
            const cls = l.type === 'error' ? 'log-error' : (l.type === 'success' ? 'log-success' : (l.type === 'warn' ? 'log-warn' : 'log-info'));
            return '<div class="log-item"><span class="log-time">[' + l.time + ']</span><span class="' + cls + '">' + l.msg + '</span></div>';
          }).join('');
        }
      } catch (e) {
        console.error('Status fetch error:', e);
      }
    }

    function clearLogs() {
      fetch('/api/clear-logs', { method: 'POST' });
    }

    loadConfig();
    fetchStatus();
    setInterval(fetchStatus, 2000);
  </script>
</body>
</html>`;

// Native HTTP Server Handler
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route: Serve Web UI
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
    return;
  }

  // Route: GET /api/config
  if (url.pathname === '/api/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, config }));
    return;
  }

  // Route: POST /api/config
  if (url.pathname === '/api/config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        Object.assign(config, data);
        saveEnv();
        await closeDbPool();
        setupAutoSync();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, config }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Route: POST /api/test-db
  if (url.pathname === '/api/test-db' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const result = await testDbConnection(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Route: POST /api/sync-now
  if (url.pathname === '/api/sync-now' && req.method === 'POST') {
    performSync(); // trigger async
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'بدأت عملية المزامنة الآن' }));
    return;
  }

  // Route: GET /api/status
  if (url.pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      config,
      isSyncing,
      lastSyncStats,
      logs: logs.slice(0, 50)
    }));
    return;
  }

  // Route: POST /api/clear-logs
  if (url.pathname === '/api/clear-logs' && req.method === 'POST') {
    logs.length = 0;
    addLog('تم مسح سجل العمليات 🧹', 'info');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Start Everything
loadEnv();

server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`   🚀 لوحة تحكم وكيل المزامنة الصيدلاني جاهزة وتعمل الآن! `);
  console.log(`   🌐 رابط الواجهة البصرية: http://localhost:${PORT}`);
  console.log('================================================================');

  addLog(`بدأ تشغيل خادم لوحة التحكم البصرية على الرابط: http://localhost:${PORT} 🌐`, 'success');

  setupAutoSync();

  // Auto-open browser on Windows
  if (process.platform === 'win32') {
    exec(`start http://localhost:${PORT}`);
  }
});
