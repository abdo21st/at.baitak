import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialUsers } from '@/lib/data-store';
import { User } from '@/lib/types';

// Helper to sync initial users into PostgreSQL if empty
async function getOrSeedUsers(): Promise<User[]> {
  try {
    const dbUsers = await prisma.user.findMany({
      include: { departments: true, jobRoles: true },
      orderBy: { createdAt: 'asc' }
    });

    if (dbUsers.length > 0) {
      return dbUsers.map((u) => {
        const assignedRoles = u.jobRoles || [];
        const assignedDeps = u.departments || [];

        const primaryRole = assignedRoles[0];
        const hasRoles = assignedRoles.length > 0;
        const jobRoleTitles = assignedRoles.map((r) => r.title);
        const departmentNames = assignedDeps.map((d) => d.name);

        return {
          id: u.id,
          employeeCode: u.employeeCode,
          pinCode: u.password || '1234',
          name: u.name,
          role: u.role as any,
          hourlyRate: u.hourlyRate || 0,
          jobTitle: hasRoles ? jobRoleTitles.join(' + ') : 'بدون وظيفة خاصة',
          departments: assignedDeps,
          departmentNames: departmentNames.length > 0 ? departmentNames : ['غير محدد'],
          jobRoles: assignedRoles,
          jobRoleIds: assignedRoles.map((r) => r.id),
          jobRoleTitles: jobRoleTitles,
          jobRoleId: primaryRole?.id,
          jobRoleTitle: primaryRole?.title,
          monthlySalary: hasRoles ? assignedRoles.reduce((sum, r) => sum + r.monthlySalary, 0) : 0,
          targetMonthlyHours: primaryRole?.targetMonthlyHours || 160,
          isHourly: primaryRole ? primaryRole.isHourly !== false : true
        };
      });
    }

    // Seed database
    for (const u of initialUsers) {
      await prisma.user.create({
        data: {
          id: u.id,
          employeeCode: u.employeeCode,
          name: u.name,
          email: `${u.employeeCode}@hodoork.ly`,
          password: u.pinCode,
          role: u.role as any,
          hourlyRate: u.hourlyRate,
          monthlySalary: u.hourlyRate * 160 || 500,
          targetMonthlyHours: 160,
          jobTitle: u.jobTitle || 'موظف'
        }
      });
    }

    return initialUsers;
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    return [];
  }
}

// 1. GET Employees
export async function GET() {
  const users = await getOrSeedUsers();
  return NextResponse.json({ success: true, users });
}

// 2. POST Add New Employee to PostgreSQL
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, employeeCode, pinCode, hourlyRate, role, jobTitle, departmentId, jobRoleId, departmentIds, jobRoleIds, monthlySalary, targetMonthlyHours } = body;

    if (!name || !employeeCode) {
      return NextResponse.json({ success: false, error: 'الاسم ورقم الموظف مطلوبان' }, { status: 400 });
    }

    const codeStr = String(employeeCode).trim();
    const pinStr = String(pinCode || '1234').trim();
    const nameStr = String(name).trim();

    // Prepare arrays of department & jobRole IDs
    const depIds: string[] = Array.isArray(departmentIds) ? departmentIds : (departmentId ? [departmentId] : []);
    const roleIds: string[] = Array.isArray(jobRoleIds) ? jobRoleIds : (jobRoleId ? [jobRoleId] : []);

    let finalMonthlySalary = 0;
    let finalTargetHours = Number(targetMonthlyHours) || 160;
    let finalJobTitle = jobTitle || 'موظف';

    if (roleIds.length > 0) {
      try {
        const jrs = await prisma.jobRole.findMany({ where: { id: { in: roleIds } } });
        if (jrs.length > 0) {
          finalMonthlySalary = jrs.reduce((sum, r) => sum + r.monthlySalary, 0);
          finalTargetHours = jrs[0].targetMonthlyHours;
          finalJobTitle = jrs.map((r) => r.title).join(' + ');
        }
      } catch {}
    }

    const finalHourlyRate = Number(hourlyRate) || 0;

    try {
      const existingUser = await prisma.user.findUnique({
        where: { employeeCode: codeStr }
      });

      if (existingUser) {
        return NextResponse.json({ success: false, error: 'رقم الموظف مستخدم بالفعل' }, { status: 400 });
      }

      await prisma.user.create({
        data: {
          employeeCode: codeStr,
          name: nameStr,
          email: `${codeStr}-${Date.now()}@hodoork.ly`,
          password: pinStr,
          role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
          monthlySalary: finalMonthlySalary,
          targetMonthlyHours: finalTargetHours,
          hourlyRate: finalHourlyRate,
          jobTitle: finalJobTitle,
          departments: { connect: depIds.map((id) => ({ id })) },
          jobRoles: { connect: roleIds.map((id) => ({ id })) }
        }
      });
    } catch (dbErr) {
      console.error('Create user error:', dbErr);
    }

    const allUsers = await getOrSeedUsers();
    return NextResponse.json({ success: true, users: allUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إضافة الموظف' }, { status: 500 });
  }
}

