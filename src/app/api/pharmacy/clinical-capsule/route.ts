import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateClinicalCapsule } from '@/lib/clinicalKnowledge';
import { fetchLiveDrugCapsule } from '@/lib/liveDrugFetcher';
import { sendDirectWhatsApp, triggerN8nWebhook, formatLibyanPhone } from '@/lib/n8n';
import { resolveTenantId } from '@/lib/tenantResolver';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'generate', product, message, targetType = 'all', departmentId, employeeIds = [], live = true } = body;

    // Action 1: Generate Clinical Capsule (with real-time live drug web lookup)
    if (action === 'generate') {
      if (!product || !product.name) {
        return NextResponse.json({ success: false, error: 'بيانات المنتج مطلوبة' }, { status: 400 });
      }
      const capsule = live ? await fetchLiveDrugCapsule(product) : generateClinicalCapsule(product);
      return NextResponse.json({ success: true, capsule });
    }

    // Action 2: Broadcast to Employees
    if (action === 'broadcast') {
      if (!message || !message.trim()) {
        return NextResponse.json({ success: false, error: 'نص الرسالة مطلوب' }, { status: 400 });
      }

      const tenantId = await resolveTenantId(req);
      const allUsers = await prisma.user.findMany({
        where: { tenantId },
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

      let sentCount = 0;
      let noPhoneCount = 0;
      let failedCount = 0;
      const results: Array<{ id: string; name: string; code: string; phone: string | null; status: 'sent' | 'no_phone' | 'failed' }> = [];

      for (const user of targetUsers) {
        if (!user.phone || !user.phone.trim()) {
          noPhoneCount++;
          results.push({ id: user.id, name: user.name, code: user.employeeCode, phone: null, status: 'no_phone' });
          continue;
        }

        const cleanPhone = formatLibyanPhone(user.phone);
        if (!cleanPhone) {
          failedCount++;
          results.push({ id: user.id, name: user.name, code: user.employeeCode, phone: user.phone, status: 'failed' });
          continue;
        }

        const personalizedMsg = message
          .replace(/{name}/g, user.name)
          .replace(/{code}/g, user.employeeCode)
          .replace(/{appUrl}/g, 'https://at.ordermt.ly');

        try {
          await sendDirectWhatsApp(cleanPhone, personalizedMsg);
          sentCount++;
          results.push({ id: user.id, name: user.name, code: user.employeeCode, phone: user.phone, status: 'sent' });
        } catch (e) {
          failedCount++;
          results.push({ id: user.id, name: user.name, code: user.employeeCode, phone: user.phone, status: 'failed' });
        }

        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      // n8n trigger
      try {
        await triggerN8nWebhook('CLINICAL_CAPSULE_SENT', {
          productName: product?.name || 'منتج دوائي',
          sentCount,
          totalTargeted: targetUsers.length
        });
      } catch (n8nErr) {}

      return NextResponse.json({
        success: true,
        summary: { total: targetUsers.length, sent: sentCount, noPhone: noPhoneCount, failed: failedCount },
        results
      });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err: any) {
    console.error('Clinical Capsule API error:', err);
    return NextResponse.json({ success: false, error: err.message || 'فشل معالجة الكبسولة الدوائية' }, { status: 500 });
  }
}
