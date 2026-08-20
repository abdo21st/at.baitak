import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// POST: Initialize Libyan Online Payment (Sadad, Moamalat, Tadawul, T-Pay) or Bank Transfer
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json();
    const { planId, billingCycle, gateway, referenceNumber, amount } = body;

    if (!planId) {
      return NextResponse.json({ success: false, error: 'يرجى تحديد باقة الاشتراك' }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return NextResponse.json({ success: false, error: 'الباقة المحددة غير موجودة' }, { status: 404 });
    }

    const cycle = billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
    const calculatedAmount = amount || (cycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly);

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (cycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create / Record Subscription
    const subscription = await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        billingCycle: cycle,
        startDate,
        endDate,
        amountPaid: calculatedAmount,
        paymentMethod: gateway || 'SADAD',
        referenceNumber: referenceNumber || `PAY-${Date.now().toString().slice(-8)}`,
        isActive: true
      }
    });

    // Update Tenant Status to ACTIVE
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'ACTIVE',
        planId: plan.id
      }
    });

    await logAuditEvent({
      tenantId: tenant.id,
      action: 'PAYMENT_SUBSCRIPTION_RENEWAL',
      entity: 'Subscription',
      entityId: subscription.id,
      details: {
        gateway,
        billingCycle: cycle,
        amountPaid: calculatedAmount,
        currency: 'LYD (د.ل)'
      },
      req
    });

    return NextResponse.json({
      success: true,
      message: `تم تجديد وتفعيل الاشتراك بنجاح عبر ${gateway || 'الدفع الإلكتروني'} بقيمة ${calculatedAmount} د.ل! 💳`,
      subscription
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
