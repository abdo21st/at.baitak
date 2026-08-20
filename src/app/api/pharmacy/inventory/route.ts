import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const safeTenantId = (tenantId || 'default-tenant').replace(/'/g, "''");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);

    const branch = searchParams.get('branch');

    // Build WHERE conditions
    const conditions: string[] = [`"tenantId" = '${safeTenantId}'`];

    if (branch && branch !== 'all' && branch !== 'ALL') {
      const safeBranch = branch.replace(/'/g, "''");
      conditions.push(`"branchCode" = '${safeBranch}'`);
    }

    if (search.trim()) {
      const rawTerm = search.trim();
      const safeTerm = rawTerm.replace(/'/g, "''");
      const noLeadingZero = rawTerm.replace(/^0+/, '');
      const safeNoZero = noLeadingZero.replace(/'/g, "''");
      const withLeadingZero = rawTerm.length === 12 ? '0' + rawTerm : '';
      const safeWithZero = withLeadingZero.replace(/'/g, "''");

      let barcodeConditions = `
        LOWER("productName") LIKE LOWER('%${safeTerm}%') OR
        LOWER("productCode") LIKE LOWER('%${safeTerm}%') OR
        LOWER(COALESCE("barcodes", '')) LIKE LOWER('%${safeTerm}%') OR
        LOWER(COALESCE("activeIngredient", '')) LIKE LOWER('%${safeTerm}%')
      `;

      if (safeNoZero && safeNoZero !== safeTerm) {
        barcodeConditions += ` OR LOWER("productCode") LIKE LOWER('%${safeNoZero}%') OR LOWER(COALESCE("barcodes", '')) LIKE LOWER('%${safeNoZero}%')`;
      }
      if (safeWithZero) {
        barcodeConditions += ` OR LOWER("productCode") LIKE LOWER('%${safeWithZero}%') OR LOWER(COALESCE("barcodes", '')) LIKE LOWER('%${safeWithZero}%')`;
      }

      conditions.push(`(${barcodeConditions})`);
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
        barcodes: p.barcodes || p.productCode || '',
        name: p.productName,
        scientificName: p.activeIngredient || '',
        stockOnHand: Number(p.stockOnHand),
        minStockLevel: Number(p.minStockLevel),
        maxStockLevel: Number(p.maxStockLevel),
        inventoryUnit: p.inventoryUnit || 'قطعة',
        orderUnit: p.orderUnit || 'عبوة',
        packSize: Number(p.packSize) || 1,
        purchaseUnitCost: Number(p.purchaseUnitCost) || (Number(p.costPrice) * (Number(p.packSize) || 1)),
        costPrice: Number(p.costPrice),
        sellPrice: Number(p.sellPrice),
        expiryDate: p.expiryDate,
        supplierName: p.supplierName || 'غير محدد',
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
