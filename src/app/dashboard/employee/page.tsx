'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AttendanceRecord } from '@/lib/types';
import { initialUsers, initialAttendanceRecords } from '@/lib/data-store';
import { Clock, Calendar, Coins, CheckCircle2, AlertCircle, LogOut, Play, Square } from 'lucide-react';
import { getCurrentTimeFormatted, getCurrentDateFormatted } from '@/lib/utils';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User>(initialUsers[1]); // Default Ahmed Ali (101)
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);

  // Date and Time inputs using strictly Western English digits (0-9)
  const [entryDate, setEntryDate] = useState<string>(getCurrentDateFormatted());
  const [checkInTime, setCheckInTime] = useState<string>('08:00');
  const [checkOutTime, setCheckOutTime] = useState<string>('16:00');
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

  // 1. Separate Check-in action (تسجيل وقت الحضور فقط)
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInTime) {
      setMsg({ text: 'يرجى إدخال وقت الحضور', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg(null);

    const inTimeFormatted = checkInTime.length === 5 ? `${checkInTime}:00` : checkInTime;

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          employeeCode: user.employeeCode,
          date: entryDate,
          checkInTime: inTimeFormatted
        })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => [data.record, ...prev]);
        setMsg({
          text: `تم تسجيل وقت الحضور (${checkInTime}) بنجاح!`,
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

  // 2. Separate Check-out action (تسجيل وقت الانصراف فقط)
  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;
    if (!checkOutTime) {
      setMsg({ text: 'يرجى إدخال وقت الانصراف', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg(null);

    const outTimeFormatted = checkOutTime.length === 5 ? `${checkOutTime}:00` : checkOutTime;

    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: activeRecord.id,
          checkOutTime: outTimeFormatted
        })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.map((r) => (r.id === data.record.id ? data.record : r)));
        setMsg({
          text: `تم تسجيل وقت الانصراف (${checkOutTime}) وتدوين ${data.record.workHours} ساعة عمل بنجاح!`,
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
    const now = getCurrentTimeFormatted();
    setCheckInTime(now.substring(0, 5));
  };

  const setNowForCheckOut = () => {
    const now = getCurrentTimeFormatted();
    setCheckOutTime(now.substring(0, 5));
  };

  const setTodayDate = () => {
    setEntryDate(getCurrentDateFormatted());
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
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">
                تسجيل دوام الموظف ({user.name})
              </h1>
              <p className="text-slate-500 text-xs font-semibold">
                رقم الموظف: <span className="font-mono text-emerald-700 font-bold">{user.employeeCode}</span> | أجر الساعة: <span className="font-mono text-slate-900 font-bold">{user.hourlyRate} د.ل</span>
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
              <Clock className="w-5 h-5 text-emerald-600" />
              إدخال وقت الحضور والانصراف يدويًا
            </h2>
          </div>

          {/* STEP 1: CHECK-IN FORM (تسجيل وقت الحضور منفصل) */}
          {!isCheckedIn ? (
            <form onSubmit={handleCheckInSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                {/* Date Input formatted strictly in Western numerals (YYYY-MM-DD) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-extrabold">التاريخ (YYYY-MM-DD)</label>
                    <button
                      type="button"
                      onClick={setTodayDate}
                      className="text-[11px] text-emerald-600 hover:underline font-bold"
                    >
                      تاريخ اليوم
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    placeholder="2026-08-11"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Check-in Time Input with Western numerals (HH:mm) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-extrabold">وقت الحضور *</label>
                    <button
                      type="button"
                      onClick={setNowForCheckIn}
                      className="text-[11px] text-emerald-600 hover:underline font-bold"
                    >
                      الوقت الحالي
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    placeholder="08:00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                {loading ? 'جاري التسجيل...' : 'تسجيل وقت الحضور'}
              </button>
            </form>
          ) : (
            /* STEP 2: CHECK-OUT FORM (تسجيل وقت الانصراف منفصل) */
            <form onSubmit={handleCheckOutSubmit} className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>تم تسجيل وقت الحضور لهذا اليوم ({activeRecord.date}):</span>
                </div>
                <span className="font-mono text-sm font-black text-emerald-700 bg-white px-3 py-1 rounded-xl border border-emerald-200">
                  {activeRecord.checkInTime}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs font-bold">
                {/* Check-out Time Input with Western numerals (HH:mm) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-extrabold">وقت الانصراف *</label>
                    <button
                      type="button"
                      onClick={setNowForCheckOut}
                      className="text-[11px] text-emerald-600 hover:underline font-bold"
                    >
                      الوقت الحالي
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    placeholder="16:00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                {loading ? 'جاري التسجيل...' : 'تسجيل وقت الانصراف'}
              </button>
            </form>
          )}

          {msg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-extrabold text-center max-w-md mx-auto ${
                msg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>

        {/* Monthly Summary Cards Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي ساعات العمل هذا الشهر</span>
              <span className="text-3xl font-black text-slate-900">{totalMonthlyHours} ساعة</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي قيمة ساعات العمل لهذا الشهر</span>
              <span className="text-3xl font-black text-emerald-700">{totalMonthlyEarned} د.ل</span>
            </div>
          </div>
        </div>

        {/* Monthly Attendance Log Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
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
                      <td className="py-3.5 px-4 text-emerald-600 font-bold">{r.checkInTime || '--:--'}</td>
                      <td className="py-3.5 px-4 text-rose-600 font-bold">{r.checkOutTime || '--:--'}</td>
                      <td className="py-3.5 px-4 text-center font-black">{r.workHours} ساعة</td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-700">{r.earnedCost} د.ل</td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        {r.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
