import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';

export const dynamic = 'force-dynamic';

// 1. GET Projects / Tasks
export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'OPEN' | 'CLOSED' | null (all)

    const whereClause: any = { tenantId };
    if (status && (status === 'OPEN' || status === 'CLOSED')) {
      whereClause.status = status;
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        attendances: {
          select: {
            id: true,
            userId: true,
            workHours: true,
            earnedCost: true,
            date: true,
            checkInTime: true,
            checkOutTime: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // OPEN first
        { createdAt: 'desc' }
      ]
    });

    const mapped = projects.map((p) => {
      const totalHours = Number(p.attendances.reduce((sum, a) => sum + (a.workHours || 0), 0).toFixed(2));
      const totalCost = Number(p.attendances.reduce((sum, a) => sum + (a.earnedCost || 0), 0).toFixed(2));
      const uniqueEmployees = new Set(p.attendances.map((a) => a.userId));

      return {
        id: p.id,
        tenantId: p.tenantId,
        name: p.name,
        description: p.description,
        clientName: p.clientName,
        hourlyRate: p.hourlyRate,
        budgetHours: p.budgetHours,
        color: p.color,
        status: p.status,
        openedAt: p.openedAt?.toISOString() || p.createdAt.toISOString(),
        closedAt: p.closedAt ? p.closedAt.toISOString() : null,
        totalHours,
        totalCost,
        attendanceCount: p.attendances.length,
        activeEmployeesCount: uniqueEmployees.size,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString()
      };
    });

    return NextResponse.json({ success: true, projects: mapped });
  } catch (error: any) {
    console.error('Projects GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في جلب المهام والمشاريع' }, { status: 500 });
  }
}

// 2. POST Create New Task / Project
export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { name, description, clientName, hourlyRate, budgetHours, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'اسم المهمة أو المشروع مطلوب' }, { status: 400 });
    }

    const created = await prisma.project.create({
      data: {
        tenantId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        clientName: clientName ? String(clientName).trim() : null,
        hourlyRate: Number(hourlyRate) || 0.0,
        budgetHours: Number(budgetHours) || 0.0,
        color: color || '#0284c7',
        status: 'OPEN',
        openedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `تم فتح وإنشاء المهمة (${created.name}) بنجاح! 🚀`,
      project: created
    });
  } catch (error: any) {
    console.error('Projects POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إنشاء المهمة' }, { status: 500 });
  }
}

// 3. PUT Update Task / Toggle Close or Open
export async function PUT(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { id, action, status, name, description, clientName, hourlyRate, budgetHours, color } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف المهمة مطلوب' }, { status: 400 });
    }

    const existing = await prisma.project.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'المهمة غير موجودة' }, { status: 404 });
    }

    // Action A: Close or Reopen Task
    if (action === 'CLOSE_TASK' || status === 'CLOSED') {
      const updated = await prisma.project.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date()
        }
      });
      return NextResponse.json({
        success: true,
        message: `تم إغلاق المهمة (${updated.name}) بنجاح. ستبقى مسجلة في السجل ولن يتمكن أي موظف من تسجيل الحضور عليها 🔒`,
        project: updated
      });
    }

    if (action === 'OPEN_TASK' || status === 'OPEN') {
      const updated = await prisma.project.update({
        where: { id },
        data: {
          status: 'OPEN',
          closedAt: null
        }
      });
      return NextResponse.json({
        success: true,
        message: `تمت إعادة فتح المهمة (${updated.name}) بنجاح ومتاحة لتسجيل الموظفين 🟢`,
        project: updated
      });
    }

    // Action B: General Edit
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(description !== undefined && { description: String(description).trim() }),
        ...(clientName !== undefined && { clientName: String(clientName).trim() }),
        ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) || 0.0 }),
        ...(budgetHours !== undefined && { budgetHours: Number(budgetHours) || 0.0 }),
        ...(color !== undefined && { color: String(color) })
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات المهمة بنجاح',
      project: updated
    });
  } catch (error: any) {
    console.error('Projects PUT error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تحديث المهمة' }, { status: 500 });
  }
}

// 4. DELETE Project
export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف المهمة مطلوب' }, { status: 400 });
    }

    const existing = await prisma.project.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { attendances: true } } }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'المهمة غير موجودة' }, { status: 404 });
    }

    if (existing._count.attendances > 0) {
      // If attendances exist, automatically close the task instead of deleting to preserve payroll history
      await prisma.project.update({
        where: { id },
        data: { status: 'CLOSED', closedAt: new Date() }
      });
      return NextResponse.json({
        success: true,
        message: 'تم إغلاق وأرشفة المهمة بنجاح حفاظاً على سجلات ساعات عمل الموظفين والرواتب المستحقة 🔒'
      });
    }

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'تم حذف المهمة بنجاح' });
  } catch (error: any) {
    console.error('Projects DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في حذف المهمة' }, { status: 500 });
  }
}
