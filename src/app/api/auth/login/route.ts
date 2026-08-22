import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { resolveTenant } from '@/lib/tenantResolver';

/**
 * POST /api/auth/login
 * مقارنة PIN الموظف بشكل آمن على الـ server-side مع العزل الصارم للأنشطة
 */
export async function POST(req: NextRequest) {
  try {
    const { employeeCode, pinCode } = await req.json();

    if (!employeeCode || !pinCode) {
      return NextResponse.json(
        { success: false, error: 'رقم الموظف والرقم السري مطلوبان' },
        { status: 400 }
      );
    }

    // 1. تحديد واستخراج النشاط التجاري الحالي عبر المحرك الموحد
    const tenant = await resolveTenant(req);
    const tenantId = tenant.id;
    const inputCode = String(employeeCode).trim();
    const cleanCode = inputCode.replace(/^(madar|mt|at\.mt|at\.madar|baytak|baitak|at\.baitak|at\.baytak|alnaqaa|naqaa)-/i, '').trim();

    // 2. البحث الحصري عن الموظف داخل النشاط التجاري بدعم كافة صيغ الأرقام والأكواد (Strict Tenant Isolation)
    let user = await prisma.user.findFirst({
      where: {
        tenantId: tenantId,
        OR: [
          { employeeCode: inputCode },
          { employeeCode: cleanCode },
          { employeeCode: `${tenant.slug}-${cleanCode}` },
          { employeeCode: `${tenant.slug}-${inputCode}` },
          { employeeCode: `madar-${cleanCode}` },
          { employeeCode: `mt-${cleanCode}` },
          { employeeCode: `at.mt-${cleanCode}` },
          { employeeCode: `at.madar-${cleanCode}` },
          { employeeCode: `baytak-${cleanCode}` },
          { employeeCode: `alnaqaa-${cleanCode}` },
        ],
      },
      include: { departments: true, jobRoles: true }
    });

    // 3. مسار احتياطي ذكي للأنشطة الخاصة (مثل مدار التقنية) في حال اختلاف معرف النشاط القديم
    if (!user) {
      const isMadar = tenant.slug === 'madar' || tenant.slug === 'mt' || tenant.slug === 'at.mt' || tenant.slug === 'at.madar' || (tenant.name && tenant.name.includes('مدار'));
      if (isMadar) {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { employeeCode: inputCode },
              { employeeCode: cleanCode },
              { employeeCode: `madar-${cleanCode}` },
              { employeeCode: `mt-${cleanCode}` },
              { employeeCode: `at.mt-${cleanCode}` },
              { employeeCode: `at.madar-${cleanCode}` },
            ],
            tenant: {
              OR: [
                { slug: 'madar' },
                { slug: 'mt' },
                { slug: 'at.mt' },
                { slug: 'at.madar' },
                { name: { contains: 'مدار', mode: 'insensitive' } },
              ]
            }
          },
          include: { departments: true, jobRoles: true }
        });
      }
    }

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
      // نص صريح (مستخدم قديم) — مقارنة مباشرة ثم ترقية تلقائية لتشفير bcrypt
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
