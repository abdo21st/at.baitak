import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pharmacy/whatsapp-shortages
 * Returns all WhatsApp-ingested shortage requests with filters and tenant isolation
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
 * Updates status or details of a WhatsApp shortage item (single or bulk) with tenant isolation
 */
export async function PATCH(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { id, ids, status, requestedQty, matchedCode, notes } = body;

    // 1. Bulk Status Update
    if (Array.isArray(ids) && ids.length > 0) {
      if (!status) {
        return NextResponse.json({ success: false, error: 'الحالة الجديدة مطلوبة للتحديث الجماعي' }, { status: 400 });
      }

      const whereClause: any = { id: { in: ids } };
      if (tenantId) whereClause.tenantId = tenantId;

      const result = await prisma.whatsAppShortageRequest.updateMany({
        where: whereClause,
        data: { status }
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `تم تحديث حالة ${result.count} صنف إلى (${status}) بنجاح`
      });
    }

    // 2. Single Item Update
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الطلب مطلوب' }, { status: 400 });
    }

    const existing = await prisma.whatsAppShortageRequest.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) }
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
 * Deletes shortage requests (single, bulk, or purge prior history) with tenant isolation
 */
export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const queryAction = searchParams.get('action');
    const queryId = searchParams.get('id');
    const queryIds = searchParams.get('ids');

    let bodyIds: string[] = [];
    let bodyAction: string | null = null;

    try {
      const body = await req.json();
      if (body.ids && Array.isArray(body.ids)) bodyIds = body.ids;
      if (body.id) bodyIds.push(body.id);
      if (body.action) bodyAction = body.action;
    } catch {
      // Body may be empty in standard DELETE
    }

    const effectiveAction = queryAction || bodyAction;

    // 1. Purge History: Delete requests prior to today 00:00:00 local time
    if (effectiveAction === 'purge-history') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      const whereClause: any = {
        createdAt: { lt: startOfToday }
      };
      if (tenantId) whereClause.tenantId = tenantId;

      const deleteResult = await prisma.whatsAppShortageRequest.deleteMany({
        where: whereClause
      });

      return NextResponse.json({
        success: true,
        count: deleteResult.count,
        message: `تم مسح ${deleteResult.count} طلب سابق لتاريخ اليوم بنجاح والاحتفاظ ببيانات اليوم فقط`
      });
    }

    // 2. Bulk or Single Delete by ID(s)
    const allIds = Array.from(
      new Set([
        ...(queryId ? [queryId] : []),
        ...(queryIds ? queryIds.split(',').map((s) => s.trim()).filter(Boolean) : []),
        ...bodyIds
      ])
    );

    if (allIds.length === 0) {
      return NextResponse.json({ success: false, error: 'معرف الطلب أو قائمة المعرفات مطلوبة' }, { status: 400 });
    }

    const whereClause: any = {
      id: allIds.length === 1 ? allIds[0] : { in: allIds }
    };
    if (tenantId) whereClause.tenantId = tenantId;

    const deleteResult = await prisma.whatsAppShortageRequest.deleteMany({
      where: whereClause
    });

    return NextResponse.json({
      success: true,
      count: deleteResult.count,
      message: `تم حذف ${deleteResult.count} صنف بنجاح`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
