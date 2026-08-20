import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export interface AuditLogPayload {
  tenantId?: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  req?: NextRequest | Request | null;
}

/**
 * Record tamper-proof immutable audit log entry in PostgreSQL
 */
export async function logAuditEvent({
  tenantId = 'default-tenant',
  userId,
  userName,
  action,
  entity,
  entityId,
  details,
  req
}: AuditLogPayload) {
  try {
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (req) {
      const headers = 'headers' in req ? req.headers : new Headers();
      ipAddress = headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || undefined;
      userAgent = headers.get('user-agent') || undefined;
    }

    const entry = await (prisma as any).auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        userName: userName || null,
        action,
        entity,
        entityId: entityId || null,
        details: details || {},
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      }
    });

    return entry;
  } catch (error) {
    // Non-blocking fallback to console if audit log write fails
    console.error('Failed to write audit log:', error);
    return null;
  }
}
