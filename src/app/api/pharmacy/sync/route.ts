import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyProduct } from '@/lib/aiClassifier';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-sync-api-key') || req.headers.get('authorization');
    const syncApiKey = process.env.SYNC_API_KEY || 'PHARMACY_SYNC_KEY_2026';

    if (authHeader && authHeader.replace('Bearer ', '') !== syncApiKey) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول (API Key غير صحيح)' }, { status: 401 });
    }

    const body = await req.json();
    const { products, suppliers, timestamp } = body;

    let updatedProductsCount = 0;
    let updatedSuppliersCount = 0;

    // 1. Bulk Upsert Products
    if (products && Array.isArray(products) && products.length > 0) {
      for (const item of products) {
        if (!item.code || !item.name) continue;

        const aiInfo = classifyProduct(item.name);

        await prisma.pharmacyProduct.upsert({
          where: { productCode: String(item.code) },
          update: {
            productName: item.name,
            stockOnHand: Number(item.stockOnHand) || 0,
            minStockLevel: Number(item.minStockLevel) || 0,
            maxStockLevel: Number(item.maxStockLevel) || 0,
            costPrice: Number(item.costPrice) || 0,
            sellPrice: Number(item.sellPrice) || 0,
            totalSoldQty: Number(item.totalSoldQty) || 0,
            inStockDays: item.inStockDays !== undefined ? Math.max(1, Number(item.inStockDays)) : 30,
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
            lastSalesDate: item.lastSalesDate || null,
            lastSyncedAt: new Date()
          },
          create: {
            productCode: String(item.code),
            productName: item.name,
            stockOnHand: Number(item.stockOnHand) || 0,
            minStockLevel: Number(item.minStockLevel) || 0,
            maxStockLevel: Number(item.maxStockLevel) || 0,
            costPrice: Number(item.costPrice) || 0,
            sellPrice: Number(item.sellPrice) || 0,
            totalSoldQty: Number(item.totalSoldQty) || 0,
            inStockDays: item.inStockDays !== undefined ? Math.max(1, Number(item.inStockDays)) : 30,
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
            lastSalesDate: item.lastSalesDate || null,
            lastSyncedAt: new Date()
          }
        });
        updatedProductsCount++;
      }
    }

    // 2. Bulk Upsert Suppliers
    if (suppliers && Array.isArray(suppliers) && suppliers.length > 0) {
      for (const s of suppliers) {
        if (!s.id || !s.name) continue;

        await prisma.pharmacySupplier.upsert({
          where: { supplierIdPk: Number(s.id) },
          update: {
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
            supplierIdPk: Number(s.id),
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

    // 3. Update Sync Timestamp in Settings
    await prisma.pharmacySettings.upsert({
      where: { id: 'default' },
      update: { lastSyncTimestamp: new Date() },
      create: { id: 'default', lastSyncTimestamp: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: 'تمت المزامنة وحفظ البيانات في قاعدة بيانات السيرفر بنجاح',
      updatedProductsCount,
      updatedSuppliersCount,
      syncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Pharmacy Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
