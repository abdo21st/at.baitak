import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    let settings = await prisma.companySettings.findFirst({
      where: { tenantId }
    });

    if (!settings && tenantId !== 'default-tenant') {
      settings = await prisma.companySettings.findUnique({
        where: { id: 'default' }
      });
    }

    const defaultLat = process.env.COMPANY_DEFAULT_LAT ? Number(process.env.COMPANY_DEFAULT_LAT) : null;
    const defaultLng = process.env.COMPANY_DEFAULT_LNG ? Number(process.env.COMPANY_DEFAULT_LNG) : null;

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          id: tenantId === 'default-tenant' ? 'default' : `settings-${tenantId}`,
          tenantId,
          companyName: process.env.COMPANY_NAME || 'صيدلية بيتك',
          gpsEnabled: false,
          gpsLatitude: defaultLat || 32.8872,
          gpsLongitude: defaultLng || 13.1913,
          gpsRadiusMeters: 200,
          whatsappGroupName: 'صيدلية بيتك',
          whatsappGroupLink: '',
          whatsappGroupJid: ''
        }
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في جلب الإعدادات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const {
      companyName,
      gpsEnabled,
      gpsLatitude,
      gpsLongitude,
      gpsRadiusMeters,
      n8nWebhookUrl,
      autoCloseHours,
      managerPhone,
      whatsappNotificationsEnabled,
      whatsappGroupLink,
      whatsappGroupJid,
      whatsappGroupName
    } = body;

    // Helper: auto-extract JID or clean group link
    let extractedJid = whatsappGroupJid ? String(whatsappGroupJid).trim() : '';
    let rawLink = whatsappGroupLink ? String(whatsappGroupLink).trim() : '';
    if (rawLink && (rawLink.includes('@g.us') || (/^\d{15,20}$/.test(rawLink)))) {
      extractedJid = rawLink.endsWith('@g.us') ? rawLink : `${rawLink}@g.us`;
    }

    const targetId = tenantId === 'default-tenant' ? 'default' : `settings-${tenantId}`;

    const updated = await prisma.companySettings.upsert({
      where: { id: targetId },
      update: {
        tenantId,
        ...(companyName !== undefined && { companyName: String(companyName).trim() }),
        ...(gpsEnabled !== undefined && { gpsEnabled: Boolean(gpsEnabled) }),
        ...(gpsLatitude !== undefined && { gpsLatitude: Number(gpsLatitude) }),
        ...(gpsLongitude !== undefined && { gpsLongitude: Number(gpsLongitude) }),
        ...(gpsRadiusMeters !== undefined && { gpsRadiusMeters: Number(gpsRadiusMeters) }),
        ...(n8nWebhookUrl !== undefined && { n8nWebhookUrl: String(n8nWebhookUrl) }),
        ...(autoCloseHours !== undefined && { autoCloseHours: Number(autoCloseHours) }),
        ...(managerPhone !== undefined && { managerPhone: String(managerPhone).trim() }),
        ...(whatsappNotificationsEnabled !== undefined && { whatsappNotificationsEnabled: Boolean(whatsappNotificationsEnabled) }),
        ...(whatsappGroupLink !== undefined && { whatsappGroupLink: rawLink }),
        ...(whatsappGroupJid !== undefined && { whatsappGroupJid: extractedJid }),
        ...(whatsappGroupName !== undefined && { whatsappGroupName: String(whatsappGroupName).trim() })
      },
      create: {
        id: targetId,
        tenantId,
        companyName: companyName ? String(companyName).trim() : 'صيدلية بيتك',
        gpsEnabled: Boolean(gpsEnabled),
        gpsLatitude: gpsLatitude ? Number(gpsLatitude) : 32.8872,
        gpsLongitude: gpsLongitude ? Number(gpsLongitude) : 13.1913,
        gpsRadiusMeters: gpsRadiusMeters ? Number(gpsRadiusMeters) : 200,
        n8nWebhookUrl: n8nWebhookUrl || 'https://n8n.ordermt.ly/webhook/attendance-alert',
        autoCloseHours: autoCloseHours ? Number(autoCloseHours) : 12.0,
        managerPhone: managerPhone ? String(managerPhone).trim() : '',
        whatsappNotificationsEnabled: whatsappNotificationsEnabled !== undefined ? Boolean(whatsappNotificationsEnabled) : true,
        whatsappGroupLink: rawLink,
        whatsappGroupJid: extractedJid,
        whatsappGroupName: whatsappGroupName ? String(whatsappGroupName).trim() : 'صيدلية بيتك'
      }
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في حفظ الإعدادات' }, { status: 500 });
  }
}
