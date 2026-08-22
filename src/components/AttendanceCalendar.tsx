'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User, AttendanceRecord } from '@/lib/types';
import { 
  Calendar as CalendarIcon, Clock, Printer, ChevronRight, ChevronLeft, 
  UserCheck, Coins, MapPin, ShieldAlert, Sparkles, Phone, MessageSquare, 
  Activity, Users, CheckCircle2, AlertTriangle, Eye, ArrowRightLeft, Filter, Moon,
  Download, UserX, UserMinus, FileSpreadsheet, Layers, ShieldCheck
} from 'lucide-react';
import { formatTime12h, formatHoursText } from '@/lib/utils';

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

export interface ShiftSegment {
  id: string;
  recordId: string;
  userId: string;
  userName: string;
  employeeCode: string;
  date: string; // The calendar date this segment belongs to (YYYY-MM-DD)
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm' or '24:00'
  segmentHours: number;
  segmentEarned: number;
  isOvernight: boolean;
  overnightPart?: 'START' | 'END';
  originalCheckIn: string;
  originalCheckOut?: string | null;
  originalDate: string;
  nextDate?: string;
  isOutsideGps?: boolean;
  isVerified?: boolean;
  projectName?: string | null;
  projectColor?: string | null;
  originalRecord: AttendanceRecord;
}

interface GroupedEmp {
  userId: string;
  userName: string;
  employeeCode: string;
  phone?: string | null;
  segments: ShiftSegment[];
  totalHours: number;
  totalEarned: number;
  theme: typeof colorThemes[0];
}

