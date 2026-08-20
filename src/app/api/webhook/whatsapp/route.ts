import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDailyDigestToN8n, sendCheckoutReminderToN8n, sendTestWebhook, sendMonthlyPayrollToN8n, sendArrivalReminderToN8n } from '@/lib/n8n';

// Anti-spam map to prevent spamming employee WhatsApp with arrival reminders (min 2 hours interval)
const lastArrivalAlertTimestamps = new Map<string, number>();

function normalizeWebhookUrl(url?: string): string {
  if (!url) return 'http://102.203.201.52:5678/webhook/attendance-alert';
  return url.replace('127.0.0.1', '102.203.201.52').replace('localhost', '102.203.201.52');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, managerPhone: customPhone, webhookUrl: customUrl } = body;

    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' }
    });

    const targetUrl = normalizeWebhookUrl(customUrl || settings?.n8nWebhookUrl);
    const targetPhone = customPhone || settings?.managerPhone || '+218923458014';

    if (action === 'TEST') {
      await sendTestWebhook(targetPhone, targetUrl);
      return NextResponse.json({ success: true, message: 'تم إرسال رسالة الاختبار إلى واتساب بنجاح! 🟢' });
    }

    const todayDate = new Date().toISOString().split('T')[0];

    if (action === 'DAILY_DIGEST') {
      const todayRecords = await prisma.attendanceRecord.findMany({
        where: { date: todayDate },
        include: { user: true },
        orderBy: { checkInTime: 'asc' }
      });

      const totalAttendees = new Set(todayRecords.map(r => r.userId)).size;
      const totalHoursToday = Number(todayRecords.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(2));
      const outsideGpsCount = todayRecords.filter(r => r.isOutsideGps).length;
      const openShiftsCount = todayRecords.filter(r => !r.checkOutTime).length;

      const attendees = todayRecords.map(r => ({
        name: r.user?.name || 'موظف',
        code: r.user?.employeeCode || '101',
        inTime: r.checkInTime,
        outTime: r.checkOutTime || null,
        hours: r.workHours,
        isOutsideGps: r.isOutsideGps
      }));

      const summary = {
        date: todayDate,
        totalAttendees,
        totalHoursToday,
        attendees,
        outsideGpsCount,
        openShiftsCount
      };

      await sendDailyDigestToN8n(summary, targetPhone, targetUrl);

      return NextResponse.json({
        success: true,
        message: `تم إرسال ملخص دوام اليوم (${totalAttendees} موظف، ${totalHoursToday} ساعة) إلى واتساب بنجاح! 🟢`,
        summary
      });
    }

    if (action === 'REMIND_OPEN_SHIFTS') {
      const openRecords = await prisma.attendanceRecord.findMany({
        where: { date: todayDate, checkOutTime: null },
        include: { user: true }
      });

      if (openRecords.length === 0) {
        return NextResponse.json({ success: true, message: 'لا توجد شفتات مفتوحة حالياً تحتاج إلى تذكير.', count: 0 });
      }

      // Cache tenant settings to avoid redundant queries
      const tenantSettingsCache = new Map<string, number>();

      const [nowH, nowM] = new Date().toTimeString().split(':').map(Number);
      const nowTotalMins = nowH * 60 + nowM;

      let sentCount = 0;
      for (const rec of openRecords) {
        const empTenantId = rec.user?.tenantId || 'default-tenant';
        let threshold = tenantSettingsCache.get(empTenantId);
        if (threshold === undefined) {
          const tSettings = (await prisma.companySettings.findFirst({ where: { tenantId: empTenantId } }))
            || (await prisma.companySettings.findUnique({ where: { id: 'default' } }));
          threshold = (tSettings as any)?.openShiftReminderHours ? Number((tSettings as any).openShiftReminderHours) : 8.0;
          tenantSettingsCache.set(empTenantId, threshold);
        }

        const [inH, inM] = rec.checkInTime.split(':').map(Number);
        const inMins = inH * 60 + (inM || 0);
        let diffMins = nowTotalMins - inMins;
        if (diffMins < 0) diffMins += 24 * 60;
        const hoursOpen = Number((diffMins / 60).toFixed(1));

        // Trigger reminder if open for more than configured threshold hours
        if (hoursOpen >= threshold) {
          await sendCheckoutReminderToN8n({
            name: rec.user?.name || 'موظف',
            code: rec.user?.employeeCode || '101',
            phone: rec.user?.phone,
            checkInTime: rec.checkInTime,
            date: rec.date,
            hoursOpen
          }, targetUrl);
          sentCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `تم فحص الشفتات المفتوحة وفقاً لساعات التنبيه المحددة وإرسال ${sentCount} تنبيهات للموظفين بنجاح! 🟢`,
        count: sentCount
      });
    }

    if (action === 'MONTHLY_PAYROLL') {
      const targetMonth = body.month || todayDate.substring(0, 7);
      const employeeId = body.employeeId;

      const whereUser = employeeId ? { id: employeeId } : { role: { not: 'ADMIN' as const } };
      const employees = await prisma.user.findMany({
        where: whereUser,
        include: {
          jobRoles: true,
          attendances: {
            where: {
              date: { startsWith: targetMonth }
            }
          }
        }
      });

      let sentCount = 0;
      for (const emp of employees) {
        const records = emp.attendances;
        const totalHours = Number(records.reduce((sum: number, r: { workHours: number }) => sum + (r.workHours || 0), 0).toFixed(2));
        const wholeHours = Math.floor(totalHours);
        const mins = Math.round((totalHours - wholeHours) * 60);
        const hoursFormatted = mins > 0 ? `${wholeHours} ساعة و ${mins} دقيقة` : `${wholeHours} ساعة`;

        const uniqueDays = new Set(records.map((r: { date: string }) => r.date).filter(Boolean)).size;
        const hourlyRate = emp.hourlyRate || 0;
        const hourlyDue = Number((totalHours * hourlyRate).toFixed(2));

        const totalCommissions = Number(records.reduce((sum: number, r: any) => sum + (Number(r.commissionAmount) || 0), 0).toFixed(2));

        const effectiveRoles = emp.jobRoles || [];
        // BUG FIX: Prevent doubling monthlySalary if emp.monthlySalary is already the sum of jobRoles
        const totalMonthlySalary = emp.monthlySalary && emp.monthlySalary > 0
          ? emp.monthlySalary
          : effectiveRoles.reduce((sum: number, r: { monthlySalary: number }) => sum + (r.monthlySalary || 0), 0);

        // Exact total calculated from individual shifts in the month (including rate rules and bonuses)
        const totalEarnedCost = Number(records.reduce((sum: number, r: any) => sum + (Number(r.earnedCost) || 0), 0).toFixed(2));

        // If records already have earnedCost computed, use it as the source of truth
        const totalDue = totalEarnedCost > 0
          ? totalEarnedCost
          : Number((hourlyDue + (uniqueDays * (totalMonthlySalary > 0 ? totalMonthlySalary / 30 : 0)) + totalCommissions).toFixed(2));

        const jobRoleDue = Number((totalDue - hourlyDue - totalCommissions).toFixed(2));

        if (emp.phone) {
          await sendMonthlyPayrollToN8n({
            employeeName: emp.name,
            employeeCode: emp.employeeCode,
            employeePhone: emp.phone,
            month: targetMonth,
            totalHours,
            hoursFormatted,
            totalDays: uniqueDays,
            hourlyRate,
            hourlyDue,
            monthlySalary: totalMonthlySalary,
            jobRoleDue: Math.max(0, jobRoleDue),
            totalCommissions,
            totalDue
          }, targetUrl);
          sentCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `تم إرسال كشوفات رواتب شهر (${targetMonth}) لـ ${sentCount} موظف بنجاح! 🟢`,
        count: sentCount
      });
    }

    if (action === 'ARRIVED_AT_LOCATION') {
      const employeeId = body.employeeId;
      if (!employeeId) {
        return NextResponse.json({ success: false, error: 'معرف الموظف مطلوب' }, { status: 400 });
      }

      const emp = await prisma.user.findUnique({ where: { id: employeeId } });
      if (!emp || !emp.phone) {
        return NextResponse.json({ success: false, error: 'الموظف غير موجود أو ليس لديه رقم هاتف' }, { status: 404 });
      }

      // Check anti-spam: 2 hours interval
      const lastSent = lastArrivalAlertTimestamps.get(emp.id) || 0;
      const now = Date.now();
      if (now - lastSent < 2 * 60 * 60 * 1000) {
        return NextResponse.json({ success: true, message: 'تم إرسال تذكير الوصول مسبقاً', skipped: true });
      }

      lastArrivalAlertTimestamps.set(emp.id, now);
      await sendArrivalReminderToN8n({
        name: emp.name,
        code: emp.employeeCode,
        phone: emp.phone
      }, targetUrl);

      return NextResponse.json({
        success: true,
        message: `تم إرسال رسالة تذكير الوصول للصيدلية إلى واتساب الموظف (${emp.name}) بنجاح! 🟢`
      });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling whatsapp webhook action:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في معالجة طلب واتساب' }, { status: 500 });
  }
}
