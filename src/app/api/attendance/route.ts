import { NextRequest, NextResponse } from 'next/server';
import { initialAttendanceRecords, initialProjects, initialUsers } from '@/lib/data-store';
import { AttendanceRecord, Attachment } from '@/lib/types';
import { triggerN8nWebhook } from '@/lib/n8n';

let attendanceStore: AttendanceRecord[] = [...initialAttendanceRecords];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const date = searchParams.get('date');

  if (userId && date) {
    const record = attendanceStore.find((r) => r.userId === userId && r.date === date && !r.checkOutTime) || null;
    return NextResponse.json({ success: true, record });
  }

  if (userId) {
    const records = attendanceStore.filter((r) => r.userId === userId);
    return NextResponse.json({ success: true, records });
  }

  return NextResponse.json({ success: true, records: attendanceStore });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userName, employeeCode, date, checkInTime, projectId, projectName, taskNotes, method, attachments } = body;

    if (!userId || !checkInTime) {
      return NextResponse.json({ success: false, error: 'جميع البيانات مطلوبة لتسجيل بدء العمل' }, { status: 400 });
    }

    // Check active uncompleted session
    const activeSession = attendanceStore.find((r) => r.userId === userId && !r.checkOutTime);
    if (activeSession) {
      return NextResponse.json({ success: false, error: 'لديك جلسة عمل جارية حالياً، يرجى إنهاؤها أولاً' }, { status: 400 });
    }

    const proj = initialProjects.find((p) => p.id === projectId);
    const user = initialUsers.find((u) => u.id === userId);

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId,
      userName: userName || user?.name || 'الموظف',
      employeeCode: employeeCode || user?.employeeCode || 'EMP',
      date: date || new Date().toISOString().split('T')[0],
      checkInTime,
      checkOutTime: null,
      workHours: 0,
      earnedCost: 0,
      projectId: projectId || undefined,
      projectName: projectName || proj?.name || undefined,
      taskNotes: taskNotes || undefined,
      attachments: attachments || [],
      method: method || 'QUICK',
      createdAt: `${date || new Date().toISOString().split('T')[0]} ${checkInTime}`
    };

    attendanceStore.unshift(newRecord);

    // Trigger n8n Webhook alert
    triggerN8nWebhook('CLOCK_IN', {
      employeeName: newRecord.userName,
      employeeCode: newRecord.employeeCode,
      checkInTime,
      projectName: newRecord.projectName || 'دوام حر',
      notes: taskNotes
    });

    return NextResponse.json({ success: true, record: newRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في بدء العمل' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId, checkOutTime, taskNotes, newAttachment } = body;

    if (!recordId || !checkOutTime) {
      return NextResponse.json({ success: false, error: 'بيانات إنهاء العمل غير مكتملة' }, { status: 400 });
    }

    const index = attendanceStore.findIndex((r) => r.id === recordId);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'سجل الجلسة غير موجود' }, { status: 404 });
    }

    const rec = attendanceStore[index];
    const user = initialUsers.find((u) => u.id === rec.userId);
    const proj = initialProjects.find((p) => p.id === rec.projectId);

    // Calculate worked hours (Decimal format)
    const [hIn, mIn, sIn] = rec.checkInTime.split(':').map(Number);
    const [hOut, mOut, sOut] = checkOutTime.split(':').map(Number);

    const inTotalSecs = hIn * 3600 + mIn * 60 + (sIn || 0);
    const outTotalSecs = hOut * 3600 + mOut * 60 + (sOut || 0);

    const diffSecs = Math.max(0, outTotalSecs - inTotalSecs);
    const workHours = Number((diffSecs / 3600).toFixed(2));

    // Hourly rate calculation precedence: Project hourly rate -> User base rate -> 50 LYD default
    const effectiveRate = proj?.hourlyRate || user?.hourlyRate || 50.0;
    const earnedCost = Number((workHours * effectiveRate).toFixed(2));

    const updatedAttachments = newAttachment
      ? [...(rec.attachments || []), newAttachment]
      : rec.attachments || [];

    const updatedRecord: AttendanceRecord = {
      ...rec,
      checkOutTime,
      workHours,
      earnedCost,
      taskNotes: taskNotes !== undefined ? taskNotes : rec.taskNotes,
      attachments: updatedAttachments
    };

    attendanceStore[index] = updatedRecord;

    // Trigger n8n Webhook alert for session completion and WhatsApp update
    triggerN8nWebhook('CLOCK_OUT', {
      employeeName: updatedRecord.userName,
      employeeCode: updatedRecord.employeeCode,
      employeePhone: user?.phone,
      checkInTime: updatedRecord.checkInTime,
      checkOutTime,
      workHours,
      earnedCost,
      projectName: updatedRecord.projectName || 'دوام حر',
      taskNotes: updatedRecord.taskNotes
    });

    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إنهاء العمل' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    attendanceStore = attendanceStore.filter((r) => r.id !== id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false, error: 'المعرف غير موجود' }, { status: 400 });
}
