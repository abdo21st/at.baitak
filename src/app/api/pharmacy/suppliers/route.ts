import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const where: any = {};
    if (search.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } }
      ];
    }

    const suppliers = await prisma.pharmacySupplier.findMany({
      where,
      orderBy: { totalPurchases: 'desc' }
    });

    return NextResponse.json({
      success: true,
      count: suppliers.length,
      suppliers: suppliers.map((s) => ({
        id: s.supplierIdPk,
        name: s.name,
        code: s.code,
        phone: s.phone,
        mobile: s.mobile,
        address: s.address,
        totalPurchasesAmount: s.totalPurchases,
        totalPurchasesCount: s.totalInvoicesCount,
        outstandingBalance: s.outstandingBalance
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
