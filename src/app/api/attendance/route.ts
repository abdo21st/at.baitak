import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AttendanceRecord } from '@/lib/types';
import { calculateGpsDistanceMeters } from '@/lib/utils';
import { calculateShiftWithRateRules } from '@/lib/rateEngine';

import { resolveTenantId } from '@/lib/tenantResolver';

let memoryRecords: AttendanceRecord[] = [];
const MAX_MEMORY_RECORDS = 500;

// التحقق من صحة نطاق الوقت — يقبل الورديات الليلية الحقيقية فقط (أقصى 12 ساعة ليلية)
function isValidTimeRange(checkInTime: string, checkOutTime: string): boolean {
  const [inH, inM] = checkInTime.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);

  const inMins = inH * 60 + (inM || 0);
  const outMins = outH * 60 + (outM || 0);

  if (outMins > inMins) return true; // نفس اليوم: انصراف بعد الحضور ✅

  if (outMins < inMins) {
    // وردية ليلية: يُقبل فقط إذا مجموع الوقت لا يتجاوز 12 ساعة (720 دقيقة)
    const minutesBeforeMidnight = 1440 - inMins;
    const minutesAfterMidnight = outMins;
    return (minutesBeforeMidnight + minutesAfterMidnight) <= 720;
  }

  return false; // وقت متطابق تمامًا — رفض
}

