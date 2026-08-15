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
    const belowMinStockCount = Number(belowMinResult[0].count);

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

    // Top Shortages (out-of-stock only, sorted by sales velocity)
    const topShortagesRaw = await prisma.pharmacyProduct.findMany({
      where: { stockOnHand: { lte: 0 } },
      orderBy: { totalSoldQty: 'desc' },
      take: 10
    });

    const topShortages = topShortagesRaw.map((item) => ({
      productId: item.id,
      code: item.productCode,
      name: item.productName,
      stockOnHand: item.stockOnHand,
      minStockLevel: item.minStockLevel,
      maxStockLevel: item.maxStockLevel,
      // BUG FIX 2: suggestedOrderQty must never be negative
      suggestedOrderQty: Math.max(10, Math.round(Math.max(0,
        (item.maxStockLevel > 0 ? item.maxStockLevel - item.stockOnHand : item.minStockLevel * 2)
      ))),
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      supplierName: item.supplierName,
      totalSoldQty: item.totalSoldQty,
      // BUG FIX 3: Use inStockDays if available, fallback to 30
      trueDailyVelocity: calculateInStockVelocity(item.totalSoldQty, Math.max(1, (item as any).inStockDays || 30)),
      urgency: item.totalSoldQty > 10 ? 'CRITICAL' : 'HIGH'
    }));

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
