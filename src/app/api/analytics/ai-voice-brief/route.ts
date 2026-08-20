import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';

// GET: Generate AI Executive Voice Briefing Script and Metrics Summary
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const today = new Date().toISOString().substring(0, 10);

    // Get today's attendance metrics
    const [attendances, openShiftsCount, usersCount, pendingReturns, contractsDue] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          date: today,
          user: { tenantId: tenant.id }
        },
        include: { user: true }
      }),
      prisma.attendanceRecord.count({
        where: {
          date: today,
          checkOutTime: null,
          user: { tenantId: tenant.id }
        }
      }),
      prisma.user.count({ where: { tenantId: tenant.id } }),
      (prisma as any).supplierReturn.count({ where: { tenantId: tenant.id, status: 'PENDING' } }).catch(() => 0),
      (prisma as any).maintenanceContract.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }).catch(() => 0)
    ]);

    const totalHoursWorked = attendances.reduce((acc, a) => acc + (a.workHours || 0), 0);
    const presentCount = attendances.length;
    const absentCount = Math.max(0, usersCount - presentCount);

    // Generate Natural Arabic Voice Briefing Script
    const voiceScript = `مرحباً بك يا دكتور في ملخص العمليات اليومي لنشاط ${tenant.name}.
سجل الحضور اليوم ${presentCount} موظف من إجمالي ${usersCount}، بينما يتواجد حالياً ${openShiftsCount} موظف في شفتات نشطة.
إجمالي ساعات العمل المنجزة اليوم بلغ ${totalHoursWorked.toFixed(1)} ساعة.
${pendingReturns > 0 ? `توجد لديك ${pendingReturns} بوالص إرجاع أدوية معلقة بانتظار اعتماد المورد.` : 'لا توجد أي بوالص إرجاع معلقة.'}
المنظومة تعمل بكامل كفاءتها واستقرارها، ونتمنى لكم يوماً موفقاً ومثمراً.`;

    return NextResponse.json({
      success: true,
      tenantName: tenant.name,
      date: today,
      voiceScript,
      metrics: {
        presentCount,
        absentCount,
        openShiftsCount,
        totalHoursWorked: Number(totalHoursWorked.toFixed(1)),
        pendingReturns,
        contractsDue
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
