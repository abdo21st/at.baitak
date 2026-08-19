import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialUsers } from '@/lib/data-store';
import { User } from '@/lib/types';
import bcrypt from 'bcryptjs';
import { resolveTenantId } from '@/lib/tenantResolver';

// Helper to sync initial users into PostgreSQL if empty for default tenant
async function getOrSeedUsers(tenantId?: string): Promise<User[]> {
  try {
    const targetTenantId = tenantId || 'default-tenant';
    const dbUsers = await prisma.user.findMany({
      where: { tenantId: targetTenantId },
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
          pinCode: (u.password && (u.password.startsWith('$2b$') || u.password.startsWith('$2a$'))) ? '••••' : (u.password || '••••'),
          name: u.name,
          role: u.role as any,
          phone: u.phone || null,
          hourlyRate: u.hourlyRate || 0,
          jobTitle: hasRoles ? jobRoleTitles.join(' + ') : (u.jobTitle || 'بدون وظيفة خاصة'),
          departments: assignedDeps,
          departmentNames: departmentNames.length > 0 ? departmentNames : ['غير محدد'],
          jobRoles: assignedRoles,
          jobRoleIds: assignedRoles.map((r) => r.id),
          jobRoleTitles: jobRoleTitles,
          jobRoleId: primaryRole?.id,
          jobRoleTitle: primaryRole?.title,
          monthlySalary: hasRoles ? assignedRoles.reduce((sum, r) => sum + r.monthlySalary, 0) : (u.monthlySalary || 0),
          targetMonthlyHours: primaryRole?.targetMonthlyHours || u.targetMonthlyHours || 0,
          isHourly: primaryRole ? primaryRole.isHourly !== false : true
        };
      });
    }

    // Seed only if default-tenant is completely empty
    if (targetTenantId === 'default-tenant') {
      for (const u of initialUsers) {
        const hashedPin = await bcrypt.hash(u.pinCode, 10);
        await prisma.user.create({
          data: {
            id: u.id,
            tenantId: 'default-tenant',
            employeeCode: u.employeeCode,
            name: u.name,
            email: `${u.employeeCode}@hodoork.ly`,
            password: hashedPin,
            role: u.role as any,
            hourlyRate: u.hourlyRate,
            monthlySalary: 0,
            targetMonthlyHours: 0,
            jobTitle: u.jobTitle || 'موظف'
          }
        }).catch(() => {});
      }
      return initialUsers;
    }

    return [];
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    return [];
  }
}

// 1. GET Employees filtered by Tenant
export async function GET(req: NextRequest) {
  const tenantId = await resolveTenantId(req);
  const users = await getOrSeedUsers(tenantId);
  return NextResponse.json({ success: true, users });
}

// 2. POST Add New Employee to PostgreSQL
export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { name, employeeCode, pinCode, hourlyRate, role, jobTitle, departmentId, jobRoleId, departmentIds, jobRoleIds, monthlySalary, targetMonthlyHours, phone } = body;

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
    let finalTargetHours = Number(targetMonthlyHours) || 0;
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

    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId,
        employeeCode: codeStr,
      }
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'رقم الموظف مستخدم بالفعل في هذا النشاط' }, { status: 400 });
    }

    // تشفير PIN بـ bcrypt قبل الحفظ
    const hashedPin = await bcrypt.hash(pinStr, 10);

    await prisma.user.create({
      data: {
        tenantId,
        employeeCode: codeStr,
        name: nameStr,
        phone: phone ? String(phone).trim() : null,
        email: `${codeStr}-${tenantId.slice(0, 6)}-${Date.now()}@hodoork.ly`,
        password: hashedPin,
        role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
        monthlySalary: finalMonthlySalary,
        targetMonthlyHours: finalTargetHours,
        hourlyRate: finalHourlyRate,
        jobTitle: finalJobTitle,
        departments: { connect: depIds.map((id) => ({ id })) },
        jobRoles: { connect: roleIds.map((id) => ({ id })) }
      }
    });

    const allUsers = await getOrSeedUsers(tenantId);
    return NextResponse.json({ success: true, users: allUsers });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إضافة الموظف' }, { status: 500 });
  }
}

// 3. PUT Edit Employee in PostgreSQL
export async function PUT(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { id, name, employeeCode, pinCode, hourlyRate, role, jobTitle, departmentId, jobRoleId, departmentIds, jobRoleIds, monthlySalary, targetMonthlyHours, phone } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الموظف مطلوب' }, { status: 400 });
    }

    const codeStr = employeeCode ? String(employeeCode).trim() : undefined;
    const nameStr = name ? String(name).trim() : undefined;

    // Check duplicate code
    if (codeStr) {
      const duplicate = await prisma.user.findFirst({
        where: {
          tenantId,
          employeeCode: codeStr,
          NOT: { id }
        }
      });
      if (duplicate) {
        return NextResponse.json({ success: false, error: 'رقم الموظف مستخدم بالفعل لموظف آخر' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (nameStr) updateData.name = nameStr;
    if (codeStr) updateData.employeeCode = codeStr;
    if (hourlyRate !== undefined) updateData.hourlyRate = Number(hourlyRate) || 0;
    if (role) updateData.role = role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;

    if (pinCode && String(pinCode).trim().length > 0 && String(pinCode).trim() !== '••••') {
      updateData.password = await bcrypt.hash(String(pinCode).trim(), 10);
    }

    const depIds: string[] = Array.isArray(departmentIds) ? departmentIds : (departmentId ? [departmentId] : []);
    const roleIds: string[] = Array.isArray(jobRoleIds) ? jobRoleIds : (jobRoleId ? [jobRoleId] : []);

    let finalMonthlySalary = monthlySalary !== undefined ? Number(monthlySalary) : undefined;
    let finalTargetHours = targetMonthlyHours !== undefined ? Number(targetMonthlyHours) : undefined;
    let finalJobTitle = jobTitle;

    if (roleIds.length > 0) {
      try {
        const dbRoles = await prisma.jobRole.findMany({ where: { id: { in: roleIds } } });
        if (dbRoles.length > 0) {
          if (finalMonthlySalary === undefined) {
            finalMonthlySalary = dbRoles.reduce((sum, r) => sum + r.monthlySalary, 0);
          }
          if (finalTargetHours === undefined) {
            finalTargetHours = dbRoles[0].targetMonthlyHours || 0;
          }
          finalJobTitle = dbRoles.map((r) => r.title).join(' + ');
        }
      } catch {}
    }

    if (finalMonthlySalary !== undefined) updateData.monthlySalary = finalMonthlySalary;
    if (finalTargetHours !== undefined) updateData.targetMonthlyHours = finalTargetHours;
    if (finalJobTitle) updateData.jobTitle = finalJobTitle;

    if (depIds.length > 0) {
      updateData.departments = { set: depIds.map((dId) => ({ id: dId })) };
    }
    if (roleIds.length > 0) {
      updateData.jobRoles = { set: roleIds.map((rId) => ({ id: rId })) };
    }

    await prisma.user.update({
      where: { id },
      data: updateData
    });

    const allUsers = await getOrSeedUsers(tenantId);
    return NextResponse.json({ success: true, users: allUsers });
  } catch (error: any) {
    console.error('Update user error:', error);
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
