import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/auditLogger';

// GET: Generate and download complete database snapshot metadata / json export
export async function GET(req: NextRequest) {
  try {
    const hostHeader = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').toLowerCase().trim();
    const tenantSlug = (req.headers.get('x-tenant-slug') || '').toLowerCase().trim();

    if (tenantSlug && tenantSlug !== 'super-admin') {
      return NextResponse.json({ success: false, error: 'غير مصرح لك بالوصول إلى بيانات النسخ الاحتياطي المركزي' }, { status: 403 });
    }

    const format = req.nextUrl.searchParams.get('format') || 'json';

    // Fetch essential tables for backup
    const [tenants, users, attendances, fieldVisits, products, settings] = await Promise.all([
      prisma.tenant.findMany(),
      prisma.user.findMany({ select: { id: true, tenantId: true, employeeCode: true, name: true, email: true, role: true, phone: true, jobTitle: true, hourlyRate: true, monthlySalary: true, createdAt: true } }),
      prisma.attendanceRecord.findMany({ take: 10000, orderBy: { createdAt: 'desc' } }),
      prisma.fieldVisit.findMany({ take: 5000, orderBy: { createdAt: 'desc' } }),
      prisma.pharmacyProduct.findMany({ take: 10000 }),
      prisma.companySettings.findMany()
    ]);

    const backupData = {
      backupTimestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'hodoork_db',
      stats: {
        tenantsCount: tenants.length,
        usersCount: users.length,
        attendancesCount: attendances.length,
        fieldVisitsCount: fieldVisits.length,
        productsCount: products.length
      },
      data: {
        tenants,
        users,
        attendances,
        fieldVisits,
        products,
        settings
      }
    };

    await logAuditEvent({
      tenantId: 'system',
      action: 'EXPORT_DATABASE_BACKUP',
      entity: 'Database',
      details: backupData.stats,
      req
    });

    const jsonString = JSON.stringify(backupData, null, 2);

    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="hodoork_backup_${new Date().toISOString().substring(0, 10)}.json"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
