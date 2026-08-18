import { RateRule } from './types';

export interface ShiftCostBreakdown {
  workHours: number;
  baseCost: number;
  bonusCost: number;
  jobRoleCost: number;
  commissionAmount: number;
  totalCost: number;
  appliedRules: {
    ruleId: string;
    ruleName: string;
    hours: number;
    bonusAmount: number;
  }[];
}

const getNextDateStr = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

/**
 * حساب تقاطع نطاقَين [a, b] و [c, d] بالدقائق
 * بديل كفوء O(1) عن حلقة minute-by-minute
 */
function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

export function calculateShiftWithRateRules(
  date: string,
  checkInTime: string,
  checkOutTime: string | null | undefined,
  directHourlyRate: number,
  monthlySalary: number,
  targetMonthlyHours: number,
  isHourly: boolean,
  isFirstRecordOfDay: boolean,
  rules: RateRule[],
  userId?: string,
  departmentIds?: string[],
  shiftAmount: number = 0,
  commissionRate: number = 0
): ShiftCostBreakdown {
  const finalCommission = Number(((shiftAmount || 0) * ((commissionRate || 0) / 100)).toFixed(2));

  if (!checkInTime || !checkOutTime) {
    return {
      workHours: 0,
      baseCost: 0,
      bonusCost: 0,
      jobRoleCost: 0,
      commissionAmount: finalCommission,
      totalCost: finalCommission,
      appliedRules: []
    };
  }

  const [inH, inM] = checkInTime.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);

  const startMins = inH * 60 + (inM || 0);
  let endMins = outH * 60 + (outM || 0);

  if (endMins < startMins) {
    endMins += 1440; // وردية ليلية تتجاوز منتصف الليل
  }

  const totalMins = endMins - startMins;
  if (totalMins <= 0) {
    return {
      workHours: 0,
      baseCost: 0,
      bonusCost: 0,
      jobRoleCost: 0,
      commissionAmount: 0,
      totalCost: 0,
      appliedRules: []
    };
  }

  const workHours = Number((totalMins / 60).toFixed(2));
  const activeRules = (rules || []).filter(r => r.isActive);

  let totalBonusCost = 0;
  const ruleMinutesMap: { [ruleId: string]: { rule: RateRule; minutes: number; bonus: number } } = {};

  if (activeRules.length > 0) {
    /**
     * تقسيم الوردية إلى مقاطع:
     * - مقطع 1: [startMins .. min(endMins, 1440)] على التاريخ الأصلي
     * - مقطع 2 (إذا وردية ليلية): [0 .. endMins-1440] على اليوم التالي
     * هذا يحل مشكلة الاحتساب الدقيق عند تغيُّر اليوم
     */
    type Segment = { segStart: number; segEnd: number; effectiveDate: string };
    const segments: Segment[] = [];

    if (endMins <= 1440) {
      segments.push({ segStart: startMins, segEnd: endMins, effectiveDate: date });
    } else {
      segments.push({ segStart: startMins, segEnd: 1440, effectiveDate: date });
      segments.push({ segStart: 0, segEnd: endMins - 1440, effectiveDate: getNextDateStr(date) });
    }

    for (const seg of segments) {
      const dayOfWeek = new Date(seg.effectiveDate + 'T12:00:00').getDay(); // 0=Sun..6=Sat
      const segMins = seg.segEnd - seg.segStart;
      if (segMins <= 0) continue;

      for (const rule of activeRules) {
        // 1. فحص نطاق التطبيق (موظف / قسم / الجميع)
        if (rule.appliesTo === 'EMPLOYEE' && rule.targetId && rule.targetId !== userId) continue;
        if (rule.appliesTo === 'DEPARTMENT' && rule.targetId) {
          if (!departmentIds || !departmentIds.includes(rule.targetId)) continue;
        }

        // 2. فحص التاريخ / اليوم
        if (rule.ruleType === 'ONE_TIME') {
          if (rule.specificDate && rule.specificDate !== seg.effectiveDate) continue;
        } else {
          // RECURRING
          if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayOfWeek)) continue;
        }

        // 3. حساب التقاطع بالدقائق
        let matchedMins = 0;

        if (rule.startTime && rule.endTime) {
          const [rStartH, rStartM] = rule.startTime.split(':').map(Number);
          const [rEndH, rEndM] = rule.endTime.split(':').map(Number);
          const rStart = rStartH * 60 + (rStartM || 0);
          let rEnd = rEndH * 60 + (rEndM || 0);

          // معالجة '24:00' كنهاية اليوم
          if (rEnd === 0 || rule.endTime === '24:00') rEnd = 1440;

          if (rStart < rEnd) {
            // قاعدة عادية لا تتجاوز منتصف الليل
            matchedMins = overlapMinutes(seg.segStart, seg.segEnd, rStart, rEnd);
          } else {
            // قاعدة تتجاوز منتصف الليل (مثال: 22:00 → 06:00)
            // تُطبَّق على [rStart..1440] + [0..rEnd]
            const o1 = overlapMinutes(seg.segStart, seg.segEnd, rStart, 1440);
            const o2 = overlapMinutes(seg.segStart, seg.segEnd, 0, rEnd);
            matchedMins = o1 + o2;
          }
        } else {
          // القاعدة تنطبق على كامل المقطع (لا قيود زمنية)
          matchedMins = segMins;
        }

        if (matchedMins <= 0) continue;

        // حساب قيمة المكافأة
        let minuteBonus = 0;
        if (rule.increaseType === 'FIXED_AMOUNT') {
          minuteBonus = ((rule.value || 0) / 60) * matchedMins;
        } else {
          // PERCENTAGE من أجر الساعة المباشر
          minuteBonus = (((directHourlyRate || 0) * ((rule.value || 0) / 100)) / 60) * matchedMins;
        }

        totalBonusCost += minuteBonus;

        if (!ruleMinutesMap[rule.id]) {
          ruleMinutesMap[rule.id] = { rule, minutes: 0, bonus: 0 };
        }
        ruleMinutesMap[rule.id].minutes += matchedMins;
        ruleMinutesMap[rule.id].bonus += minuteBonus;
      }
    }
  }

  // حساب حصة الراتب الوظيفي
  let jobRoleCost = 0;
  if (isHourly) {
    if (targetMonthlyHours && targetMonthlyHours > 0) {
      jobRoleCost = Number(((workHours * (monthlySalary || 0)) / targetMonthlyHours).toFixed(2));
    }
  } else {
    // راتب شهري ثابت: حصة يومية مرة واحدة فقط
    jobRoleCost = isFirstRecordOfDay ? Number(((monthlySalary || 0) / 30).toFixed(2)) : 0;
  }

  const finalBaseCost = Number((workHours * (directHourlyRate || 0)).toFixed(2));
  const finalBonusCost = Number(totalBonusCost.toFixed(2));
  const totalCost = Number((finalBaseCost + finalBonusCost + jobRoleCost + finalCommission).toFixed(2));

  const appliedRules = Object.values(ruleMinutesMap).map(({ rule, minutes, bonus }) => ({
    ruleId: rule.id,
    ruleName: rule.name,
    hours: Number((minutes / 60).toFixed(2)),
    bonusAmount: Number(bonus.toFixed(2))
  }));

  return {
    workHours,
    baseCost: finalBaseCost,
    bonusCost: finalBonusCost,
    jobRoleCost,
    commissionAmount: finalCommission,
    totalCost,
    appliedRules
  };
}
