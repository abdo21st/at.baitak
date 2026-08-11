import { NextRequest, NextResponse } from 'next/server';
import { initialLeaveRequests } from '@/lib/data-store';
import { LeaveRequest } from '@/lib/types';
import { triggerN8nWebhook } from '@/lib/n8n';

let leavesStore: LeaveRequest[] = [...initialLeaveRequests];

export async function GET() {
  return NextResponse.json({ success: true, leaves: leavesStore });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userName, type, startDate, endDate, reason } = body;

    if (!userId || !startDate || !endDate || !reason) {
      return NextResponse.json({ success: false, error: 'جميع حقول الطلب مطلوبة' }, { status: 400 });
    }

    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      userId,
      userName: userName || 'الموظف',
      type: type || 'ANNUAL',
      startDate,
      endDate,
      reason,
      status: 'PENDING',
      createdAt: new Date().toLocaleString('ar-SA')
    };

    leavesStore.unshift(newRequest);

    // Trigger n8n Webhook
    triggerN8nWebhook('LEAVE_REQUEST', {
      employeeName: newRequest.userName,
      type: newRequest.type,
      startDate,
      endDate,
      reason
    });

    return NextResponse.json({ success: true, leave: newRequest });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إرسال طلب الإجازة' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    const index = leavesStore.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'طلب الإجازة غير موجود' }, { status: 404 });
    }

    leavesStore[index].status = status;
    return NextResponse.json({ success: true, leave: leavesStore[index] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تحديث الطلب' }, { status: 500 });
  }
}