// 3. PUT Edit Employee in PostgreSQL
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, employeeCode, pinCode, hourlyRate, role, jobTitle, departmentId, jobRoleId, departmentIds, jobRoleIds, monthlySalary, targetMonthlyHours } = body;

    const codeStr = employeeCode ? String(employeeCode).trim() : undefined;
    const pinStr = pinCode ? String(pinCode).trim() : undefined;
    const nameStr = name ? String(name).trim() : undefined;

    const depIds: string[] | undefined = Array.isArray(departmentIds) ? departmentIds : (departmentId ? [departmentId] : undefined);
    const roleIds: string[] | undefined = Array.isArray(jobRoleIds) ? jobRoleIds : (jobRoleId ? [jobRoleId] : undefined);

    let finalMonthlySalary = monthlySalary !== undefined ? Number(monthlySalary) : undefined;
    let finalTargetHours = targetMonthlyHours !== undefined ? Number(targetMonthlyHours) : undefined;
    let finalJobTitle = jobTitle;

    if (roleIds !== undefined) {
      try {
        const jrs = await prisma.jobRole.findMany({ where: { id: { in: roleIds } } });
        finalMonthlySalary = jrs.reduce((sum, r) => sum + r.monthlySalary, 0);
        finalJobTitle = jrs.map((r) => r.title).join(' + ') || 'بدون وظيفة خاصة';
      } catch {}
    }

    try {
      await prisma.user.update({
        where: { id },
        data: {
          ...(nameStr && { name: nameStr }),
          ...(codeStr && { employeeCode: codeStr }),
          ...(pinStr && { password: pinStr }),
          ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
          ...(finalMonthlySalary !== undefined && { monthlySalary: finalMonthlySalary }),
          ...(finalTargetHours !== undefined && { targetMonthlyHours: finalTargetHours }),
          ...(role && { role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE' }),
          ...(finalJobTitle !== undefined && { jobTitle: finalJobTitle }),
          ...(depIds !== undefined && { departments: { set: depIds.map((dId) => ({ id: dId })) } }),
          ...(roleIds !== undefined && { jobRoles: { set: roleIds.map((rId) => ({ id: rId })) } })
        }
      });
    } catch (dbErr) {
      console.error('Update user error:', dbErr);
    }

    const allUsers = await getOrSeedUsers();
    return NextResponse.json({ success: true, users: allUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تعديل بيانات الموظف' }, { status: 500 });
  }
}

// 4. DELETE Employee from PostgreSQL
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الموظف مطلوب' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === 'ADMIN') {
      return NextResponse.json({ success: false, error: 'يمنع حذف حساب المدير الرئيسي' }, { status: 400 });
    }
    await prisma.user.delete({ where: { id } });

    const allUsers = await getOrSeedUsers();
    return NextResponse.json({ success: true, users: allUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في حذف الموظف' }, { status: 500 });
  }
}
