import { RateRule } from './types';

export interface ShiftCostBreakdown {
  workHours: number;
  baseCost: number;
  bonusCost: number;
  jobRoleCost: number;
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
  departmentIds?: string[]
): ShiftCostBreakdown {
  if (!checkInTime || !checkOutTime) {
    return {
      workHours: 0,
      baseCost: 0,
      bonusCost: 0,
      jobRoleCost: 0,
      totalCost: 0,
      appliedRules: []
    };
  }

  const [inH, inM] = checkInTime.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);

  const startMins = inH * 60 + (inM || 0);
  let endMins = outH * 60 + (outM || 0);

  if (endMins < startMins) {
    endMins += 1440; // Overnight shift
  }

  const totalMins = endMins - startMins;
  if (totalMins <= 0) {
    return {
      workHours: 0,
      baseCost: 0,
      bonusCost: 0,
      jobRoleCost: 0,
      totalCost: 0,
      appliedRules: []
    };
  }

  const workHours = Number((totalMins / 60).toFixed(2));
  const activeRules = (rules || []).filter(r => r.isActive);

  let totalBonusCost = 0;
  const ruleMinutesMap: { [ruleId: string]: { rule: RateRule; minutes: number; bonus: number } } = {};

  // Evaluate in 1-minute steps for active rate rules
  if (activeRules.length > 0) {
    for (let m = startMins; m < endMins; m++) {
      const isNextDay = m >= 1440;
      const effectiveDate = isNextDay ? getNextDateStr(date) : date;
      const dayOfWeek = new Date(effectiveDate + 'T12:00:00').getDay(); // 0=Sun ... 5=Fri, 6=Sat
      const minuteOfDay = m % 1440;

      // Check applicable rules for this specific minute
      activeRules.forEach((rule) => {
        // 1. Check user / department scope
        if (rule.appliesTo === 'EMPLOYEE' && rule.targetId && rule.targetId !== userId) {
          return;
        }
        if (rule.appliesTo === 'DEPARTMENT' && rule.targetId) {
          if (!departmentIds || !departmentIds.includes(rule.targetId)) {
            return;
          }
        }

        // 2. Check date / day of week
        if (rule.ruleType === 'ONE_TIME') {
          if (rule.specificDate && rule.specificDate !== effectiveDate) {
            return;
          }
        } else {
          // RECURRING
          if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
            if (!rule.daysOfWeek.includes(dayOfWeek)) {
              return;
            }
          }
        }

        // 3. Check time of day
        if (rule.startTime && rule.endTime) {
          const [rStartH, rStartM] = rule.startTime.split(':').map(Number);
          const [rEndH, rEndM] = rule.endTime.split(':').map(Number);
          const rStartTotal = rStartH * 60 + (rStartM || 0);
          let rEndTotal = rEndH * 60 + (rEndM || 0);
          if (rEndTotal === 0 && (rEndH === 24 || rule.endTime === '24:00')) {
            rEndTotal = 1440;
          }

          if (rStartTotal < rEndTotal) {
            if (minuteOfDay < rStartTotal || minuteOfDay >= rEndTotal) {
              return;
            }
          } else {
            // Rule crosses midnight (e.g. 22:00 to 06:00)
            if (minuteOfDay < rStartTotal && minuteOfDay >= rEndTotal) {
              return;
            }
          }
        }

        // Rule matched this minute!
        let minuteBonus = 0;
        if (rule.increaseType === 'FIXED_AMOUNT') {
          minuteBonus = (rule.value || 0) / 60;
        } else {
          // PERCENTAGE
          minuteBonus = ((directHourlyRate || 0) * ((rule.value || 0) / 100)) / 60;
        }

        totalBonusCost += minuteBonus;

        if (!ruleMinutesMap[rule.id]) {
          ruleMinutesMap[rule.id] = { rule, minutes: 0, bonus: 0 };
        }
        ruleMinutesMap[rule.id].minutes += 1;
        ruleMinutesMap[rule.id].bonus += minuteBonus;
      });
    }
  }

  // Job Role Dual Salary Component
  let jobRoleCost = 0;
  if (isHourly) {
    if (targetMonthlyHours && targetMonthlyHours > 0) {
      jobRoleCost = Number(((workHours * (monthlySalary || 0)) / targetMonthlyHours).toFixed(2));
    }
  } else {
    // Fixed monthly salary
    jobRoleCost = isFirstRecordOfDay ? Number(((monthlySalary || 0) / 30).toFixed(2)) : 0;
  }

  const finalBaseCost = Number((workHours * (directHourlyRate || 0)).toFixed(2));
  const finalBonusCost = Number(totalBonusCost.toFixed(2));
  const totalCost = Number((finalBaseCost + finalBonusCost + jobRoleCost).toFixed(2));

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
    totalCost,
    appliedRules
  };
}
