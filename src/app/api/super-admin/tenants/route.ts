import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: جلب كافة الأنشطة التجارية والاشتراكات
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        plan: true,
        subscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            users: true,
            pharmacyProducts: true,
            departments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      tenants,
      plans,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: إنشاء نشاط تجاري جديد مع باقة اشتراك وشعار
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, logo, planId, managerName, managerPhone, phone, billingCycle, amountPaid } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'اسم النشاط والنطاق الفرعي مطلوبان' },
        { status: 400 }
      );
    }

    // تحقق من عدم تكرار الـ slug
    const existing = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'هذا النطاق الفرعي مستخدم بالفعل' },
        { status: 400 }
      );
    }

    // حساب تاريخ نهاية الاشتراك
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const newTenant = await prisma.tenant.create({
      data: {
        id: crypto.randomUUID(),
        name,
        slug: slug.toLowerCase().trim(),
        logo: logo || null,
        planId: planId || null,
        managerName: managerName || '',
        managerPhone: managerPhone || '',
        phone: phone || '',
        status: 'ACTIVE',
        subscriptions: planId
          ? {
              create: {
                id: crypto.randomUUID(),
                planId,
                billingCycle: billingCycle || 'MONTHLY',
                startDate,
                endDate,
                amountPaid: parseFloat(amountPaid) || 0.0,
                paymentMethod: 'CASH',
                isActive: true,
                notes: 'اشتراك افتتاحي جديد',
              },
            }
          : undefined,
      },
      include: {
        plan: true,
        subscriptions: true,
      },
    });

    return NextResponse.json({
      success: true,
      tenant: newTenant,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: تحديث بيانات وشعار نشاط تجاري قائم
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, slug, logo, planId, managerName, managerPhone, phone, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف النشاط التجاري مطلوب' },
        { status: 400 }
      );
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug: slug.toLowerCase().trim() }),
        ...(logo !== undefined && { logo }),
        ...(planId !== undefined && { planId }),
        ...(managerName !== undefined && { managerName }),
        ...(managerPhone !== undefined && { managerPhone }),
        ...(phone !== undefined && { phone }),
        ...(status !== undefined && { status }),
      },
      include: {
        plan: true,
        subscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      tenant: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