// Fetch or seed records in PostgreSQL with Tenant Isolation
async function getOrSeedRecords(userIdFilter?: string | null, tenantId?: string | null): Promise<AttendanceRecord[]> {
  try {
    const targetTenantId = tenantId || 'default-tenant';
    const dbRecords = await prisma.attendanceRecord.findMany({
      where: {
        user: { tenantId: targetTenantId },
        ...(userIdFilter ? { userId: userIdFilter } : {}),
      },
      include: {
        user: { include: { jobRoles: true, departments: true } },
        project: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (dbRecords && dbRecords.length > 0) {
      let activeRules: any[] = [];
      try {
        activeRules = await (prisma as any).rateRule.findMany({ where: { tenantId: targetTenantId, isActive: true } });
      } catch {}

      // Identify the first record of each day for each user (for non-hourly daily bonus calculation)
      const userDateSeen = new Set<string>();
      const recordIsFirstMap = new Map<string, boolean>();

      // Sort ascending by checkInTime to properly determine the first record of the day
      const sortedByTime = [...dbRecords].sort((a, b) => a.checkInTime.localeCompare(b.checkInTime));
      for (const r of sortedByTime) {
        const key = `${r.userId}_${r.date}`;
        if (!userDateSeen.has(key)) {
          userDateSeen.add(key);
          recordIsFirstMap.set(r.id, true);
        } else {
          recordIsFirstMap.set(r.id, false);
        }
      }

      const mapped = dbRecords.map((r) => {
        const directRate = r.user?.hourlyRate || 0;
        const jobSalary = r.user?.monthlySalary || 0;
        const targetHours = r.user?.targetMonthlyHours || 0;
        const primaryRole = r.user?.jobRoles?.[0];
        const isHourly = primaryRole ? primaryRole.isHourly !== false : true;
        const isFirst = recordIsFirstMap.get(r.id) ?? true;
        const userDeptIds = r.user?.departments?.map((d: any) => d.id) || [];

        const shiftAmt = (r as any).shiftAmount || 0;
        const commRate = (r as any).commissionRate || (primaryRole?.hasCommission ? primaryRole.commissionRate : 0) || 0;
        const commType = (r as any).shiftAmountType || (primaryRole?.hasCommission ? primaryRole.commissionType : null);
        const commAmt = (r as any).commissionAmount !== undefined ? (r as any).commissionAmount : Number(((shiftAmt * commRate) / 100).toFixed(2));

        // Use persisted earnedCost if already calculated, otherwise calculate once
        let calculatedEarned = r.earnedCost;
        if ((calculatedEarned === 0 || calculatedEarned === null || calculatedEarned === undefined) && r.checkOutTime) {
          const shiftCost = calculateShiftWithRateRules(
            r.date,
            r.checkInTime,
            r.checkOutTime,
            directRate,
            jobSalary,
            targetHours,
            isHourly,
            isFirst,
            activeRules,
            r.userId,
            userDeptIds,
            shiftAmt,
            commRate
          );
          calculatedEarned = shiftCost.totalCost;
        }

        return {
          id: r.id,
          userId: r.userId,
          userName: r.user?.name || 'موظف',
          employeeCode: r.user?.employeeCode || '101',
          date: r.date,
          checkInTime: r.checkInTime,
          checkOutTime: r.checkOutTime || null,
          workHours: r.workHours,
          earnedCost: calculatedEarned,
          shiftAmount: shiftAmt,
          shiftAmountType: commType,
          commissionRate: commRate,
          commissionAmount: commAmt,
          isVerified: r.isVerified ?? false,
          verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : undefined,
          checkInLat: r.checkInLat,
          checkInLng: r.checkInLng,
          checkOutLat: r.checkOutLat,
          checkOutLng: r.checkOutLng,
          isOutsideGps: r.isOutsideGps ?? false,
          projectId: r.projectId || null,
          projectName: r.project?.name || r.projectName || null,
          projectColor: r.project?.color || null,
          taskNotes: r.taskNotes || null,
          createdAt: r.createdAt.toISOString()
        };
      });

      return mapped;
    }

    return [];
  } catch (err) {
    console.error('PostgreSQL attendance fallback:', err);
    return userIdFilter
      ? memoryRecords.filter((r) => r.userId === userIdFilter)
      : memoryRecords;
  }
}

// 1. GET Attendance Records from PostgreSQL with Tenant Isolation
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const tenantId = await resolveTenantId(req);

  const records = await getOrSeedRecords(userId, tenantId);
  return NextResponse.json({ success: true, records });
}

// 2. POST Check-in / Record Attendance to PostgreSQL
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userName, employeeCode, checkInTime, checkOutTime, date, checkInLat, checkInLng, lat, lng } = body;

    if (!userId || !checkInTime) {
      return NextResponse.json({ success: false, error: 'بيانات الحضور غير مكتملة' }, { status: 400 });
    }

    if (checkOutTime && !isValidTimeRange(checkInTime, checkOutTime)) {
      return NextResponse.json({
        success: false,
        error: 'خطأ: يمنع تسجيل وقت الانصراف قبل وقت الحضور!'
      }, { status: 400 });
    }

    const finalLat = checkInLat ?? lat ?? null;
    const finalLng = checkInLng ?? lng ?? null;

    let isOutsideGps = false;
    let gpsDistanceMeters: number | undefined;

    if (finalLat !== null && finalLng !== null) {
      try {
        const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
        if (settings && settings.gpsEnabled && settings.gpsLatitude && settings.gpsLongitude) {
          gpsDistanceMeters = calculateGpsDistanceMeters(finalLat, finalLng, settings.gpsLatitude, settings.gpsLongitude);
          if (gpsDistanceMeters > (settings.gpsRadiusMeters || 200)) {
            isOutsideGps = true;
          }
        }
      } catch {}
    }

    let directHourlyRate = 0;
    let monthlySalary = 0;
    let targetMonthlyHours = 0;
    let isHourly = true;
    let userDepartmentIds: string[] = [];
    let userTenantId = 'default-tenant';

    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        include: { jobRoles: true, departments: true }
      });
      if (u) {
        userTenantId = u.tenantId || 'default-tenant';
        directHourlyRate = u.hourlyRate || 0;
        monthlySalary = u.monthlySalary || 0;
        targetMonthlyHours = u.targetMonthlyHours || 0;
        const primaryRole = u.jobRoles?.[0];
        isHourly = primaryRole ? primaryRole.isHourly !== false : true;
        userDepartmentIds = u.departments.map(d => d.id);
      }
    } catch {}

    // استخراج jobRoleId والمهمة/المشروع من البيانات المُرسلة
    const { jobRoleId, projectId, taskNotes } = body;
    const resolvedJobRoleId = jobRoleId || (await (async () => {
      try {
        const u = await prisma.user.findUnique({ where: { id: userId }, include: { jobRoles: true } });
        return u?.jobRoles?.[0]?.id || null;
      } catch { return null; }
    })());

    let resolvedProjectId: string | null = null;
    let resolvedProjectName: string | null = null;
    let resolvedProjectColor: string | null = null;

    if (projectId) {
      const proj = await prisma.project.findFirst({
        where: { id: projectId, tenantId: userTenantId }
      });
      if (!proj) {
        return NextResponse.json({ success: false, error: 'المهمة أو المشروع المحدد غير موجود' }, { status: 400 });
      }
      if (proj.status === 'CLOSED') {
        return NextResponse.json({
          success: false,
          error: `عذراً: المهمة (${proj.name}) تم إغلاقها من قبل الإدارة ولا يمكن تسجيل الحضور عليها 🔒`
        }, { status: 400 });
      }
      resolvedProjectId = proj.id;
      resolvedProjectName = proj.name;
      resolvedProjectColor = proj.color;
    }

    const todayDate = date || new Date().toISOString().split('T')[0];

    // 1. Prevent duplicate / overlapping check-ins for the same employee on the same date
    try {
      const existingUserRecords = await prisma.attendanceRecord.findMany({
        where: { userId, date: todayDate }
      });

      const newInMins = (() => {
        const [h, m] = checkInTime.split(':').map(Number);
        return h * 60 + (m || 0);
      })();

      const newOutMins = checkOutTime ? (() => {
        const [h, m] = checkOutTime.split(':').map(Number);
        let out = h * 60 + (m || 0);
        if (out < newInMins) out += 24 * 60;
        return out;
      })() : null;

      for (const rec of existingUserRecords) {
        const [exInH, exInM] = rec.checkInTime.split(':').map(Number);
        const exInMins = exInH * 60 + (exInM || 0);
        let exOutMins = 24 * 60; // if unclosed, assume till end of day
        if (rec.checkOutTime) {
          const [exOutH, exOutM] = rec.checkOutTime.split(':').map(Number);
          exOutMins = exOutH * 60 + (exOutM || 0);
          if (exOutMins < exInMins) exOutMins += 24 * 60;
        }

        // Check if newInMins falls within existing shift interval
        if (newInMins >= exInMins && newInMins < exOutMins) {
          return NextResponse.json({
            success: false,
            error: `خطأ: الموظف لديه بالفعل دوام محجوز في هذا الوقت (${rec.checkInTime} ➔ ${rec.checkOutTime || 'جاري'})، لا يمكن تكرار الحضور!`
          }, { status: 400 });
        }

        if (newOutMins && newInMins < exOutMins && newOutMins > exInMins) {
          return NextResponse.json({
            success: false,
            error: `خطأ: فترة الدوام الجديدة يتقاطع جزء منها مع دوام آخر بنفس اليوم (${rec.checkInTime} ➔ ${rec.checkOutTime || 'جاري'})!`
          }, { status: 400 });
        }
      }
    } catch {}

    let workHours = 0;
    let earnedCost = 0;

    if (checkOutTime) {
      const [inH, inM] = checkInTime.split(':').map(Number);
      const [outH, outM] = checkOutTime.split(':').map(Number);

      let startMins = inH * 60 + (inM || 0);
      let endMins = outH * 60 + (outM || 0);
      if (endMins < startMins) endMins += 24 * 60;

      const totalMins = endMins - startMins;
      workHours = Number((totalMins / 60).toFixed(2));

      let isFirstRecordOfDay = true;
      try {
        const existingSameDayCount = await prisma.attendanceRecord.count({
          where: { userId, date: todayDate }
        });
        isFirstRecordOfDay = existingSameDayCount === 0;
      } catch {}

      let rateRules: any[] = [];
      try {
        rateRules = await (prisma as any).rateRule.findMany({ where: { tenantId: userTenantId, isActive: true } });
      } catch {}

      const shiftCost = calculateShiftWithRateRules(
        todayDate,
        checkInTime,
        checkOutTime,
        directHourlyRate,
        monthlySalary,
        targetMonthlyHours,
        isHourly,
        isFirstRecordOfDay,
        rateRules,
        userId,
        userDepartmentIds
      );
      earnedCost = shiftCost.totalCost;
    }

    let newRecord: AttendanceRecord;
    try {
      const created = await prisma.attendanceRecord.create({
        data: {
          userId,
          jobRoleId: resolvedJobRoleId,
          projectId: resolvedProjectId,
          projectName: resolvedProjectName,
          taskNotes: taskNotes ? String(taskNotes).trim() : null,
          date: todayDate,
          checkInTime,
          checkOutTime: checkOutTime || null,
          workHours,
          earnedCost,
          checkInLat: finalLat,
          checkInLng: finalLng,
          isOutsideGps,
          method: finalLat ? 'GPS' : 'QUICK'
        },
        include: { user: true, project: true }
      });

      newRecord = {
        id: created.id,
        userId: created.userId,
        userName: created.user?.name || userName || 'موظف',
        employeeCode: created.user?.employeeCode || employeeCode || '101',
        date: created.date,
        checkInTime: created.checkInTime,
        checkOutTime: created.checkOutTime,
        workHours: created.workHours,
        earnedCost: created.earnedCost,
        isVerified: false,
        checkInLat: created.checkInLat,
        checkInLng: created.checkInLng,
        isOutsideGps: created.isOutsideGps,
        projectId: created.projectId || null,
        projectName: created.project?.name || created.projectName || null,
        projectColor: created.project?.color || resolvedProjectColor || null,
        taskNotes: created.taskNotes || null,
        createdAt: created.createdAt.toISOString()
      };
    } catch (dbErr) {
      newRecord = {
        id: `att-${Date.now()}`,
        userId,
        userName: userName || 'موظف',
        employeeCode: employeeCode || '101',
        date: todayDate,
        checkInTime,
        checkOutTime: checkOutTime || null,
        workHours,
        earnedCost,
        isVerified: false,
        checkInLat: finalLat,
        checkInLng: finalLng,
        isOutsideGps,
        createdAt: `${todayDate} ${checkInTime}`
      };
      memoryRecords.unshift(newRecord);
      // تحديد حد أقصى لمنع تسرب الذاكرة في بيئة production
      if (memoryRecords.length > MAX_MEMORY_RECORDS) {
        memoryRecords = memoryRecords.slice(0, MAX_MEMORY_RECORDS);
      }
    }

    return NextResponse.json({
      success: true,
      record: newRecord,
      isOutsideGps,
      gpsDistanceMeters,
      warning: isOutsideGps ? `تنبيه: تم تسجيل الحضور ولكن موقعك يبعد ${gpsDistanceMeters} متر عن مقر العمل!` : undefined
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تسجيل الدوام' }, { status: 500 });
  }
}

