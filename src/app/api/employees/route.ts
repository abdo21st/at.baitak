import { NextRequest, NextResponse } from 'next/server';
import { initialUsers } from '@/lib/data-store';
import { User } from '@/lib/types';

let usersStore: User[] = [...initialUsers];

// 1. Get all employees
export async function GET() {
  return NextResponse.json({ success: true, users: usersStore });
}

// 2. Add a new employee
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, employeeCode, pinCode, hourlyRate, role, jobTitle } = body;

    if (!name || !employeeCode) {
      return NextResponse.json({ success: false, error: 'الاسم ورقم الموظف مطلوبان' }, { status: 400 });
    }

    const existingCode = usersStore.find((u) => u.employeeCode === String(employeeCode).trim());
    if (existingCode) {
      return NextResponse.json({ success: false, error: 'رقم الموظف مستخدم بالفعل لموظف آخر' }, { status: 400 });
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      employeeCode: String(employeeCode).trim(),
      pinCode: String(pinCode || '1234').trim(),
      name: name.trim(),
      role: role || 'EMPLOYEE',
      hourlyRate: Number(hourlyRate) || 50,
      jobTitle: jobTitle || 'صيدلي / موظف'
    };

    usersStore.push(newUser);
    return NextResponse.json({ success: true, user: newUser, users: usersStore });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إضافة الموظف' }, { status: 500 });
  }
}

// 3. Edit existing employee
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, employeeCode, pinCode, hourlyRate, role, jobTitle } = body;

    const user = usersStore.find((u) => u.id === id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 });
    }

    // Check duplicate code if changed
    if (employeeCode && String(employeeCode).trim() !== user.employeeCode) {
      const existing = usersStore.find((u) => u.employeeCode === String(employeeCode).trim());
      if (existing) {
        return NextResponse.json({ success: false, error: 'رقم الموظف مستخدم بالفعل لموظف آخر' }, { status: 400 });
      }
      user.employeeCode = String(employeeCode).trim();
    }

    if (name) user.name = name.trim();
    if (pinCode) user.pinCode = String(pinCode).trim();
    if (hourlyRate !== undefined) user.hourlyRate = Number(hourlyRate);
    if (role) user.role = role;
    if (jobTitle) user.jobTitle = jobTitle;

    return NextResponse.json({ success: true, user, users: usersStore });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تعديل بيانات الموظف' }, { status: 500 });
  }
}

// 4. Delete employee
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الموظف مطلوب' }, { status: 400 });
    }

    const index = usersStore.findIndex((u) => u.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 });
    }

    // Prohibit deleting system admin
    if (usersStore[index].role === 'ADMIN') {
      return NextResponse.json({ success: false, error: 'يمنع حذف حساب المدير الرئيسي' }, { status: 400 });
    }

    usersStore.splice(index, 1);
    return NextResponse.json({ success: true, users: usersStore });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في حذف الموظف' }, { status: 500 });
  }
}
