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

// POST: إنشاء نشاط تجاري جديد مع باقة اشتراك
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, planId, managerName, managerPhone, phone, billingCycle, amountPaid } = body;

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
        name,
        slug: slug.toLowerCase().trim(),
        planId: planId || null,
        managerName: managerName || '',
        managerPhone: managerPhone || '',
        phone: phone || '',
        status: 'ACTIVE',
        subscriptions: planId
          ? {
              create: {
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
