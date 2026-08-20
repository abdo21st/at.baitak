import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenantId } from '@/lib/tenantResolver';
import { sendDirectWhatsApp } from '@/lib/n8n';

export const dynamic = 'force-dynamic';

// 1. GET Field Visits
export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technicianId');
    const clientPhone = searchParams.get('clientPhone');

    const whereClause: any = { tenantId };
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (technicianId) {
      whereClause.technicianId = technicianId;
    }
    if (clientPhone) {
      whereClause.clientPhone = { contains: clientPhone.trim() };
    }

    const visits = await prisma.fieldVisit.findMany({
      where: whereClause,
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            phone: true,
            jobTitle: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    let totalCollectedLYD = 0;
    let totalPendingLYD = 0;
    let completedOtpCount = 0;
    let disputedCount = 0;
    let inProgressCount = 0;
    let inspectionCount = 0;

    const mapped = visits.map((v) => {
      if (v.status === 'COMPLETED_OTP') {
        totalCollectedLYD += v.totalAmount;
        completedOtpCount++;
      } else if (v.status === 'COMPLETED_DISPUTED') {
        totalPendingLYD += v.totalAmount;
        disputedCount++;
      } else if (v.status === 'IN_PROGRESS') {
        inProgressCount++;
      } else if (v.status === 'INSPECTION_ONLY') {
        totalCollectedLYD += v.serviceFee;
        inspectionCount++;
      }

      return {
        id: v.id,
        tenantId: v.tenantId,
        technicianId: v.technicianId,
        technicianName: v.technician?.name || 'فني الصيانة',
        technicianCode: v.technician?.employeeCode || '101',
        projectId: v.projectId || null,
        projectName: v.project?.name || null,
        clientName: v.clientName,
        clientPhone: v.clientPhone,
        clientAddress: v.clientAddress || null,
        visitType: v.visitType,
        diagnosisNotes: v.diagnosisNotes || null,
        solutionNotes: v.solutionNotes || null,
        partsUsed: v.partsUsed || null,
        serviceFee: v.serviceFee,
        partsFee: v.partsFee,
        totalAmount: v.totalAmount,
        status: v.status,
        hasOtp: Boolean(v.otpCode),
        otpVerifiedAt: v.otpVerifiedAt?.toISOString() || null,
        customerSignature: v.customerSignature || null,
        customerRefusalReason: v.customerRefusalReason || null,
        photoBefore: v.photoBefore || null,
        photoAfter: v.photoAfter || null,
        checkInLat: v.checkInLat || null,
        checkInLng: v.checkInLng || null,
        checkOutLat: v.checkOutLat || null,
        checkOutLng: v.checkOutLng || null,
        startedAt: v.startedAt.toISOString(),
        completedAt: v.completedAt?.toISOString() || null,
        workMinutes: v.workMinutes || 0,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      visits: mapped,
      stats: {
        totalVisits: mapped.length,
        completedOtpCount,
        disputedCount,
        inProgressCount,
        inspectionCount,
        totalCollectedLYD: Number(totalCollectedLYD.toFixed(2)),
        totalPendingLYD: Number(totalPendingLYD.toFixed(2))
      }
    });
  } catch (error: any) {
    console.error('Field visits GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في جلب زيارات الصيانة' }, { status: 500 });
  }
}

