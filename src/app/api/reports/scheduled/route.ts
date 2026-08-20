import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// POST: Trigger or Dispatch Scheduled Management Report via WhatsApp / Webhook
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json().catch(() => ({}));
    const reportType = body.reportType || 'DAILY_SUMMARY'; // "DAILY_SUMMARY" | "WEEKLY_PAYROLL" | "MONTHLY_FINANCIAL"

    const today = new Date().toISOString().substring(0, 10);
    const [attendances, settings] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { date: today, user: { tenantId: tenant.id } },
        include: { user: true }
      }),
      prisma.companySettings.findFirst({ where: { tenantId: tenant.id } })
    ]);

    const totalHours = attendances.reduce((acc, a) => acc + (a.workHours || 0), 0);
    const totalWage = attendances.reduce((acc, a) => acc + (a.earnedCost || 0), 0);

    const reportMessage = `📊 *تقرير العمليات والدوام اليومي المجدول*
🏢 *المنشأة:* ${tenant.name}
📅 *التاريخ:* ${today}
━━━━━━━━━━━━━━━━━━
👥 *عدد الحاضرين:* ${attendances.length} موظف
⏱️ *إجمالي ساعات العمل:* ${totalHours.toFixed(1)} ساعة
💰 *إجمالي مستحقات اليوم:* ${totalWage.toFixed(2)} د.ل
━━━━━━━━━━━━━━━━━━
✅ تم إصدار التقرير تلقائياً بواسطة منظومة حضورك الذكية.`;

    // Forward to WhatsApp / n8n Webhook if configured
    let dispatchedToWhatsApp = false;
    if (settings?.n8nWebhookUrl) {
      try {
        await fetch(settings.n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenant.id,
            tenantName: tenant.name,
            eventType: 'SCHEDULED_MANAGEMENT_REPORT',
            reportType,
            message: reportMessage,
            recipientPhone: settings.managerPhone || settings.whatsappGroupJid,
            timestamp: new Date().toISOString()
          })
        });
        dispatchedToWhatsApp = true;
      } catch (err) {
        console.error('Webhook dispatch failed:', err);
      }
    }

    await logAuditEvent({
      tenantId: tenant.id,
      action: 'DISPATCH_SCHEDULED_REPORT',
      entity: 'Report',
      details: { reportType, date: today, dispatchedToWhatsApp },
      req
    });

    return NextResponse.json({
      success: true,
      message: '✅ تم تجهيز وإرسال التقرير الدوري المجدول بنجاح!',
      reportMessage,
      dispatchedToWhatsApp
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
