import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pharmacy/whatsapp-shortages
 * Returns all WhatsApp-ingested shortage requests with filters
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';
    const search = searchParams.get('search') || '';

    const where: any = { tenantId };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search.trim()) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { activeIngredient: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { rawMessage: { contains: search, mode: 'insensitive' } }
      ];
    }

    const requests = await prisma.whatsAppShortageRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const pendingCount = await prisma.whatsAppShortageRequest.count({ where: { tenantId, status: 'PENDING' } });
    const orderedCount = await prisma.whatsAppShortageRequest.count({ where: { tenantId, status: 'ORDERED' } });

    return NextResponse.json({
      success: true,
      requests,
      counts: {
        total: requests.length,
        pending: pendingCount,
        ordered: orderedCount
      }
    });
  } catch (error: any) {
    console.error('Error fetching WhatsApp shortages:', error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

/**
 * PATCH /api/pharmacy/whatsapp-shortages
 * Updates status or details of a WhatsApp shortage item
 */
export async function PATCH(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { id, status, requestedQty, matchedCode, notes } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الطلب مطلوب' }, { status: 400 });
    }

    const existing = await prisma.whatsAppShortageRequest.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'الطلب غير موجود أو غير مصرح بتعديله' }, { status: 404 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (requestedQty !== undefined) data.requestedQty = parseFloat(requestedQty);
    if (matchedCode !== undefined) data.matchedCode = matchedCode;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.whatsAppShortageRequest.update({
      where: { id },
      data
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

/**
 * DELETE /api/pharmacy/whatsapp-shortages
 * Deletes a shortage request with Tenant Isolation
 */
export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الطلب مطلوب' }, { status: 400 });
    }

    const existing = await prisma.whatsAppShortageRequest.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'الطلب غير موجود أو غير مصرح بحذفه' }, { status: 404 });
    }

    await prisma.whatsAppShortageRequest.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
