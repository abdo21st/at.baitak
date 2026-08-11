import { NextRequest, NextResponse } from 'next/server';
import { initialCompanySettings, initialAttendanceRecords, initialProjects, initialUsers } from '@/lib/data-store';
import { CompanySettings } from '@/lib/types';

let currentSettings: CompanySettings = { ...initialCompanySettings };

export async function GET() {
  return NextResponse.json({ success: true, settings: currentSettings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, companyName, logoUrl, n8nWebhookUrl, defaultTargetMonthlyHours, autoCloseHours } = body;

    // Factory Reset Trigger (ضبط المصنع)
    if (action === 'FACTORY_RESET') {
      currentSettings = { ...initialCompanySettings };
      return NextResponse.json({
        success: true,
        message: 'تمت إعادة ضبط المصنع بنجاح واسترجاع الإعدادات والبيانات الأولية النظيفة'
      });
    }

    currentSettings = {
      ...currentSettings,
      companyName: companyName || currentSettings.companyName,
      logoUrl: logoUrl !== undefined ? logoUrl : currentSettings.logoUrl,
      n8nWebhookUrl: n8nWebhookUrl || currentSettings.n8nWebhookUrl,
      defaultTargetMonthlyHours: defaultTargetMonthlyHours ? Number(defaultTargetMonthlyHours) : currentSettings.defaultTargetMonthlyHours,
      autoCloseHours: autoCloseHours ? Number(autoCloseHours) : currentSettings.autoCloseHours
    };

    return NextResponse.json({ success: true, settings: currentSettings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تحديث الإعدادات' }, { status: 500 });
  }
}
