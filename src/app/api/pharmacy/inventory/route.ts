import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);

    // Build WHERE conditions
    const conditions: string[] = [];

    if (search.trim()) {
      const safeTerm = search.trim().replace(/'/g, "''");
      conditions.push(`(
        LOWER("productName") LIKE LOWER('%${safeTerm}%') OR
        LOWER("productCode") LIKE LOWER('%${safeTerm}%') OR
        LOWER(COALESCE("activeIngredient", '')) LIKE LOWER('%${safeTerm}%')
      )`);
    }

    // BUG FIX: lowStock filter now correctly uses stockOnHand < minStockLevel (column comparison)
    if (filter === 'inStock') {
      conditions.push('"stockOnHand" > 0');
    } else if (filter === 'outOfStock') {
      conditions.push('"stockOnHand" <= 0');
    } else if (filter === 'lowStock') {
      conditions.push('"stockOnHand" > 0 AND "minStockLevel" > 0 AND "stockOnHand" < "minStockLevel"');
    }

    if (category && category !== 'all') {
      const safeCategory = category.replace(/'/g, "''");
      conditions.push(`"category" = '${safeCategory}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*)::bigint as count FROM "PharmacyProduct" ${whereClause}`
    );
    const totalCount = Number(countResult[0].count);
    const totalPages = Math.ceil(totalCount / pageSize);

    const offset = (page - 1) * pageSize;
    const products = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "PharmacyProduct" ${whereClause} ORDER BY "productName" ASC LIMIT ${pageSize} OFFSET ${offset}`
    );

    return NextResponse.json({
      success: true,
      totalCount,
      page,
      pageSize,
      totalPages,
      products: products.map((p: any) => ({
        id: p.id,
        code: p.productCode,
        name: p.productName,
        stockOnHand: Number(p.stockOnHand),
        minStockLevel: Number(p.minStockLevel),
        maxStockLevel: Number(p.maxStockLevel),
        costPrice: Number(p.costPrice),
        sellPrice: Number(p.sellPrice),
        expiryDate: p.expiryDate,
        supplierName: p.supplierName,
        category: p.category,
        subCategory: p.subCategory,
        activeIngredient: p.activeIngredient,
        strength: p.strength,
        dosageForm: p.dosageForm
      }))
    });
  } catch (error: any) {
    console.error('Pharmacy Inventory API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, newStock, minStock, maxStock } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'معرف الصنف مطلوب' }, { status: 400 });
    }

    const newStockVal = Number(newStock);
    const minStockVal = Number(minStock) || 0;

    // Validate: min stock can't exceed actual stock
    if (minStockVal > newStockVal && newStockVal > 0) {
      return NextResponse.json({
        success: false,
        error: 'حد الأمان الأدنى لا يمكن أن يتجاوز الرصيد الفعلي'
      }, { status: 400 });
    }

    const updated = await prisma.pharmacyProduct.update({
      where: { id: Number(productId) },
      data: {
        stockOnHand: newStockVal || 0,
        minStockLevel: minStockVal,
        maxStockLevel: Number(maxStock) || 0
      }
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
