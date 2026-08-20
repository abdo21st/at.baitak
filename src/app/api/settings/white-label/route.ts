import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// POST: Update Custom Domain & White Labeling Branding
export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { name, logo, customDomain } = body;

    let cleanDomain = customDomain ? String(customDomain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '') : null;

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(logo !== undefined && { logo: logo ? String(logo).trim() : null }),
        ...(cleanDomain !== undefined && { customDomain: cleanDomain })
      }
    });

    await logAuditEvent({
      tenantId,
      action: 'UPDATE_WHITE_LABEL_SETTINGS',
      entity: 'Tenant',
      entityId: tenantId,
      details: { customDomain: cleanDomain, name },
      req
    });

    return NextResponse.json({ success: true, message: 'تم تحديث الهوية والنطاق المخصص بنجاح! 🎨', tenant: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
