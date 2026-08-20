import { prisma } from '@/lib/prisma';

export interface SubscriptionStatusResult {
  allowed: boolean;
  status: 'ACTIVE' | 'TRIAL' | 'GRACE_PERIOD' | 'EXPIRED' | 'SUSPENDED';
  daysRemaining: number;
  message?: string;
}

/**
 * Checks whether a tenant's subscription is in good standing or should enter grace period / suspension
 */
export async function checkTenantSubscriptionStatus(tenantId: string): Promise<SubscriptionStatusResult> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1
        }
      }
    });

    if (!tenant) {
      return { allowed: false, status: 'EXPIRED', daysRemaining: 0, message: 'النشاط غير موجود' };
    }

    if (String(tenant.status) === 'SUSPENDED') {
      return { allowed: false, status: 'SUSPENDED', daysRemaining: 0, message: 'تم إيقاف حساب المنشأة مؤقتاً لعدم تجديد الاشتراك' };
    }

    const latestSub = tenant.subscriptions[0];
    if (!latestSub) {
      return { allowed: true, status: 'TRIAL', daysRemaining: 14 };
    }

    const now = new Date();
    const endDate = new Date(latestSub.endDate);
    const diffMs = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining > 0) {
      return {
        allowed: true,
        status: tenant.status === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
        daysRemaining
      };
    }

    // Grace Period (7 days after expiry)
    if (daysRemaining >= -7) {
      return {
        allowed: true,
        status: 'GRACE_PERIOD',
        daysRemaining: 7 + daysRemaining,
        message: `انتهت صلاحية الاشتراك. أنت الآن في فترة السماح (متبقي ${7 + daysRemaining} أيام). يرجى التجديد لتجنب إيقاف الخدمة.`
      };
    }

    // Auto-Suspend tenant if past grace period
    if (String(tenant.status) !== 'SUSPENDED') {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'EXPIRED' as any }
      });
    }

    return {
      allowed: false,
      status: 'EXPIRED',
      daysRemaining: 0,
      message: 'انتهت صلاحية الاشتراك وفترة السماح. يرجى تجديد الاشتراك لإعادة التفعيل.'
    };
  } catch (e) {
    return { allowed: true, status: 'ACTIVE', daysRemaining: 30 };
  }
}
