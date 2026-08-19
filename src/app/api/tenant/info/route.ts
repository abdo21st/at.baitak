import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const hostHeader = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase().trim();
    const injectedSlug = (req.headers.get('x-tenant-slug') || '').toLowerCase().trim();

    // 1. Determine the target slug from host or header
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

    let tenant = null;

    // 2. Search for the specific tenant by slug, prefix, or custom domain
    if (targetSlug && targetSlug !== 'super-admin') {
      tenant = await prisma.tenant.findFirst({
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
          status: true,
          hasClinicalCapsule: true,
          hasInventory: true,
          hasPurchases: true,
        },
      });
    }

    // 3. Fallback to default tenant (Baytak Pharmacy) only if no custom tenant found
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
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
          status: true,
          hasClinicalCapsule: true,
          hasInventory: true,
          hasPurchases: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      tenant: tenant || {
        id: 'default-tenant',
        name: 'صيدلية بيتك',
        slug: 'baytak',
        logo: null,
        status: 'ACTIVE',
        hasClinicalCapsule: true,
        hasInventory: true,
        hasPurchases: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        tenant: {
          id: 'default-tenant',
          name: 'صيدلية بيتك',
          slug: 'baytak',
          logo: null,
          status: 'ACTIVE',
          hasClinicalCapsule: true,
          hasInventory: true,
          hasPurchases: true,
        },
        error: error.message,
      },
      { status: 500 }
    );
  }
}
