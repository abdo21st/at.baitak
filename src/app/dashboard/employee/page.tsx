'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AttendanceRecord } from '@/lib/types';
import { initialUsers, initialAttendanceRecords } from '@/lib/data-store';
import { Clock, Calendar, Coins, CheckCircle2, AlertCircle, LogOut, Play, Square, Zap } from 'lucide-react';
import { getCurrentTimeFormatted, getCurrentDateFormatted } from '@/lib/utils';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User>(initialUsers[1]); // Default Ahmed Ali (101)
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);

  // Generate Date List (Recent 30 Days)
  const recentDatesList = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  // Hours: 00 to 23
  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  // Minutes: 00 to 59
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // Selected State for Check-in
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDateFormatted());
  const [checkInHour, setCheckInHour] = useState<string>('08');
  const [checkInMinute, setCheckInMinute] = useState<string>('00');

  // Selected State for Check-out
  const [checkOutHour, setCheckOutHour] = useState<string>('16');
  const [checkOutMinute, setCheckOutMinute] = useState<string>('00');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
      } catch {}
    }
  }, []);

  const userRecords = records.filter((r) => r.userId === user.id);
  
  // Find active record where employee checked in but has not checked out yet
  const activeRecord = userRecords.find((r) => !r.checkOutTime) || null;
  const isCheckedIn = !!activeRecord;

  // Monthly Calculations
  const totalMonthlyHours = Number(
    userRecords.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(2)
  );

  const totalMonthlyEarned = Number(
    userRecords.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2)
  );

  // Helper to format work time strictly in Hours and Minutes (ساعة و دقيقة)
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

  // 1. Separate Check-in action (اختيار الحضور من القائمة)
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCheckIn = `${checkInHour}:${checkInMinute}:00`;

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          employeeCode: user.employeeCode,
          date: selectedDate,
          checkInTime: formattedCheckIn
        })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => [data.record, ...prev]);
        setMsg({
          text: `تم تسجيل وقت الحضور (${checkInHour}:${checkInMinute}) بنجاح!`,
          type: 'success'
        });
      } else {
        setMsg({ text: data.error || 'حدث خطأ في تسجيل الحضور', type: 'error' });
      }
    } catch {
      setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Separate Check-out action (عرض بالدقيقة والساعة)
  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;

    const formattedCheckOut = `${checkOutHour}:${checkOutMinute}:00`;

    // Client-side validation for check-out time before check-in time
    if (activeRecord.checkInTime) {
      const [inH, inM] = activeRecord.checkInTime.split(':').map(Number);
      const outH = Number(checkOutHour);
      const outM = Number(checkOutMinute);

      const inMins = inH * 60 + inM;
      const outMins = outH * 60 + outM;

      if (outMins < inMins && !(inH >= 18 && outH < 12)) {
        setMsg({
          text: `خطأ: يمنع تسجيل وقت الانصراف (${checkOutHour}:${checkOutMinute}) قبل وقت الحضور (${activeRecord.checkInTime})!`,
          type: 'error'
        });
        return;
      }
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: activeRecord.id,
          checkOutTime: formattedCheckOut
        })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.map((r) => (r.id === data.record.id ? data.record : r)));
        setMsg({
          text: `تم تسجيل وقت الانصراف (${checkOutHour}:${checkOutMinute}) وتدوين ${formatHoursText(data.record.workHours)} بقيمة (${data.record.earnedCost} د.ل) بنجاح!`,
          type: 'success'
        });
      } else {
        setMsg({ text: data.error || 'حدث خطأ في تسجيل الانصراف', type: 'error' });
      }
    } catch {
      setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const setNowForCheckIn = () => {
    const now = getCurrentTimeFormatted(); // e.g. "14:25:00"
    const parts = now.split(':');
    setCheckInHour(parts[0] || '08');
    setCheckInMinute(parts[1] || '00');
  };

  const setNowForCheckOut = () => {
    const now = getCurrentTimeFormatted();
    const parts = now.split(':');
    setCheckOutHour(parts[0] || '16');
    setCheckOutMinute(parts[1] || '00');
  };

  const setTodayDate = () => {
    setSelectedDate(getCurrentDateFormatted());
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-cairo" dir="rtl">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">
                تسجيل دوام الموظف ({user.name})
              </h1>
              <p className="text-slate-500 text-xs font-semibold">
                رقم الموظف: <span className="font-mono text-blue-700 font-bold">{user.employeeCode}</span> | أجر الساعة: <span className="font-mono text-slate-900 font-bold">{user.hourlyRate} د.ل</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Attendance Entry Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              اختيار وقت الحضور والانصراف من القائمة
            </h2>
          </div>

          {/* STEP 1: CHECK-IN FORM (قائمة اختيار الحضور والتاريخ) */}
          {!isCheckedIn ? (
            <form onSubmit={handleCheckInSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-bold">
                {/* Date Dropdown List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-800 font-black text-sm">اختيار التاريخ</label>
                    <button
                      type="button"
                      onClick={setTodayDate}
                      className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-xs font-black rounded-lg transition-all cursor-pointer shadow-sm border border-sky-200 flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      تاريخ اليوم
                    </button>
                  </div>
                  {/* spacer label to match the height of the hour/minute sub-labels */}
                  <div className="block text-[11px] text-transparent mb-1 font-sans font-bold select-none">التاريخ</div>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                  >
                    {recentDatesList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Check-in Time Dropdown Lists (Hour & Minute) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-800 font-black text-sm">اختيار وقت الحضور (ساعة : دقيقة)</label>
                    <button
                      type="button"
                      onClick={setNowForCheckIn}
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-black rounded-lg transition-all cursor-pointer shadow-sm border border-blue-200 flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      الوقت الحالي
                    </button>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-500 mb-1 text-center font-sans font-bold">الساعة</label>
                      <select
                        value={checkInHour}
                        onChange={(e) => setCheckInHour(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-center text-base font-black focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                      >
                        {hoursList.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-xl font-black text-slate-400 self-end pb-3">:</span>

                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-500 mb-1 text-center font-sans font-bold">الدقيقة</label>
                      <select
                        value={checkInMinute}
                        onChange={(e) => setCheckInMinute(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-center text-base font-black focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                      >
                        {minutesList.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLUE CHECK-IN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-4"
              >
                <Play className="w-5 h-5 fill-white" />
                {loading ? 'جاري التسجيل...' : 'تسجيل وقت الحضور'}
              </button>
            </form>
          ) : (
            /* STEP 2: CHECK-OUT FORM (قائمة اختيار الانصراف) */
            <form onSubmit={handleCheckOutSubmit} className="space-y-5">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs font-bold text-blue-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <span>تم تسجيل وقت الحضور لهذا اليوم ({activeRecord.date}):</span>
                </div>
                <span className="font-mono text-sm font-black text-blue-700 bg-white px-3 py-1 rounded-xl border border-blue-200">
                  {activeRecord.checkInTime}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs font-bold">
                {/* Check-out Time Dropdown Lists (Hour & Minute) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-800 font-black text-sm">اختيار وقت الانصراف (ساعة : دقيقة)</label>
                    <button
                      type="button"
                      onClick={setNowForCheckOut}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-black rounded-lg transition-all cursor-pointer shadow-sm border border-red-200 flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      الوقت الحالي
                    </button>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-500 mb-1 text-center font-sans font-bold">الساعة</label>
                      <select
                        value={checkOutHour}
                        onChange={(e) => setCheckOutHour(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-center text-base font-black focus:outline-none focus:border-red-500 cursor-pointer shadow-sm"
                      >
                        {hoursList.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-xl font-black text-slate-400 self-end pb-3">:</span>

                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-500 mb-1 text-center font-sans font-bold">الدقيقة</label>
                      <select
                        value={checkOutMinute}
                        onChange={(e) => setCheckOutMinute(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-center text-base font-black focus:outline-none focus:border-red-500 cursor-pointer shadow-sm"
                      >
                        {minutesList.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* RED CHECK-OUT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-base rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Square className="w-5 h-5 fill-white" />
                {loading ? 'جاري التسجيل...' : 'تسجيل وقت الانصراف'}
              </button>
            </form>
          )}

          {msg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-extrabold text-center max-w-md mx-auto ${
                msg.type === 'success'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-red-50 text-red-800 border border-red-200 font-black'
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>

        {/* Monthly Summary Cards Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي ساعات العمل هذا الشهر</span>
              <span className="text-3xl font-black text-slate-900">{formatHoursText(totalMonthlyHours)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي قيمة ساعات العمل لهذا الشهر</span>
              <span className="text-3xl font-black text-teal-700">{totalMonthlyEarned} د.ل</span>
            </div>
          </div>
        </div>

        {/* Monthly Attendance Log Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            جدول ساعات عمل الشهر الحالي
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-4 font-bold">التاريخ</th>
                  <th className="py-3.5 px-4 font-bold">وقت الحضور</th>
                  <th className="py-3.5 px-4 font-bold">وقت الانصراف</th>
                  <th className="py-3.5 px-4 font-bold text-center">ساعات اليوم</th>
                  <th className="py-3.5 px-4 font-bold text-center">قيمة الساعات لليوم</th>
                  <th className="py-3.5 px-4 font-bold text-center">توثيق المدير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {userRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans font-medium">
                      لا يوجد حضور مسجل في هذا الشهر حتى الآن.
                    </td>
                  </tr>
                ) : (
                  userRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-sans">{r.date}</td>
                      <td className="py-3.5 px-4 text-blue-600 font-bold">{r.checkInTime || '--:--'}</td>
                      <td className="py-3.5 px-4 text-red-600 font-bold">{r.checkOutTime || '--:--'}</td>
                      <td className="py-3.5 px-4 text-center font-black">{formatHoursText(r.workHours)}</td>
                      <td className="py-3.5 px-4 text-center font-black text-teal-700">{r.earnedCost} د.ل</td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        {r.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-extrabold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                            موثّق
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-extrabold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            بانتظار التوثيق
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