// 2. POST Start New Field Visit
export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const {
      technicianId,
      projectId,
      clientName,
      clientPhone,
      clientAddress,
      visitType,
      diagnosisNotes,
      serviceFee,
      partsFee,
      lat,
      lng,
      photoBefore
    } = body;

    if (!technicianId) {
      return NextResponse.json({ success: false, error: 'معرف الفني مطلوب' }, { status: 400 });
    }

    const techUser = await prisma.user.findFirst({
      where: { id: technicianId, tenantId }
    });
    if (!techUser) {
      return NextResponse.json({ success: false, error: 'الموظف/الفني المحدد غير مسجل في هذا النشاط' }, { status: 400 });
    }

    if (!clientName || typeof clientName !== 'string' || !clientName.trim()) {
      return NextResponse.json({ success: false, error: 'اسم العميل مطلوب' }, { status: 400 });
    }
    if (!clientPhone || typeof clientPhone !== 'string' || !clientPhone.trim()) {
      return NextResponse.json({ success: false, error: 'رقم هاتف العميل مطلوب للتواصل والتحقق' }, { status: 400 });
    }

    const safeServiceFee = Math.max(0, Math.min(100000, parseFloat(String(serviceFee)) || 0.0));
    const safePartsFee = Math.max(0, Math.min(100000, parseFloat(String(partsFee)) || 0.0));
    const totalAmount = Number((safeServiceFee + safePartsFee).toFixed(2));

    // Generate random 4-digit OTP
    const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));

    const created = await prisma.fieldVisit.create({
      data: {
        tenantId,
        technicianId,
        projectId: projectId || null,
        clientName: String(clientName).trim().slice(0, 150),
        clientPhone: String(clientPhone).trim().replace(/[^0-9+]/g, '').slice(0, 25),
        clientAddress: clientAddress ? String(clientAddress).trim().slice(0, 250) : null,
        visitType: visitType || 'MAINTENANCE',
        diagnosisNotes: diagnosisNotes ? String(diagnosisNotes).trim().slice(0, 1000) : null,
        serviceFee: safeServiceFee,
        partsFee: safePartsFee,
        totalAmount,
        status: 'IN_PROGRESS',
        otpCode: generatedOtp,
        checkInLat: lat ? Number(lat) : null,
        checkInLng: lng ? Number(lng) : null,
        photoBefore: photoBefore || null,
        startedAt: new Date()
      },
      include: {
        technician: true,
        project: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `تم بدء مهمة الزيارة الميدانية بنجاح لموقع (${created.clientName}) 🚗`,
      visit: {
        id: created.id,
        clientName: created.clientName,
        clientPhone: created.clientPhone,
        status: created.status,
        hasOtp: true,
        startedAt: created.startedAt.toISOString()
      }
    });
  } catch (error: any) {
    console.error('Field visits POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في بدء الزيارة الميدانية' }, { status: 500 });
  }
}

