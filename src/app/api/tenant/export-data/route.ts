import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// GET: Export entire tenant data in clean portable JSON/CSV format
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);

    const [users, departments, attendances, fieldVisits, products, settings] = await Promise.all([
      prisma.user.findMany({ where: { tenantId: tenant.id }, select: { id: true, name: true, employeeCode: true, phone: true, jobTitle: true, hourlyRate: true, monthlySalary: true, createdAt: true } }),
      prisma.department.findMany({ where: { tenantId: tenant.id } }),
      prisma.attendanceRecord.findMany({ where: { user: { tenantId: tenant.id } }, orderBy: { date: 'desc' } }),
      prisma.fieldVisit.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' } }),
      prisma.pharmacyProduct.findMany({ where: { tenantId: tenant.id } }),
      prisma.companySettings.findFirst({ where: { tenantId: tenant.id } })
    ]);

    const exportPackage = {
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        users,
        departments,
        attendances,
        fieldVisits,
        products,
        settings
      }
    };

    await logAuditEvent({
      tenantId: tenant.id,
      action: 'EXPORT_TENANT_DATA',
      entity: 'Tenant',
      entityId: tenant.id,
      req
    });

    const jsonString = JSON.stringify(exportPackage, null, 2);

    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${tenant.slug}_backup_${new Date().toISOString().substring(0, 10)}.json"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
