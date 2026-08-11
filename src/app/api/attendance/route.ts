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

// Helper to validate that check-out is not earlier than check-in (unless overnight late evening -> early morning)
function isValidTimeRange(checkInTime: string, checkOutTime: string): boolean {
  const [inH, inM] = checkInTime.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);

  const inMins = inH * 60 + (inM || 0);
  const outMins = outH * 60 + (outM || 0);

  if (outMins < inMins) {
    // Valid only if check-in is late evening (>= 18:00) and check-out is early morning (< 12:00)
    return inH >= 18 && outH < 12;
  }
  return true;
}

// 1. Create or Record Attendance
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userName, employeeCode, checkInTime, checkOutTime, date } = body;

    if (!userId || !checkInTime) {
      return NextResponse.json({ success: false, error: 'بيانات الحضور غير مكتملة' }, { status: 400 });
    }

    if (checkOutTime && !isValidTimeRange(checkInTime, checkOutTime)) {
      return NextResponse.json({
        success: false,
        error: 'خطأ: يمنع تسجيل وقت الانصراف قبل وقت الحضور!'
      }, { status: 400 });
    }

    const todayDate = date || new Date().toISOString().split('T')[0];
    const user = initialUsers.find((u) => u.id === userId);
    const hourlyRate = user?.hourlyRate || 50;

    let workHours = 0;
    let earnedCost = 0;

    if (checkOutTime) {
      const [inH, inM] = checkInTime.split(':').map(Number);
      const [outH, outM] = checkOutTime.split(':').map(Number);

      let startMins = inH * 60 + (inM || 0);
      let endMins = outH * 60 + (outM || 0);

      if (endMins < startMins) endMins += 24 * 60; // Overnight shift

      const totalMins = endMins - startMins;
      workHours = Number((totalMins / 60).toFixed(2));
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

// 2. Update Check-out Time (حساب الساعات والدقائق بدقة 2 أرقام عشرية)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId, checkOutTime } = body;

    const record = recordsStore.find((r) => r.id === recordId);
    if (!record) {
      return NextResponse.json({ success: false, error: 'سجل الحضور غير موجود' }, { status: 404 });
    }

    if (!isValidTimeRange(record.checkInTime, checkOutTime)) {
      return NextResponse.json({
        success: false,
        error: `خطأ: وقت الانصراف (${checkOutTime}) يسبق وقت الحضور (${record.checkInTime})!`
      }, { status: 400 });
    }

    const user = initialUsers.find((u) => u.id === record.userId);
    const hourlyRate = user?.hourlyRate || 50;

    const [inH, inM] = record.checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);

    let startMins = inH * 60 + (inM || 0);
    let endMins = outH * 60 + (outM || 0);
    if (endMins < startMins) endMins += 24 * 60;

    const totalMins = endMins - startMins;
    const diffHours = Number((totalMins / 60).toFixed(2));
    const earnedCost = Number((diffHours * hourlyRate).toFixed(2));

    record.checkOutTime = checkOutTime;
    record.workHours = diffHours;
    record.earnedCost = earnedCost;

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تسجيل الانصراف' }, { status: 500 });
  }
}

// 3. Admin Actions: Verify or Edit Check-in/out Times
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
      const newIn = checkInTime || record.checkInTime;
      const newOut = checkOutTime !== undefined ? checkOutTime : record.checkOutTime;

      if (newIn && newOut && !isValidTimeRange(newIn, newOut)) {
        return NextResponse.json({
          success: false,
          error: 'خطأ: يمنع تعديل وقت الانصراف ليصبح قبل وقت الحضور!'
        }, { status: 400 });
      }

      if (checkInTime) record.checkInTime = checkInTime;
      if (checkOutTime !== undefined) record.checkOutTime = checkOutTime;

      if (record.checkInTime && record.checkOutTime) {
        const user = initialUsers.find((u) => u.id === record.userId);
        const hourlyRate = user?.hourlyRate || 50;

        const [inH, inM] = record.checkInTime.split(':').map(Number);
        const [outH, outM] = record.checkOutTime.split(':').map(Number);

        let startMins = inH * 60 + (inM || 0);
        let endMins = outH * 60 + (outM || 0);
        if (endMins < startMins) endMins += 24 * 60;

        const totalMins = endMins - startMins;
        record.workHours = Number((totalMins / 60).toFixed(2));
        record.earnedCost = Number((record.workHours * hourlyRate).toFixed(2));
      }

      return NextResponse.json({ success: true, message: 'تم تعديل وقت الحضور والانصراف بنجاح', record });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في معالجة طلب المدير' }, { status: 500 });
  }
}
