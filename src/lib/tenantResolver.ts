import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface ResolvedTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  customDomain?: string | null;
  status: string;
  hasClinicalCapsule: boolean;
  hasInventory: boolean;
  hasPurchases: boolean;
}

/**
 * Resolve active Tenant details from request headers (x-forwarded-host, host, x-tenant-slug)
 */
export async function resolveTenant(req: NextRequest): Promise<ResolvedTenant> {
  const hostHeader = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase().trim();
  const injectedSlug = (req.headers.get('x-tenant-slug') || '').toLowerCase().trim();

  // 1. Determine target slug
  let targetSlug = '';
  if (injectedSlug) {
    targetSlug = injectedSlug;
  } else if (hostHeader.endsWith('.mtapp.ly')) {
    const sub = hostHeader.replace('.mtapp.ly', '').trim();
    if (sub === 'at.baitak' || sub === 'baitak') {
      targetSlug = 'baytak';
    } else if (sub === 'at') {
      targetSlug = 'super-admin';
    } else {
      targetSlug = sub;
    }
  }

  // 2. Query tenant from database
  if (targetSlug && targetSlug !== 'super-admin') {
    const isBaytakVariant = targetSlug === 'baytak' || targetSlug === 'baitak' || targetSlug === 'at.baitak' || targetSlug === 'at.baytak';

    const slugConditions: any[] = isBaytakVariant ? [
      { id: 'default-tenant' },
      { slug: 'at.baitak' },
      { slug: 'baytak' },
      { slug: 'baitak' },
      { slug: 'at.baytak' }
    ] : [
      { slug: targetSlug },
      { slug: targetSlug.replace(/^at\./, '') },
      { slug: `at.${targetSlug}` },
    ];
    if (hostHeader && hostHeader !== 'localhost' && !hostHeader.includes('127.0.0.1') && !hostHeader.endsWith('.mtapp.ly')) {
      slugConditions.push({ customDomain: hostHeader }, { customDomain: `https://${hostHeader}` });
    }

    let tenant = await prisma.tenant.findFirst({
      where: {
        OR: slugConditions,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        customDomain: true,
        status: true,
        hasClinicalCapsule: true,
        hasInventory: true,
        hasPurchases: true,
      },
    });

    if (tenant) return tenant;

    // Strict Tenant Isolation: Auto-create requested tenant if not in DB to prevent leaking default-tenant data
    try {
      tenant = await prisma.tenant.create({
        data: {
          name: `نشاط ${targetSlug}`,
          slug: targetSlug,
          status: 'ACTIVE',
          hasClinicalCapsule: false,
          hasInventory: false,
          hasPurchases: false,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          customDomain: true,
          status: true,
          hasClinicalCapsule: true,
          hasInventory: true,
          hasPurchases: true,
        },
      });
      if (tenant) return tenant;
    } catch {
      // Return isolated in-memory identifier
      return {
        id: `tenant-${targetSlug}`,
        name: `نشاط ${targetSlug}`,
        slug: targetSlug,
        logo: null,
        customDomain: null,
        status: 'ACTIVE',
        hasClinicalCapsule: false,
        hasInventory: false,
        hasPurchases: false,
      };
    }
  }

  // 3. Fallback to default tenant (Baytak Pharmacy) - Auto-seed in DB if missing
  let defaultTenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { id: 'default-tenant' },
        { slug: 'baytak' },
        { slug: 'at.baitak' },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      customDomain: true,
      status: true,
      hasClinicalCapsule: true,
      hasInventory: true,
      hasPurchases: true,
    },
  });

  if (!defaultTenant) {
    try {
      defaultTenant = await prisma.tenant.upsert({
        where: { id: 'default-tenant' },
        update: {},
        create: {
          id: 'default-tenant',
          name: 'صيدلية بيتك',
          slug: 'baytak',
          status: 'ACTIVE',
          hasClinicalCapsule: true,
          hasInventory: true,
          hasPurchases: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          customDomain: true,
          status: true,
          hasClinicalCapsule: true,
          hasInventory: true,
          hasPurchases: true,
        },
      });
    } catch {
      // Fallback in case of DB read-only
    }
  }

  return defaultTenant || {
    id: 'default-tenant',
    name: 'صيدلية بيتك',
    slug: 'baytak',
    logo: null,
    customDomain: null,
    status: 'ACTIVE',
    hasClinicalCapsule: true,
    hasInventory: true,
    hasPurchases: true,
  };
}

export async function resolveTenantId(req: NextRequest): Promise<string> {
  const tenant = await resolveTenant(req);
  return tenant.id;
}
