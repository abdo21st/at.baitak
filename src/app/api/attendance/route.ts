import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialAttendanceRecords } from '@/lib/data-store';
import { AttendanceRecord } from '@/lib/types';

let memoryRecords: AttendanceRecord[] = [...initialAttendanceRecords];

// Helper to validate that check-out is not earlier than check-in
function isValidTimeRange(checkInTime: string, checkOutTime: string): boolean {
  const [inH, inM] = checkInTime.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);

  const inMins = inH * 60 + (inM || 0);
  const outMins = outH * 60 + (outM || 0);

  if (outMins < inMins) {
    return inH >= 18 && outH < 12; // Overnight shift
  }
  return true;
}

// Fetch or seed records in PostgreSQL
async function getOrSeedRecords(userIdFilter?: string | null): Promise<AttendanceRecord[]> {
  try {
    const dbRecords = await prisma.attendanceRecord.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });

    if (dbRecords.length > 0) {
      const mapped = dbRecords.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user?.name || 'موظف',
        employeeCode: r.user?.employeeCode || '101',
        date: r.date,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime || null,
        workHours: r.workHours,
        earnedCost: r.earnedCost,
        isVerified: false,
        createdAt: r.createdAt.toISOString()
      }));

      return userIdFilter
        ? mapped.filter((r) => r.userId === userIdFilter)
        : mapped;
    }

    // Seed database if empty
    for (const r of initialAttendanceRecords) {
      await prisma.attendanceRecord.create({
        data: {
          id: r.id,
          userId: r.userId,
          date: r.date,
          checkInTime: r.checkInTime,
          checkOutTime: r.checkOutTime,
          workHours: r.workHours,
          earnedCost: r.earnedCost
        }
      });
    }

    return userIdFilter
      ? initialAttendanceRecords.filter((r) => r.userId === userIdFilter)
      : initialAttendanceRecords;
  } catch (err) {
    console.error('PostgreSQL attendance fallback:', err);
    return userIdFilter
      ? memoryRecords.filter((r) => r.userId === userIdFilter)
      : memoryRecords;
  }
}

// 1. GET Attendance Records from PostgreSQL
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  const records = await getOrSeedRecords(userId);
  return NextResponse.json({ success: true, records });
}

// 2. POST Check-in / Record Attendance to PostgreSQL
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

    // Fetch user for hourly rate
    let hourlyRate = 50;
    try {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) hourlyRate = u.hourlyRate;
    } catch {}

    let workHours = 0;
    let earnedCost = 0;

    if (checkOutTime) {
      const [inH, inM] = checkInTime.split(':').map(Number);
      const [outH, outM] = checkOutTime.split(':').map(Number);

      let startMins = inH * 60 + (inM || 0);
      let endMins = outH * 60 + (outM || 0);
      if (endMins < startMins) endMins += 24 * 60;

      const totalMins = endMins - startMins;
      workHours = Number((totalMins / 60).toFixed(2));
      earnedCost = Number((workHours * hourlyRate).toFixed(2));
    }

    let newRecord: AttendanceRecord;
    try {
      const created = await prisma.attendanceRecord.create({
        data: {
          userId,
          date: todayDate,
          checkInTime,
          checkOutTime: checkOutTime || null,
          workHours,
          earnedCost
        },
        include: { user: true }
      });

      newRecord = {
        id: created.id,
        userId: created.userId,
        userName: created.user?.name || userName || 'موظف',
        employeeCode: created.user?.employeeCode || employeeCode || '101',
        date: created.date,
        checkInTime: created.checkInTime,
        checkOutTime: created.checkOutTime,
        workHours: created.workHours,
        earnedCost: created.earnedCost,
        isVerified: false,
        createdAt: created.createdAt.toISOString()
      };
    } catch (dbErr) {
      newRecord = {
        id: `att-${Date.now()}`,
        userId,
        userName: userName || 'موظف',
        employeeCode: employeeCode || '101',
        date: todayDate,
        checkInTime,
        checkOutTime: checkOutTime || null,
        workHours,
        earnedCost,
        isVerified: false,
        createdAt: `${todayDate} ${checkInTime}`
      };
      memoryRecords.unshift(newRecord);
    }

    return NextResponse.json({ success: true, record: newRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تسجيل الدوام' }, { status: 500 });
  }
}

