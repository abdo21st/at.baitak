'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AttendanceRecord } from '@/lib/types';
import { initialUsers, initialAttendanceRecords } from '@/lib/data-store';
import { Clock, Calendar, Coins, CheckCircle2, AlertCircle, LogOut, Play, Square, Plus, Zap, Moon } from 'lucide-react';
import { getCurrentTimeFormatted, getCurrentDateFormatted } from '@/lib/utils';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User>(initialUsers[1]); // Default Ahmed Ali (101)
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);

  // Mode Selection: 'AUTO' vs 'MANUAL'
  const [activeTab, setActiveTab] = useState<'AUTO' | 'MANUAL'>('AUTO');

  // Manual Form Inputs
  const [entryDate, setEntryDate] = useState<string>(getCurrentDateFormatted());
  const [checkInTime, setCheckInTime] = useState<string>('23:00');
  const [checkOutTime, setCheckOutTime] = useState<string>('02:00');
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
  const activeRecord = userRecords.find((r) => !r.checkOutTime) || null;
  const isCheckedIn = !!activeRecord;

  // Monthly Calculations
  const totalMonthlyHours = Number(
    userRecords.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(2)
  );

  const totalMonthlyEarned = Number(
    userRecords.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2)
  );

  // Detect overnight shift across midnight
  const isOvernight = (() => {
    if (!checkInTime || !checkOutTime) return false;
    const [inH, inM] = checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);
    return outH * 60 + outM < inH * 60 + inM;
  })();

  // 1. Automatic 1-Click Check-in / Check-out
  const handleAutoCheckIn = async () => {
    setLoading(true);
    setMsg(null);
    const timeNow = getCurrentTimeFormatted();

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          employeeCode: user.employeeCode,
          checkInTime: timeNow,
          date: getCurrentDateFormatted()
        })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => [data.record, ...prev]);
        setMsg({ text: `تم تسجيل الحضور التلقائي بنجاح الساعة ${timeNow}`, type: 'success' });
      } else {
        setMsg({ text: data.error || 'حدث خطأ في التسجيل', type: 'error' });
      }
    } catch {
      setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoCheckOut = async () => {
    if (!activeRecord) return;
    setLoading(true);
    setMsg(null);
    const timeNow = getCurrentTimeFormatted();

    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: activeRecord.id,
          checkOutTime: timeNow
        })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.map((r) => (r.id === data.record.id ? data.record : r)));
        setMsg({ text: `تم تسجيل الانصراف التلقائي بنجاح الساعة ${timeNow} (${data.record.workHours} ساعة)!`, type: 'success' });
      } else {
        setMsg({ text: data.error || 'حدث خطأ في تسجيل الانصراف', type: 'error' });
      }
    } catch {
      setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Manual Time Entry Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInTime) {
      setMsg({ text: 'يرجى إدخال وقت الحضور على الأقل', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg(null);

    const inTimeFormatted = checkInTime.length === 5 ? `${checkInTime}:00` : checkInTime;
    const outTimeFormatted = checkOutTime ? (checkOutTime.length === 5 ? `${checkOutTime}:00` : checkOutTime) : null;

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          employeeCode: user.employeeCode,
          date: entryDate,
          checkInTime: inTimeFormatted,
          checkOutTime: outTimeFormatted
        })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => [data.record, ...prev]);
        const overnightNote = data.record.workHours > 0 ? ` (شفت مبيت: ${data.record.workHours} ساعة)` : '';
        setMsg({
          text: `تم تسجيل ساعات الدوام (${checkInTime} إلى ${checkOutTime || 'لم يحدد'})${overnightNote} بنجاح!`,
          type: 'success'
        });
      } else {
        setMsg({ text: data.error || 'حدث خطأ في التسجيل اليدوي', type: 'error' });
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
        {/* Mode Selector Tabs (تلقائي vs يدوي) */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <button
            onClick={() => setActiveTab('AUTO')}
            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'AUTO'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-4 h-4" />
            تسجيل تلقائي بنقرة واحدة (Auto Clock-in/out)
          </button>

          <button
            onClick={() => setActiveTab('MANUAL')}
            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'MANUAL'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            إدخال يدوي (يشمل شفتات المبيت عبر منتصف الليل)
          </button>
        </div>

        {/* Tab 1: Automatic 1-Click Entry */}
        {activeTab === 'AUTO' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-emerald-600" />
              الوقت والتاريخ الحالي: {new Date().toLocaleDateString('ar-LY-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>

            <div>
              {!isCheckedIn ? (
                <button
                  onClick={handleAutoCheckIn}
                  disabled={loading}
                  className="w-full sm:w-auto px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 mx-auto transition-all cursor-pointer"
                >
                  <Play className="w-6 h-6 fill-white" />
                  تسجيل وقت الحضور التلقائي الآن
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl max-w-md mx-auto text-emerald-800 text-sm font-extrabold">
                    🟢 تم تسجيل حضورك التلقائي اليوم الساعة <span className="font-mono text-base">{activeRecord?.checkInTime}</span>
                  </div>

                  <button
                    onClick={handleAutoCheckOut}
                    disabled={loading}
                    className="w-full sm:w-auto px-10 py-5 bg-rose-600 hover:bg-rose-500 text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 mx-auto transition-all cursor-pointer"
                  >
                    <Square className="w-6 h-6 fill-white" />
                    تسجيل وقت الانصراف التلقائي الآن
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Manual Entry Form */}
        {activeTab === 'MANUAL' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                تحديد وقت الحضور والانصراف يدويًا (يشمل شفتات منتصف الليل والمبيت)
              </h2>
              <span className="text-xs font-bold text-slate-400">مثال: حضور 23:00 وانصراف 02:00 اليوم التالي</span>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-700 mb-1">تاريخ الحضور</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700">وقت الحضور (مثلاً 23:00)</label>
                    <button
                      type="button"
                      onClick={setNowForCheckIn}
                      className="text-[10px] text-emerald-600 hover:underline font-bold"
                    >
                      الوقت الحالي
                    </button>
                  </div>
                  <input
                    type="time"
                    required
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-center text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700">وقت الانصراف (مثلاً 02:00)</label>
                    <button
                      type="button"
                      onClick={setNowForCheckOut}
                      className="text-[10px] text-emerald-600 hover:underline font-bold"
                    >
                      الوقت الحالي
                    </button>
                  </div>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-center text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Overnight Shift Banner Indicator */}
              {isOvernight && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-bold flex items-center gap-2">
                  <Moon className="w-4 h-4 text-amber-600" />
                  تم رصد شفت مبيت (تم الحضور قبل منتصف الليل والانصراف في اليوم التالي)، سيتم حساب الساعات عبر منتصف الليل تلقائياً!
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                {loading ? 'جاري الحفظ...' : 'حفظ ساعات الدوام اليدوي'}
              </button>
            </form>
          </div>
        )}

        {/* Message Banner */}
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
