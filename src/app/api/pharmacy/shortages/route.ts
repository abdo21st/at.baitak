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

    const branch = searchParams.get('branch');

    let categoryFilter = '';
    let searchFilter = '';
    let branchFilter = '';

    if (branch && branch !== 'all' && branch !== 'ALL') {
      const safeBranch = branch.replace(/'/g, "''");
      branchFilter = `AND "branchCode" = '${safeBranch}'`;
    }

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

    // Shortage = stockOnHand <= 0 OR (stockOnHand > 0 AND minStockLevel > 0 AND stockOnHand < minStockLevel)
    const rawQuery = `
      SELECT * FROM "PharmacyProduct"
      WHERE (
        "stockOnHand" <= 0 OR
        ("stockOnHand" > 0 AND "minStockLevel" > 0 AND "stockOnHand" < "minStockLevel")
      )
      ${branchFilter}
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
    const targetCoverageDays = parseInt(searchParams.get('coverageDays') || '30', 10);
    const studyPeriodDays = parseInt(searchParams.get('studyPeriod') || '30', 10);

    const enriched = items.map((item: any) => {
      const stockOnHand = Number(item.stockOnHand) || 0;
      const minStockLevel = Number(item.minStockLevel) || 0;
      const maxStockLevel = Number(item.maxStockLevel) || 0;
      const totalSoldQty = Number(item.totalSoldQty) || 0;

      // حساب سرعة السحب اليومية الفعلية بناءً على الأيام المتوفرة
      const inStockDays = Math.max(1, Number(item.inStockDays) || studyPeriodDays);
      const velocity = calculateInStockVelocity(totalSoldQty, inStockDays);
      const doi = calculateDaysOfInventory(stockOnHand, velocity);

      // حساب الوحدات ومعامل التحويل للطلب بالوحدة الكبرى
      const inventoryUnit = item.inventoryUnit || 'قطعة';
      const orderUnit = item.orderUnit || 'عبوة';
      const packSize = Math.max(1, Number(item.packSize) || 1.0);
      const costPrice = Number(item.costPrice) || 0;
      const purchaseUnitCost = Number(item.purchaseUnitCost) || (costPrice * packSize);

      // معادلة الكمية المطلوبة بالوحدات الصغرى لتغطية الفترة المحددة
      const targetDemand = velocity * targetCoverageDays;
      const neededSmallUnits = Math.max(0, targetDemand - stockOnHand);

      // تحويل الوحدات المطلوبة إلى وحدات شراء كبرى (Packages)
      let suggestedOrderPackages = Math.ceil(neededSmallUnits / packSize);
      if (suggestedOrderPackages <= 0 && stockOnHand <= 0) {
        suggestedOrderPackages = 1; // حد أدنى عبوة واحدة في حال النفاذ التام
      }
      const suggestedTotalSmallUnits = suggestedOrderPackages * packSize;
      const estimatedOrderCost = suggestedOrderPackages * purchaseUnitCost;

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
            recommendationMessage: `تنبيه بدائل: رصيد (${match.stockOnHand}) من [${match.productName}] ينتهي خلال ${daysLeft} يوماً – يفضل تصريفه أولاً!`
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
        branchCode: item.branchCode || 'MAIN_BRANCH',
        branchName: item.branchName || 'الفرع الرئيسي',
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