const getNextDateStr = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export default function AttendanceCalendar({ users, records }: AttendanceCalendarProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'GPS_ALERT' | 'OVERNIGHT'>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [selectedSegmentForDetail, setSelectedSegmentForDetail] = useState<ShiftSegment | null>(null);

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

  // Convert all attendance records into day-bounded ShiftSegments (handling overnight shifts accurately)
  const allSegments = useMemo(() => {
    const segments: ShiftSegment[] = [];

    records.forEach((r) => {
      if (!r.checkInTime || !r.date) return;

      const [inH, inM] = r.checkInTime.split(':').map(Number);
      const inMinutes = inH * 60 + (inM || 0);

      const matchedUser = users.find(u => u.id === r.userId);
      const userRate = matchedUser?.hourlyRate || 0;
      const effectiveRate = r.workHours && r.workHours > 0 ? (r.earnedCost / r.workHours) : userRate;

      // Check if this record is an overnight shift
      let isOvernight = false;
      let outMinutes = inMinutes + 480;

      if (r.checkOutTime) {
        const [outH, outM] = r.checkOutTime.split(':').map(Number);
        outMinutes = outH * 60 + (outM || 0);
        if (outMinutes < inMinutes) {
          isOvernight = true;
        }
      }

      if (!isOvernight) {
        // Single-day shift
        const segHours = r.workHours || Number(((outMinutes - inMinutes) / 60).toFixed(2));
        segments.push({
          id: `seg-${r.id}-single`,
          recordId: r.id,
          userId: r.userId,
          userName: r.userName,
          employeeCode: r.employeeCode,
          date: r.date,
          startTime: r.checkInTime,
          endTime: r.checkOutTime || '',
          segmentHours: segHours,
          segmentEarned: r.earnedCost || Number((segHours * effectiveRate).toFixed(2)),
          isOvernight: false,
          originalCheckIn: r.checkInTime,
          originalCheckOut: r.checkOutTime,
          originalDate: r.date,
          isOutsideGps: r.isOutsideGps,
          isVerified: r.isVerified,
          projectName: r.projectName,
          projectColor: r.projectColor,
          originalRecord: r
        });
      } else {
        // Overnight Shift: Split into Part 1 (Start Day -> 24:00) and Part 2 (00:00 -> End Day)
        const nextDayStr = getNextDateStr(r.date);

        // Part 1: Start Day (from checkInTime to 24:00)
        const day1Mins = 1440 - inMinutes;
        const day1Hours = Number((day1Mins / 60).toFixed(2));
        const day1Earned = Number((day1Hours * effectiveRate).toFixed(2));

        segments.push({
          id: `seg-${r.id}-part1`,
          recordId: r.id,
          userId: r.userId,
          userName: r.userName,
          employeeCode: r.employeeCode,
          date: r.date,
          startTime: r.checkInTime,
          endTime: '24:00',
          segmentHours: day1Hours,
          segmentEarned: day1Earned,
          isOvernight: true,
          overnightPart: 'START',
          originalCheckIn: r.checkInTime,
          originalCheckOut: r.checkOutTime,
          originalDate: r.date,
          nextDate: nextDayStr,
          isOutsideGps: r.isOutsideGps,
          isVerified: r.isVerified,
          projectName: r.projectName,
          projectColor: r.projectColor,
          originalRecord: r
        });

        // Part 2: Next Day (from 00:00 to checkOutTime)
        const day2Mins = outMinutes;
        const day2Hours = Number((day2Mins / 60).toFixed(2));
        const day2Earned = Number((day2Hours * effectiveRate).toFixed(2));

        segments.push({
          id: `seg-${r.id}-part2`,
          recordId: r.id,
          userId: r.userId,
          userName: r.userName,
          employeeCode: r.employeeCode,
          date: nextDayStr,
          startTime: '00:00',
          endTime: r.checkOutTime || '06:00',
          segmentHours: day2Hours,
          segmentEarned: day2Earned,
          isOvernight: true,
          overnightPart: 'END',
          originalCheckIn: r.checkInTime,
          originalCheckOut: r.checkOutTime,
          originalDate: r.date,
          nextDate: nextDayStr,
          isOutsideGps: r.isOutsideGps,
          isVerified: r.isVerified,
          projectName: r.projectName,
          projectColor: r.projectColor,
          originalRecord: r
        });
      }
    });

    return segments;
  }, [records, users]);

  // Selected Day Segments
  const selectedDaySegments = allSegments.filter((s) => s.date === selectedDateStr);

  // Apply Employee Filter & Status Filter
  const filteredDaySegments = selectedDaySegments.filter((s) => {
    if (selectedUserId !== 'ALL' && s.userId !== selectedUserId) return false;
    if (activeFilter === 'ACTIVE') return !s.originalCheckOut;
    if (activeFilter === 'GPS_ALERT') return s.isOutsideGps;
    if (activeFilter === 'OVERNIGHT') return s.isOvernight;
    return true;
  });

  const groupedList: GroupedEmp[] = [];
  const map: { [id: string]: GroupedEmp } = {};

  filteredDaySegments.forEach((s) => {
    if (!map[s.userId]) {
      const themeIdx = Object.keys(map).length % colorThemes.length;
      const matchedUser = users.find(u => u.id === s.userId);
      map[s.userId] = {
        userId: s.userId,
        userName: s.userName,
        employeeCode: s.employeeCode,
        phone: matchedUser?.phone || null,
        segments: [],
        totalHours: 0,
        totalEarned: 0,
        theme: colorThemes[themeIdx]
      };
      groupedList.push(map[s.userId]);
    }
    map[s.userId].segments.push(s);
    map[s.userId].totalHours += s.segmentHours || 0;
    map[s.userId].totalEarned += s.segmentEarned || 0;
  });

  // Calculate Absent Employees for Selected Day
  const nonAdminUsers = useMemo(() => users.filter(u => u.role !== 'ADMIN'), [users]);
  const presentUserIds = useMemo(() => new Set(selectedDaySegments.map(s => s.userId)), [selectedDaySegments]);
  const absentEmployees = useMemo(() => {
    return nonAdminUsers.filter(u => !presentUserIds.has(u.id));
  }, [nonAdminUsers, presentUserIds]);

  // Calculate Pharmacy Hourly Coverage (0 to 23 hours) for Selected Day
  const hourlyCoverage = hours24.map((hour) => {
    const hourStartMins = hour * 60;
    const hourEndMins = (hour + 1) * 60;

    const attendeesInHour = selectedDaySegments.filter((s) => {
      if (!s.startTime) return false;
      const [inH, inM] = s.startTime.split(':').map(Number);
      const startMins = inH * 60 + (inM || 0);

      let endMins = startMins + 480;
      if (s.endTime) {
        if (s.endTime === '24:00') {
          endMins = 1440;
        } else {
          const [outH, outM] = s.endTime.split(':').map(Number);
          endMins = outH * 60 + (outM || 0);
        }
      }

      return startMins < hourEndMins && endMins > hourStartMins;
    });

    return {
      hour,
      count: attendeesInHour.length,
      attendees: attendeesInHour.map(a => a.userName)
    };
  });

  // Coverage statistics
  const goodCoverageHours = hourlyCoverage.filter(h => h.count >= 2).length;
  const singleCoverageHours = hourlyCoverage.filter(h => h.count === 1).length;
  const gapCoverageHours = hourlyCoverage.filter(h => h.count === 0).length;

  // Monthly Metrics based on Day-accurate segments
  const selectedMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthSegments = allSegments.filter((s) => {
    if (selectedUserId !== 'ALL' && s.userId !== selectedUserId) return false;
    return s.date && s.date.startsWith(selectedMonthPrefix);
  });

  const monthTotalHours = Number(monthSegments.reduce((acc, s) => acc + (s.segmentHours || 0), 0).toFixed(2));
  const monthTotalEarned = Number(monthSegments.reduce((acc, s) => acc + (s.segmentEarned || 0), 0).toFixed(2));
  const monthActiveEmployees = new Set(monthSegments.map((s) => s.userId)).size;
  const monthWorkingDays = new Set(monthSegments.map((s) => s.date)).size;

  // Weekly Metrics (Saturday to Friday)
  const selDate = new Date(selectedDateStr);
  const dayOfWeek = selDate.getDay();
  const diffToSat = (dayOfWeek + 1) % 7;
  const weekStart = new Date(selDate);
  weekStart.setDate(selDate.getDate() - diffToSat);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const weekSegments = allSegments.filter((s) => {
    if (selectedUserId !== 'ALL' && s.userId !== selectedUserId) return false;
    return s.date && s.date >= weekStartStr && s.date <= weekEndStr;
  });
  const weekTotalHours = Number(weekSegments.reduce((acc, s) => acc + (s.segmentHours || 0), 0).toFixed(2));
  const weekTotalEarned = Number(weekSegments.reduce((acc, s) => acc + (s.segmentEarned || 0), 0).toFixed(2));
  const weekActiveEmployees = new Set(weekSegments.map((s) => s.userId)).size;
  const weekWorkingDays = new Set(weekSegments.map((s) => s.date)).size;

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

  const getSegmentBarPosition = (startTime: string, endTime?: string | null) => {
    if (!startTime) return { left: '0%', width: '0%' };

    const [inH, inM] = startTime.split(':').map(Number);
    const startMins = inH * 60 + (inM || 0);

    let endMins = startMins + 480;
    if (endTime) {
      if (endTime === '24:00') {
        endMins = 1440;
      } else {
        const [outH, outM] = endTime.split(':').map(Number);
        endMins = outH * 60 + (outM || 0);
      }
    }

    const leftPercent = Math.min(100, Math.max(0, (startMins / 1440) * 100));
    const widthPercent = Math.min(100 - leftPercent, Math.max(2, ((endMins - startMins) / 1440) * 100));

    return {
      left: `${leftPercent.toFixed(1)}%`,
      width: `${widthPercent.toFixed(1)}%`
    };
  };


  // Export to CSV Function
  const handleExportCsv = () => {
    const targetSegs = viewMode === 'MONTH' ? monthSegments : (viewMode === 'WEEK' ? weekSegments : filteredDaySegments);
    if (targetSegs.length === 0) {
      alert('لا توجد سجلات لتصديرها في هذا العرض.');
      return;
    }

    const headers = [
      'اسم الموظف',
      'رقم الموظف',
      'التاريخ',
      'وقت البداية',
      'وقت النهاية',
      'ساعات العمل (ساعة)',
      'المستحق المالي (د.ل)',
      'نوع الشفت',
      'حالة الـ GPS'
    ];

    const rows = targetSegs.map((s) => [
      `"${s.userName}"`,
      `"${s.employeeCode}"`,
      `"${s.date}"`,
      `"${s.startTime}"`,
      `"${s.endTime || 'مباشر'}"`,
      `"${s.segmentHours}"`,
      `"${s.segmentEarned}"`,
      `"${s.isOvernight ? 'وردية ليلية متداخلة' : 'شفت اعتيادي'}"`,
      `"${s.isOutsideGps ? 'خارج نطاق GPS' : 'داخل الصيدلية'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hodoork-timesheet-${viewMode.toLowerCase()}-${selectedDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const liveLinePercent = (currentTimeMinutes / 1440) * 100;
  const isSelectedDateToday = selectedDateStr === todayStr;

  return (
    <div className="space-y-6 font-dubai" dir="rtl">
      {/* Top Controls Bar: View Modes & Employee Isolation */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black shadow-md">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              لوحة المراقبة الزمنية والتقويم الذكي
              <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md font-bold border border-indigo-200 flex items-center gap-1">
                <Moon className="w-3 h-3 text-indigo-600" />
                دعم الشفتات المتداخلة
              </span>
            </h2>
            <p className="text-slate-500 text-xs font-semibold">
              تتبع دوام الصيادلة الحي، كشف ثغرات التغطية، ورصد المتغيبين
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Employee Isolation Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 h-11">
            <Users className="w-4 h-4 text-blue-600" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">👥 كافة الموظفين ({nonAdminUsers.length})</option>
              {nonAdminUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  👤 {u.name} ({u.employeeCode})
                </option>
              ))}
            </select>
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
              الخط الزمني (24س)
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
      </div>

      {/* VIEW 1: DAY TIMELINE (الخط الزمني اليومي المفصل 24 ساعة) */}
      {viewMode === 'DAY' && (
        <div className="space-y-6">
          {/* Timeline Date Selector & Filters & Actions */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
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
                  كافة الشفتات ({selectedDaySegments.length})
                </button>
                <button
                  onClick={() => setActiveFilter('OVERNIGHT')}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                    activeFilter === 'OVERNIGHT'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  ورديات ليلية ({selectedDaySegments.filter(s => s.isOvernight).length})
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
                  شفتات جارية ({selectedDaySegments.filter(s => !s.originalCheckOut).length})
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
                  خارج GPS ({selectedDaySegments.filter(s => s.isOutsideGps).length})
                </button>
              </div>

              {/* Action Buttons: CSV Export & Print */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="px-3.5 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  title="تصدير بيانات الساعات إلى ملف Excel / CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  تصدير Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all print:hidden"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  طباعة
                </button>
              </div>
            </div>

            {/* 24-Hour Timeline Master Board */}
            <div className="bg-slate-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-6 overflow-x-auto">
              
              {/* 1. Top Ruler (Hours 00 to 23) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between font-mono text-[11px] font-black text-slate-400 pb-2 border-b border-slate-800 gap-2 sm:gap-4">
                <span className="w-full sm:w-64 shrink-0 text-right font-sans text-xs font-bold text-slate-300 pl-2">
                  الموظف / الدوام
                </span>
                <div className="w-full sm:flex-1 grid text-center font-bold min-w-[320px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }} dir="ltr">
                  {hours24.map((h) => (
                    <span key={h} className="text-slate-400 text-[11px]">
                      {String(h).padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. Pharmacy Shift Coverage Heatmap Bar & Stats */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-indigo-500/30 shadow-inner space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-indigo-300 text-sm">مؤشر تغطية الصيدلية بالساعة</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                      تحليل زمني
                    </span>
                  </div>

                  {/* Coverage Breakdown Numbers */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      تغطية ممتازة (2+): {goodCoverageHours} ساعة
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      صيدلي واحد: {singleCoverageHours} ساعة
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      ثغرة / فارغة: {gapCoverageHours} ساعة
                    </span>
                  </div>
                </div>

                <div className="relative bg-slate-950 rounded-xl border border-slate-800 p-1.5 overflow-hidden min-w-[320px]" dir="ltr">
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
              <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-full sm:w-64 shrink-0 space-y-0.5 text-xs">
                  <span className="font-black text-blue-400 text-sm">الشريط الموحد المدمج</span>
                  <p className="text-[10px] text-slate-400">تراكب كافة الشفتات في مسار زمني واحد</p>
                </div>

                <div className="relative w-full sm:flex-1 bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden min-w-[320px]" dir="ltr">
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
                        {emp.segments.map((seg) => {
                          const pos = getSegmentBarPosition(seg.startTime, seg.endTime);
                          return (
                            <button
                              type="button"
                              key={`ms-${seg.id}`}
                              onClick={() => setSelectedSegmentForDetail(seg)}
                              style={{ left: pos.left, width: pos.width }}
                              className={`absolute inset-y-0 bg-gradient-to-r ${emp.theme.bg} text-white text-[9px] font-black font-mono rounded-sm flex items-center justify-between px-1.5 shadow-sm transition-all whitespace-nowrap overflow-hidden cursor-pointer hover:opacity-90`}
                              title={`${seg.userName}: ${seg.startTime} ➔ ${seg.endTime} (${formatHoursText(seg.segmentHours)})`}
                            >
                              <span className="truncate leading-none">
                                {seg.isOvernight && '🌙 '}{seg.userName.split(' ')[0]}
                              </span>
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
                    لا توجد سجلات دوام مطابقة للفلتر المحدد في هذا اليوم ({selectedDateStr}).
                  </div>
                ) : (
                  groupedList.map((emp) => (
                    <div key={emp.userId} className="p-3.5 bg-slate-900/90 hover:bg-slate-900 rounded-2xl border border-slate-800/80 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      {/* Employee Meta Card */}
                      <div className="w-full sm:w-64 shrink-0 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-white text-sm">{emp.userName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono border ${emp.theme.badge}`}>
                            {emp.employeeCode}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-400">ساعات هذا اليوم: {formatHoursText(emp.totalHours)}</span>
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
                      <div className="relative h-9 w-full sm:flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden min-w-[320px]" dir="ltr">
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

                        {/* Shift Segments */}
                        {emp.segments.map((seg) => {
                          const pos = getSegmentBarPosition(seg.startTime, seg.endTime);
                          return (
                            <button
                              type="button"
                              key={seg.id}
                              onClick={() => setSelectedSegmentForDetail(seg)}
                              style={{ left: pos.left, width: pos.width }}
                              className={`absolute top-1 bottom-1 bg-gradient-to-r ${emp.theme.bg} text-white text-[10px] font-black font-mono rounded-lg flex items-center justify-between px-2.5 shadow-md transition-all whitespace-nowrap overflow-hidden z-10 cursor-pointer hover:ring-2 hover:ring-white`}
                            >
                              <span className="flex items-center gap-1">
                                {seg.isOvernight && <Moon className="w-3 h-3 text-amber-300 shrink-0" />}
                                {seg.startTime === '00:00' ? '12:00 ص' : formatTime12h(seg.startTime)}
                              </span>
                              <span className="opacity-90 font-sans truncate px-1">{formatHoursText(seg.segmentHours)}</span>
                              <span>{seg.endTime === '24:00' ? '12:00 ص (غداً)' : formatTime12h(seg.endTime)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Absent Employees Card (المتغيبون عن العمل اليوم) */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserMinus className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-black text-slate-900">
                    المتغيبون عن العمل في هذا اليوم ({selectedDateStr}):
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                    {absentEmployees.length} موظف
                  </span>
                </div>
                {absentEmployees.length === 0 && (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    جميع الكادر مسجل حضور اليوم بنسبة 100%
                  </span>
                )}
              </div>

              {absentEmployees.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {absentEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-sm text-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        {emp.name.substring(0, 1)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">{emp.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">كود: {emp.employeeCode}</span>
                      </div>
                      {emp.phone && (
                        <a
                          href={`https://wa.me/${emp.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً ${emp.name}، نلاحظ عدم تسجيل حضورك اليوم (${selectedDateStr}) في الصيدلية، يرجى تأكيد حضورك وتسجيل شفتك.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="مراسلة الموظف عبر واتساب"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">الموظفين المتواجدين في هذا اليوم</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">{groupedList.length} موظف</span>
                </div>
                <Users className="w-8 h-8 text-slate-700" />
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">إجمالي الساعات المنجزة في هذا اليوم</span>
                  <span className="text-lg font-black text-white font-mono">
                    {formatHoursText(selectedDaySegments.reduce((acc, s) => acc + (s.segmentHours || 0), 0))}
                  </span>
                </div>
                <Clock className="w-8 h-8 text-slate-700" />
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">إجمالي مستحقات هذا اليوم</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {selectedDaySegments.reduce((acc, s) => acc + (s.segmentEarned || 0), 0).toFixed(2)} د.ل
                  </span>
                </div>
                <Coins className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY GANTT GRID (مخطط الأسبوع 7 أيام مع توزيع الشفتات المتداخلة) */}
      {viewMode === 'WEEK' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                مخطط الدوام الأسبوعي ({weekStartStr} ➔ {weekEndStr})
              </h3>
              <p className="text-slate-500 text-xs font-semibold">
                توزيع ساعات دوام كل يوم بدقة حتى للشفتات الليلية المتداخلة
              </p>
            </div>

            <button
              onClick={handleExportCsv}
              className="px-4 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              تصدير الأسبوع لـ Excel
            </button>
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
                {nonAdminUsers
                  .filter(u => selectedUserId === 'ALL' || u.id === selectedUserId)
                  .map((emp) => {
                    const empWeekSegs = weekSegments.filter(s => s.userId === emp.id);
                    const totalWeekHours = empWeekSegs.reduce((acc, s) => acc + (s.segmentHours || 0), 0);
                    const totalWeekEarned = empWeekSegs.reduce((acc, s) => acc + (s.segmentEarned || 0), 0);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{emp.name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">({emp.employeeCode})</span>
                        </td>
                        {weekDays.map((d) => {
                          const daySegs = empWeekSegs.filter(s => s.date === d.dateStr);
                          const dayHours = daySegs.reduce((acc, s) => acc + (s.segmentHours || 0), 0);
                          const hasOvernight = daySegs.some(s => s.isOvernight);

                          return (
                            <td key={d.dateStr} className="py-3.5 px-3 text-center">
                              {dayHours > 0 ? (
                                <button
                                  onClick={() => {
                                    setSelectedDateStr(d.dateStr);
                                    setViewMode('DAY');
                                  }}
                                  className={`px-2 py-1 rounded-lg font-mono font-bold text-[11px] border cursor-pointer inline-flex items-center gap-1 ${
                                    hasOvernight
                                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                                  }`}
                                >
                                  {hasOvernight && <Moon className="w-2.5 h-2.5 text-indigo-600" />}
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

      {/* VIEW 3: MONTHLY HEATMAP CALENDAR */}
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
                  اختر أي يوم للانتقال الفوري إلى خطه الزمني 24 ساعة (مع مراعاة الشفتات المتداخلة)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="px-3.5 h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                تصدير الشهر
              </button>

              <div className="flex items-center gap-1.5 font-mono text-xs">
                <button
                  onClick={prevMonth}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </button>
                <span className="px-3 py-1.5 bg-slate-900 text-emerald-400 font-bold rounded-xl">
                  {currentYear}-{String(currentMonth + 1).padStart(2, '0')}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Month Matrix */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center text-xs">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const daySegs = allSegments.filter((s) => {
                if (selectedUserId !== 'ALL' && s.userId !== selectedUserId) return false;
                return s.date === dateStr;
              });
              const totalHours = daySegs.reduce((acc, s) => acc + (s.segmentHours || 0), 0);
              const isSelected = selectedDateStr === dateStr;
              const isToday = dateStr === todayStr;
              const hasOvernight = daySegs.some(s => s.isOvernight);

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
                      : daySegs.length > 0
                      ? 'bg-slate-50 border-slate-200 text-slate-900 hover:border-blue-400'
                      : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-sm font-black">{dayNum}</span>
                      {hasOvernight && <Moon className="w-3 h-3 text-indigo-500" />}
                    </div>
                    {isToday && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                        اليوم
                      </span>
                    )}
                  </div>

                  {daySegs.length > 0 ? (
                    <div className="text-[10px] space-y-0.5 font-bold">
                      <div className="flex items-center gap-1 text-slate-600">
                        <UserCheck className="w-3 h-3" />
                        <span>{new Set(daySegs.map(s => s.userId)).size} موظفين</span>
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

      {/* SHIFT DETAILS MODAL */}
      {selectedSegmentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedSegmentForDetail.userName}</h3>
                  <span className="text-xs text-slate-500 font-mono">كود: {selectedSegmentForDetail.employeeCode}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSegmentForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              {/* Overnight Badge Alert */}
              {selectedSegmentForDetail.isOvernight && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span>وردية ليلية متداخلة في يومين (Overnight Shift)</span>
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    {selectedSegmentForDetail.overnightPart === 'START'
                      ? `الجزء الأول: من بداية الحضور (${formatTime12h(selectedSegmentForDetail.originalCheckIn)}) حتى منتصف الليل (12:00 ص).`
                      : `الجزء الثاني: من منتصف الليل (12:00 ص) حتى وقت الانصراف (${formatTime12h(selectedSegmentForDetail.originalCheckOut || '06:00')}).`}
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">تاريخ هذا اليوم:</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedSegmentForDetail.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">أوقات الساعات في هذا اليوم:</span>
                  <span className="font-bold text-blue-700 font-mono">
                    {selectedSegmentForDetail.startTime === '00:00' ? '12:00 ص' : formatTime12h(selectedSegmentForDetail.startTime)} ➔ {selectedSegmentForDetail.endTime === '24:00' ? '12:00 ص' : formatTime12h(selectedSegmentForDetail.endTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ساعات الدوام المنسوبة لهذا اليوم:</span>
                  <span className="font-black text-slate-900 font-sans">{formatHoursText(selectedSegmentForDetail.segmentHours)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">المستحق المالي المنسوب لهذا اليوم:</span>
                  <span className="font-black text-emerald-700 font-mono">{selectedSegmentForDetail.segmentEarned} د.ل</span>
                </div>
                {selectedSegmentForDetail.isOvernight && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                    <span>إجمالي كامل الشفت المتداخل:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatHoursText(selectedSegmentForDetail.originalRecord.workHours || 0)} ({selectedSegmentForDetail.originalRecord.earnedCost} د.ل)
                    </span>
                  </div>
                )}
              </div>

              {/* GPS status */}
              <div className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
                selectedSegmentForDetail.isOutsideGps
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                {selectedSegmentForDetail.isOutsideGps ? (
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {selectedSegmentForDetail.isOutsideGps ? '⚠️ تسجيل خارج نطاق الصيدلية' : '🟢 تسجيل من داخل نطاق الصيدلية'}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {selectedSegmentForDetail.isOutsideGps ? 'تم تسجيل الدخول أو الخروج من مسافة تزيد عن 200م' : 'ضمن نطاق الـ 200م المحدد للصيدلية'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSegmentForDetail(null)}
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
