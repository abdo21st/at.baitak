import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all'; // all, expired, 30days, 90days, 180days
    const search = searchParams.get('search') || '';

    const products = await prisma.pharmacyProduct.findMany({
      where: {
        tenantId,
        stockOnHand: { gt: 0 },
        expiryDate: { not: null }
      },
      orderBy: { expiryDate: 'asc' }
    });

    const now = new Date();
    const items = [];

    for (const p of products) {
      if (!p.expiryDate) continue;
      const expDate = new Date(p.expiryDate);
      const daysRemaining = Math.round((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      let status = 'ATTENTION_180';
      if (daysRemaining <= 0) status = 'EXPIRED';
      else if (daysRemaining <= 30) status = 'CRITICAL_30';
      else if (daysRemaining <= 90) status = 'WARNING_90';
      else if (daysRemaining <= 180) status = 'ATTENTION_180';
      else continue; // Beyond 180 days

      if (filter === 'expired' && status !== 'EXPIRED') continue;
      if (filter === '30days' && status !== 'CRITICAL_30') continue;
      if (filter === '90days' && status !== 'WARNING_90') continue;
      if (filter === '180days' && status !== 'ATTENTION_180') continue;

      if (search.trim()) {
        const query = search.toLowerCase();
        if (
          !p.productName.toLowerCase().includes(query) &&
          !p.productCode.toLowerCase().includes(query)
        ) {
          continue;
        }
      }

      items.push({
        productId: p.id,
        productCode: p.productCode,
        productName: p.productName,
        stockOnHand: p.stockOnHand,
        inventoryUnit: p.inventoryUnit || 'قطعة',
        orderUnit: p.orderUnit || 'عبوة',
        packSize: p.packSize || 1,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        expiryDate: p.expiryDate,
        daysRemaining,
        supplierName: p.supplierName || 'غير محدد',
        status
      });
    }

    return NextResponse.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error: any) {
    console.error('Pharmacy Expiries API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
