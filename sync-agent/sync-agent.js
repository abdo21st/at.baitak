/**
 * وكيل المزامنة التلقائي الفوري لقاعدة بيانات إنفينيتي (Local Sync Agent)
 * يقوم بنقل الأرصدة والمبيعات والمشتريات والنواقص من جهاز الصيدلية إلى السيرفر السحابي (https://at.baitak.mtapp.ly/api/pharmacy/sync) كل دقيقة
 */

const sql = require('mssql');

// 1. إعدادات الاتصال بقاعدة بيانات إنفينيتي المحلية
const dbConfig = {
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || 'PharmacyAdmin2026!',
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

    // 2. قراءة دليل الموردين
    const suppliersQuery = `
      SELECT 
        s.SupplierID_PK AS id,
        s.SupplierCode AS code,
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

    console.log(`[وكيل المزامنة] جاري إرسال ${products.length} صنفاً و ${suppliers.length} مورداً إلى السيرفر...`);

    // إرسال البيانات عبر Fetch
    const response = await fetch(CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-api-key': SYNC_API_KEY
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        products,
        suppliers
      })
    });

    const resData = await response.json();
    if (resData.success) {
      console.log(`[وكيل المزامنة] تم تحديث قاعدة بيانات السيرفر بنجاح! 🚀 (${resData.updatedProductsCount} صنف)`);
    } else {
      console.warn(`[وكيل المزامنة] تحذير من السيرفر:`, resData.error);
    }
  } catch (err) {
    console.error(`[وكيل المزامنة] ❌ خطأ أثناء المزامنة:`, err.message);
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
