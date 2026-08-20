import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantResolver';
import { encryptData, decryptData } from '@/lib/crypto';
import { logAuditEvent } from '@/lib/auditLogger';

// GET: Fetch Anonymous Suggestions (For Admin with Decryption)
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const rawSuggestions = await (prisma as any).anonymousSuggestion.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' }
    });

    const suggestions = rawSuggestions.map((s: any) => ({
      id: s.id,
      category: s.category,
      content: decryptData(s.encryptedContent),
      status: s.status,
      adminReply: s.adminReply,
      createdAt: s.createdAt
    }));

    return NextResponse.json({ success: true, suggestions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Submit Confidential Anonymous Suggestion (Zero Identity Stored)
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json();
    const { category, content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'نص المقترح أو الملاحظة مطلوب' }, { status: 400 });
    }

    const safeContent = content.trim().slice(0, 4000);
    const encryptedContent = encryptData(safeContent);

    const suggestion = await (prisma as any).anonymousSuggestion.create({
      data: {
        tenantId: tenant.id,
        category: category || 'WORK_ENVIRONMENT',
        encryptedContent,
        status: 'UNREAD'
      }
    });

    await logAuditEvent({
      tenantId: tenant.id,
      action: 'SUBMIT_ANONYMOUS_SUGGESTION',
      entity: 'AnonymousSuggestion',
      entityId: suggestion.id,
      details: { category },
      req
    });

    return NextResponse.json({
      success: true,
      message: '🔒 تم إرسال مقترحك بسرية وتشفير كامل 100% دون تسجيل أي بيانات هوية. شكراً لمساهمتك!'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
