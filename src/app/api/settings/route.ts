import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.companySettings.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          id: 'default',
          companyName: 'نظام تدوين ساعات العمل المخصص',
          gpsEnabled: false,
          gpsLatitude: 32.8872,
          gpsLongitude: 13.1913,
          gpsRadiusMeters: 200
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
    const body = await req.json();
    const { companyName, gpsEnabled, gpsLatitude, gpsLongitude, gpsRadiusMeters, n8nWebhookUrl, autoCloseHours } = body;

    const updated = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: {
        ...(companyName !== undefined && { companyName: String(companyName).trim() }),
        ...(gpsEnabled !== undefined && { gpsEnabled: Boolean(gpsEnabled) }),
        ...(gpsLatitude !== undefined && { gpsLatitude: Number(gpsLatitude) }),
        ...(gpsLongitude !== undefined && { gpsLongitude: Number(gpsLongitude) }),
        ...(gpsRadiusMeters !== undefined && { gpsRadiusMeters: Number(gpsRadiusMeters) }),
        ...(n8nWebhookUrl !== undefined && { n8nWebhookUrl: String(n8nWebhookUrl) }),
        ...(autoCloseHours !== undefined && { autoCloseHours: Number(autoCloseHours) })
      },
      create: {
        id: 'default',
        companyName: companyName ? String(companyName).trim() : 'نظام تدوين ساعات العمل المخصص',
        gpsEnabled: Boolean(gpsEnabled),
        gpsLatitude: gpsLatitude ? Number(gpsLatitude) : 32.8872,
        gpsLongitude: gpsLongitude ? Number(gpsLongitude) : 13.1913,
        gpsRadiusMeters: gpsRadiusMeters ? Number(gpsRadiusMeters) : 200,
        n8nWebhookUrl: n8nWebhookUrl || 'https://n8n.ordermt.ly/webhook/attendance-alert',
        autoCloseHours: autoCloseHours ? Number(autoCloseHours) : 12.0
      }
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في حفظ الإعدادات' }, { status: 500 });
  }
}

