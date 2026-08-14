'use client';

import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord } from '@/lib/types';
import { 
  Calendar as CalendarIcon, Clock, Printer, ChevronRight, ChevronLeft, 
  UserCheck, Coins, MapPin, ShieldAlert, Sparkles, Phone, MessageSquare, 
  Activity, Users, CheckCircle2, AlertTriangle, Eye, ArrowRightLeft, Filter
} from 'lucide-react';
import { formatTime12h } from '@/lib/utils';

interface AttendanceCalendarProps {
  users: User[];
  records: AttendanceRecord[];
}

const colorThemes = [
  { bg: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { bg: 'from-blue-500 to-indigo-600', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { bg: 'from-purple-500 to-violet-600', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { bg: 'from-amber-500 to-orange-600', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { bg: 'from-rose-500 to-pink-600', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { bg: 'from-sky-500 to-cyan-600', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { bg: 'from-fuchsia-500 to-pink-600', badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
  { bg: 'from-teal-500 to-emerald-600', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' }
];

interface GroupedEmp {
  userId: string;
  userName: string;
  employeeCode: string;
  phone?: string | null;
  records: AttendanceRecord[];
  totalHours: number;
  totalEarned: number;
  theme: typeof colorThemes[0];
}

export default function AttendanceCalendar({ users, records }: AttendanceCalendarProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'GPS_ALERT'>('ALL');
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<AttendanceRecord | null>(null);

  // Month Navigation State (Year & Month: 0-indexed)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  // Real-time current time for Live Indicator
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Hours: 00 to 23
  const hours24 = Array.from({ length: 24 }, (_, i) => i);

  // Days in selected Month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Records for selected date & Grouping by employee
  const selectedDayRecords = records.filter((r) => r.date === selectedDateStr);

  // Apply Filter
  const filteredDayRecords = selectedDayRecords.filter((r) => {
    if (activeFilter === 'ACTIVE') return !r.checkOutTime;
    if (activeFilter === 'GPS_ALERT') return r.isOutsideGps;
    return true;
  });

  const groupedList: GroupedEmp[] = [];
  const map: { [id: string]: GroupedEmp } = {};

  filteredDayRecords.forEach((r) => {
    if (!map[r.userId]) {
      const themeIdx = Object.keys(map).length % colorThemes.length;
      const matchedUser = users.find(u => u.id === r.userId);
      map[r.userId] = {
        userId: r.userId,
        userName: r.userName,
        employeeCode: r.employeeCode,
        phone: matchedUser?.phone || null,
        records: [],
        totalHours: 0,
        totalEarned: 0,
        theme: colorThemes[themeIdx]
      };
      groupedList.push(map[r.userId]);
    }
    map[r.userId].records.push(r);
    map[r.userId].totalHours += r.workHours || 0;
    map[r.userId].totalEarned += r.earnedCost || 0;
  });

  // Calculate Pharmacy Hourly Coverage (0 to 23 hours)
  const hourlyCoverage = hours24.map((hour) => {
    const hourStartMins = hour * 60;
    const hourEndMins = (hour + 1) * 60;

    const attendeesInHour = selectedDayRecords.filter((r) => {
      if (!r.checkInTime) return false;
      const [inH, inM] = r.checkInTime.split(':').map(Number);
      const startMins = inH * 60 + (inM || 0);

      let endMins = startMins + 480; // default 8h if open
      if (r.checkOutTime) {
        const [outH, outM] = r.checkOutTime.split(':').map(Number);
        endMins = outH * 60 + (outM || 0);
        if (endMins < startMins) endMins += 24 * 60;
      }

      return startMins < hourEndMins && endMins > hourStartMins;
    });

    return {
      hour,
      count: attendeesInHour.length,
      attendees: attendeesInHour.map(a => a.userName)
    };
  });

  // Monthly Records & Metrics
  const selectedMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthRecords = records.filter((r) => r.date && r.date.startsWith(selectedMonthPrefix));

  const monthTotalHours = Number(monthRecords.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(2));
  const monthTotalEarned = Number(monthRecords.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2));
  const monthActiveEmployees = new Set(monthRecords.map((r) => r.userId)).size;
  const monthWorkingDays = new Set(monthRecords.map((r) => r.date)).size;

  // Weekly Records & Metrics (Saturday to Friday)
  const selDate = new Date(selectedDateStr);
  const dayOfWeek = selDate.getDay();
  const diffToSat = (dayOfWeek + 1) % 7;
  const weekStart = new Date(selDate);
  weekStart.setDate(selDate.getDate() - diffToSat);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const weekRecords = records.filter((r) => r.date && r.date >= weekStartStr && r.date <= weekEndStr);
  const weekTotalHours = Number(weekRecords.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(2));
  const weekTotalEarned = Number(weekRecords.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2));
  const weekActiveEmployees = new Set(weekRecords.map((r) => r.userId)).size;
  const weekWorkingDays = new Set(weekRecords.map((r) => r.date)).size;

  // Week days array for Week Gantt Grid
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: dayNames[i],
      dayNum: d.getDate()
    };
  });

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    'يناير (01)', 'فبراير (02)', 'مارس (03)', 'أبريل (04)',
    'مايو (05)', 'يونيو (06)', 'يوليو (07)', 'أغسطس (08)',
    'سبتمبر (09)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
  ];

  const getShiftBarPosition = (checkInStr: string, checkOutStr?: string | null) => {
    if (!checkInStr) return { left: '0%', width: '0%' };

    const [inH, inM] = checkInStr.split(':').map(Number);
    const startMins = inH * 60 + (inM || 0);

    let endMins = startMins + 480;
    if (checkOutStr) {
      const [outH, outM] = checkOutStr.split(':').map(Number);
      endMins = outH * 60 + (outM || 0);
      if (endMins < startMins) endMins += 24 * 60;
    }

    const leftPercent = Math.min(100, Math.max(0, (startMins / 1440) * 100));
    const widthPercent = Math.min(100 - leftPercent, Math.max(2, ((endMins - startMins) / 1440) * 100));

    return {
      left: `${leftPercent.toFixed(1)}%`,
      width: `${widthPercent.toFixed(1)}%`
    };
  };

  const formatHoursText = (hoursNum: number) => {
    if (!hoursNum && hoursNum !== 0) return '0 دقيقة';
    const totalMinutes = Math.round(hoursNum * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hrs > 0 && mins > 0) {
      return `${hrs} ساعة و ${mins} دقيقة`;
    } else if (hrs > 0 && mins === 0) {
      return `${hrs} ساعة`;
    } else {
      return `${mins} دقيقة`;
    }
  };

  const liveLinePercent = (currentTimeMinutes / 1440) * 100;
  const isSelectedDateToday = selectedDateStr === todayStr;

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Top Controls Bar: View Modes & Filters */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black shadow-md">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              لوحة المراقبة الزمنية والتقويم الذكي
              <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold border border-blue-200">
                صيدلية بيتك
              </span>
            </h2>
            <p className="text-slate-500 text-xs font-semibold">
              تتبع دوام الصيادلة الحي، كشف ثغرات التغطية، ورصد الخط الزمني
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-black">
          <button
            onClick={() => setViewMode('DAY')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'DAY'
                ? 'bg-white text-blue-700 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            الخط الزمني اليومي (24س)
          </button>
          <button
            onClick={() => setViewMode('WEEK')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'WEEK'
                ? 'bg-white text-blue-700 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            مخطط الأسبوع
          </button>
          <button
            onClick={() => setViewMode('MONTH')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'MONTH'
                ? 'bg-white text-blue-700 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            التقويم الشهري
          </button>
        </div>
      </div>

      {/* VIEW 1: DAY TIMELINE (الخط الزمني اليومي المفصل 24 ساعة) */}
      {viewMode === 'DAY' && (
        <div className="space-y-6">
          {/* Timeline Date Selector & Filters */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                />
                <button
                  onClick={() => setSelectedDateStr(todayStr)}
                  className={`px-3.5 h-11 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    isSelectedDateToday
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  📍 اليوم
                </button>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    activeFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  كافة الشفتات ({selectedDayRecords.length})
                </button>
                <button
                  onClick={() => setActiveFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                    activeFilter === 'ACTIVE'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  شفتات جارية الآن ({selectedDayRecords.filter(r => !r.checkOutTime).length})
                </button>
                <button
                  onClick={() => setActiveFilter('GPS_ALERT')}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                    activeFilter === 'GPS_ALERT'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  خارج GPS ({selectedDayRecords.filter(r => r.isOutsideGps).length})
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all print:hidden"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                طباعة التقرير
              </button>
            </div>

            {/* 24-Hour Timeline Master Board */}
            <div className="bg-slate-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-6 overflow-x-auto">
              
              {/* 1. Top Ruler (Hours 00 to 23) */}
              <div className="flex items-center justify-between font-mono text-[11px] font-black text-slate-400 pb-2 border-b border-slate-800">
                <span className="w-60 shrink-0 text-right font-sans text-xs font-bold text-slate-300 pl-2">
                  الموظف / الدوام
                </span>
                <div className="flex-1 grid text-center font-bold" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }} dir="ltr">
                  {hours24.map((h) => (
                    <span key={h} className="text-slate-400 text-[11px]">
                      {String(h).padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. Pharmacy Shift Coverage Heatmap Bar (شريط كشف التغطية والفراغات) */}
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-indigo-500/30 shadow-inner flex flex-wrap sm:flex-nowrap items-center gap-4">
                <div className="w-full sm:w-60 shrink-0 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-indigo-300 text-sm">تغطية الصيدلية بالساعة</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                      مباشر
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    🟢 كادر متكامل | 🟡 صيدلي واحد | 🔴 ثغرة دوام (فارغ)
                  </p>
                </div>

                <div className="relative flex-1 bg-slate-950 rounded-xl border border-slate-800 p-1.5 overflow-hidden min-w-[320px]" dir="ltr">
                  <div className="grid gap-1 h-7" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                    {hourlyCoverage.map((slot) => {
                      const isZero = slot.count === 0;
                      const isOne = slot.count === 1;
                      const isGood = slot.count >= 2;

                      return (
                        <div
                          key={slot.hour}
                          title={`الساعة ${String(slot.hour).padStart(2, '0')}:00 ➔ ${slot.count} موظفين (${slot.attendees.join(', ') || 'لا يوجد كادر'})`}
                          className={`rounded-md flex items-center justify-center font-mono font-black text-[10px] transition-all cursor-help ${
                            isGood
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : isOne
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-rose-950/60 border border-rose-800/80 text-rose-400'
                          }`}
                        >
                          {slot.count > 0 ? slot.count : '0'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Combined Master Coverage Line */}
              <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-wrap sm:flex-nowrap items-start gap-4">
                <div className="w-full sm:w-60 shrink-0 space-y-0.5 text-xs">
                  <span className="font-black text-blue-400 text-sm">الشريط الموحد المدمج</span>
                  <p className="text-[10px] text-slate-400">تراكب كافة الشفتات في خط زمني واحد</p>
                </div>

                <div className="relative flex-1 bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden min-w-[320px]" dir="ltr">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 grid opacity-15 pointer-events-none" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                    {hours24.map((h) => (
                      <div key={h} className="border-r border-slate-400 h-full"></div>
                    ))}
                  </div>

                  {/* Live Red Line Indicator */}
                  {isSelectedDateToday && (
                    <div 
                      style={{ left: `${liveLinePercent}%` }}
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 shadow-[0_0_8px_#f43f5e]"
                    >
                      <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                      <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                    </div>
                  )}

                  {/* Sub-rows */}
                  <div className="relative z-10 space-y-1">
                    {groupedList.map((emp) => (
                      <div key={`m-${emp.userId}`} className="relative h-3 w-full">
                        {emp.records.map((rec) => {
                          const pos = getShiftBarPosition(rec.checkInTime, rec.checkOutTime);
                          return (
                            <button
                              type="button"
                              key={`ms-${rec.id}`}
                              onClick={() => setSelectedShiftForDetail(rec)}
                              style={{ left: pos.left, width: pos.width }}
                              className={`absolute inset-y-0 bg-gradient-to-r ${emp.theme.bg} text-white text-[9px] font-black font-mono rounded-sm flex items-center justify-between px-1.5 shadow-sm transition-all whitespace-nowrap overflow-hidden cursor-pointer hover:opacity-90`}
                            >
                              <span className="truncate leading-none">{rec.userName.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Employee Detailed Shift Tracks */}
              <div className="space-y-3 pt-2">
                {groupedList.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-bold">
                    لا توجد سجلات دوام مطابقة للفلتر المحدد في هذا اليوم.
                  </div>
                ) : (
                  groupedList.map((emp) => (
                    <div key={emp.userId} className="p-3.5 bg-slate-900/90 hover:bg-slate-900 rounded-2xl border border-slate-800/80 transition-all flex flex-wrap sm:flex-nowrap items-center gap-4">
                      {/* Employee Meta Card */}
                      <div className="w-full sm:w-60 shrink-0 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-white text-sm">{emp.userName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono border ${emp.theme.badge}`}>
                            {emp.employeeCode}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-400">إجمالي اليوم: {formatHoursText(emp.totalHours)}</span>
                          <span className="text-emerald-400 font-mono">{emp.totalEarned.toFixed(2)} د.ل</span>
                        </div>
                        {emp.phone && (
                          <a
                            href={`https://wa.me/${emp.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono font-semibold"
                            dir="ltr"
                          >
                            <Phone className="w-3 h-3" />
                            {emp.phone}
                          </a>
                        )}
                      </div>

                      {/* 24h Timeline Track Bar with Live Indicator */}
                      <div className="relative h-9 flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden min-w-[320px]" dir="ltr">
                        {/* Grid Lines */}
                        <div className="absolute inset-0 grid opacity-15 pointer-events-none" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                          {hours24.map((h) => (
                            <div key={h} className="border-r border-slate-400 h-full"></div>
                          ))}
                        </div>

                        {/* Live Red Line Indicator */}
                        {isSelectedDateToday && (
                          <div 
                            style={{ left: `${liveLinePercent}%` }}
                            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 shadow-[0_0_8px_#f43f5e]"
                          ></div>
                        )}

                        {/* Shift Blocks */}
                        {emp.records.map((rec) => {
                          const pos = getShiftBarPosition(rec.checkInTime, rec.checkOutTime);
                          return (
                            <button
                              type="button"
                              key={rec.id}
                              onClick={() => setSelectedShiftForDetail(rec)}
                              style={{ left: pos.left, width: pos.width }}
                              className={`absolute top-1 bottom-1 bg-gradient-to-r ${emp.theme.bg} text-white text-[10px] font-black font-mono rounded-lg flex items-center justify-between px-2.5 shadow-md transition-all whitespace-nowrap overflow-hidden z-10 cursor-pointer hover:ring-2 hover:ring-white`}
                            >
                              <span>{formatTime12h(rec.checkInTime)}</span>
                              <span className="opacity-90 font-sans truncate px-1">{formatHoursText(rec.workHours)}</span>
                              <span>{rec.checkOutTime ? formatTime12h(rec.checkOutTime) : 'مباشر 🟢'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Daily Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">الموظفين الحاضرين اليوم</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">{groupedList.length} موظف</span>
                </div>
                <Users className="w-8 h-8 text-slate-700" />
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">إجمالي ساعات اليوم</span>
                  <span className="text-lg font-black text-white font-mono">
                    {formatHoursText(selectedDayRecords.reduce((acc, r) => acc + (r.workHours || 0), 0))}
                  </span>
                </div>
                <Clock className="w-8 h-8 text-slate-700" />
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">إجمالي مستحقات اليوم</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {selectedDayRecords.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2)} د.ل
                  </span>
                </div>
                <Coins className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY GANTT GRID (مخطط الأسبوع 7 أيام) */}
      {viewMode === 'WEEK' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                مخطط الدوام الأسبوعي ({weekStartStr} ➔ {weekEndStr})
              </h3>
              <p className="text-slate-500 text-xs font-semibold">
                عرض ساعات الدوام ومستحقات كل موظف على مدار أيام الأسبوع السبعة
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-3.5 px-4 font-black">الموظف</th>
                  {weekDays.map((d) => (
                    <th key={d.dateStr} className="py-3.5 px-3 text-center font-bold">
                      <div>{d.dayName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{d.dateStr.slice(5)}</span>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-center font-black text-blue-700">إجمالي الأسبوع</th>
                  <th className="py-3.5 px-4 text-center font-black text-emerald-700">مستحق الأسبوع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.filter(u => u.role !== 'ADMIN').map((emp) => {
                  const empWeekRecs = weekRecords.filter(r => r.userId === emp.id);
                  const totalWeekHours = empWeekRecs.reduce((acc, r) => acc + (r.workHours || 0), 0);
                  const totalWeekEarned = empWeekRecs.reduce((acc, r) => acc + (r.earnedCost || 0), 0);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{emp.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">({emp.employeeCode})</span>
                      </td>
                      {weekDays.map((d) => {
                        const dayRecs = empWeekRecs.filter(r => r.date === d.dateStr);
                        const dayHours = dayRecs.reduce((acc, r) => acc + (r.workHours || 0), 0);

                        return (
                          <td key={d.dateStr} className="py-3.5 px-3 text-center">
                            {dayHours > 0 ? (
                              <button
                                onClick={() => {
                                  setSelectedDateStr(d.dateStr);
                                  setViewMode('DAY');
                                }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-mono font-bold text-[11px] border border-blue-200 cursor-pointer"
                              >
                                {dayHours.toFixed(1)} س
                              </button>
                            ) : (
                              <span className="text-slate-300 font-mono">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3.5 px-4 text-center font-mono font-black text-blue-700 bg-blue-50/40">
                        {totalWeekHours.toFixed(1)} ساعة
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-700 bg-emerald-50/40">
                        {totalWeekEarned.toFixed(2)} د.ل
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: MONTHLY HEATMAP CALENDAR (التقويم الشهري المصور) */}
      {viewMode === 'MONTH' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  تقويم شهر {monthNames[currentMonth]} {currentYear}
                </h3>
                <p className="text-slate-500 text-xs font-semibold">
                  اختر أي يوم للانتقال الفوري إلى خطه الزمني 24 ساعة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={prevMonth}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                الشهر السابق
              </button>
              <span className="px-3 py-1.5 bg-slate-900 text-emerald-400 font-bold rounded-xl">
                {currentYear}-{String(currentMonth + 1).padStart(2, '0')}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1"
              >
                الشهر التالي
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Matrix */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center text-xs">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayRecords = records.filter((r) => r.date === dateStr);
              const totalHours = dayRecords.reduce((acc, r) => acc + (r.workHours || 0), 0);
              const isSelected = selectedDateStr === dateStr;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDateStr(dateStr);
                    setViewMode('DAY');
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between h-24 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400'
                      : isToday
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : dayRecords.length > 0
                      ? 'bg-slate-50 border-slate-200 text-slate-900 hover:border-blue-400'
                      : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-sm font-black">{dayNum}</span>
                    {isToday && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                        اليوم
                      </span>
                    )}
                  </div>

                  {dayRecords.length > 0 ? (
                    <div className="text-[10px] space-y-0.5 font-bold">
                      <div className="flex items-center gap-1 text-slate-600">
                        <UserCheck className="w-3 h-3" />
                        <span>{dayRecords.length} موظفين</span>
                      </div>
                      <div className="font-mono text-[10px] text-blue-700 font-black">
                        {totalHours.toFixed(1)} ساعة
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] opacity-30">فارغ</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SHIFT DETAILS MODAL (نافذة تفاصيل الشفت التفاعلية) */}
      {selectedShiftForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedShiftForDetail.userName}</h3>
                  <span className="text-xs text-slate-500 font-mono">كود: {selectedShiftForDetail.employeeCode}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedShiftForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">التاريخ:</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedShiftForDetail.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">وقت الحضور:</span>
                  <span className="font-bold text-emerald-700 font-mono">{formatTime12h(selectedShiftForDetail.checkInTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">وقت الانصراف:</span>
                  <span className="font-bold text-rose-700 font-mono">
                    {selectedShiftForDetail.checkOutTime ? formatTime12h(selectedShiftForDetail.checkOutTime) : 'جاري العمل الآن 🟢'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">مدة الشفت:</span>
                  <span className="font-black text-slate-900 font-sans">{formatHoursText(selectedShiftForDetail.workHours)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">الأجر المحتسب:</span>
                  <span className="font-black text-emerald-700 font-mono">{selectedShiftForDetail.earnedCost} د.ل</span>
                </div>
              </div>

              {/* GPS status */}
              <div className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
                selectedShiftForDetail.isOutsideGps
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                {selectedShiftForDetail.isOutsideGps ? (
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {selectedShiftForDetail.isOutsideGps ? '⚠️ تسجيل خارج نطاق الصيدلية' : '🟢 تسجيل من داخل نطاق الصيدلية'}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {selectedShiftForDetail.isOutsideGps ? 'تم تسجيل الدخول أو الخروج من مسافة تزيد عن 200م' : 'ضمن نطاق الـ 200م المحدد للصيدلية'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedShiftForDetail(null)}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
