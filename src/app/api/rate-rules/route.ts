import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateShiftWithRateRules } from '@/lib/rateEngine';

// 1. GET Rate Rules
export async function GET() {
  try {
    const rules = await (prisma as any).rateRule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في جلب قواعد التسعير' }, { status: 500 });
  }
}

// 2. POST Create Rate Rule OR Recalculate Month
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'RECALCULATE_MONTH') {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const targetMonth = body.month || currentMonthStr;

      // 1. Fetch active rate rules
      const activeRules = await (prisma as any).rateRule.findMany({
        where: { isActive: true }
      });

      // 2. Fetch all attendance records for the target month
      const monthRecords = await prisma.attendanceRecord.findMany({
        where: {
          date: { startsWith: targetMonth }
        },
        include: {
          user: {
            include: {
              jobRoles: true,
              departments: true
            }
          }
        },
        orderBy: { checkInTime: 'asc' }
      });

      let updatedCount = 0;

      for (const rec of monthRecords) {
        if (!rec.checkInTime || !rec.checkOutTime) continue;

        const directHourlyRate = rec.user?.hourlyRate || 0;
        const monthlySalary = rec.user?.monthlySalary || 0;
        const targetMonthlyHours = rec.user?.targetMonthlyHours || 0;
        const primaryRole = rec.user?.jobRoles?.[0];
        const isHourly = primaryRole ? primaryRole.isHourly !== false : true;
        const userDeptIds = rec.user?.departments?.map((d) => d.id) || [];

        // Check if first record of day for fixed monthly daily portion
        const isFirst = monthRecords.findIndex(r => r.userId === rec.userId && r.date === rec.date) === monthRecords.indexOf(rec);

        const shiftCost = calculateShiftWithRateRules(
          rec.date,
          rec.checkInTime,
          rec.checkOutTime,
          directHourlyRate,
          monthlySalary,
          targetMonthlyHours,
          isHourly,
          isFirst,
          activeRules,
          rec.userId,
          userDeptIds
        );

        await prisma.attendanceRecord.update({
          where: { id: rec.id },
          data: {
            workHours: shiftCost.workHours,
            earnedCost: shiftCost.totalCost
          }
        });

        updatedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `تمت إعادة احتساب ${updatedCount} سجل لشهر (${targetMonth}) بنجاح وفق القواعد النشطة`,
        updatedCount,
        month: targetMonth
      });
    }

    const {
      name,
      ruleType,
      daysOfWeek,
      specificDate,
      startTime,
      endTime,
      increaseType,
      value,
      appliesTo,
      targetId,
      isActive
    } = body;

    if (!name || value === undefined || value === null) {
      return NextResponse.json({ success: false, error: 'اسم القاعدة وقيمة الزيادة مطلوبان' }, { status: 400 });
    }

    const created = await (prisma as any).rateRule.create({
      data: {
        name: String(name).trim(),
        ruleType: ruleType === 'ONE_TIME' ? 'ONE_TIME' : 'RECURRING',
        daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek.map(Number) : [],
        specificDate: specificDate ? String(specificDate).trim() : null,
        startTime: startTime ? String(startTime).trim() : null,
        endTime: endTime ? String(endTime).trim() : null,
        increaseType: increaseType === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'PERCENTAGE',
        value: Number(value) || 0,
        appliesTo: appliesTo || 'ALL',
        targetId: targetId || null,
        isActive: isActive !== false
      }
    });

    const rules = await (prisma as any).rateRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, rule: created, rules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إضافة قاعدة التسعير' }, { status: 500 });
  }
}

// 3. PUT Update / Toggle Rate Rule
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      ruleType,
      daysOfWeek,
      specificDate,
      startTime,
      endTime,
      increaseType,
      value,
      appliesTo,
      targetId,
      isActive
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف القاعدة مطلوب' }, { status: 400 });
    }

    const updated = await (prisma as any).rateRule.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(ruleType !== undefined && { ruleType }),
        ...(daysOfWeek !== undefined && { daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek.map(Number) : [] }),
        ...(specificDate !== undefined && { specificDate: specificDate ? String(specificDate).trim() : null }),
        ...(startTime !== undefined && { startTime: startTime ? String(startTime).trim() : null }),
        ...(endTime !== undefined && { endTime: endTime ? String(endTime).trim() : null }),
        ...(increaseType !== undefined && { increaseType }),
        ...(value !== undefined && { value: Number(value) }),
        ...(appliesTo !== undefined && { appliesTo }),
        ...(targetId !== undefined && { targetId }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      }
    });

    const rules = await (prisma as any).rateRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, rule: updated, rules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تعديل قاعدة التسعير' }, { status: 500 });
  }
}

// 4. DELETE Rate Rule
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف القاعدة مطلوب' }, { status: 400 });
    }

    await (prisma as any).rateRule.delete({
      where: { id }
    });

    const rules = await (prisma as any).rateRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في حذف قاعدة التسعير' }, { status: 500 });
  }
}
