import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/login
 * مقارنة PIN الموظف بشكل آمن على الـ server-side مع العزل الصارم للأنشطة
 */
export async function POST(req: NextRequest) {
  try {
    const { employeeCode, pinCode } = await req.json();

    const hostHeader = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase().trim();
    const injectedSlug = (req.headers.get('x-tenant-slug') || '').toLowerCase().trim();

    // 1. تحديد الـ slug المستهدف
    let targetSlug = '';
    if (injectedSlug) {
      targetSlug = injectedSlug;
    } else if (hostHeader.endsWith('.mtapp.ly')) {
      const sub = hostHeader.replace('.mtapp.ly', '').trim();
      if (sub === 'at.baitak' || sub === 'baitak') {
        targetSlug = 'baytak';
      } else if (sub === 'at') {
        targetSlug = 'super-admin';
      } else {
        targetSlug = sub;
      }
    }

    // 2. البحث عن النشاط التجاري
    let tenant = null;
    if (targetSlug && targetSlug !== 'super-admin') {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { slug: targetSlug },
            { slug: targetSlug.replace(/^at\./, '') },
            { slug: `at.${targetSlug}` },
            { customDomain: hostHeader },
            { customDomain: `https://${hostHeader}` },
          ],
        },
        select: { id: true, name: true, slug: true },
      });
    }

    // افتراضي: صيدلية بيتك إذا كان الرابط هو at.baitak أو محلي
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { id: 'default-tenant' },
            { slug: 'baytak' },
            { slug: 'at.baitak' },
          ],
        },
        select: { id: true, name: true, slug: true },
      });
    }

    const tenantId = tenant?.id || 'default-tenant';
    const inputCode = String(employeeCode).trim();

    // 3. البحث الحصري عن الموظف داخل النشاط التجاري التابع لهذا الرابط فقط (Strict Tenant Isolation)
    const user = await prisma.user.findFirst({
      where: {
        tenantId: tenantId,
        OR: [
          { employeeCode: inputCode },
          { employeeCode: `${targetSlug}-${inputCode}` },
          { employeeCode: `at.mt-${inputCode}` },
        ],
      },
      include: { departments: true, jobRoles: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: `رقم الموظف (${inputCode}) غير مسجل في ${tenant?.name || 'هذا النشاط التجاري'}` },
        { status: 401 }
      );
    }

    const storedPassword = user.password || '';
    const inputPin = String(pinCode).trim();

    let isValid = false;

    if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$')) {
      // كلمة مرور مشفرة بـ bcrypt
      isValid = await bcrypt.compare(inputPin, storedPassword);
    } else {
      // نص صريح (مستخدم قديم) — مقارنة مباشرة ثم ترقية تلقائية
      isValid = storedPassword === inputPin;
      if (isValid && inputPin.length > 0) {
        const newHashed = await bcrypt.hash(inputPin, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: newHashed }
        }).catch(() => {});
      }
    }

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'الرقم السري (PIN) غير صحيح' }, { status: 401 });
    }

    // إرجاع بيانات المستخدم مع tenantId للتوثيق في الواجهة
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        employeeCode: user.employeeCode,
        name: user.name,
        role: user.role,
        phone: user.phone,
        hourlyRate: user.hourlyRate,
        jobTitle: user.jobTitle,
        tenantId: user.tenantId,
        departments: user.departments,
        departmentNames: user.departments.map(d => d.name),
        jobRoles: user.jobRoles,
        jobRoleIds: user.jobRoles.map(j => j.id),
        jobRoleTitles: user.jobRoles.map(j => j.title),
        monthlySalary: user.monthlySalary,
        targetMonthlyHours: user.targetMonthlyHours,
        isHourly: user.jobRoles?.[0]?.isHourly !== false
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
