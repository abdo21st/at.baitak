import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const tenantSlug = (req.headers.get('x-tenant-slug') || 'baytak').toLowerCase().trim();
    const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();
    
    // Find tenant by slug (or slug variations) or customDomain
    let tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: tenantSlug },
          { slug: tenantSlug.replace(/^at\./, '') },
          { slug: `at.${tenantSlug}` },
          { customDomain: host },
          { customDomain: `https://${host}` },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        status: true,
      },
    });

    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: { id: 'default-tenant' },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          status: true,
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
        },
      },
      { status: 200 }
    );
  }
}
