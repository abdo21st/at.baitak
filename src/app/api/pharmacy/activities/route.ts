import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const trips = await prisma.purchasingTrip.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    const audits = await prisma.inventoryAudit.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      trips,
      audits
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { action, trip, audit } = body;

    if (action === 'ADD_TRIP' && trip) {
      const createdTrip = await prisma.purchasingTrip.create({
        data: {
          tenantId,
          officerId: trip.officerId || null,
          officerName: trip.officerName || 'مسؤول المشتريات',
          date: trip.date || new Date().toISOString().split('T')[0],
          startTime: trip.startTime || '10:00',
          endTime: trip.endTime || '16:00',
          suppliersVisited: trip.suppliersVisited || [],
          totalInvoicesAmount: Number(trip.totalInvoicesAmount) || 0,
          commissionEarned: Number(trip.commissionEarned) || 0,
          status: trip.status || 'COMPLETED',
          notes: trip.notes || ''
        }
      });
      return NextResponse.json({ success: true, trip: createdTrip });
    }

    if (action === 'ADD_AUDIT' && audit) {
      const createdAudit = await prisma.inventoryAudit.create({
        data: {
          tenantId,
          officerId: audit.officerId || null,
          officerName: audit.officerName || 'مسؤول المخزون',
          date: audit.date || new Date().toISOString().split('T')[0],
          sectionAudited: audit.sectionAudited || 'جرد رفوف دوري',
          totalItemsChecked: Number(audit.totalItemsChecked) || 0,
          matchedCount: Number(audit.matchedCount) || 0,
          discrepancyCount: Number(audit.discrepancyCount) || 0,
          notes: audit.notes || ''
        }
      });
      return NextResponse.json({ success: true, audit: createdAudit });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير صالح' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
