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

  // Separate Check-in vs Check-out Inputs
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

  // 2. Separate Check-out action (يمنع الانصراف بزمن يسبق الحضور)
  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;
    if (!checkOutTime) {
      setMsg({ text: 'يرجى إدخال وقت الانصراف', type: 'error' });
      return;
    }

    // Client-side validation for check-out time before check-in time
    if (activeRecord.checkInTime) {
      const [inH, inM] = activeRecord.checkInTime.split(':').map(Number);
      const [outH, outM] = checkOutTime.split(':').map(Number);
      const inMins = inH * 60 + inM;
      const outMins = outH * 60 + outM;

      if (outMins < inMins && !(inH >= 18 && outH < 12)) {
        setMsg({
          text: `خطأ: يمنع تسجيل وقت الانصراف (${checkOutTime}) قبل وقت الحضور (${activeRecord.checkInTime})!`,
          type: 'error'
        });
        return;
      }
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
              إدخال وقت الحضور والانصراف يدويًا
            </h2>
          </div>

          {/* STEP 1: CHECK-IN FORM */}
          {!isCheckedIn ? (
            <form onSubmit={handleCheckInSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                {/* Date Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-extrabold text-sm">التاريخ</label>
                    <button
                      type="button"
                      onClick={setTodayDate}
                      className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-xs font-black rounded-lg transition-all cursor-pointer shadow-sm border border-sky-200 flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Check-in Time Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-extrabold text-sm">وقت الحضور *</label>
                    <button
                      type="button"
                      onClick={setNowForCheckIn}
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-black rounded-lg transition-all cursor-pointer shadow-sm border border-blue-200 flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* BLUE CHECK-IN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                {loading ? 'جاري التسجيل...' : 'تسجيل وقت الحضور'}
              </button>
            </form>
          ) : (
            /* STEP 2: CHECK-OUT FORM */
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
                {/* Check-out Time Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-extrabold text-sm">وقت الانصراف *</label>
                    <button
                      type="button"
                      onClick={setNowForCheckOut}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-black rounded-lg transition-all cursor-pointer shadow-sm border border-red-200 flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-red-500"
                  />
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
              <span className="text-3xl font-black text-slate-900">{totalMonthlyHours} ساعة</span>
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
                      <td className="py-3.5 px-4 text-center font-black">{r.workHours} ساعة</td>
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
