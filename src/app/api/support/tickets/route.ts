import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// GET: Fetch Tickets for current tenant (or all for super-admin)
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const isSuperAdmin = tenant.slug === 'super-admin';

    const tickets = await (prisma as any).supportTicket.findMany({
      where: isSuperAdmin ? {} : { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create New Support Ticket
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json();
    const { subject, message, category, priority, userName, userPhone } = body;

    if (!subject || !message) {
      return NextResponse.json({ success: false, error: 'عنوان وتفاصيل التذكرة مطلوبة' }, { status: 400 });
    }

    const ticket = await (prisma as any).supportTicket.create({
      data: {
        tenantId: tenant.id,
        userName: userName || tenant.name,
        userPhone: userPhone || null,
        subject: String(subject).trim(),
        message: String(message).trim(),
        category: category || 'GENERAL',
        priority: priority || 'NORMAL',
        status: 'OPEN'
      }
    });

    await logAuditEvent({
      tenantId: tenant.id,
      action: 'CREATE_SUPPORT_TICKET',
      entity: 'SupportTicket',
      entityId: ticket.id,
      details: { subject, category, priority },
      req
    });

    return NextResponse.json({
      success: true,
      message: '✅ تم إرسال تذكرة الدعم الفني بنجاح، سيقوم فريق الدعم بالرد فوراً.',
      ticket
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Update Ticket Status or Add Response (Super Admin)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, status, response } = body;

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'معرف التذكرة مطلوب' }, { status: 400 });
    }

    const updated = await (prisma as any).supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(status && { status }),
        ...(response !== undefined && { response })
      }
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
