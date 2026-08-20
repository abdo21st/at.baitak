import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// GET: List Maintenance Contracts
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const contracts = await (prisma as any).maintenanceContract.findMany({
      where: { tenantId: tenant.id },
      orderBy: { nextVisitDate: 'asc' }
    });

    return NextResponse.json({ success: true, contracts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create New SLA Maintenance Contract
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json();
    const { clientName, clientPhone, clientAddress, equipmentName, visitFrequency, contractValue, slaHours, nextVisitDate, notes } = body;

    if (!clientName || !clientPhone || !equipmentName) {
      return NextResponse.json({ success: false, error: 'اسم العميل ورقم الهاتف ونوع المعدة مطلوبة' }, { status: 400 });
    }

    const calculatedNextDate = nextVisitDate ? new Date(nextVisitDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const contract = await (prisma as any).maintenanceContract.create({
      data: {
        tenantId: tenant.id,
        clientName: String(clientName).trim(),
        clientPhone: String(clientPhone).trim(),
        clientAddress: clientAddress ? String(clientAddress).trim() : null,
        equipmentName: String(equipmentName).trim(),
        visitFrequency: visitFrequency || 'MONTHLY',
        contractValue: Number(contractValue) || 0.0,
        slaHours: Number(slaHours) || 24,
        nextVisitDate: calculatedNextDate,
        status: 'ACTIVE',
        notes: notes ? String(notes).trim() : null
      }
    });

    await logAuditEvent({
      tenantId: tenant.id,
      action: 'CREATE_MAINTENANCE_CONTRACT',
      entity: 'MaintenanceContract',
      entityId: contract.id,
      details: { clientName, equipmentName, contractValue },
      req
    });

    return NextResponse.json({
      success: true,
      message: '✅ تم إنشاء عقد الصيانة الدورية واتفاقية مستوى الخدمة (SLA) بنجاح!',
      contract
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
