import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';

// GET: Identify Slow Moving & Dead Stock items (>60 or >90 days)
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const thresholdDays = Number(req.nextUrl.searchParams.get('days')) || 60;

    const products = await prisma.pharmacyProduct.findMany({
      where: {
        tenantId: tenant.id,
        stockOnHand: { gt: 0 }
      },
      orderBy: { updatedAt: 'asc' },
      take: 100
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

    const deadStockItems = products.map((p) => {
      const daysSinceUpdate = Math.ceil((new Date().getTime() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      const tiedCapital = Math.round((p.stockOnHand || 0) * (p.costPrice || p.sellPrice * 0.75));

      return {
        id: p.id,
        name: p.productName,
        currentStock: p.stockOnHand,
        price: p.sellPrice,
        costPrice: p.costPrice || Math.round(p.sellPrice * 0.75),
        tiedCapital,
        daysStagnant: daysSinceUpdate,
        suggestedAction: daysSinceUpdate > 90 ? 'عمل عرض ترويجي / خصم 25% للتصريف' : 'إعادة ترتيب العرض بالواجهة الأمامية'
      };
    });

    const totalTiedCapital = deadStockItems.reduce((acc, item) => acc + item.tiedCapital, 0);

    return NextResponse.json({
      success: true,
      thresholdDays,
      totalTiedCapital,
      currency: 'د.ل',
      itemsCount: deadStockItems.length,
      items: deadStockItems
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
