import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// GET: Fetch Supplier Returns
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const returns = await (prisma as any).supplierReturn.findMany({
      where: { tenantId: tenant.id },
      orderBy: { returnDate: 'desc' }
    });

    return NextResponse.json({ success: true, returns });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create Supplier Return Slip
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json();
    const { supplierName, supplierPhone, totalAmount, reason, items, creditNoteNo, notes } = body;

    if (!supplierName || !totalAmount) {
      return NextResponse.json({ success: false, error: 'اسم المورد والقيمة الإجمالية مطلوبة' }, { status: 400 });
    }

    const ret = await (prisma as any).supplierReturn.create({
      data: {
        tenantId: tenant.id,
        supplierName: String(supplierName).trim(),
        supplierPhone: supplierPhone ? String(supplierPhone).trim() : null,
        totalAmount: Number(totalAmount) || 0.0,
        reason: reason || 'EXPIRY_NEAR',
        items: items || [],
        creditNoteNo: creditNoteNo ? String(creditNoteNo).trim() : null,
        notes: notes ? String(notes).trim() : null,
        status: 'PENDING'
      }
    });

    await logAuditEvent({
      tenantId: tenant.id,
      action: 'CREATE_SUPPLIER_RETURN',
      entity: 'SupplierReturn',
      entityId: ret.id,
      details: { supplierName, totalAmount, reason },
      req
    });

    return NextResponse.json({
      success: true,
      message: '✅ تم توثيق بوليصة إرجاع الأدوية للمورد بنجاح!',
      returnRecord: ret
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
