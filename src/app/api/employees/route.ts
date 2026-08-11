import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialUsers } from '@/lib/data-store';
import { User } from '@/lib/types';

let memoryUsers: User[] = [...initialUsers];

// Helper to sync initial users into PostgreSQL if empty
async function getOrSeedUsers(): Promise<User[]> {
  try {
    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' }
    });

    if (dbUsers.length > 0) {
      return dbUsers.map((u) => ({
        id: u.id,
        employeeCode: u.employeeCode,
        pinCode: u.password || '1234',
        name: u.name,
        role: u.role as any,
        hourlyRate: u.hourlyRate,
        jobTitle: u.jobTitle
      }));
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
          jobTitle: u.jobTitle || 'موظف'
        }
      });
    }

    return initialUsers;
  } catch (err) {
    console.error('PostgreSQL connection fallback:', err);
    return memoryUsers;
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
    const { name, employeeCode, pinCode, hourlyRate, role, jobTitle } = body;

    if (!name || !employeeCode) {
      return NextResponse.json({ success: false, error: 'الاسم ورقم الموظف مطلوبان' }, { status: 400 });
    }

    const codeStr = String(employeeCode).trim();
    const pinStr = String(pinCode || '1234').trim();
    const nameStr = String(name).trim();

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
          hourlyRate: Number(hourlyRate) || 50,
          jobTitle: jobTitle || 'صيدلي / موظف'
        }
      });
    } catch (dbErr) {
      // Memory fallback
      const newUser: User = {
        id: `usr-${Date.now()}`,
        employeeCode: codeStr,
        pinCode: pinStr,
        name: nameStr,
        role: role || 'EMPLOYEE',
        hourlyRate: Number(hourlyRate) || 50,
        jobTitle: jobTitle || 'موظف'
      };
      memoryUsers.push(newUser);
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
    const { id, name, employeeCode, pinCode, hourlyRate, role, jobTitle } = body;

    const codeStr = employeeCode ? String(employeeCode).trim() : undefined;
    const pinStr = pinCode ? String(pinCode).trim() : undefined;
    const nameStr = name ? String(name).trim() : undefined;

    try {
      await prisma.user.update({
        where: { id },
        data: {
          ...(nameStr && { name: nameStr }),
          ...(codeStr && { employeeCode: codeStr }),
          ...(pinStr && { password: pinStr }),
          ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
          ...(role && { role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE' }),
          ...(jobTitle && { jobTitle })
        }
      });
    } catch (dbErr) {
      const u = memoryUsers.find((x) => x.id === id);
      if (u) {
        if (nameStr) u.name = nameStr;
        if (codeStr) u.employeeCode = codeStr;
        if (pinStr) u.pinCode = pinStr;
        if (hourlyRate !== undefined) u.hourlyRate = Number(hourlyRate);
      }
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

    try {
      const target = await prisma.user.findUnique({ where: { id } });
      if (target?.role === 'ADMIN') {
        return NextResponse.json({ success: false, error: 'يمنع حذف حساب المدير الرئيسي' }, { status: 400 });
      }
      await prisma.user.delete({ where: { id } });
    } catch (dbErr) {
      const idx = memoryUsers.findIndex((x) => x.id === id);
      if (idx !== -1 && memoryUsers[idx].role !== 'ADMIN') {
        memoryUsers.splice(idx, 1);
      }
    }

    const allUsers = await getOrSeedUsers();
    return NextResponse.json({ success: true, users: allUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في حذف الموظف' }, { status: 500 });
  }
}