// 3. PUT Update Check-out Time in PostgreSQL
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId, checkOutTime, checkOutDate, checkOutLat, checkOutLng, lat, lng, shiftAmount } = body;

    const finalLat = checkOutLat ?? lat ?? null;
    const finalLng = checkOutLng ?? lng ?? null;

    let targetRec: any = null;
    try {
      targetRec = await prisma.attendanceRecord.findUnique({
        where: { id: recordId },
        include: { user: { include: { jobRoles: true } } }
      });
    } catch {}

    const computeWorkHours = (inDateStr: string, inTimeStr: string, outDateStr: string, outTimeStr: string) => {
      const inStr = `${inDateStr}T${inTimeStr.length === 5 ? inTimeStr + ':00' : inTimeStr}`;
      const outStr = `${outDateStr}T${outTimeStr.length === 5 ? outTimeStr + ':00' : outTimeStr}`;
      const inTime = new Date(inStr).getTime();
      const outTime = new Date(outStr).getTime();
      let diffMins = (outTime - inTime) / 60000;
      if (diffMins < 0 && !checkOutDate) {
        const [outH] = outTimeStr.split(':').map(Number);
        if (outH < 13) {
          diffMins += 24 * 60;
        }
      }
      return diffMins;
    };

    if (!targetRec) {
      const memRec = memoryRecords.find((r) => r.id === recordId);
      if (!memRec) {
        return NextResponse.json({ success: false, error: 'سجل الحضور غير موجود' }, { status: 404 });
      }

      const outDate = checkOutDate || memRec.date;
      const totalMins = computeWorkHours(memRec.date, memRec.checkInTime, outDate, checkOutTime);
      if (totalMins < 0) {
        return NextResponse.json({
          success: false,
          error: `خطأ: تاريخ ووقت الانصراف يسبق وقت الحضور (${memRec.checkInTime})!`
        }, { status: 400 });
      }

      // BUG FIX: Fetch actual user rates for memory fallback (was hardcoded 50/500/160)
      let memRate = 0, memSalary = 0, memTargetHrs = 0, memIsHourly = true;
      try {
        const memUser = await prisma.user.findUnique({
          where: { id: targetRec ? targetRec.userId : memRec.userId },
          include: { jobRoles: true }
        });
        if (memUser) {
          memRate = memUser.hourlyRate || 0;
          memSalary = memUser.monthlySalary || 0;
          memTargetHrs = memUser.targetMonthlyHours || 0;
          const role = memUser.jobRoles?.[0];
          memIsHourly = role ? role.isHourly !== false : true;
        }
      } catch {}

      const shiftCost = calculateShiftWithRateRules(
        memRec.date,
        memRec.checkInTime,
        checkOutTime,
        memRate,
        memSalary,
        memTargetHrs,
        memIsHourly,
        true,
        [],
        memRec.userId
      );
      memRec.workHours = Number((totalMins / 60).toFixed(2));
      memRec.earnedCost = shiftCost.totalCost;
      memRec.checkOutTime = checkOutTime;
      memRec.checkOutLat = finalLat;
      memRec.checkOutLng = finalLng;

      return NextResponse.json({ success: true, record: memRec });
    }


    const outDate = checkOutDate || targetRec.date;
    const totalMins = computeWorkHours(targetRec.date, targetRec.checkInTime, outDate, checkOutTime);
    if (totalMins < 0) {
      return NextResponse.json({
        success: false,
        error: `خطأ: تاريخ ووقت الانصراف يسبق وقت الحضور (${targetRec.checkInTime})!`
      }, { status: 400 });
    }

    let isOutsideGps = targetRec.isOutsideGps || false;
    let gpsDistanceMeters: number | undefined;

    if (finalLat !== null && finalLng !== null) {
      try {
        const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
        if (settings && settings.gpsEnabled && settings.gpsLatitude && settings.gpsLongitude) {
          gpsDistanceMeters = calculateGpsDistanceMeters(finalLat, finalLng, settings.gpsLatitude, settings.gpsLongitude);
          if (gpsDistanceMeters > (settings.gpsRadiusMeters || 200)) {
            isOutsideGps = true;
          }
        }
      } catch {}
    }

    const directHourlyRate = targetRec.user?.hourlyRate || 0;
    const monthlySalary = targetRec.user?.monthlySalary || 0;
    const targetMonthlyHours = targetRec.user?.targetMonthlyHours || 0;
    const primaryRole = targetRec.user?.jobRoles?.[0];
    const isHourly = primaryRole ? primaryRole.isHourly !== false : true;

    const hasCommission = Boolean(primaryRole?.hasCommission);
    const commissionRate = hasCommission ? (Number(primaryRole?.commissionRate) || 0) : 0;
    const shiftAmountType = hasCommission ? (primaryRole?.commissionType || 'SALES') : null;
    const shiftAmountNum = Number(shiftAmount) || 0;
    const commissionAmount = Number(((shiftAmountNum * commissionRate) / 100).toFixed(2));

    const workHours = Number((totalMins / 60).toFixed(2));

    let isFirstRecordOfDay = true;
    try {
      const earlierSameDayRecords = await prisma.attendanceRecord.findMany({
        where: {
          userId: targetRec.userId,
          date: targetRec.date,
          id: { not: recordId }
        },
        orderBy: { checkInTime: 'asc' }
      });
      isFirstRecordOfDay = earlierSameDayRecords.length === 0 || (earlierSameDayRecords[0].checkInTime > targetRec.checkInTime);
    } catch {}

    let rateRules: any[] = [];
    try {
      const putTenantId = targetRec?.user?.tenantId || 'default-tenant';
      rateRules = await (prisma as any).rateRule.findMany({ where: { tenantId: putTenantId, isActive: true } });
    } catch {}

    // BUG FIX: Fetch user department IDs for department-scoped rate rules
    let userDeptIds: string[] = [];
    try {
      const uWithDepts = await prisma.user.findUnique({
        where: { id: targetRec.userId },
        include: { departments: { select: { id: true } } }
      });
      userDeptIds = uWithDepts?.departments?.map((d: any) => d.id) || [];
    } catch {}

    const shiftCost = calculateShiftWithRateRules(
      targetRec.date,
      targetRec.checkInTime,
      checkOutTime,
      directHourlyRate,
      monthlySalary,
      targetMonthlyHours,
      isHourly,
      isFirstRecordOfDay,
      rateRules,
      targetRec.userId,
      userDeptIds,
      shiftAmountNum,
      commissionRate
    );
    const earnedCost = shiftCost.totalCost;

    const updated = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        checkOutTime,
        workHours,
        earnedCost,
        shiftAmount: shiftAmountNum,
        shiftAmountType,
        commissionRate,
        commissionAmount,
        checkOutLat: finalLat,
        checkOutLng: finalLng,
        isOutsideGps
      },
      include: { user: true, project: true }
    });

    const mapped = {
      id: updated.id,
      userId: updated.userId,
      userName: updated.user?.name || 'موظف',
      employeeCode: updated.user?.employeeCode || '101',
      date: updated.date,
      checkInTime: updated.checkInTime,
      checkOutTime: updated.checkOutTime,
      workHours: updated.workHours,
      earnedCost: updated.earnedCost,
      shiftAmount: updated.shiftAmount || 0,
      shiftAmountType: updated.shiftAmountType || null,
      commissionRate: updated.commissionRate || 0,
      commissionAmount: updated.commissionAmount || 0,
      isVerified: updated.isVerified ?? false,
      verifiedAt: updated.verifiedAt?.toISOString(),
      checkInLat: updated.checkInLat,
      checkInLng: updated.checkInLng,
      checkOutLat: updated.checkOutLat,
      checkOutLng: updated.checkOutLng,
      isOutsideGps: updated.isOutsideGps ?? false,
      projectId: updated.projectId || null,
      projectName: (updated as any).project?.name || updated.projectName || null,
      projectColor: (updated as any).project?.color || null,
      taskNotes: updated.taskNotes || null,
      createdAt: updated.createdAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      record: mapped,
      isOutsideGps,
      gpsDistanceMeters,
      warning: isOutsideGps ? `تنبيه: تم تسجيل الانصراف ولكن موقعك يبعد ${gpsDistanceMeters} متر عن مقر العمل!` : undefined
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تسجيل الانصراف' }, { status: 500 });
  }
}

