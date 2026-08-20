import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '@/lib/auditLogger';

// POST: Self-Service Tenant Registration with 14-Day Free Trial
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      slug,
      managerName,
      managerPhone,
      email,
      password,
      businessType // "PHARMACY" | "FIELD_SERVICE" | "COMPANY"
    } = body;

    if (!companyName || !slug || !managerName || !password) {
      return NextResponse.json({ success: false, error: 'يرجى استكمال كافة الحقول الإلزامية' }, { status: 400 });
    }

    const cleanSlug = String(slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (!cleanSlug || cleanSlug.length < 2) {
      return NextResponse.json({ success: false, error: 'النطاق الفرعي يجب أن يحتوي على أحرف وأرقام إنجليزية فقط' }, { status: 400 });
    }

    // Check slug collision
    const existing = await prisma.tenant.findUnique({
      where: { slug: cleanSlug }
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'هذا النطاق الفرعي محجوز بالفعل، يرجى اختيار اسم آخر' }, { status: 400 });
    }

    const tenantId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);

    // 14-day trial end date
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Find default plan or create
    let defaultPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true }
    });

    const isPharmacy = businessType === 'PHARMACY';

    // Create Tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: companyName.trim(),
        slug: cleanSlug,
        status: 'TRIAL',
        hasClinicalCapsule: isPharmacy,
        hasInventory: isPharmacy,
        hasPurchases: isPharmacy,
        planId: defaultPlan?.id || null
      }
    });

    // 1. Create Default Department
    const adminDept = await prisma.department.create({
      data: {
        id: crypto.randomUUID(),
        name: `الإدارة العامة (${cleanSlug})`,
        code: 'MGMT',
        tenantId
      }
    });

    // 2. Create Admin User
    const adminEmail = email ? String(email).trim().toLowerCase() : `admin-${cleanSlug}-${Date.now()}@mtapp.ly`;
    const adminUser = await prisma.user.create({
      data: {
        tenantId,
        name: managerName.trim(),
        employeeCode: `${cleanSlug}-101`,
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        jobTitle: 'مدير المنشأة',
        phone: managerPhone ? String(managerPhone).trim() : null,
        departments: {
          connect: { id: adminDept.id }
        }
      }
    });

    // Create Default Company Settings
    await (prisma.companySettings as any).create({
      data: {
        id: `settings-${tenantId}`,
        tenantId,
        companyName: companyName.trim(),
        n8nWebhookUrl: 'https://n8n.ordermt.ly/webhook/attendance-alert',
        managerPhone: managerPhone ? String(managerPhone).trim() : '',
        whatsappGroupName: companyName.trim(),
        autoCloseHours: 12.0,
        openShiftReminderHours: 8.0,
        gpsEnabled: false
      }
    });

    // Create Trial Subscription
    if (defaultPlan) {
      await prisma.subscription.create({
        data: {
          tenantId,
          planId: defaultPlan.id,
          billingCycle: 'MONTHLY',
          startDate: new Date(),
          endDate: trialEndDate,
          amountPaid: 0.0,
          paymentMethod: 'FREE_TRIAL',
          isActive: true,
          notes: 'تجربة مجانية لمدة 14 يوماً'
        }
      });
    }

    await logAuditEvent({
      tenantId,
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'SELF_SERVICE_SIGNUP',
      entity: 'Tenant',
      entityId: tenantId,
      details: {
        slug: cleanSlug,
        companyName,
        trialEndDate: trialEndDate.toISOString()
      },
      req
    });

    return NextResponse.json({
      success: true,
      message: '🎉 تم إنشاء بيئة العمل والتجربة المجانية بنجاح!',
      tenantUrl: `https://${cleanSlug}.mtapp.ly/login`,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إنشاء الحساب' }, { status: 500 });
  }
}
