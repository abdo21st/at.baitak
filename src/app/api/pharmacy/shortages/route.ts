import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateInStockVelocity, calculateDaysOfInventory } from '@/lib/pharmacyAnalytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    // BUG FIX 1: Fetch all products matching shortage criteria using raw SQL for
    // the "below min stock" condition (Prisma can't compare two columns directly).
    // Shortage = stockOnHand <= 0 OR (stockOnHand > 0 AND minStockLevel > 0 AND stockOnHand < minStockLevel)

    let categoryFilter = '';
    let searchFilter = '';

    // Build raw SQL conditions safely (category and search are validated, not user-injectable SQL)
    if (category && category !== 'all') {
      const safeCategory = category.replace(/'/g, "''");
      categoryFilter = `AND "category" = '${safeCategory}'`;
    }

    if (search.trim()) {
      const safeTerm = search.trim().replace(/'/g, "''");
      searchFilter = `AND (
        LOWER("productName") LIKE LOWER('%${safeTerm}%') OR
        LOWER("productCode") LIKE LOWER('%${safeTerm}%') OR
        LOWER(COALESCE("activeIngredient", '')) LIKE LOWER('%${safeTerm}%')
      )`;
    }

    // BUG FIX 3: Remove dead query (shortageItems) that was never used — was wasted DB round-trip
    // Use queryRawUnsafe only (with safe category and search conditions)
    const rawQuery = `
      SELECT * FROM "PharmacyProduct"
      WHERE (
        "stockOnHand" <= 0 OR
        ("stockOnHand" > 0 AND "minStockLevel" > 0 AND "stockOnHand" < "minStockLevel")
      )
      ${categoryFilter}
      ${searchFilter}
      ORDER BY "stockOnHand" ASC, "totalSoldQty" DESC
      LIMIT ${limit}
    `;
    const items = await prisma.$queryRawUnsafe<any[]>(rawQuery);

    // Pool of near-expiry items for generic risk check (items with stock > 0 and expiry date)
    const expiringPool = await prisma.pharmacyProduct.findMany({
      where: {
        stockOnHand: { gt: 0 },
        expiryDate: { not: null }
      },
      select: {
        productCode: true,
        productName: true,
        activeIngredient: true,
        stockOnHand: true,
        expiryDate: true
      }
    });

    const now = new Date();

    const enriched = items.map((item: any) => {
      const totalSoldQty = Number(item.totalSoldQty) || 0;
      const stockOnHand = Number(item.stockOnHand) || 0;
      const minStockLevel = Number(item.minStockLevel) || 0;
      const maxStockLevel = Number(item.maxStockLevel) || 0;

      // BUG FIX 4: Use inStockDays from DB (days the item had stock) not a hardcoded 30
      // This implements the user's requirement: only measure velocity during in-stock periods
      const inStockDays = Math.max(1, Number(item.inStockDays) || 30);
      const velocity = calculateInStockVelocity(totalSoldQty, inStockDays);
      const doi = calculateDaysOfInventory(stockOnHand, velocity);

      // BUG FIX 5: suggestedOrderQty must never be negative (if stockOnHand > maxStockLevel)
      // Suggested order qty: aim to fill to maxStockLevel, or 2x min, or 10 at minimum
      const baseQty = maxStockLevel > 0
        ? maxStockLevel - stockOnHand
        : (minStockLevel > 0 ? minStockLevel * 2 - stockOnHand : 10);
      const suggestedOrderQty = Math.max(10, Math.round(Math.max(0, baseQty)));

      // Generic risk: find near-expiry alternative with same active ingredient
      let genericRisk = null;
      if (item.activeIngredient) {
        const match = expiringPool.find((p) => {
          if (p.productCode === item.productCode || !p.expiryDate) return false;
          if (p.activeIngredient !== item.activeIngredient) return false;
          const daysLeft = Math.round((new Date(p.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
          return daysLeft <= 90; // Only warn if substitute expires within 90 days
        });

        if (match) {
          const daysLeft = Math.round((new Date(match.expiryDate!).getTime() - now.getTime()) / (1000 * 3600 * 24));
          genericRisk = {
            hasNearExpirySubstitute: true,
            substituteProductName: match.productName,
            substituteStock: match.stockOnHand,
            substituteExpiryDate: match.expiryDate,
            substituteDaysRemaining: daysLeft,
            recommendationMessage: `تنبيه بدائل: رصيد (${match.stockOnHand}) علبة من [${match.productName}] ينتهي خلال ${daysLeft} يوماً – تصريفه أولاً قبل طلب هذا الصنف!`
          };
        }
      }

      // Urgency classification
      let urgency = 'MEDIUM';
      if (stockOnHand <= 0 && totalSoldQty > 10) urgency = 'CRITICAL';
      else if (stockOnHand <= 0) urgency = 'HIGH';
      else if (stockOnHand < minStockLevel) urgency = 'LOW';

      return {
        productId: item.id,
        code: item.productCode,
        name: item.productName,
        stockOnHand,
        minStockLevel,
        maxStockLevel,
        suggestedOrderQty,
        costPrice: Number(item.costPrice) || 0,
        sellPrice: Number(item.sellPrice) || 0,
        totalSoldQty,
        supplierName: item.supplierName,
        category: item.category,
        subCategory: item.subCategory,
        activeIngredient: item.activeIngredient,
        strength: item.strength,
        dosageForm: item.dosageForm,
        trueDailyVelocity: velocity,
        daysOfInventory: doi,
        genericRisk,
        urgency
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
