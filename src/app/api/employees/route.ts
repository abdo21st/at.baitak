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
    const { name, employeeCode, pinCode, hourlyRate, role, jobTitle } = body;

    if (!name || !employeeCode) {
      return NextResponse.json({ success: false, error: 'الاسم ورقم الموظف مطلوبان' }, { status: 400 });
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      employeeCode: String(employeeCode),
      pinCode: String(pinCode || '1234'),
      name,
      role: role || 'EMPLOYEE',
      hourlyRate: Number(hourlyRate) || 50,
      jobTitle: jobTitle || 'موظف'
    };

    usersStore.push(newUser);
    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إضافة الموظف' }, { status: 500 });
  }
}
