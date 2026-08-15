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

    const where: any = {};

    if (search.trim()) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { productCode: { contains: search, mode: 'insensitive' } },
        { activeIngredient: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (filter === 'inStock') where.stockOnHand = { gt: 0 };
    else if (filter === 'outOfStock') where.stockOnHand = { lte: 0 };
    else if (filter === 'lowStock') where.AND = [{ stockOnHand: { gt: 0 } }];

    if (category && category !== 'all') {
      where.category = category;
    }

    const totalCount = await prisma.pharmacyProduct.count({ where });
    const totalPages = Math.ceil(totalCount / pageSize);

    const products = await prisma.pharmacyProduct.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { productName: 'asc' }
    });

    return NextResponse.json({
      success: true,
      totalCount,
      page,
      pageSize,
      totalPages,
      products: products.map((p) => ({
        id: p.id,
        code: p.productCode,
        name: p.productName,
        stockOnHand: p.stockOnHand,
        minStockLevel: p.minStockLevel,
        maxStockLevel: p.maxStockLevel,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
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

    if (!productId) return NextResponse.json({ success: false, error: 'معرف الصنف مطلوب' }, { status: 400 });

    const updated = await prisma.pharmacyProduct.update({
      where: { id: Number(productId) },
      data: {
        stockOnHand: Number(newStock) || 0,
        minStockLevel: Number(minStock) || 0,
        maxStockLevel: Number(maxStock) || 0
      }
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
