import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateInStockVelocity } from '@/lib/pharmacyAnalytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const totalProductsCount = await prisma.pharmacyProduct.count();
    const outOfStockCount = await prisma.pharmacyProduct.count({
      where: { stockOnHand: { lte: 0 } }
    });

    // BUG FIX: belowMinStockCount must check stockOnHand < minStockLevel
    // Prisma doesn't support column-to-column comparison, use raw SQL
    const belowMinResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "PharmacyProduct"
      WHERE "stockOnHand" > 0 AND "minStockLevel" > 0 AND "stockOnHand" < "minStockLevel"
    `;
    const belowMinStockCount = Number(belowMinResult?.[0]?.count || 0);

    const totalSuppliersCount = await prisma.pharmacySupplier.count();

    // Aggregates - only load needed columns for performance
    const products = await prisma.pharmacyProduct.findMany({
      select: {
        stockOnHand: true,
        costPrice: true,
        sellPrice: true,
        expiryDate: true
      }
    });

    let totalInventoryValueCost = 0;
    let totalInventoryValueSell = 0;
    let expiredCount = 0;
    let within30Days = 0;
    let within90Days = 0;
    let within180Days = 0;

    const now = new Date();

    for (const p of products) {
      if (p.stockOnHand > 0) {
        totalInventoryValueCost += p.stockOnHand * p.costPrice;
        totalInventoryValueSell += p.stockOnHand * p.sellPrice;
      }

      if (p.expiryDate && p.stockOnHand > 0) {
        const expDate = new Date(p.expiryDate);
        const diffDays = Math.round((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

        // BUG FIX 1: Use exclusive ranges (each item counted ONCE, not double-counted)
        // 30days check already covers <=30, so 90days should be 31..90, etc.
        if (diffDays <= 0) expiredCount++;
        else if (diffDays <= 30) within30Days++;
        else if (diffDays <= 90) within90Days++;   // 31-90 days
        else if (diffDays <= 180) within180Days++;  // 91-180 days
      }
    }

    // Top Critical Shortages (out-of-stock, sorted by real 30-day velocity / sales)
    const topShortagesRaw = await prisma.pharmacyProduct.findMany({
      where: { stockOnHand: { lte: 0 } },
      orderBy: [
        { sold30Days: 'desc' },
        { totalSoldQty: 'desc' }
      ],
      take: 10
    });

    const targetCoverageDays = 30; // Default dashboard coverage target: 30 days

    const topShortages = topShortagesRaw.map((item: any) => {
      const stockOnHand = Number(item.stockOnHand) || 0;
      const minStockLevel = Number(item.minStockLevel) || 0;
      const maxStockLevel = Number(item.maxStockLevel) || 0;
      const sold30 = Number(item.sold30Days) || 0;
      const totalSoldQty = Number(item.totalSoldQty) || 0;

      // حساب سرعة السحب اليومية الحقيقية (Real Daily Velocity)
      let velocity = 0;
      if (sold30 > 0) {
        velocity = Number((sold30 / 30).toFixed(2));
      } else if (totalSoldQty > 0) {
        velocity = Number((Math.min(0.1, totalSoldQty / 365)).toFixed(2));
      }

      // حساب الوحدات ومقاس العبوة
      const inventoryUnit = item.inventoryUnit || 'قطعة';
      const orderUnit = item.orderUnit || 'عبوة';
      const packSize = Math.max(1, Number(item.packSize) || 1.0);
      const costPrice = Number(item.costPrice) || 0;
      const purchaseUnitCost = Number(item.purchaseUnitCost) || (costPrice * packSize);

      // معادلة الكمية المطلوبة وتغطية الـ 30 يوماً
      const targetDemand = velocity * targetCoverageDays;
      const neededSmallUnits = Math.max(0, targetDemand - stockOnHand);
      let suggestedOrderPackages = Math.ceil(neededSmallUnits / packSize);
      if (suggestedOrderPackages <= 0 && stockOnHand <= 0) {
        suggestedOrderPackages = 1;
      }
      const suggestedTotalSmallUnits = suggestedOrderPackages * packSize;
      const estimatedOrderCost = suggestedOrderPackages * purchaseUnitCost;

      return {
        productId: item.id,
        code: item.productCode,
        name: item.productName,
        stockOnHand,
        minStockLevel,
        maxStockLevel,
        inventoryUnit,
        orderUnit,
        packSize,
        purchaseUnitCost,
        suggestedOrderPackages,
        suggestedTotalSmallUnits,
        suggestedOrderQty: suggestedOrderPackages,
        estimatedOrderCost,
        costPrice,
        sellPrice: Number(item.sellPrice) || 0,
        supplierName: item.supplierName || 'غير محدد',
        totalSoldQty,
        sold30Days: sold30,
        trueDailyVelocity: velocity,
        urgency: stockOnHand <= 0 && (sold30 > 0 || totalSoldQty > 10) ? 'CRITICAL' : 'HIGH'
      };
    });

    // Settings
    const settings = await prisma.pharmacySettings.findUnique({ where: { id: 'default' } });

    return NextResponse.json({
      success: true,
      stats: {
        totalProductsCount,
        totalInventoryValueCost,
        totalInventoryValueSell,
        outOfStockCount,
        belowMinStockCount,
        criticalExpiriesCount: expiredCount + within30Days,
        totalSuppliersCount,
        topShortages,
        expiringSoonSummary: {
          expiredCount,
          within30Days,
          within90Days,
          within180Days
        },
        lastSyncTimestamp: settings?.lastSyncTimestamp || null
      }
    });
  } catch (error: any) {
    console.error('Pharmacy Dashboard API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
