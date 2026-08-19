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

import bcrypt from 'bcryptjs';

// POST: إنشاء نشاط تجاري جديد مع باقة اشتراك وتوليد بيئة العمل وحساب المدير فوراً
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      slug,
      logo,
      planId,
      managerName,
      managerPhone,
      phone,
      managerEmployeeCode,
      managerPinCode,
      billingCycle,
      amountPaid
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'اسم النشاط والنطاق الفرعي مطلوبان' },
        { status: 400 }
      );
    }

    // تحقق من عدم تكرار الـ slug
    const cleanSlug = slug.toLowerCase().trim();
    const existing = await prisma.tenant.findUnique({
      where: { slug: cleanSlug },
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

    const tenantId = crypto.randomUUID();
    const empCode = String(managerEmployeeCode || '101').trim();
    const rawPin = String(managerPinCode || '1234').trim();
    const hashedPin = await bcrypt.hash(rawPin, 10);

    const newTenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name,
        slug: cleanSlug,
        logo: logo || null,
        planId: planId || null,
        managerName: managerName || 'مدير النشاط',
        managerPhone: managerPhone || phone || '',
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

    // 1. إنشاء الأقسام الافتراضية للنشاط الجديد
    const adminDeptId = crypto.randomUUID();
    await prisma.department.createMany({
      data: [
        {
          id: adminDeptId,
          name: 'الإدارة العامة',
          description: 'إدارة وتسيير أعمال النشاط التجاري',
          tenantId: tenantId,
        },
        {
          id: crypto.randomUUID(),
          name: 'الصيادلة والتشغيل',
          description: 'فريق العمليات والصرف والمبيعات',
          tenantId: tenantId,
        },
      ],
    }).catch(() => {});

    // 2. إنشاء حساب المدير الأساسي للنشاط الجديد
    const managerUserId = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id: managerUserId,
        employeeCode: empCode,
        password: hashedPin,
        name: managerName ? String(managerName).trim() : 'مدير النشاط',
        phone: managerPhone || phone || '',
        role: 'ADMIN',
        tenantId: tenantId,
        departments: {
          connect: { id: adminDeptId },
        },
      },
    }).catch((err) => {
      console.warn('Could not create default admin user:', err.message);
    });

    return NextResponse.json({
      success: true,
      tenant: newTenant,
      credentials: {
        employeeCode: empCode,
        pinCode: rawPin,
        url: `https://${cleanSlug}.mtapp.ly`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: تحديث بيانات ورابط وشعار نشاط تجاري قائم
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, slug, customDomain, logo, planId, managerName, managerPhone, phone, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف النشاط التجاري مطلوب' },
        { status: 400 }
      );
    }

    if (slug) {
      const cleanSlug = slug.toLowerCase().trim();
      const existing = await prisma.tenant.findFirst({
        where: { slug: cleanSlug, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'هذا الرابط / النطاق الفرعي مستخدم بالفعل من قبل نشاط تجاري آخر' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug: slug.toLowerCase().trim() }),
        ...(customDomain !== undefined && { customDomain: customDomain ? customDomain.trim().toLowerCase() : null }),
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
