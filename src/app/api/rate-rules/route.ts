import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

// 2. POST Create Rate Rule
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
