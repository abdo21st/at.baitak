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
    if (sub === 'at' || sub === 'admin' || sub === '') {
      targetSlug = 'super-admin';
    } else if (sub === 'at.baitak' || sub === 'baitak' || sub === 'baytak' || sub === 'at.baytak') {
      targetSlug = 'baytak';
    } else if (sub === 'at.mt' || sub === 'mt' || sub === 'at.madar' || sub === 'madar') {
      targetSlug = 'madar';
    } else if (sub === 'alnaqaa' || sub === 'at.alnaqaa' || sub === 'naqaa' || sub === 'at.naqaa') {
      targetSlug = 'alnaqaa';
    } else {
      targetSlug = sub.startsWith('at.') ? sub.replace(/^at\./, '') : sub;
    }
  }

  // 2. Query tenant from database
  if (targetSlug && targetSlug !== 'super-admin') {
    const isBaytakVariant = targetSlug === 'baytak' || targetSlug === 'baitak' || targetSlug === 'at.baitak' || targetSlug === 'at.baytak' || targetSlug === 'default-tenant';
    const isMadarVariant = targetSlug === 'madar' || targetSlug === 'mt' || targetSlug === 'at.mt' || targetSlug === 'at.madar' || targetSlug.includes('madar') || targetSlug.includes('mt');
    const isNaqaaVariant = targetSlug === 'alnaqaa' || targetSlug === 'naqaa' || targetSlug === 'at.alnaqaa' || targetSlug === 'at.naqaa' || targetSlug.includes('naqaa');

    let slugConditions: any[] = [];
    if (isBaytakVariant) {
      slugConditions = [
        { id: 'default-tenant' },
        { slug: 'at.baitak' },
        { slug: 'baytak' },
        { slug: 'baitak' },
        { slug: 'at.baytak' },
        { name: { contains: 'بيتك', mode: 'insensitive' } }
      ];
    } else if (isMadarVariant) {
      slugConditions = [
        { slug: 'madar' },
        { slug: 'mt' },
        { slug: 'at.mt' },
        { slug: 'at.madar' },
        { slug: 'madar-tech' },
        { slug: 'at.madar-tech' },
        { slug: { contains: 'madar', mode: 'insensitive' } },
        { name: { contains: 'مدار', mode: 'insensitive' } }
      ];
    } else if (isNaqaaVariant) {
      slugConditions = [
        { slug: 'alnaqaa' },
        { slug: 'naqaa' },
        { slug: 'at.alnaqaa' },
        { slug: 'at.naqaa' },
        { name: { contains: 'النقاء', mode: 'insensitive' } }
      ];
    } else {
      slugConditions = [
        { slug: targetSlug },
        { slug: targetSlug.replace(/^at\./, '') },
        { slug: `at.${targetSlug}` },
      ];
    }
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
      const defaultName = isMadarVariant ? 'شركة مدار التقنية' : (isNaqaaVariant ? 'نشاط النقاء' : `نشاط ${targetSlug}`);
      tenant = await prisma.tenant.create({
        data: {
          name: defaultName,
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
      const fallbackName = isMadarVariant ? 'شركة مدار التقنية' : (isNaqaaVariant ? 'نشاط النقاء' : `نشاط ${targetSlug}`);
      // Return isolated in-memory identifier
      return {
        id: `tenant-${targetSlug}`,
        name: fallbackName,
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

/**
 * Generate full dynamic Application URL based on Tenant slug and Custom Domain
 */
export function getTenantAppUrl(tenant?: { slug?: string; customDomain?: string | null } | null, req?: NextRequest): string {
  if (tenant?.customDomain) {
    const cd = tenant.customDomain.replace(/^https?:\/\//, '').trim();
    return `https://${cd}`;
  }

  // Handle localhost/dev requests if req is provided
  if (req) {
    const hostHeader = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase().trim();
    if (hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1')) {
      const proto = req.headers.get('x-forwarded-proto') || 'http';
      const port = (req.headers.get('host') || '').split(':')[1];
      return `${proto}://${hostHeader}${port ? `:${port}` : ''}`;
    }
  }

  const rawSlug = tenant?.slug || 'baytak';
  const cleanSlug = rawSlug.trim().toLowerCase();

  if (cleanSlug === 'super-admin' || cleanSlug === 'admin') {
    return 'https://at.mtapp.ly';
  }

  if (cleanSlug === 'baytak' || cleanSlug === 'baitak' || cleanSlug === 'at.baitak' || cleanSlug === 'default-tenant') {
    return 'https://at.baitak.mtapp.ly';
  }

  if (cleanSlug === 'madar' || cleanSlug === 'mt' || cleanSlug === 'at.mt' || cleanSlug === 'at.madar') {
    return 'https://at.mt.mtapp.ly';
  }

  if (cleanSlug === 'alnaqaa' || cleanSlug === 'naqaa' || cleanSlug === 'at.alnaqaa') {
    return 'https://alnaqaa.mtapp.ly';
  }

  const prefix = cleanSlug.startsWith('at.') ? cleanSlug : `at.${cleanSlug}`;
  return `https://${prefix}.mtapp.ly`;
}
