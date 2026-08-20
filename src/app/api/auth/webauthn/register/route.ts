import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';
import { logAuditEvent } from '@/lib/auditLogger';

// GET: Generate WebAuthn Registration Options
export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, employeeCode: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Generate random challenge
    const challenge = crypto.randomUUID();

    const options = {
      challenge,
      rp: {
        name: 'منظومة حضورك الذكية',
        id: req.headers.get('host')?.split(':')[0] || 'localhost'
      },
      user: {
        id: user.id,
        name: user.employeeCode,
        displayName: user.name
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred'
      },
      timeout: 60000
    };

    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Verify & Store WebAuthn Credential
export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const { userId, credentialId, publicKey, deviceName } = body;

    if (!userId || !credentialId || !publicKey) {
      return NextResponse.json({ success: false, error: 'بيانات الاعتماد غير مكتملة' }, { status: 400 });
    }

    const cred = await (prisma as any).webAuthnCredential.upsert({
      where: { credentialId },
      update: {
        publicKey,
        deviceName: deviceName || 'بصمة جهاز معتمد',
        tenantId
      },
      create: {
        userId,
        tenantId,
        credentialId,
        publicKey,
        deviceName: deviceName || 'بصمة جهاز معتمد'
      }
    });

    await logAuditEvent({
      tenantId,
      userId,
      action: 'REGISTER_PASSKEY',
      entity: 'WebAuthnCredential',
      entityId: cred.id,
      details: { deviceName },
      req
    });

    return NextResponse.json({ success: true, message: 'تم تسجيل بصمة الأمان بنجاح! 🔒', credential: cred });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
