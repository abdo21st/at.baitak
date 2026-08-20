import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// GET: Fetch Patient Refill Schedule
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const refills = await (prisma as any).patientRefill.findMany({
      where: { tenantId: tenant.id },
      orderBy: { nextReminderDate: 'asc' }
    });

    return NextResponse.json({ success: true, refills });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create or Update Patient Chronic Refill Plan
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json();
    const { patientName, patientPhone, medicationName, dosageInstructions, refillIntervalDays, notes } = body;

    if (!patientName || !patientPhone || !medicationName) {
      return NextResponse.json({ success: false, error: 'اسم المريض ورقم الهاتف واسم الدواء مطلوبة' }, { status: 400 });
    }

    const interval = Number(refillIntervalDays) || 30;
    const nextDate = new Date();
    // Remind 3 days before supply runs out
    nextDate.setDate(nextDate.getDate() + Math.max(1, interval - 3));

    const refill = await (prisma as any).patientRefill.create({
      data: {
        tenantId: tenant.id,
        patientName: String(patientName).trim(),
        patientPhone: String(patientPhone).trim(),
        medicationName: String(medicationName).trim(),
        dosageInstructions: dosageInstructions ? String(dosageInstructions).trim() : null,
        refillIntervalDays: interval,
        nextReminderDate: nextDate,
        status: 'ACTIVE',
        notes: notes ? String(notes).trim() : null
      }
    });

    await logAuditEvent({
      tenantId: tenant.id,
      action: 'CREATE_PATIENT_REFILL_PLAN',
      entity: 'PatientRefill',
      entityId: refill.id,
      details: { patientName, medicationName, nextReminderDate: nextDate.toISOString() },
      req
    });

    return NextResponse.json({
      success: true,
      message: '✅ تم إنشاء خطة متابعة الدواء المزمن للمريض بنجاح، سيتم تذكيره تلقائياً عبر واتساب!',
      refill
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
