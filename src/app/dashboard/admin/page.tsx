'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AttendanceRecord } from '@/lib/types';
import { initialUsers, initialAttendanceRecords } from '@/lib/data-store';
import { Clock, ShieldCheck, CheckCircle2, Edit3, X, Calendar, Coins, LogOut, Search, UserPlus } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');

  const filteredRecords = selectedUserId === 'ALL'
    ? records
    : records.filter((r) => r.userId === selectedUserId);

  const totalMonthlyHours = Number(records.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(2));
  const totalMonthlyEarned = Number(records.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2));

  // Verify attendance action (توثيق الحضور)
  const handleVerifyRecord = async (recordId: string) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VERIFY', recordId })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, isVerified: true } : r)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save edited check-in / check-out times (تعديل وقت الحضور والانصراف)
  const handleSaveTimeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_TIME',
          recordId: editingRecord.id,
          checkInTime: editCheckIn,
          checkOutTime: editCheckOut
        })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.map((r) => (r.id === data.record.id ? data.record : r)));
        setEditingRecord(null);
      } else {
        setMsg(data.error || 'خطأ في التعديل');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditCheckIn(rec.checkInTime || '');
    setEditCheckOut(rec.checkOutTime || '');
    setMsg(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-cairo" dir="rtl">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold shadow-md">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
                لوحة المدير الإدارية لتوثيق وتعديل دوام الموظفين
              </h1>
              <p className="text-slate-500 text-xs font-semibold">
                صلاحية توثيق الحضور وتعديل ساعات الدخول والانصراف لكافة الكادر
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

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Top Summary Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي الساعات المسجلة</span>
              <span className="text-2xl font-black text-slate-900">{totalMonthlyHours} ساعة</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي الأجور المستحقة</span>
              <span className="text-2xl font-black text-emerald-700">{totalMonthlyEarned} د.ل</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-bold block">تصفية حسب الموظف</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">جميع الموظفين ({records.length})</option>
                {users.filter(u => u.role !== 'ADMIN').map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (كود: {u.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Attendance Verification & Editing Log Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              سجل الحضور والانصراف وتوثيق ساعات الموظفين
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-4 font-bold">التاريخ</th>
                  <th className="py-3.5 px-4 font-bold">الموظف</th>
                  <th className="py-3.5 px-4 font-bold">وقت الحضور</th>
                  <th className="py-3.5 px-4 font-bold">وقت الانصراف</th>
                  <th className="py-3.5 px-4 font-bold text-center">ساعات اليوم</th>
                  <th className="py-3.5 px-4 font-bold text-center">المبلغ المستحق</th>
                  <th className="py-3.5 px-4 font-bold text-center">توثيق الحضور</th>
                  <th className="py-3.5 px-4 font-bold text-center">تعديل الساعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-sans font-medium">
                      لا توجد سجلات حضور مسجلة.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-sans">{r.date}</td>
                      <td className="py-3.5 px-4 font-sans font-extrabold text-slate-900">
                        {r.userName} <span className="text-[10px] text-slate-400 font-mono font-normal">({r.employeeCode})</span>
                      </td>
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
                          <button
                            onClick={() => handleVerifyRecord(r.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1 mx-auto shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            توثيق الحضور
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-sans">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto cursor-pointer"
                          title="تعديل وقت الحضور والانصراف"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                          تعديل
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Admin Time Editing Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                تعديل وقت حضور وانصراف الموظف
              </h3>
              <button onClick={() => setEditingRecord(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-semibold">
              <div>الموظف: <span className="font-bold text-slate-900">{editingRecord.userName}</span></div>
              <div>التاريخ: <span className="font-bold font-mono">{editingRecord.date}</span></div>
            </div>

            <form onSubmit={handleSaveTimeEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">وقت الحضور (HH:mm:ss)</label>
                <input
                  type="text"
                  required
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  placeholder="08:00:00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">وقت الانصراف (HH:mm:ss)</label>
                <input
                  type="text"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  placeholder="16:00:00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                />
              </div>

              {msg && <p className="text-rose-600 font-bold text-center">{msg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ الوقت الجديد'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
