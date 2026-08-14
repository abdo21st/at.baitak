import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDailyDigestToN8n, sendCheckoutReminderToN8n, sendTestWebhook } from '@/lib/n8n';

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

      const [nowH, nowM] = new Date().toTimeString().split(':').map(Number);
      const nowTotalMins = nowH * 60 + nowM;

      let sentCount = 0;
      for (const rec of openRecords) {
        const [inH, inM] = rec.checkInTime.split(':').map(Number);
        const inMins = inH * 60 + (inM || 0);
        let diffMins = nowTotalMins - inMins;
        if (diffMins < 0) diffMins += 24 * 60;
        const hoursOpen = Number((diffMins / 60).toFixed(1));

        // Trigger reminder if open for more than 4 hours
        if (hoursOpen >= 4) {
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
        message: `تم فحص الشفتات المفتوحة وإرسال ${sentCount} تنبيهات للموظفين بنجاح! 🟢`,
        count: sentCount
      });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling whatsapp webhook action:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في معالجة طلب واتساب' }, { status: 500 });
  }
}
