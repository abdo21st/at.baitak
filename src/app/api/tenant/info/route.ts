import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenantResolver';

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    return NextResponse.json({
      success: true,
      tenant: tenant || {
        id: 'unknown',
        name: '',
        slug: '',
        logo: null,
        status: 'ACTIVE',
        hasClinicalCapsule: false,
        hasInventory: false,
        hasPurchases: false,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        tenant: {
          id: 'unknown',
          name: '',
          slug: '',
          logo: null,
          status: 'ACTIVE',
          hasClinicalCapsule: false,
          hasInventory: false,
          hasPurchases: false,
        },
        error: error.message,
      },
      { status: 500 }
    );
  }
}
