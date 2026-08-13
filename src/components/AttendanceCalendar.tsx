'use client';

import React, { useState } from 'react';
import { User, AttendanceRecord } from '@/lib/types';
import { Calendar as CalendarIcon, Clock, Printer, ChevronRight, ChevronLeft, UserCheck, Coins } from 'lucide-react';

interface AttendanceCalendarProps {
  users: User[];
  records: AttendanceRecord[];
}

export default function AttendanceCalendar({ users, records }: AttendanceCalendarProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Month Navigation State (Year & Month: 0-indexed)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  // Hours: 00 to 23
  const hours24 = Array.from({ length: 24 }, (_, i) => i);

  // Days in selected Month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Records for selected date
  const selectedDayRecords = records.filter((r) => r.date === selectedDateStr);

  // Month navigation
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

  // Helper to calculate position and width percentage for a 24-hour timeline
  const getShiftBarPosition = (checkInStr: string, checkOutStr?: string | null) => {
    if (!checkInStr) return { left: '0%', width: '0%' };

    const [inH, inM] = checkInStr.split(':').map(Number);
    const startMins = inH * 60 + (inM || 0);

    let endMins = startMins + 480; // default 8 hours if checked in but not checked out yet
    if (checkOutStr) {
      const [outH, outM] = checkOutStr.split(':').map(Number);
      endMins = outH * 60 + (outM || 0);
      if (endMins < startMins) endMins += 24 * 60; // Overnight
    }

    const leftPercent = Math.min(100, Math.max(0, (startMins / 1440) * 100));
    const widthPercent = Math.min(100 - leftPercent, Math.max(2, ((endMins - startMins) / 1440) * 100));

    return {
      left: `${leftPercent.toFixed(1)}%`,
      width: `${widthPercent.toFixed(1)}%`
    };
  };

  // Helper to format hours in Hours and Minutes
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* 1. Monthly Calendar Navigation Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                تقويم ساعات الحضور لـ {monthNames[currentMonth]} {currentYear}
              </h2>
              <p className="text-slate-500 text-xs font-semibold">
                انقر على أي يوم لاستعراض الخط الزمني للساعات وشفتات الحضور
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

        {/* Days Grid */}
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
                onClick={() => setSelectedDateStr(dateStr)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between h-20 ${
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
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>{dayRecords.length} موظف</span>
                    </div>
                    <div className="font-mono text-[9px] opacity-90">
                      {totalHours.toFixed(1)} س
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] opacity-40">لا يوجد</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Day Unified 24-Hour Timeline Chart & Report */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              الخط الزمني الموحد 24 ساعة لساعات الحضور يوم (<span className="font-mono text-blue-700">{selectedDateStr}</span>)
            </h3>
            <p className="text-slate-500 text-xs font-semibold">
              شريط زمن 24 ساعة موحد يظهر تغطية دوام الموظفين والتسلسل الزمني لليوم
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all print:hidden"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            طباعة التقرير اليومي
          </button>
        </div>

        {selectedDayRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            لا توجد ساعات دوام مسجلة لهذا اليوم ({selectedDateStr}).
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unified 24-Hour Timeline Master Container */}
            <div className="bg-slate-900/95 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-5 overflow-x-auto">
              
              {/* 24-Hour Top Ruler */}
              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px] font-black text-slate-400 pb-1 border-b border-slate-800">
                  <span className="w-48 text-right font-sans text-xs font-bold text-slate-300">الموظف / الدوام</span>
                  <div className="flex-1 flex items-center justify-between px-2">
                    {hours24.map((h) => (
                      <span key={h} className="text-center w-6 text-slate-400 font-bold">
                        {String(h).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stacked Rows for Employees */}
              <div className="space-y-3">
                {selectedDayRecords.map((rec, idx) => {
                  const pos = getShiftBarPosition(rec.checkInTime, rec.checkOutTime);
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
                  const theme = colorThemes[idx % colorThemes.length];

                  return (
                    <div key={rec.id} className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700/80 transition-all flex flex-wrap sm:flex-nowrap items-center gap-4">
                      {/* Employee Mini Card (Right Side in RTL) */}
                      <div className="w-full sm:w-60 shrink-0 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-white text-sm font-sans">{rec.userName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono border ${theme.badge}`}>
                            كود: {rec.employeeCode}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300">
                          <span>حضور: <span className="text-emerald-400">{rec.checkInTime.substring(0,5)}</span></span>
                          <span>انصراف: <span className="text-rose-400">{rec.checkOutTime ? rec.checkOutTime.substring(0,5) : 'مباشر'}</span></span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-400">{formatHoursText(rec.workHours)}</span>
                          <span className="text-emerald-400 font-mono">{rec.earnedCost} د.ل</span>
                        </div>
                      </div>

                      {/* 24-Hour Timeline Track Bar */}
                      <div className="relative h-8 flex-1 bg-slate-950/80 rounded-xl border border-slate-700/60 overflow-hidden min-w-[300px]">
                        {/* Hour background ticks */}
                        <div className="absolute inset-0 flex justify-between px-2 opacity-20 pointer-events-none">
                          {hours24.map((h) => (
                            <div key={h} className="border-r border-slate-400 h-full w-6"></div>
                          ))}
                        </div>

                        {/* Shift Colored Line Bar */}
                        <div
                          style={{ left: pos.left, width: pos.width }}
                          className={`absolute top-1 bottom-1 bg-gradient-to-r ${theme.bg} text-white text-[10px] font-black font-mono rounded-lg flex items-center justify-between px-2.5 shadow-md transition-all whitespace-nowrap overflow-hidden`}
                          title={`${rec.userName}: ${rec.checkInTime} ➔ ${rec.checkOutTime || 'جاري'} (${formatHoursText(rec.workHours)})`}
                        >
                          <span>{rec.checkInTime.substring(0, 5)}</span>
                          <span className="opacity-90 font-sans">{rec.userName.split(' ')[0]} ({formatHoursText(rec.workHours)})</span>
                          <span>{rec.checkOutTime ? rec.checkOutTime.substring(0, 5) : 'مباشر'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Total Summary Card */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-md border border-slate-800">
              <div className="flex items-center gap-2 font-sans font-bold text-sm">
                <Coins className="w-5 h-5 text-emerald-400" />
                ملخص ساعات وأجور اليوم ({selectedDateStr}):
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-400 font-sans text-[11px] block">الموظفين الحاضرين</span>
                  <span className="text-base font-black text-emerald-400">{selectedDayRecords.length} موظف</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans text-[11px] block">إجمالي ساعات اليوم</span>
                  <span className="text-base font-black text-white font-sans">
                    {formatHoursText(selectedDayRecords.reduce((acc, r) => acc + (r.workHours || 0), 0))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans text-[11px] block">إجمالي المستحقات</span>
                  <span className="text-base font-black text-emerald-400">
                    {selectedDayRecords.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2)} د.ل
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
