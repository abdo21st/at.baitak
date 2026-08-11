'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AttendanceRecord } from '@/lib/types';
import { initialUsers, initialAttendanceRecords } from '@/lib/data-store';
import { Clock, Play, Square, Calendar, Coins, CheckCircle2, AlertCircle, LogOut, Check, ArrowRight } from 'lucide-react';
import { getCurrentTimeFormatted, getCurrentDateFormatted } from '@/lib/utils';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User>(initialUsers[1]); // Default Ahmed Ali (101)
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);
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

  // Check-in action (تسجيل وقت الحضور)
  const handleCheckIn = async () => {
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
        setMsg({ text: `تم تسجيل وقت الحضور بنجاح الساعة ${timeNow}`, type: 'success' });
      } else {
        setMsg({ text: data.error || 'خطأ في تسجيل الحضور', type: 'error' });
      }
    } catch {
      setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Check-out action (تسجيل وقت الانصراف)
  const handleCheckOut = async () => {
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
        setMsg({ text: `تم تسجيل وقت الانصراف الساعة ${timeNow} وتدوين ${data.record.workHours} ساعة!`, type: 'success' });
      } else {
        setMsg({ text: data.error || 'خطأ في تسجيل الانصراف', type: 'error' });
      }
    } catch {
      setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
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
                رقم الموظف: <span className="font-mono text-emerald-700 font-bold">{user.employeeCode}</span> | سعر الساعة: <span className="font-mono text-slate-900 font-bold">{user.hourlyRate} د.ل</span>
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
        {/* Main Action Box: Attendance & Clocking */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            التاريخ: {new Date().toLocaleDateString('ar-LY-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          <div>
            {!isCheckedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="w-full sm:w-auto px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 mx-auto transition-all cursor-pointer"
              >
                <Play className="w-6 h-6 fill-white" />
                تسجيل وقت الحضور
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl max-w-md mx-auto text-emerald-800 text-sm font-extrabold">
                  🟢 تم تسجيل حضورك اليوم الساعة <span className="font-mono text-base">{activeRecord?.checkInTime}</span>
                </div>

                <button
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="w-full sm:w-auto px-10 py-5 bg-rose-600 hover:bg-rose-500 text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 mx-auto transition-all cursor-pointer"
                >
                  <Square className="w-6 h-6 fill-white" />
                  تسجيل وقت الانصراف
                </button>
              </div>
            )}
          </div>

          {msg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-extrabold text-center max-w-md mx-auto ${
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold block">إجمالي ساعات العمل هذا الشهر</span>
              <span className="text-3xl font-black font-mono text-slate-900">{totalMonthlyHours} ساعة</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold block">إجمالي قيمة ساعات العمل لهذا الشهر</span>
              <span className="text-3xl font-black font-mono text-emerald-700">{totalMonthlyEarned} د.ل</span>
            </div>
          </div>
        </div>

        {/* Monthly Attendance Log Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            جدول ساعات عمل الشهر الحالي ({new Date().toLocaleDateString('ar-LY-u-nu-latn', { month: 'long', year: 'numeric' })})
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
                            موثق
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
