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

// 1. Create or Record Attendance (حفظ أو تسجيل وقت الحضور والانصراف يدويًا أو تلقائيًا)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userName, employeeCode, checkInTime, checkOutTime, date } = body;

    if (!userId || !checkInTime) {
      return NextResponse.json({ success: false, error: 'بيانات الحضور غير مكتملة' }, { status: 400 });
    }

    const todayDate = date || new Date().toISOString().split('T')[0];
    const user = initialUsers.find((u) => u.id === userId);
    const hourlyRate = user?.hourlyRate || 50;

    let workHours = 0;
    let earnedCost = 0;

    // Calculate work hours & earned cost if checkOutTime is provided
    if (checkOutTime) {
      const [inH, inM] = checkInTime.split(':').map(Number);
      const [outH, outM] = checkOutTime.split(':').map(Number);

      let startMins = inH * 60 + inM;
      let endMins = outH * 60 + outM;

      if (endMins < startMins) endMins += 24 * 60; // Overnight shift

      workHours = Number(((endMins - startMins) / 60).toFixed(2));
      earnedCost = Number((workHours * hourlyRate).toFixed(2));
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId,
      userName: userName || user?.name || 'موظف',
      employeeCode: employeeCode || user?.employeeCode || '101',
      date: todayDate,
      checkInTime,
      checkOutTime: checkOutTime || null,
      workHours,
      earnedCost,
      isVerified: false,
      createdAt: `${todayDate} ${checkInTime}`
    };

    recordsStore.unshift(newRecord);
    return NextResponse.json({ success: true, record: newRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تسجيل الدوام' }, { status: 500 });
  }
}

// 2. Update Check-out Time (تسجيل وقت الانصراف)
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

    const [inH, inM] = record.checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);

    let startMins = inH * 60 + inM;
    let endMins = outH * 60 + outM;
    if (endMins < startMins) endMins += 24 * 60;

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
