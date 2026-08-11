import { NextRequest, NextResponse } from 'next/server';
import { initialUsers } from '@/lib/data-store';
import { User } from '@/lib/types';

let usersStore: User[] = [...initialUsers];

export async function GET() {
  return NextResponse.json({ success: true, users: usersStore });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, employeeCode, jobTitle, phone, hourlyRate, targetMonthlyHours, role } = body;

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'الاسم والبريد الإلكتروني مطلوبان' }, { status: 400 });
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      employeeCode: employeeCode || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name,
      email,
      role: role || 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
      phone: phone || '',
      jobTitle: jobTitle || 'موظف',
      targetMonthlyHours: Number(targetMonthlyHours) || 160,
      hourlyRate: Number(hourlyRate) || 0.0
    };

    usersStore.push(newUser);
    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إضافة الموظف' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, employeeCode, jobTitle, phone, hourlyRate, targetMonthlyHours, role } = body;

    const index = usersStore.findIndex((u) => u.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 });
    }

    usersStore[index] = {
      ...usersStore[index],
      name: name || usersStore[index].name,
      email: email || usersStore[index].email,
      employeeCode: employeeCode || usersStore[index].employeeCode,
      jobTitle: jobTitle || usersStore[index].jobTitle,
      phone: phone !== undefined ? phone : usersStore[index].phone,
      hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : usersStore[index].hourlyRate,
      targetMonthlyHours: targetMonthlyHours !== undefined ? Number(targetMonthlyHours) : usersStore[index].targetMonthlyHours,
      role: role || usersStore[index].role
    };

    return NextResponse.json({ success: true, user: usersStore[index] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تعديل الموظف' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    usersStore = usersStore.filter((u) => u.id !== id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false, error: 'المعرف غير موجود' }, { status: 400 });
}
