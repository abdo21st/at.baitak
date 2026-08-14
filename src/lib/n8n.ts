export async function triggerN8nWebhook(event: string, payload: Record<string, any>, webhookUrl?: string) {
  const targetUrl = webhookUrl || process.env.N8N_WEBHOOK_URL || 'https://n8n.ordermt.ly/webhook/attendance-alert';

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...payload
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('n8n webhook dispatch warning:', err);
    return false;
  }
}

export async function sendDailyDigestToN8n(
  summary: {
    date: string;
    totalAttendees: number;
    totalHoursToday: number;
    attendees: Array<{ name: string; code: string; inTime: string; outTime: string | null; hours: number; isOutsideGps: boolean }>;
    outsideGpsCount: number;
    openShiftsCount: number;
  },
  managerPhone?: string,
  webhookUrl?: string
) {
  return triggerN8nWebhook(
    'DAILY_ATTENDANCE_DIGEST',
    {
      type: 'DAILY_DIGEST',
      managerPhone: managerPhone || '',
      summary,
      messageFormatted: `📊 *تقرير ملخص دوام اليوم (${summary.date})*\n\n👥 *إجمالي الحاضرين:* ${summary.totalAttendees} موظف\n⏱️ *إجمالي ساعات العمل:* ${summary.totalHoursToday} ساعة\n⚠️ *تسجيلات خارج النطاق:* ${summary.outsideGpsCount}\n🔄 *شفتات لم تُغلق بعد:* ${summary.openShiftsCount}\n\n*تفاصيل الموظفين:*\n${summary.attendees.map(a => `• *${a.name}* (${a.code}): من ${a.inTime} إلى ${a.outTime || 'جاري'} | ${a.hours}س ${a.isOutsideGps ? '⚠️(خارج GPS)' : ''}`).join('\n')}`
    },
    webhookUrl
  );
}

export async function sendCheckoutReminderToN8n(
  employee: {
    name: string;
    code: string;
    phone?: string | null;
    checkInTime: string;
    date: string;
    hoursOpen: number;
  },
  webhookUrl?: string
) {
  return triggerN8nWebhook(
    'CHECKOUT_REMINDER',
    {
      type: 'CHECKOUT_REMINDER',
      employeePhone: employee.phone || '',
      employeeName: employee.name,
      employeeCode: employee.code,
      checkInTime: employee.checkInTime,
      date: employee.date,
      hoursOpen: employee.hoursOpen,
      messageFormatted: `⚠️ *تنبيه حضور وانصراف*\n\nمرحباً بك *${employee.name}*،\nلقد قمت بتسجيل الدخول اليوم في الساعة *${employee.checkInTime}* ومضت أكثر من *${employee.hoursOpen} ساعة* دون تسجيل الانصراف.\nيرجى التكرم بتسجيل الانصراف لضمان دقة توثيق ساعات عملك.`
    },
    webhookUrl
  );
}

export async function sendTestWebhook(targetPhone?: string, webhookUrl?: string) {
  return triggerN8nWebhook(
    'TEST_PING',
    {
      type: 'TEST_PING',
      targetPhone: targetPhone || '',
      message: '✅ اتصال ناجح مع نظام حضورك (HodoorK Attendance System) و n8n Webhook!',
      sentAt: new Date().toLocaleString('ar-LY')
    },
    webhookUrl
  );
}
