import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default initial departments if DB is empty
const initialDepartments = [
  {
    name: 'قسم الإدارة',
    roles: [
      { title: 'مدير عام', monthlySalary: 3000, targetMonthlyHours: 160 },
      { title: 'مدير تنفيذي', monthlySalary: 2000, targetMonthlyHours: 160 }
    ]
  },
  {
    name: 'قسم المبيعات',
    roles: [
      { title: 'مسؤول مبيعات', monthlySalary: 500, targetMonthlyHours: 160 },
      { title: 'مشرف مبيعات', monthlySalary: 1200, targetMonthlyHours: 160 }
    ]
  },
  {
    name: 'قسم الصيدلة',
    roles: [
      { title: 'صيدلي أول', monthlySalary: 2500, targetMonthlyHours: 160 },
      { title: 'مساعد صيدلي', monthlySalary: 1000, targetMonthlyHours: 160 }
    ]
  }
];

async function getOrSeedDepartments() {
  try {
    let deps = await prisma.department.findMany({
      include: { jobRoles: true, users: true },
      orderBy: { createdAt: 'asc' }
    });

    if (deps.length === 0) {
      // Seed default departments & roles
      for (const d of initialDepartments) {
        const createdDep = await prisma.department.create({
          data: { name: d.name }
        });

        for (const r of d.roles) {
          await prisma.jobRole.create({
            data: {
              title: r.title,
              monthlySalary: r.monthlySalary,
              targetMonthlyHours: r.targetMonthlyHours,
              departmentId: createdDep.id
            }
          });
        }
      }

      deps = await prisma.department.findMany({
        include: { jobRoles: true, users: true },
        orderBy: { createdAt: 'asc' }
      });
    }

    return deps.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      userCount: d.users.length,
      jobRoles: d.jobRoles.map((r) => ({
        id: r.id,
        title: r.title,
        monthlySalary: r.monthlySalary,
        targetMonthlyHours: r.targetMonthlyHours,
        isHourly: r.isHourly !== false,
        departmentId: r.departmentId,
        departmentName: d.name
      }))
    }));
  } catch (err) {
    console.error('Error fetching departments:', err);
    return [];
  }
}

// 1. GET Departments & Job Roles
export async function GET() {
  const departments = await getOrSeedDepartments();
  return NextResponse.json({ success: true, departments });
}

// 2. POST Create Department or Job Role
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, departmentName, departmentId, roleTitle, monthlySalary, targetMonthlyHours, isHourly } = body;

    if (action === 'CREATE_DEPARTMENT') {
      if (!departmentName) {
        return NextResponse.json({ success: false, error: 'اسم القسم مطلوب' }, { status: 400 });
      }

      await prisma.department.create({
        data: { name: String(departmentName).trim() }
      });
    } else if (action === 'CREATE_JOB_ROLE') {
      if (!departmentId || !roleTitle) {
        return NextResponse.json({ success: false, error: 'القسم ومسمى الوظيفة مطلوبان' }, { status: 400 });
      }

      await prisma.jobRole.create({
        data: {
          title: String(roleTitle).trim(),
          monthlySalary: Number(monthlySalary) || 0,
          targetMonthlyHours: Number(targetMonthlyHours) || 0,
          isHourly: isHourly !== false,
          departmentId
        }
      });
    }

    const departments = await getOrSeedDepartments();
    return NextResponse.json({ success: true, departments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في معالجة طلب الأقسام' }, { status: 500 });
  }
}

// 3. PUT Edit Department or Job Role
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, name, title, monthlySalary, targetMonthlyHours, isHourly } = body;

    if (action === 'EDIT_DEPARTMENT') {
      await prisma.department.update({
        where: { id },
        data: { name: String(name).trim() }
      });
    } else if (action === 'EDIT_JOB_ROLE') {
      await prisma.jobRole.update({
        where: { id },
        data: {
          ...(title && { title: String(title).trim() }),
          ...(monthlySalary !== undefined && { monthlySalary: Number(monthlySalary) }),
          ...(targetMonthlyHours !== undefined && { targetMonthlyHours: Number(targetMonthlyHours) }),
          ...(isHourly !== undefined && { isHourly: Boolean(isHourly) })
        }
      });
    }

    const departments = await getOrSeedDepartments();
    return NextResponse.json({ success: true, departments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في التعديل' }, { status: 500 });
  }
}

// 4. DELETE Department or Job Role
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف مطلوب' }, { status: 400 });
    }

    if (action === 'DELETE_DEPARTMENT') {
      await prisma.department.delete({ where: { id } });
    } else if (action === 'DELETE_JOB_ROLE') {
      await prisma.jobRole.delete({ where: { id } });
    }

    const departments = await getOrSeedDepartments();
    return NextResponse.json({ success: true, departments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في الحذف' }, { status: 500 });
  }
}
