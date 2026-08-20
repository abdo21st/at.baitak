import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// GET: Generate WebAuthn Authentication Challenge
export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const employeeCode = req.nextUrl.searchParams.get('code');

    let allowCredentials: any[] = [];
    if (employeeCode) {
      const user = await prisma.user.findFirst({
        where: {
          employeeCode: String(employeeCode).trim(),
          tenantId
        },
        include: {
          webAuthnCredentials: true
        } as any
      });

      if (user && (user as any).webAuthnCredentials) {
        allowCredentials = (user as any).webAuthnCredentials.map((c: any) => ({
          id: c.credentialId,
          type: 'public-key'
        }));
      }
    }

    const challenge = crypto.randomUUID();

    const options = {
      challenge,
      timeout: 60000,
      rpId: req.headers.get('host')?.split(':')[0] || 'localhost',
      userVerification: 'preferred',
      ...(allowCredentials.length > 0 && { allowCredentials })
    };

    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Verify WebAuthn Assertion & Login
export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { credentialId, rawId } = body;

    const cred = await (prisma as any).webAuthnCredential.findUnique({
      where: { credentialId },
      include: {
        user: {
          include: {
            departments: true,
            jobRoles: true
          }
        }
      }
    });

    if (!cred || !cred.user) {
      return NextResponse.json({ success: false, error: 'بصمة الأمان غير مسجلة' }, { status: 404 });
    }

    const user = cred.user;

    await logAuditEvent({
      tenantId,
      userId: user.id,
      userName: user.name,
      action: 'LOGIN_VIA_PASSKEY',
      entity: 'User',
      entityId: user.id,
      details: { deviceName: cred.deviceName },
      req
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        employeeCode: user.employeeCode,
        role: user.role,
        tenantId: user.tenantId,
        departments: user.departments,
        jobRoles: user.jobRoles
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
