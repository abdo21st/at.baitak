import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateInStockVelocity, calculateDaysOfInventory } from '@/lib/pharmacyAnalytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const supplierId = searchParams.get('supplierId');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '150', 10);

    const where: any = {
      OR: [
        { stockOnHand: { lte: 0 } },
        {
          AND: [
            { minStockLevel: { gt: 0 } }
          ]
        }
      ]
    };

    if (search.trim()) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { productCode: { contains: search, mode: 'insensitive' } },
        { activeIngredient: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    const items = await prisma.pharmacyProduct.findMany({
      where,
      orderBy: [{ stockOnHand: 'asc' }, { totalSoldQty: 'desc' }],
      take: limit
    });

    // Pool of near-expiry items to check generic risk
    const now = new Date();
    const expiringPool = await prisma.pharmacyProduct.findMany({
      where: {
        stockOnHand: { gt: 0 },
        expiryDate: { not: null }
      }
    });

    const enriched = items.map((item) => {
      const velocity = calculateInStockVelocity(item.totalSoldQty, 20);
      const doi = calculateDaysOfInventory(item.stockOnHand, velocity);

      // Check generic risk
      let genericRisk = null;
      if (item.activeIngredient) {
        const match = expiringPool.find(
          (p) =>
            p.productCode !== item.productCode &&
            p.activeIngredient === item.activeIngredient &&
            p.expiryDate
        );
        if (match) {
          genericRisk = {
            hasNearExpirySubstitute: true,
            substituteProductName: match.productName,
            substituteStock: match.stockOnHand,
            substituteExpiryDate: match.expiryDate,
            recommendationMessage: `تنبيه بدائل: يتوفر رصيد (${match.stockOnHand} علبة) من البديل [${match.productName}] ينتهي قريباً. يُنصح بتصريفه أولاً!`
          };
        }
      }

      return {
        productId: item.id,
        code: item.productCode,
        name: item.productName,
        stockOnHand: item.stockOnHand,
        minStockLevel: item.minStockLevel,
        maxStockLevel: item.maxStockLevel,
        suggestedOrderQty: Math.max(10, Math.round(item.minStockLevel * 2 || 10)),
        costPrice: item.costPrice,
        sellPrice: item.sellPrice,
        totalSoldQty: item.totalSoldQty,
        supplierName: item.supplierName,
        category: item.category,
        subCategory: item.subCategory,
        activeIngredient: item.activeIngredient,
        strength: item.strength,
        dosageForm: item.dosageForm,
        trueDailyVelocity: velocity,
        daysOfInventory: doi,
        genericRisk,
        urgency: item.stockOnHand <= 0 && item.totalSoldQty > 10 ? 'CRITICAL' : item.stockOnHand <= 0 ? 'HIGH' : 'MEDIUM'
      };
    });

    return NextResponse.json({
      success: true,
      count: enriched.length,
      shortages: enriched
    });
  } catch (error: any) {
    console.error('Pharmacy Shortages API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
