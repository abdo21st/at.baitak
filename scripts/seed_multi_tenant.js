const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Multi-Tenant Initialization Seed...');

  // 1. Create or upsert Standard Subscription Plans
  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'BASIC' },
    update: {},
    create: {
      name: 'الباقة الأساسية',
      code: 'BASIC',
      description: 'مناسبة للأنشطة الناشئة والصيدليات الفردية',
      priceMonthly: 150.0, // 150 د.ل شهرياً
      priceYearly: 1500.0,
      maxEmployees: 10,
      maxBranches: 1,
      maxProducts: 2000,
      hasAdvancedOcr: false,
      hasWhatsAppAlerts: false,
      hasInventoryPredict: false
    }
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'PRO' },
    update: {},
    create: {
      name: 'الباقة الاحترافية',
      code: 'PRO',
      description: 'للصيدليات والشركات المتوسطة مع ميزات الذكاء الاصطناعي',
      priceMonthly: 350.0, // 350 د.ل شهرياً
      priceYearly: 3500.0,
      maxEmployees: 35,
      maxBranches: 3,
      maxProducts: 10000,
      hasAdvancedOcr: true,
      hasWhatsAppAlerts: true,
      hasInventoryPredict: true
    }
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'ENTERPRISE' },
    update: {},
    create: {
      name: 'باقة المؤسسات والشبكات',
      code: 'ENTERPRISE',
      description: 'للشركات الكبرى وسلاسل الفروع غير المحدودة',
      priceMonthly: 750.0, // 750 د.ل شهرياً
      priceYearly: 7500.0,
      maxEmployees: 999,
      maxBranches: 99,
      maxProducts: 100000,
      hasAdvancedOcr: true,
      hasWhatsAppAlerts: true,
      hasInventoryPredict: true
    }
  });

  console.log('✅ Subscription Plans initialized: BASIC, PRO, ENTERPRISE');

  // 2. Create Default Tenant for "صيدلية بيتك"
  const defaultTenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {
      name: 'صيدلية بيتك',
      slug: 'baytak',
      planId: proPlan.id,
      status: 'ACTIVE'
    },
    create: {
      id: 'default-tenant',
      name: 'صيدلية بيتك',
      slug: 'baytak',
      status: 'ACTIVE',
      planId: proPlan.id,
      managerName: 'إدارة صيدلية بيتك',
      managerPhone: ''
    }
  });

  console.log('✅ Default Tenant initialized:', defaultTenant.name);

  // 3. Create initial active subscription for Default Tenant
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  // Check if subscription already exists to avoid duplication
  const existingSub = await prisma.subscription.findFirst({
    where: { tenantId: defaultTenant.id }
  });

  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        tenantId: defaultTenant.id,
        planId: proPlan.id,
        billingCycle: 'YEARLY',
        startDate: new Date(),
        endDate: nextYear,
        amountPaid: 3500.0,
        paymentMethod: 'CASH',
        referenceNumber: 'SUB-BAYTAK-2026',
        isActive: true,
        notes: 'اشتراك سنوي نشط - صيدلية بيتك'
      }
    });
  }

  console.log('🎉 Multi-Tenant initialization complete for صيدلية بيتك!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
