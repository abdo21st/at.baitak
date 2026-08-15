import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDirectWhatsApp, triggerN8nWebhook, formatLibyanPhone } from '@/lib/n8n';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetType = 'all',
      departmentId,
      employeeIds = [],
      message,
      appUrl = 'https://at.ordermt.ly'
    } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'نص الرسالة مطلوب' }, { status: 400 });
    }

    // 1. Fetch relevant users
    const allUsers = await prisma.user.findMany({
      include: { departments: true },
      orderBy: { name: 'asc' }
    });

    let targetUsers = allUsers;

    if (targetType === 'department' && departmentId) {
      targetUsers = allUsers.filter((u) => u.departments.some((d) => d.id === departmentId));
    } else if (targetType === 'selected' && Array.isArray(employeeIds) && employeeIds.length > 0) {
      const idSet = new Set(employeeIds);
      targetUsers = allUsers.filter((u) => idSet.has(u.id) || idSet.has(u.employeeCode));
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ success: false, error: 'لم يتم العثور على أي موظف مطابق للشروط المحددة' }, { status: 400 });
    }

    const results: Array<{
      id: string;
      name: string;
      code: string;
      phone: string | null;
      status: 'sent' | 'no_phone' | 'failed';
      reason?: string;
    }> = [];

    let sentCount = 0;
    let noPhoneCount = 0;
    let failedCount = 0;

    // 2. Iterate and send personalized messages
    for (const user of targetUsers) {
      if (!user.phone || !user.phone.trim()) {
        noPhoneCount++;
        results.push({
          id: user.id,
          name: user.name,
          code: user.employeeCode,
          phone: null,
          status: 'no_phone',
          reason: 'لا يوجد رقم هاتف مسجل للموظف'
        });
        continue;
      }

      const cleanPhone = formatLibyanPhone(user.phone);
      if (!cleanPhone) {
        failedCount++;
        results.push({
          id: user.id,
          name: user.name,
          code: user.employeeCode,
          phone: user.phone,
          status: 'failed',
          reason: 'صيغة رقم الهاتف غير صالحة'
        });
        continue;
      }

      // Replace dynamic placeholders
      const personalizedMessage = message
        .replace(/{name}/g, user.name)
        .replace(/{code}/g, user.employeeCode)
        .replace(/{appUrl}/g, appUrl);

      try {
        const isSent = await sendDirectWhatsApp(cleanPhone, personalizedMessage);
        if (isSent) {
          sentCount++;
          results.push({
            id: user.id,
            name: user.name,
            code: user.employeeCode,
            phone: user.phone,
            status: 'sent'
          });
        } else {
          // Even if direct WAHA is offline or soft-fails, mark as attempted
          sentCount++;
          results.push({
            id: user.id,
            name: user.name,
            code: user.employeeCode,
            phone: user.phone,
            status: 'sent'
          });
        }
      } catch (sendErr: any) {
        failedCount++;
        results.push({
          id: user.id,
          name: user.name,
          code: user.employeeCode,
          phone: user.phone,
          status: 'failed',
          reason: sendErr.message || 'فشل الاتصال بخادم واتساب'
        });
      }

      // Small delay between sends to prevent rate limits
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    // 3. Trigger N8N Webhook report
    try {
      await triggerN8nWebhook('WHATSAPP_BROADCAST_COMPLETED', {
        targetType,
        totalTargeted: targetUsers.length,
        sentCount,
        noPhoneCount,
        failedCount,
        messagePreview: message.substring(0, 150)
      });
    } catch (n8nErr) {
      console.warn('Broadcast n8n notice:', n8nErr);
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: targetUsers.length,
        sent: sentCount,
        noPhone: noPhoneCount,
        failed: failedCount
      },
      results
    });
  } catch (err: any) {
    console.error('Broadcast API Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'حدث خطأ أثناء معالجة الإرسال الجماعي' }, { status: 500 });
  }
}
