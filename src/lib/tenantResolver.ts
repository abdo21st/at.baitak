import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface ResolvedTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  customDomain?: string | null;
  status: string;
}

/**
 * Resolve active Tenant details from request headers (x-forwarded-host, host, x-tenant-slug)
 */
export async function resolveTenant(req: NextRequest): Promise<ResolvedTenant> {
  const hostHeader = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase().trim();
  const injectedSlug = (req.headers.get('x-tenant-slug') || '').toLowerCase().trim();

  // 1. Determine target slug
  let targetSlug = '';
  if (injectedSlug && injectedSlug !== 'baytak' && injectedSlug !== 'default-tenant') {
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
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: targetSlug },
          { slug: targetSlug.replace(/^at\./, '') },
          { slug: `at.${targetSlug}` },
          { customDomain: hostHeader },
          { customDomain: `https://${hostHeader}` },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        customDomain: true,
        status: true,
      },
    });

    if (tenant) return tenant;
  }

  // 3. Fallback to default tenant (Baytak Pharmacy)
  const defaultTenant = await prisma.tenant.findFirst({
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
    },
  });

  return defaultTenant || {
    id: 'default-tenant',
    name: 'صيدلية بيتك',
    slug: 'baytak',
    logo: null,
    customDomain: null,
    status: 'ACTIVE',
  };
}

export async function resolveTenantId(req: NextRequest): Promise<string> {
  const tenant = await resolveTenant(req);
  return tenant.id;
}
