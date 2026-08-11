import { NextRequest, NextResponse } from 'next/server';
import { initialAttendanceRecords, initialUsers } from '@/lib/data-store';
import { AttendanceRecord } from '@/lib/types';

let recordsStore: AttendanceRecord[] = [...initialAttendanceRecords];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (userId) {
    const filtered = recordsStore.filter((r) => r.userId === userId);
    return NextResponse.json({ success: true, records: filtered });
  }

  return NextResponse.json({ success: true, records: recordsStore });
}

// 1. Check-in (تسجيل الحضور)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userName, employeeCode, checkInTime, date } = body;

    if (!userId || !checkInTime) {
      return NextResponse.json({ success: false, error: 'بيانات الحضور غير مكتملة' }, { status: 400 });
    }

    const todayDate = date || new Date().toISOString().split('T')[0];

    // Check if employee is already checked in and not checked out
    const active = recordsStore.find((r) => r.userId === userId && !r.checkOutTime && r.date === todayDate);
    if (active) {
      return NextResponse.json({ success: false, error: 'تم تسجيل الحضور بالفعل لم تنصرف بعد' }, { status: 400 });
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId,
      userName: userName || 'موظف',
      employeeCode: employeeCode || '101',
      date: todayDate,
      checkInTime,
      checkOutTime: null,
      workHours: 0,
      earnedCost: 0,
      isVerified: false,
      createdAt: `${todayDate} ${checkInTime}`
    };

    recordsStore.unshift(newRecord);
    return NextResponse.json({ success: true, record: newRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تسجيل الحضور' }, { status: 500 });
  }
}

// 2. Check-out (تسجيل الانصراف)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId, checkOutTime } = body;

    const record = recordsStore.find((r) => r.id === recordId);
    if (!record) {
      return NextResponse.json({ success: false, error: 'سجل الحضور غير موجود' }, { status: 404 });
    }

    const user = initialUsers.find((u) => u.id === record.userId);
    const hourlyRate = user?.hourlyRate || 50;

    // Calculate hours worked
    const [inH, inM] = record.checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);

    let startMins = inH * 60 + inM;
    let endMins = outH * 60 + outM;

    if (endMins < startMins) {
      endMins += 24 * 60; // Overnight shift
    }

    const diffHours = Number(((endMins - startMins) / 60).toFixed(2));
    const earnedCost = Number((diffHours * hourlyRate).toFixed(2));

    record.checkOutTime = checkOutTime;
    record.workHours = diffHours;
    record.earnedCost = earnedCost;

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تسجيل الانصراف' }, { status: 500 });
  }
}

// 3. Admin Actions: Verify or Edit Check-in/out Times (توثيق الحضور وتعديل الساعات)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, recordId, checkInTime, checkOutTime } = body;

    const record = recordsStore.find((r) => r.id === recordId);
    if (!record) {
      return NextResponse.json({ success: false, error: 'السجل غير موجود' }, { status: 404 });
    }

    if (action === 'VERIFY') {
      record.isVerified = true;
      record.verifiedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      return NextResponse.json({ success: true, message: 'تم توثيق الحضور بنجاح', record });
    }

    if (action === 'EDIT_TIME') {
      if (checkInTime) record.checkInTime = checkInTime;
      if (checkOutTime !== undefined) record.checkOutTime = checkOutTime;

      // Recalculate hours & cost
      if (record.checkInTime && record.checkOutTime) {
        const user = initialUsers.find((u) => u.id === record.userId);
        const hourlyRate = user?.hourlyRate || 50;

        const [inH, inM] = record.checkInTime.split(':').map(Number);
        const [outH, outM] = record.checkOutTime.split(':').map(Number);

        let startMins = inH * 60 + inM;
        let endMins = outH * 60 + outM;
        if (endMins < startMins) endMins += 24 * 60;

        record.workHours = Number(((endMins - startMins) / 60).toFixed(2));
        record.earnedCost = Number((record.workHours * hourlyRate).toFixed(2));
      }

      return NextResponse.json({ success: true, message: 'تم تعديل وقت الحضور والانصراف بنجاح', record });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في معالجة طلب المدير' }, { status: 500 });
  }
}
