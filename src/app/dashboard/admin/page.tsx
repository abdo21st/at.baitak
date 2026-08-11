'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AttendanceRecord, Department, JobRole } from '@/lib/types';
import { initialUsers, initialAttendanceRecords } from '@/lib/data-store';
import { Clock, ShieldCheck, CheckCircle2, Edit3, X, Calendar, Coins, LogOut, UserPlus, Users, Trash2, Key, Hash, UserCheck, BarChart3, Building2, Briefcase } from 'lucide-react';
import AttendanceCalendar from '@/components/AttendanceCalendar';
import DepartmentManagement from '@/components/DepartmentManagement';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Tab State: 'ATTENDANCE' vs 'CALENDAR' vs 'EMPLOYEES' vs 'DEPARTMENTS'
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'CALENDAR' | 'EMPLOYEES' | 'DEPARTMENTS'>('ATTENDANCE');

  // Time Edit Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter state for Attendance Tab
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');

  // Employee Management Modals & State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empPin, setEmpPin] = useState('');
  const [empDepartmentId, setEmpDepartmentId] = useState('');
  const [empJobRoleId, setEmpJobRoleId] = useState('');
  const [empMonthlySalary, setEmpMonthlySalary] = useState('0');
  const [empTargetHours, setEmpTargetHours] = useState('160');
  const [empRate, setEmpRate] = useState('50');
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const fetchEmployeesAndDeps = () => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.users) {
          setUsers(data.users);
        }
      })
      .catch(() => {});

    fetch('/api/departments')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.departments) {
          setDepartments(data.departments);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchEmployeesAndDeps();
  }, []);

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

  // Save edited check-in / check-out times
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

  // When selected department changes, filter available job roles
  const availableJobRoles = departments.find((d) => d.id === empDepartmentId)?.jobRoles || [];

  const handleJobRoleChange = (roleId: string) => {
    setEmpJobRoleId(roleId);
    if (!roleId) {
      setEmpMonthlySalary('0');
      return;
    }
    const role = availableJobRoles.find((r) => r.id === roleId);
    if (role) {
      setEmpMonthlySalary(String(role.monthlySalary));
      setEmpTargetHours(String(role.targetMonthlyHours));
    }
  };

  // Add New Employee Action
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg(null);

    if (!empName || !empCode || !empPin) {
      setUserMsg('الاسم، رقم الموظف، والرقم السري مطلوبة');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empName,
          employeeCode: empCode,
          pinCode: empPin,
          departmentId: empDepartmentId || null,
          jobRoleId: empJobRoleId || null,
          monthlySalary: empJobRoleId ? Number(empMonthlySalary) : 0,
          targetMonthlyHours: Number(empTargetHours) || 160,
          hourlyRate: Number(empRate) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setIsAddUserOpen(false);
        setEmpName('');
        setEmpCode('');
        setEmpPin('');
        setEmpDepartmentId('');
        setEmpJobRoleId('');
      } else {
        setUserMsg(data.error || 'حدث خطأ في إضافة الموظف');
      }
    } catch {
      setUserMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Save Edited Employee Action
  const handleSaveEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserMsg(null);

    setLoading(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: empName,
          employeeCode: empCode,
          pinCode: empPin,
          departmentId: empDepartmentId || null,
          jobRoleId: empJobRoleId || null,
          monthlySalary: empJobRoleId ? Number(empMonthlySalary) : 0,
          targetMonthlyHours: Number(empTargetHours) || 160,
          hourlyRate: Number(empRate) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setEditingUser(null);
      } else {
        setUserMsg(data.error || 'حدث خطأ في تعديل الموظف');
      }
    } catch {
      setUserMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Delete Employee Action
  const handleDeleteEmployee = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت تأكد من إرادتك لحذف الموظف (${userName}) نهائياً؟`)) return;

    try {
      const res = await fetch(`/api/employees?id=${userId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        alert(data.error || 'خطأ في حذف الموظف');
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const openAddUserModal = () => {
    setEmpName('');
    setEmpCode('');
    setEmpPin('1234');
    setEmpDepartmentId('');
    setEmpJobRoleId('');
    setEmpMonthlySalary('0');
    setEmpTargetHours('160');
    setEmpRate('50');
    setUserMsg(null);
    setIsAddUserOpen(true);
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setEmpName(u.name);
    setEmpCode(u.employeeCode);
    setEmpPin(u.pinCode);
    setEmpDepartmentId(u.departmentId || '');
    setEmpJobRoleId(u.jobRoleId || '');
    setEmpMonthlySalary(String(u.monthlySalary || 0));
    setEmpTargetHours(String(u.targetMonthlyHours || 160));
    setEmpRate(String(u.hourlyRate || 50));
    setUserMsg(null);
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold shadow-md">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
                لوحة المدير الإدارية لتوثيق الدوام وإدارة الموظفين والأقسام
              </h1>
              <p className="text-slate-500 text-xs font-semibold">
                توثيق الحضور وتعديل ساعات الدوام وإدارة الأقسام والوظائف وقيمها الشهرية
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
        {/* Navigation Tabs (سجل وتوثيق الدوام vs تقويم ساعات الحضور vs قسم الموظفين vs إدارة الأقسام والوظائف) */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ATTENDANCE'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            سجل وتوثيق دوام الموظفين ({records.length})
          </button>

          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'CALENDAR'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            تقويم ساعات الحضور والخط الزمني
          </button>

          <button
            onClick={() => setActiveTab('EMPLOYEES')}
            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'EMPLOYEES'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            قسم إدارة الموظفين ({users.filter(u => u.role !== 'ADMIN').length})
          </button>

          <button
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'DEPARTMENTS'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-400" />
            إدارة الأقسام والوظائف
          </button>
        </div>

        {/* TAB 1: ATTENDANCE LOG & VERIFICATION */}
        {activeTab === 'ATTENDANCE' && (
          <div className="space-y-6">
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
          </div>
        )}

        {/* TAB 2: ATTENDANCE HOURS CALENDAR & TIMELINE */}
        {activeTab === 'CALENDAR' && (
          <AttendanceCalendar users={users} records={records} />
        )}

        {/* TAB 3: EMPLOYEE MANAGEMENT SECTION */}
        {activeTab === 'EMPLOYEES' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  قسم إدارة وتحديث بيانات الموظفين
                </h2>
                <p className="text-slate-500 text-xs font-semibold">
                  إضافة موظف جديد، تعيين أجر ساعته المباشر وراتب الوظيفة الخاص، أو حذفه
                </p>
              </div>

              <button
                onClick={openAddUserModal}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <UserPlus className="w-4 h-4" />
                إضافة موظف جديد
              </button>
            </div>

            {/* Employees Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-3.5 px-4 font-bold">اسم الموظف</th>
                    <th className="py-3.5 px-4 font-bold">القسم والوظيفة</th>
                    <th className="py-3.5 px-4 font-bold text-center">رقم الموظف (ID)</th>
                    <th className="py-3.5 px-4 font-bold text-center">الرقم السري (PIN)</th>
                    <th className="py-3.5 px-4 font-bold text-center">أجر الساعة المباشر</th>
                    <th className="py-3.5 px-4 font-bold text-center">راتب الوظيفة الخاص</th>
                    <th className="py-3.5 px-4 font-bold text-center">نوع الحساب</th>
                    <th className="py-3.5 px-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 font-sans">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
                            {u.name.substring(0, 1)}
                          </div>
                          <div>
                            <div>{u.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold">
                        <div className="text-slate-900">{u.departmentName || 'عام'}</div>
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                          {u.jobTitle || 'موظف'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-blue-700">{u.employeeCode}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-600">{u.pinCode}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-blue-700">
                        {u.hourlyRate || 0} د.ل/س
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black">
                        {u.jobRoleId && u.monthlySalary && u.monthlySalary > 0 ? (
                          <span className="text-emerald-700">
                            {u.monthlySalary} د.ل <span className="text-[10px] text-slate-400 font-normal font-sans">/ {u.targetMonthlyHours || 160}س</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans font-medium text-[11px]">بدون وظيفة خاصة</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        {u.role === 'ADMIN' ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-emerald-400 text-[10px] font-black">
                            مدير النظام
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                            موظف
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="تعديل بيانات الموظف"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            تعديل
                          </button>

                          {u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleDeleteEmployee(u.id, u.name)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="حذف الموظف"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DEPARTMENT & JOB ROLE MANAGEMENT */}
        {activeTab === 'DEPARTMENTS' && (
          <DepartmentManagement />
        )}
      </main>

      {/* Add Employee Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                إدخال وإضافة موظف جديد
              </h3>
              <button onClick={() => setIsAddUserOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  1. اسم الموظف *
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="مثال: علي الطرابلسي"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">القسم التابع له الموظف</label>
                  <select
                    value={empDepartmentId}
                    onChange={(e) => {
                      setEmpDepartmentId(e.target.value);
                      setEmpJobRoleId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">اختر القسم (اختياري)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الوظيفة / الصفة الخاصة</label>
                  <select
                    value={empJobRoleId}
                    onChange={(e) => handleJobRoleChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">بدون وظيفة خاصة (ساعات فقط)</option>
                    {availableJobRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.monthlySalary} د.ل)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-blue-600" />
                    2. رقم الموظف (ID) *
                  </label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    placeholder="104"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    3. الرقم السري (PIN) *
                  </label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empPin}
                    onChange={(e) => setEmpPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    أجر الساعة المباشر (د.ل/س) *
                  </label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empRate}
                    onChange={(e) => setEmpRate(e.target.value)}
                    placeholder="50"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    راتب الوظيفة الخاص (د.ل)
                  </label>
                  <input
                    type="text"
                    lang="en-US"
                    dir="ltr"
                    value={empMonthlySalary}
                    onChange={(e) => setEmpMonthlySalary(e.target.value)}
                    placeholder="0"
                    disabled={!empJobRoleId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {userMsg && <p className="text-rose-600 font-bold text-center">{userMsg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs"
                >
                  {loading ? 'جاري الإضافة...' : 'إضافة الموظف الآن'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                تعديل بيانات الموظف ({editingUser.name})
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEmployee} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">1. اسم الموظف *</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">القسم</label>
                  <select
                    value={empDepartmentId}
                    onChange={(e) => {
                      setEmpDepartmentId(e.target.value);
                      setEmpJobRoleId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">اختر القسم</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الوظيفة / الصفة الخاصة</label>
                  <select
                    value={empJobRoleId}
                    onChange={(e) => handleJobRoleChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">بدون وظيفة خاصة (ساعات فقط)</option>
                    {availableJobRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.monthlySalary} د.ل)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">2. رقم الموظف (ID) *</label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">3. الرقم السري (PIN) *</label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empPin}
                    onChange={(e) => setEmpPin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">أجر الساعة المباشر (د.ل/س)</label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empRate}
                    onChange={(e) => setEmpRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">راتب الوظيفة الخاص (د.ل)</label>
                  <input
                    type="text"
                    lang="en-US"
                    dir="ltr"
                    value={empMonthlySalary}
                    onChange={(e) => setEmpMonthlySalary(e.target.value)}
                    disabled={!empJobRoleId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {userMsg && <p className="text-rose-600 font-bold text-center">{userMsg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ البيانات الجديدة'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
