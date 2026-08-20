import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyProduct } from '@/lib/aiClassifier';
import { resolveTenantId } from '@/lib/tenantResolver';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-sync-api-key') || req.headers.get('authorization');
    const syncApiKey = process.env.SYNC_API_KEY || 'PHARMACY_SYNC_KEY_2026';

    if (authHeader && authHeader.replace('Bearer ', '') !== syncApiKey) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول (API Key غير صحيح)' }, { status: 401 });
    }

    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { action, branchCode: rawBranchCode, branchName: rawBranchName, products, suppliers, timestamp } = body;

    const branchCode = String(rawBranchCode || 'MAIN_BRANCH').trim();
    const branchName = String(rawBranchName || 'الفرع الرئيسي').trim();

    // 1. Handling Data Reset / Purge
    if (action === 'RESET_DATA' || action === 'PURGE_BRANCH') {
      const deleteFilter = branchCode === 'ALL' ? { tenantId } : { tenantId, branchCode };
      const deletedProducts = await prisma.pharmacyProduct.deleteMany({ where: deleteFilter });
      const deletedSuppliers = await prisma.pharmacySupplier.deleteMany({ where: deleteFilter });

      return NextResponse.json({
        success: true,
        message: `تم تنظيف وتصفير بيانات المزامنة بنجاح (${deletedProducts.count} صنف، ${deletedSuppliers.count} مورد)`,
        deletedProductsCount: deletedProducts.count,
        deletedSuppliersCount: deletedSuppliers.count,
        branchCode
      });
    }

    let updatedProductsCount = 0;
    let updatedSuppliersCount = 0;

    // 2. Bulk / Incremental Upsert Products
    if (products && Array.isArray(products) && products.length > 0) {
      for (const item of products) {
        if (!item.code || !item.name) continue;

        const aiInfo = classifyProduct(item.name);
        const pCode = String(item.code);

        const rawBarcodesList = [item.barcodes, item.barcode, item.internationalBarcode, item.code, pCode]
          .filter(Boolean)
          .flatMap((b) => String(b).split(/[\s,;|/]+/))
          .map((b) => b.trim())
          .filter((b, idx, arr) => b.length > 0 && arr.indexOf(b) === idx);
        const resolvedBarcodes = rawBarcodesList.join(',') || pCode;

        await prisma.pharmacyProduct.upsert({
          where: {
            productCode_branchCode: {
              productCode: pCode,
              branchCode
            }
          },
          update: {
            branchName,
            productName: item.name,
            stockOnHand: Number(item.stockOnHand) || 0,
            minStockLevel: Number(item.minStockLevel) || 0,
            maxStockLevel: Number(item.maxStockLevel) || 0,
            costPrice: Number(item.costPrice) || 0,
            sellPrice: Number(item.sellPrice) || 0,
            totalSoldQty: Number(item.totalSoldQty) || 0,
            sold30Days: Number(item.sold30Days) || 0,
            sold60Days: Number(item.sold60Days) || 0,
            sold90Days: Number(item.sold90Days) || 0,
            sold180Days: Number(item.sold180Days) || 0,
            inStockDays: item.inStockDays !== undefined ? Math.max(1, Number(item.inStockDays)) : 30,
            inventoryUnit: item.inventoryUnit || 'قطعة',
            orderUnit: item.orderUnit || 'عبوة',
            packSize: item.packSize !== undefined ? Math.max(1, Number(item.packSize)) : 1.0,
            purchaseUnitCost: Number(item.purchaseUnitCost) || 0,
            expiryDate: item.expiryDate || null,
            supplierId: item.supplierId ? Number(item.supplierId) : null,
            supplierName: item.supplierName || null,
            groupName: item.groupName || null,
            category: aiInfo.category,
            subCategory: aiInfo.subCategory,
            activeIngredient: aiInfo.activeIngredient || null,
            strength: aiInfo.strength || null,
            dosageForm: aiInfo.dosageForm || null,
            genericGroupId: aiInfo.genericGroupId || null,
            barcodes: resolvedBarcodes,
            lastSalesDate: item.lastSalesDate || null,
            lastSyncedAt: new Date()
          },
          create: {
            tenantId,
            branchCode,
            branchName,
            productCode: pCode,
            productName: item.name,
            stockOnHand: Number(item.stockOnHand) || 0,
            minStockLevel: Number(item.minStockLevel) || 0,
            maxStockLevel: Number(item.maxStockLevel) || 0,
            costPrice: Number(item.costPrice) || 0,
            sellPrice: Number(item.sellPrice) || 0,
            totalSoldQty: Number(item.totalSoldQty) || 0,
            sold30Days: Number(item.sold30Days) || 0,
            sold60Days: Number(item.sold60Days) || 0,
            sold90Days: Number(item.sold90Days) || 0,
            sold180Days: Number(item.sold180Days) || 0,
            inStockDays: item.inStockDays !== undefined ? Math.max(1, Number(item.inStockDays)) : 30,
            inventoryUnit: item.inventoryUnit || 'قطعة',
            orderUnit: item.orderUnit || 'عبوة',
            packSize: item.packSize !== undefined ? Math.max(1, Number(item.packSize)) : 1.0,
            purchaseUnitCost: Number(item.purchaseUnitCost) || 0,
            expiryDate: item.expiryDate || null,
            supplierId: item.supplierId ? Number(item.supplierId) : null,
            supplierName: item.supplierName || null,
            groupName: item.groupName || null,
            category: aiInfo.category,
            subCategory: aiInfo.subCategory,
            activeIngredient: aiInfo.activeIngredient || null,
            strength: aiInfo.strength || null,
            dosageForm: aiInfo.dosageForm || null,
            genericGroupId: aiInfo.genericGroupId || null,
            barcodes: resolvedBarcodes,
            lastSalesDate: item.lastSalesDate || null,
            lastSyncedAt: new Date()
          }
        });
        updatedProductsCount++;
      }
    }

    // 3. Bulk / Incremental Upsert Suppliers
    if (suppliers && Array.isArray(suppliers) && suppliers.length > 0) {
      for (const s of suppliers) {
        if (!s.id || !s.name) continue;
        const supId = Number(s.id);

        await prisma.pharmacySupplier.upsert({
          where: {
            supplierIdPk_branchCode: {
              supplierIdPk: supId,
              branchCode
            }
          },
          update: {
            branchName,
            name: s.name,
            code: s.code || null,
            phone: s.phone || null,
            mobile: s.mobile || null,
            address: s.address || null,
            totalPurchases: Number(s.totalPurchasesAmount) || 0,
            totalInvoicesCount: Number(s.totalPurchasesCount) || 0,
            outstandingBalance: Number(s.outstandingBalance) || 0,
            lastSyncedAt: new Date()
          },
          create: {
            tenantId,
            branchCode,
            branchName,
            supplierIdPk: supId,
            name: s.name,
            code: s.code || null,
            phone: s.phone || null,
            mobile: s.mobile || null,
            address: s.address || null,
            totalPurchases: Number(s.totalPurchasesAmount) || 0,
            totalInvoicesCount: Number(s.totalPurchasesCount) || 0,
            outstandingBalance: Number(s.outstandingBalance) || 0,
            lastSyncedAt: new Date()
          }
        });
        updatedSuppliersCount++;
      }
    }

    // 4. Update Sync Timestamp in Settings
    await prisma.pharmacySettings.upsert({
      where: { id: 'default' },
      update: { lastSyncTimestamp: new Date() },
      create: { id: 'default', lastSyncTimestamp: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: `تمت المزامنة لفرع (${branchName}) وحفظ البيانات بنجاح`,
      branchCode,
      branchName,
      updatedProductsCount,
      updatedSuppliersCount,
      syncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Pharmacy Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
