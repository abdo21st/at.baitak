import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';

// Default initial departments if DB is empty for default tenant
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

async function getOrSeedDepartments(tenantId?: string) {
  try {
    const targetTenantId = tenantId || 'default-tenant';
    let deps = await prisma.department.findMany({
      where: { tenantId: targetTenantId },
      include: { jobRoles: true, users: true },
      orderBy: { createdAt: 'asc' }
    });

    if (deps.length === 0 && targetTenantId === 'default-tenant') {
      // Seed default departments & roles for default-tenant only
      for (const d of initialDepartments) {
        const createdDep = await prisma.department.create({
          data: { name: d.name, tenantId: 'default-tenant' }
        }).catch(() => null);

        if (createdDep) {
          for (const r of d.roles) {
            await prisma.jobRole.create({
              data: {
                title: r.title,
                monthlySalary: r.monthlySalary,
                targetMonthlyHours: r.targetMonthlyHours,
                departmentId: createdDep.id
              }
            }).catch(() => {});
          }
        }
      }

      deps = await prisma.department.findMany({
        where: { tenantId: 'default-tenant' },
        include: { jobRoles: true, users: true },
        orderBy: { createdAt: 'asc' }
      });
    }

    return deps.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      userCount: d.users.length,
      jobRoles: d.jobRoles.map((r: any) => ({
        id: r.id,
        title: r.title,
        monthlySalary: r.monthlySalary,
        targetMonthlyHours: r.targetMonthlyHours,
        isHourly: r.isHourly !== false,
        hasCommission: Boolean(r.hasCommission),
        commissionType: r.commissionType || 'SALES',
        commissionRate: Number(r.commissionRate) || 0,
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
export async function GET(req: NextRequest) {
  const tenantId = await resolveTenantId(req);
  const departments = await getOrSeedDepartments(tenantId);
  return NextResponse.json({ success: true, departments });
}

// 2. POST Create Department or Job Role
export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { action, departmentName, departmentId, roleTitle, monthlySalary, targetMonthlyHours, isHourly, hasCommission, commissionType, commissionRate } = body;

    if (action === 'CREATE_DEPARTMENT') {
      if (!departmentName) {
        return NextResponse.json({ success: false, error: 'اسم القسم مطلوب' }, { status: 400 });
      }

      const existing = await prisma.department.findFirst({
        where: { name: String(departmentName).trim(), tenantId }
      });
      if (existing) {
        return NextResponse.json({ success: false, error: 'اسم القسم موجود بالفعل في هذا النشاط' }, { status: 400 });
      }

      await prisma.department.create({
        data: {
          name: String(departmentName).trim(),
          tenantId
        }
      });

      const updatedDeps = await getOrSeedDepartments(tenantId);
      return NextResponse.json({ success: true, departments: updatedDeps });
    }

    if (action === 'CREATE_ROLE') {
      if (!departmentId || !roleTitle) {
        return NextResponse.json({ success: false, error: 'القسم والمسمى الوظيفي مطلوبان' }, { status: 400 });
      }

      const existing = await prisma.jobRole.findFirst({
        where: { departmentId, title: String(roleTitle).trim() }
      });
      if (existing) {
        return NextResponse.json({ success: false, error: 'المسمى الوظيفي موجود بالفعل في هذا القسم' }, { status: 400 });
      }

      await prisma.jobRole.create({
        data: {
          title: String(roleTitle).trim(),
          monthlySalary: Number(monthlySalary) || 0,
          targetMonthlyHours: Number(targetMonthlyHours) || 0,
          isHourly: isHourly !== false,
          hasCommission: Boolean(hasCommission),
          commissionType: commissionType || 'SALES',
          commissionRate: Number(commissionRate) || 0,
          departmentId
        }
      });

      const updatedDeps = await getOrSeedDepartments(tenantId);
      return NextResponse.json({ success: true, departments: updatedDeps });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    console.error('Department/Role POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في العملية' }, { status: 500 });
  }
}

// 3. DELETE Department or Job Role
export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف مطلوب' }, { status: 400 });
    }

    if (action === 'DELETE_DEPARTMENT') {
      const dep = await prisma.department.findFirst({
        where: { id, tenantId }
      });
      if (!dep) {
        return NextResponse.json({ success: false, error: 'القسم غير موجود في هذا النشاط' }, { status: 404 });
      }
      await prisma.jobRole.deleteMany({ where: { departmentId: id } });
      await prisma.department.delete({ where: { id } });
      const updatedDeps = await getOrSeedDepartments(tenantId);
      return NextResponse.json({ success: true, departments: updatedDeps });
    }

    if (action === 'DELETE_ROLE') {
      const role = await prisma.jobRole.findFirst({
        where: { id, department: { tenantId } }
      });
      if (!role) {
        return NextResponse.json({ success: false, error: 'الوظيفة غير موجودة في هذا النشاط' }, { status: 404 });
      }
      await prisma.jobRole.delete({ where: { id } });
      const updatedDeps = await getOrSeedDepartments(tenantId);
      return NextResponse.json({ success: true, departments: updatedDeps });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    console.error('Department/Role DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في الحذف' }, { status: 500 });
  }
}