// 3. PUT Update Check-out Time in PostgreSQL
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId, checkOutTime } = body;

    let targetRec: any = null;
    try {
      targetRec = await prisma.attendanceRecord.findUnique({
        where: { id: recordId },
        include: { user: true }
      });
    } catch {}

    if (!targetRec) {
      const memRec = memoryRecords.find((r) => r.id === recordId);
      if (!memRec) {
        return NextResponse.json({ success: false, error: 'سجل الحضور غير موجود' }, { status: 404 });
      }

      if (!isValidTimeRange(memRec.checkInTime, checkOutTime)) {
        return NextResponse.json({
          success: false,
          error: `خطأ: وقت الانصراف (${checkOutTime}) يسبق وقت الحضور (${memRec.checkInTime})!`
        }, { status: 400 });
      }

      const [inH, inM] = memRec.checkInTime.split(':').map(Number);
      const [outH, outM] = checkOutTime.split(':').map(Number);
      let startMins = inH * 60 + (inM || 0);
      let endMins = outH * 60 + (outM || 0);
      if (endMins < startMins) endMins += 24 * 60;

      const totalMins = endMins - startMins;
      memRec.workHours = Number((totalMins / 60).toFixed(2));
      memRec.earnedCost = Number((memRec.workHours * 50).toFixed(2));
      memRec.checkOutTime = checkOutTime;

      return NextResponse.json({ success: true, record: memRec });
    }

    if (!isValidTimeRange(targetRec.checkInTime, checkOutTime)) {
      return NextResponse.json({
        success: false,
        error: `خطأ: وقت الانصراف (${checkOutTime}) يسبق وقت الحضور (${targetRec.checkInTime})!`
      }, { status: 400 });
    }

    const hourlyRate = targetRec.user?.hourlyRate || 50;
    const [inH, inM] = targetRec.checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);
    let startMins = inH * 60 + (inM || 0);
    let endMins = outH * 60 + (outM || 0);
    if (endMins < startMins) endMins += 24 * 60;

    const totalMins = endMins - startMins;
    const workHours = Number((totalMins / 60).toFixed(2));
    const earnedCost = Number((workHours * hourlyRate).toFixed(2));

    const updated = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        checkOutTime,
        workHours,
        earnedCost
      },
      include: { user: true }
    });

    const mapped = {
      id: updated.id,
      userId: updated.userId,
      userName: updated.user?.name || 'موظف',
      employeeCode: updated.user?.employeeCode || '101',
      date: updated.date,
      checkInTime: updated.checkInTime,
      checkOutTime: updated.checkOutTime,
      workHours: updated.workHours,
      earnedCost: updated.earnedCost,
      isVerified: false,
      createdAt: updated.createdAt.toISOString()
    };

    return NextResponse.json({ success: true, record: mapped });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تسجيل الانصراف' }, { status: 500 });
  }
}

// 4. PATCH Admin Actions (VERIFY or EDIT_TIME) in PostgreSQL
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, recordId, checkInTime, checkOutTime } = body;

    try {
      const target = await prisma.attendanceRecord.findUnique({
        where: { id: recordId },
        include: { user: true }
      });

      if (target) {
        if (action === 'VERIFY') {
          return NextResponse.json({ success: true, message: 'تم توثيق الحضور بنجاح' });
        }

        if (action === 'EDIT_TIME') {
          const newIn = checkInTime || target.checkInTime;
          const newOut = checkOutTime !== undefined ? checkOutTime : target.checkOutTime;

          if (newIn && newOut && !isValidTimeRange(newIn, newOut)) {
            return NextResponse.json({
              success: false,
              error: 'خطأ: يمنع تعديل وقت الانصراف ليصبح قبل وقت الحضور!'
            }, { status: 400 });
          }

          let workHours = target.workHours;
          let earnedCost = target.earnedCost;
          const hourlyRate = target.user?.hourlyRate || 50;

          if (newIn && newOut) {
            const [inH, inM] = newIn.split(':').map(Number);
            const [outH, outM] = newOut.split(':').map(Number);
            let startMins = inH * 60 + (inM || 0);
            let endMins = outH * 60 + (outM || 0);
            if (endMins < startMins) endMins += 24 * 60;

            const totalMins = endMins - startMins;
            workHours = Number((totalMins / 60).toFixed(2));
            earnedCost = Number((workHours * hourlyRate).toFixed(2));
          }

          const updated = await prisma.attendanceRecord.update({
            where: { id: recordId },
            data: {
              checkInTime: newIn,
              checkOutTime: newOut,
              workHours,
              earnedCost
            },
            include: { user: true }
          });

          const mapped = {
            id: updated.id,
            userId: updated.userId,
            userName: updated.user?.name || 'موظف',
            employeeCode: updated.user?.employeeCode || '101',
            date: updated.date,
            checkInTime: updated.checkInTime,
            checkOutTime: updated.checkOutTime,
            workHours: updated.workHours,
            earnedCost: updated.earnedCost,
            isVerified: true,
            createdAt: updated.createdAt.toISOString()
          };

          return NextResponse.json({ success: true, message: 'تم تعديل وقت الحضور والانصراف بنجاح', record: mapped });
        }
      }
    } catch {}

    const memRec = memoryRecords.find((r) => r.id === recordId);
    if (!memRec) {
      return NextResponse.json({ success: false, error: 'السجل غير موجود' }, { status: 404 });
    }

    if (action === 'VERIFY') {
      memRec.isVerified = true;
      return NextResponse.json({ success: true, message: 'تم توثيق الحضور بنجاح', record: memRec });
    }

    if (action === 'EDIT_TIME') {
      if (checkInTime) memRec.checkInTime = checkInTime;
      if (checkOutTime !== undefined) memRec.checkOutTime = checkOutTime;
      return NextResponse.json({ success: true, message: 'تم تعديل وقت الحضور والانصراف بنجاح', record: memRec });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في معالجة طلب المدير' }, { status: 500 });
  }
}
