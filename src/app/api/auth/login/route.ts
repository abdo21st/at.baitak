import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/login
 * مقارنة PIN الموظف بشكل آمن على الـ server-side
 * يدعم كلا الوضعين: PIN مشفر (bcrypt) وPIN نص صريح (للمستخدمين القدامى مع ترقية تلقائية)
 */
export async function POST(req: NextRequest) {
  try {
    const { employeeCode, pinCode } = await req.json();

    if (!employeeCode || !pinCode) {
      return NextResponse.json({ success: false, error: 'بيانات الدخول غير مكتملة' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { employeeCode: String(employeeCode).trim() },
      include: { departments: true, jobRoles: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'رقم الموظف أو الرقم السري غير صحيح' }, { status: 401 });
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
      if (isValid) {
        // ترقية PIN إلى bcrypt للأمان
        const hashed = await bcrypt.hash(inputPin, 10);
        await prisma.user.update({ where: { id: user.id }, data: { password: hashed } }).catch(() => {});
      }
    }

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'رقم الموظف أو الرقم السري غير صحيح' }, { status: 401 });
    }

    // إعداد بيانات المستخدم للإرجاع
    const assignedRoles = user.jobRoles || [];
    const assignedDeps = user.departments || [];
    const primaryRole = assignedRoles[0];

    const userData = {
      id: user.id,
      employeeCode: user.employeeCode,
      pinCode: inputPin, // نُرجع الـ PIN الأصلي للـ client فقط في الجلسة
      name: user.name,
      role: user.role,
      phone: user.phone || null,
      hourlyRate: user.hourlyRate || 0,
      jobTitle: assignedRoles.length > 0 ? assignedRoles.map(r => r.title).join(' + ') : 'بدون وظيفة',
      departments: assignedDeps,
      departmentNames: assignedDeps.map(d => d.name),
      jobRoles: assignedRoles,
      jobRoleIds: assignedRoles.map(r => r.id),
      jobRoleTitles: assignedRoles.map(r => r.title),
      jobRoleId: primaryRole?.id,
      jobRoleTitle: primaryRole?.title,
      monthlySalary: assignedRoles.reduce((s, r) => s + r.monthlySalary, 0),
      targetMonthlyHours: primaryRole?.targetMonthlyHours || 0,
      isHourly: primaryRole ? primaryRole.isHourly !== false : true
    };

    return NextResponse.json({ success: true, user: userData });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 });
  }
}