// 4. PATCH Admin Actions (VERIFY or EDIT_TIME) in PostgreSQL
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, recordId, checkInTime, checkOutTime, date, checkOutDate, shiftAmount } = body;

    if (!recordId) {
      return NextResponse.json({ success: false, error: 'معرف السجل مطلوب' }, { status: 400 });
    }

    try {
      if (action === 'VERIFY') {
        const target = await prisma.attendanceRecord.findUnique({
          where: { id: recordId },
          include: { user: true }
        });

        if (target) {
          const newVerified = !target.isVerified;
          const verified = await prisma.attendanceRecord.update({
            where: { id: recordId },
            data: {
              isVerified: newVerified,
              verifiedAt: newVerified ? new Date() : null
            },
            include: { user: true }
          });

          return NextResponse.json({
            success: true,
            message: newVerified ? 'تم اعتماد وتوثيق السجل بنجاح' : 'تم إلغاء توثيق السجل',
            record: {
              id: verified.id,
              userId: verified.userId,
              userName: verified.user?.name || 'موظف',
              employeeCode: verified.user?.employeeCode || '101',
              date: verified.date,
              checkInTime: verified.checkInTime,
              checkOutTime: verified.checkOutTime,
              workHours: verified.workHours,
              earnedCost: verified.earnedCost,
              shiftAmount: verified.shiftAmount || 0,
              shiftAmountType: verified.shiftAmountType || null,
              commissionRate: verified.commissionRate || 0,
              commissionAmount: verified.commissionAmount || 0,
              isVerified: verified.isVerified,
              verifiedAt: verified.verifiedAt?.toISOString(),
              createdAt: verified.createdAt.toISOString()
            }
          });
        }
      } else if (action === 'EDIT_TIME') {
        const target = await prisma.attendanceRecord.findUnique({
          where: { id: recordId },
          include: { user: { include: { jobRoles: true } } }
        });

        if (target) {
          if (checkInTime && checkOutTime && checkInTime === checkOutTime) {
            return NextResponse.json({
              success: false,
              error: 'خطأ: لا يمكن أن يتطابق وقت الحضور ووقت الانصراف في نفس اللحظة!'
            }, { status: 400 });
          }

          const newDate = date || target.date;
          const outDate = checkOutDate || newDate;
          const newIn = checkInTime || target.checkInTime;
          const newOut = checkOutTime !== undefined ? checkOutTime : target.checkOutTime;

          let workHours = target.workHours;
          let earnedCost = target.earnedCost;
          const directHourlyRate = target.user?.hourlyRate || 0;
          const monthlySalary = target.user?.monthlySalary || 0;
          const targetMonthlyHours = target.user?.targetMonthlyHours || 0;
          const targetRole = (target.user as any)?.jobRoles?.[0];
          const isHourly = targetRole ? targetRole.isHourly !== false : true;

          const commissionRate = (target as any).commissionRate || (targetRole?.hasCommission ? Number(targetRole.commissionRate) || 0 : 0);
          const shiftAmountType = (target as any).shiftAmountType || (targetRole?.hasCommission ? targetRole.commissionType : 'SALES');
          const newShiftAmount = shiftAmount !== undefined ? (Number(shiftAmount) || 0) : ((target as any).shiftAmount || 0);
          const commissionAmount = Number(((newShiftAmount * commissionRate) / 100).toFixed(2));

          if (newIn && newOut) {
            const inStr = `${newDate}T${newIn.length === 5 ? newIn + ':00' : newIn}`;
            const outStr = `${outDate}T${newOut.length === 5 ? newOut + ':00' : newOut}`;
            const inTime = new Date(inStr).getTime();
            const outTime = new Date(outStr).getTime();
            let diffMins = (outTime - inTime) / 60000;
            if (diffMins < 0 && !checkOutDate) {
              const [outH] = newOut.split(':').map(Number);
              if (outH < 13) diffMins += 24 * 60;
            }

            if (diffMins < 0) {
              return NextResponse.json({
                success: false,
                error: 'خطأ: يمنع تعديل وقت وتاريخ الانصراف ليصبح قبل وقت وتاريخ الحضور!'
              }, { status: 400 });
            }

            workHours = Number((diffMins / 60).toFixed(2));

            let patchRules: any[] = [];
            try {
              const patchTenantId = target?.user?.tenantId || 'default-tenant';
              patchRules = await (prisma as any).rateRule.findMany({ where: { tenantId: patchTenantId, isActive: true } });
            } catch {}

            // BUG FIX: Calculate isFirstRecordOfDay correctly instead of hardcoding true
            let patchIsFirst = true;
            try {
              const otherSameDayRecs = await prisma.attendanceRecord.findMany({
                where: { userId: target.userId, date: newDate, id: { not: recordId } },
                orderBy: { checkInTime: 'asc' }
              });
              patchIsFirst = otherSameDayRecs.length === 0 || (otherSameDayRecs[0].checkInTime > newIn);
            } catch {}

            // BUG FIX: Fetch department IDs for department-scoped rate rules
            let patchDeptIds: string[] = [];
            try {
              const uWithDepts = await prisma.user.findUnique({
                where: { id: target.userId },
                include: { departments: { select: { id: true } } }
              });
              patchDeptIds = uWithDepts?.departments?.map((d: any) => d.id) || [];
            } catch {}

            const shiftCost = calculateShiftWithRateRules(
              newDate,
              newIn,
              newOut,
              directHourlyRate,
              monthlySalary,
              targetMonthlyHours,
              isHourly,
              patchIsFirst,
              patchRules,
              target.userId,
              patchDeptIds,
              newShiftAmount,
              commissionRate
            );
            earnedCost = shiftCost.totalCost;
          }

          const updated = await prisma.attendanceRecord.update({
            where: { id: recordId },
            data: {
              date: newDate,
              checkInTime: newIn,
              checkOutTime: newOut,
              workHours,
              earnedCost,
              shiftAmount: newShiftAmount,
              shiftAmountType,
              commissionRate,
              commissionAmount
            } as any,
            include: { user: true, project: true }
          });

          const mapped = {
            id: updated.id,
            userId: updated.userId,
            userName: (updated as any).user?.name || 'موظف',
            employeeCode: (updated as any).user?.employeeCode || '101',
            date: updated.date,
            checkInTime: updated.checkInTime,
            checkOutTime: updated.checkOutTime,
            workHours: updated.workHours,
            earnedCost: updated.earnedCost,
            shiftAmount: (updated as any).shiftAmount || 0,
            shiftAmountType: (updated as any).shiftAmountType || null,
            commissionRate: (updated as any).commissionRate || 0,
            commissionAmount: (updated as any).commissionAmount || 0,
            isVerified: updated.isVerified ?? false,
            verifiedAt: updated.verifiedAt?.toISOString(),
            projectId: updated.projectId || null,
            projectName: (updated as any).project?.name || updated.projectName || null,
            projectColor: (updated as any).project?.color || null,
            taskNotes: updated.taskNotes || null,
            createdAt: updated.createdAt.toISOString()
          };

          return NextResponse.json({ success: true, message: 'تم تعديل وقت الحضور والانصراف ومبلغ الوردية بنجاح', record: mapped });
        }
      }
    } catch {}

    const memRec = memoryRecords.find((r) => r.id === recordId);
    if (!memRec) {
      return NextResponse.json({ success: false, error: 'السجل غير موجود' }, { status: 404 });
    }

    if (action === 'VERIFY') {
      memRec.isVerified = true;
      return NextResponse.json({ success: true, message: 'تم توثيق الحضور بنجاح', record: memRec });
    }

    if (action === 'EDIT_TIME') {
      if (checkInTime) memRec.checkInTime = checkInTime;
      if (checkOutTime !== undefined) memRec.checkOutTime = checkOutTime;
      return NextResponse.json({ success: true, message: 'تم تعديل وقت الحضور والانصراف بنجاح', record: memRec });
    }

    return NextResponse.json({ success: false, error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في العملية' }, { status: 500 });
  }
}

// 5. DELETE Attendance Record in PostgreSQL
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف سجل الحضور مطلوب' }, { status: 400 });
    }

    try {
      await prisma.attendanceRecord.delete({ where: { id } });
    } catch (dbErr: any) {
      console.error('Delete attendance DB error:', dbErr);
      if (!memoryRecords.some(r => r.id === id)) {
        return NextResponse.json({ success: false, error: 'تعذر حذف سجل الحضور من قاعدة البيانات' }, { status: 500 });
      }
    }

    memoryRecords = memoryRecords.filter((r) => r.id !== id);

    return NextResponse.json({ success: true, message: 'تم حذف سجل الحضور بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في حذف سجل الحضور' }, { status: 500 });
  }
}
