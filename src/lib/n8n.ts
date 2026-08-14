export function formatLibyanPhone(phone: string): string {
  let clean = (phone || '').replace(/[^0-9]/g, '');
  if (clean.startsWith('09')) {
    clean = '218' + clean.substring(1);
  } else if (clean.startsWith('9') && clean.length === 9) {
    clean = '218' + clean;
  }
  return clean;
}

export async function sendDirectWhatsApp(phone: string, text: string): Promise<boolean> {
  const cleanPhone = formatLibyanPhone(phone);
  if (!cleanPhone) return false;

  const chatId = `${cleanPhone}@c.us`;
  const wahaUrl = process.env.WAHA_API_URL || 'http://102.203.201.52:3008/api/sendText';

  try {
    const res = await fetch(wahaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Api-Key': process.env.WAHA_API_KEY || 'hodoork_waha_secure_2026'
      },
      body: JSON.stringify({
        session: 'default',
        chatId,
        text
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Direct WAHA WhatsApp warning:', err);
    return false;
  }
}

export async function triggerN8nWebhook(event: string, payload: Record<string, any>, webhookUrl?: string): Promise<boolean> {
  const targetUrl = webhookUrl || process.env.N8N_WEBHOOK_URL || 'http://102.203.201.52:5678/webhook/attendance-alert';

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
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
): Promise<boolean> {
  const formattedMessage = `📊 *تقرير ملخص دوام اليوم (${summary.date})*\n\n👥 *إجمالي الحاضرين:* ${summary.totalAttendees} موظف\n⏱️ *إجمالي ساعات العمل:* ${summary.totalHoursToday} ساعة\n⚠️ *تسجيلات خارج النطاق:* ${summary.outsideGpsCount}\n🔄 *شفتات لم تُغلق بعد:* ${summary.openShiftsCount}\n\n*تفاصيل الموظفين:*\n${
    summary.attendees.length > 0
      ? summary.attendees.map(a => `• *${a.name}* (${a.code}): من ${a.inTime} إلى ${a.outTime || 'جاري'} | ${a.hours}س ${a.isOutsideGps ? '⚠️(خارج GPS)' : ''}`).join('\n')
      : '• لا توجد سجلات حضور مسجلة لليوم حتى الآن.'
  }`;

  // 1. Send direct via WAHA
  if (managerPhone) {
    await sendDirectWhatsApp(managerPhone, formattedMessage);
  }

  // 2. Also trigger n8n webhook
  return triggerN8nWebhook(
    'DAILY_ATTENDANCE_DIGEST',
    {
      type: 'DAILY_DIGEST',
      managerPhone: managerPhone || '',
      summary,
      messageFormatted: formattedMessage
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
): Promise<boolean> {
  const message = `⚠️ *تنبيه حضور وانصراف*\n\nمرحباً بك *${employee.name}*،\nلقد قمت بتسجيل الدخول اليوم في الساعة *${employee.checkInTime}* ومضت أكثر من *${employee.hoursOpen} ساعة* دون تسجيل الانصراف.\nيرجى التكرم بتسجيل الانصراف لضمان دقة توثيق ساعات عملك.`;

  if (employee.phone) {
    await sendDirectWhatsApp(employee.phone, message);
  }

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
      messageFormatted: message
    },
    webhookUrl
  );
}

export async function sendTestWebhook(targetPhone?: string, webhookUrl?: string): Promise<boolean> {
  const message = `✅ *اتصال ناجح مع نظام حضورك*\n\nتم ربط واتساب و n8n Webhook بنجاح مع منظومة الدوام! 🟢\nالوقت: ${new Date().toLocaleString('ar-LY')}`;

  if (targetPhone) {
    await sendDirectWhatsApp(targetPhone, message);
  }

  return triggerN8nWebhook(
    'TEST_PING',
    {
      type: 'TEST_PING',
      targetPhone: targetPhone || '',
      message,
      sentAt: new Date().toLocaleString('ar-LY')
    },
    webhookUrl
  );
}

export async function sendMonthlyPayrollToN8n(
  payroll: {
    employeeName: string;
    employeeCode: string;
    employeePhone?: string | null;
    month: string;
    totalHours: number;
    hoursFormatted: string;
    totalDays: number;
    hourlyRate: number;
    hourlyDue: number;
    monthlySalary: number;
    jobRoleDue: number;
    totalCommissions?: number;
    totalDue: number;
  },
  webhookUrl?: string
): Promise<boolean> {
  const commLine = (payroll.totalCommissions && payroll.totalCommissions > 0)
    ? `\n🛒 *إجمالي العمولات المستحقة:* ${payroll.totalCommissions.toFixed(2)} د.ل`
    : '';

  const message = `📄 *كشف حساب الراتب وساعات الدوام الشهري*\n🏢 *نظام حضورك لتوثيق الدوام*\n━━━━━━━━━━━━━━━━━━\n👤 *الموظف:* ${payroll.employeeName} (كود: ${payroll.employeeCode})\n📅 *الشهر المستحق:* ${payroll.month}\n\n⏱️ *ساعات الدوام المنجزة:* ${payroll.hoursFormatted}\n🗓️ *أيام الحضور الفعلية:* ${payroll.totalDays} يوم\n💵 *أجر ساعات العمل:* ${payroll.hourlyDue.toFixed(2)} د.ل (${payroll.hourlyRate} د.ل/ساعة)\n💼 *بدل الوظيفة الثابت:* ${payroll.jobRoleDue.toFixed(2)} د.ل${commLine}\n━━━━━━━━━━━━━━━━━━\n💰 *صافي المستحق النهائي:* ${payroll.totalDue.toFixed(2)} د.ل\n━━━━━━━━━━━━━━━━━━\n🙏 نشكركم على جهودكم والتزامكم خلال هذا الشهر!`;

  if (payroll.employeePhone) {
    await sendDirectWhatsApp(payroll.employeePhone, message);
  }

  return triggerN8nWebhook(
    'MONTHLY_PAYROLL_DIGEST',
    {
      type: 'MONTHLY_PAYROLL',
      employeePhone: payroll.employeePhone || '',
      payroll,
      messageFormatted: message
    },
    webhookUrl
  );
}

export async function sendArrivalReminderToN8n(
  employee: {
    name: string;
    code: string;
    phone?: string | null;
  },
  webhookUrl?: string
): Promise<boolean> {
  const message = `📍 *مرحباً بك يا ${employee.name} في الصيدلية!* 🏢\n\nتم رصد وصولك لموقع العمل بنجاح 🟢\nتذكير لطيف: لا تنسَ فتح نظام حضورك وتسجيل الحضور لبدء احتساب ساعات دوامك المرن:\n👉 https://at.baitak.mtapp.ly\n\nنتمنى لك وقتاً طيباً وعملاً موفقاً! 🌿`;

  if (employee.phone) {
    await sendDirectWhatsApp(employee.phone, message);
  }

  return triggerN8nWebhook(
    'ARRIVAL_LOCATION_REMINDER',
    {
      type: 'ARRIVAL_REMINDER',
      employeePhone: employee.phone || '',
      employeeName: employee.name,
      employeeCode: employee.code,
      messageFormatted: message
    },
    webhookUrl
  );
}
