/**
 * وكيل المزامنة التلقائي الفوري لقاعدة بيانات إنفينيتي (Local Sync Agent)
 * يقوم بنقل الأرصدة والمبيعات والمشتريات والنواقص من جهاز الصيدلية إلى السيرفر السحابي (https://at.baitak.mtapp.ly/api/pharmacy/sync) كل دقيقة
 */

// Load .env if present
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[k.trim()]) {
        process.env[k.trim()] = val;
      }
    }
  });
}

const sql = require('mssql');

// 1. إعدادات الاتصال بقاعدة بيانات إنفينيتي المحلية
const dbConfig = {
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || '123',
  server: process.env.MSSQL_SERVER || '127.0.0.1',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  database: process.env.MSSQL_DATABASE || 'InfinityPharmacyDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// 2. إعدادات السيرفر السحابي المستهدف
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://at.baitak.mtapp.ly/api/pharmacy/sync';
const SYNC_API_KEY = process.env.SYNC_API_KEY || 'PHARMACY_SYNC_KEY_2026';
const SYNC_INTERVAL_SEC = parseInt(process.env.SYNC_INTERVAL_SEC || '60', 10); // كل دقيقة

let pool = null;

async function connectToDb() {
  if (!pool) {
    console.log('[وكيل المزامنة] جاري الاتصال بقاعدة بيانات إنفينيتي المحلية...');
    pool = await sql.connect(dbConfig);
    console.log('[وكيل المزامنة] تم الاتصال بقاعدة البيانات بنجاح ✅');
  }
  return pool;
}

async function performSync() {
  const timestamp = new Date().toLocaleTimeString('ar-LY');
  console.log(`\n[${timestamp}] 🔄 بدء جولة المزامنة ونقل البيانات للسيرفر السحابي...`);

  try {
    const db = await connectToDb();

    // 1. قراءة الأصناف والأرصدة والنواقص
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

    // 2. قراءة دليل الموردين (استخدام SupplierID_PK ككود مورد بدلاً من عمود SupplierCode غير المتوفر)
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

    console.log(`[وكيل المزامنة] جاري نقل ${products.length} صنفاً و ${suppliers.length} مورداً إلى السيرفر السحابي...`);

    // 1. إرسال الموردين
    if (suppliers.length > 0) {
      try {
        const supRes = await fetch(CLOUD_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-api-key': SYNC_API_KEY
          },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            suppliers
          })
        });
        const supData = await supRes.json();
        if (supData.success) {
          console.log(`[وكيل المزامنة] ✅ تم تحديث ${suppliers.length} مورد بنجاح.`);
        }
      } catch (sErr) {
        console.warn(`[وكيل المزامنة] تنبيه في نقل الموردين:`, sErr.message);
      }
    }

    // 2. إرسال الأصناف على دفعات ذكية (Batches of 300) لتجاوز قيود حجم الطلب في السيرفر
    const BATCH_SIZE = 300;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);
    let totalSynced = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      const response = await fetch(CLOUD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-api-key': SYNC_API_KEY
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          products: batch
        })
      });

      const resText = await response.text();
      let resData = {};
      try {
        resData = JSON.parse(resText);
      } catch {
        console.error(`\n[وكيل المزامنة] ❌ خطأ في استجابة الدفعة [${batchNum}/${totalBatches}]: ${resText.substring(0, 120)}`);
        continue;
      }

      if (resData.success) {
        totalSynced += batch.length;
        process.stdout.write(`[وكيل المزامنة] 📤 الدفعة [${batchNum}/${totalBatches}]: تم نقل ${totalSynced} من ${products.length} صنفاً...\r`);
      } else {
        console.warn(`\n[وكيل المزامنة] تحذير من السيرفر في الدفعة [${batchNum}/${totalBatches}]:`, resData.error);
      }
    }

    console.log(`\n[وكيل المزامنة] 🟢 اكتملت المزامنة بنجاح! تم تحديث ${totalSynced} صنفاً في السيرفر السحابي.`);
  } catch (err) {
    console.error(`\n[وكيل المزامنة] ❌ خطأ أثناء المزامنة:`, err.message);
  }

  console.log(`[وكيل المزامنة] الجولة القادمة بعد ${SYNC_INTERVAL_SEC} ثانية...`);
}

async function startAgent() {
  console.log('====================================================');
  console.log('   وكيل المزامنة الصيدلاني اللحظي لمنظومة إنفينيتي 🌿 ');
  console.log('   Target: ' + CLOUD_API_URL);
  console.log('   Interval: كل ' + SYNC_INTERVAL_SEC + ' ثانية');
  console.log('====================================================');

  await performSync();
  setInterval(performSync, SYNC_INTERVAL_SEC * 1000);
}

startAgent();