// 3. PUT Update / Complete Field Visit
export async function PUT(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const body = await req.json();
    const {
      id,
      action,
      otpCodeInput,
      diagnosisNotes,
      solutionNotes,
      partsUsed,
      serviceFee,
      partsFee,
      customerSignature,
      customerRefusalReason,
      photoAfter,
      lat,
      lng
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الزيارة مطلوب' }, { status: 400 });
    }

    const existing = await prisma.fieldVisit.findFirst({
      where: { id, tenantId },
      include: {
        technician: true,
        tenant: true
      }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'سجل الزيارة غير موجود' }, { status: 404 });
    }

    // Action 1: SEND_OTP to Client WhatsApp
    if (action === 'SEND_OTP') {
      const freshOtp = String(Math.floor(1000 + Math.random() * 9000));
      await prisma.fieldVisit.update({
        where: { id },
        data: { otpCode: freshOtp }
      });

      const companyName = existing.tenant?.name || 'شركة مدار التقنية للخدمات التقنية';
      const techName = existing.technician?.name || 'المهندس المختص';
      const safeTotal = existing.totalAmount;

      const otpMessage = `مرحباً بك عزيزي العميل في *${companyName}* 🛠️\n\nأكمل ${techName} أعمال الصيانة في موقعكم.\nالمبلغ المستحق: *${safeTotal} د.ل*\n\nلتأكيد استلام الخدمة ورضاكم التام، يرجى تزويد المهندس برمز التأكيد التالي:\n🔑 رمز التحقق: *${freshOtp}*\n\nشكراً لثقتكم بنا! ✨`;

      const sent = await sendDirectWhatsApp(existing.clientPhone, otpMessage);

      return NextResponse.json({
        success: true,
        message: sent
          ? `تم إرسال رمز التأكيد (OTP) إلى واتساب العميل (${existing.clientPhone}) بنجاح 📲`
          : `تم توليد الرمز (${freshOtp}). (تنبيه: تعذر إرسال الواتساب، يمكنك تزويد العميل به مباشرة)`,
        otpSent: sent,
        generatedOtp: freshOtp
      });
    }

    // Action 2: COMPLETE_OTP (Customer verified with 4-digit OTP)
    if (action === 'COMPLETE_OTP' || action === 'VERIFY_OTP_COMPLETE') {
      const cleanInput = String(otpCodeInput || '').trim();
      if (!cleanInput || cleanInput !== existing.otpCode) {
        return NextResponse.json({
          success: false,
          error: `رمز التحقق المدخل غير صحيح! يرجى إدخال الرمز السري المكون من 4 أرقام المستلم على هاتف العميل 🔒`
        }, { status: 400 });
      }

      const now = new Date();
      const workMinutes = Math.max(1, Math.round((now.getTime() - new Date(existing.startedAt).getTime()) / 60000));

      const safeServiceFee = serviceFee !== undefined ? Math.max(0, parseFloat(String(serviceFee)) || 0.0) : existing.serviceFee;
      const safePartsFee = partsFee !== undefined ? Math.max(0, parseFloat(String(partsFee)) || 0.0) : existing.partsFee;
      const totalAmount = Number((safeServiceFee + safePartsFee).toFixed(2));

      const updated = await prisma.fieldVisit.update({
        where: { id },
        data: {
          status: 'COMPLETED_OTP',
          otpVerifiedAt: now,
          completedAt: now,
          workMinutes,
          serviceFee: safeServiceFee,
          partsFee: safePartsFee,
          totalAmount,
          diagnosisNotes: diagnosisNotes !== undefined ? String(diagnosisNotes).trim().slice(0, 1000) : existing.diagnosisNotes,
          solutionNotes: solutionNotes !== undefined ? String(solutionNotes).trim().slice(0, 1000) : existing.solutionNotes,
          partsUsed: partsUsed !== undefined ? String(partsUsed).trim().slice(0, 500) : existing.partsUsed,
          customerSignature: customerSignature || existing.customerSignature,
          photoAfter: photoAfter || existing.photoAfter,
          checkOutLat: lat ? Number(lat) : existing.checkOutLat,
          checkOutLng: lng ? Number(lng) : existing.checkOutLng
        },
        include: { technician: true, project: true }
      });

      // Send thank you confirmation to customer WhatsApp
      const thankYouMsg = `تم تأكيد واعتماد استلام خدمة الصيانة بنجاح من *${existing.tenant?.name || 'شركة مدار التقنية'}* ✅\n\nالمبلغ الإجمالي المسدد: *${totalAmount} د.ل*\nمدة العمل: *${workMinutes} دقيقة*\n\nنشكركم لاختياركم خدماتنا! 🌟`;
      sendDirectWhatsApp(existing.clientPhone, thankYouMsg).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `تم اعتماد وإغلاق الزيارة بنجاح برمز تأكيد العميل 🟢 (المبلغ المحصل: ${totalAmount} د.ل)`,
        visit: updated
      });
    }

    // Action 3: COMPLETE_DISPUTED (Technician completed work, client refused to sign/pay)
    if (action === 'COMPLETE_DISPUTED' || action === 'DISPUTED_COMPLETE') {
      if (!customerRefusalReason || !String(customerRefusalReason).trim()) {
        return NextResponse.json({
          success: false,
          error: 'يرجى توضيح سبب امتناع العميل عن التوقيع أو السداد لتوثيق المحضر الإداري ✍️'
        }, { status: 400 });
      }

      const now = new Date();
      const workMinutes = Math.max(1, Math.round((now.getTime() - new Date(existing.startedAt).getTime()) / 60000));

      const safeServiceFee = serviceFee !== undefined ? Math.max(0, parseFloat(String(serviceFee)) || 0.0) : existing.serviceFee;
      const safePartsFee = partsFee !== undefined ? Math.max(0, parseFloat(String(partsFee)) || 0.0) : existing.partsFee;
      const totalAmount = Number((safeServiceFee + safePartsFee).toFixed(2));

      const updated = await prisma.fieldVisit.update({
        where: { id },
        data: {
          status: 'COMPLETED_DISPUTED',
          customerRefusalReason: String(customerRefusalReason).trim().slice(0, 500),
          completedAt: now,
          workMinutes,
          serviceFee: safeServiceFee,
          partsFee: safePartsFee,
          totalAmount,
          diagnosisNotes: diagnosisNotes !== undefined ? String(diagnosisNotes).trim().slice(0, 1000) : existing.diagnosisNotes,
          solutionNotes: solutionNotes !== undefined ? String(solutionNotes).trim().slice(0, 1000) : existing.solutionNotes,
          partsUsed: partsUsed !== undefined ? String(partsUsed).trim().slice(0, 500) : existing.partsUsed,
          photoAfter: photoAfter || existing.photoAfter,
          checkOutLat: lat ? Number(lat) : existing.checkOutLat,
          checkOutLng: lng ? Number(lng) : existing.checkOutLng
        },
        include: { technician: true, project: true }
      });

      // Send official formal notice to client WhatsApp
      const companyName = existing.tenant?.name || 'شركة مدار التقنية للخدمات التقنية';
      const formalNoticeMsg = `⚠️ *إشعار رسمي من ${companyName}*\n\nتم توثيق إنجاز أعمال الصيانة الميدانية في موقعكم بالصور وإحداثيات التواجد الجغرافي.\nقيمة الفاتورة المستحقة: *${totalAmount} د.ل*\nحالة المحضر: *مكتمل وموثق تحت المتابعة الإدارية*\n\nلأي استفسار أو تسوية يرجى مراجعة إدارة الشركة.`;
      sendDirectWhatsApp(existing.clientPhone, formalNoticeMsg).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `تم توثيق إنجاز الصيانة وحفظ إثباتات الـ GPS والصور وإحالة الفاتورة (${totalAmount} د.ل) للإدارة للمتابعة 🔴`,
        visit: updated
      });
    }

    // Action 4: INSPECTION_ONLY
    if (action === 'INSPECTION_ONLY') {
      const now = new Date();
      const workMinutes = Math.max(1, Math.round((now.getTime() - new Date(existing.startedAt).getTime()) / 60000));
      const safeServiceFee = serviceFee !== undefined ? Math.max(0, parseFloat(String(serviceFee)) || 0.0) : existing.serviceFee;

      const updated = await prisma.fieldVisit.update({
        where: { id },
        data: {
          status: 'INSPECTION_ONLY',
          completedAt: now,
          workMinutes,
          serviceFee: safeServiceFee,
          partsFee: 0,
          totalAmount: safeServiceFee,
          diagnosisNotes: diagnosisNotes !== undefined ? String(diagnosisNotes).trim().slice(0, 1000) : existing.diagnosisNotes,
          solutionNotes: solutionNotes !== undefined ? String(solutionNotes).trim().slice(0, 1000) : existing.solutionNotes
        },
        include: { technician: true, project: true }
      });

      return NextResponse.json({
        success: true,
        message: `تم توثيق الزيارة كـ (كشف ومعاينة فقط) بنجاح 🟡 (أتعاب الكشف: ${safeServiceFee} د.ل)`,
        visit: updated
      });
    }

    // Action 5: General Update
    const updated = await prisma.fieldVisit.update({
      where: { id },
      data: {
        ...(diagnosisNotes !== undefined && { diagnosisNotes: String(diagnosisNotes).trim().slice(0, 1000) }),
        ...(solutionNotes !== undefined && { solutionNotes: String(solutionNotes).trim().slice(0, 1000) }),
        ...(partsUsed !== undefined && { partsUsed: String(partsUsed).trim().slice(0, 500) }),
        ...(serviceFee !== undefined && { serviceFee: Math.max(0, parseFloat(String(serviceFee)) || 0.0) }),
        ...(partsFee !== undefined && { partsFee: Math.max(0, parseFloat(String(partsFee)) || 0.0) })
      },
      include: { technician: true, project: true }
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات الزيارة بنجاح',
      visit: updated
    });
  } catch (error: any) {
    console.error('Field visits PUT error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تحديث الزيارة' }, { status: 500 });
  }
}

// 4. DELETE Field Visit (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الزيارة مطلوب' }, { status: 400 });
    }

    await prisma.fieldVisit.deleteMany({
      where: { id, tenantId }
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف سجل الزيارة بنجاح'
    });
  } catch (error: any) {
    console.error('Field visits DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ في حذف الزيارة' }, { status: 500 });
  }
}
