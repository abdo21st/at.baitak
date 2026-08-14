'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AttendanceRecord, Department, JobRole, CompanySettings } from '@/lib/types';
import { initialUsers, initialAttendanceRecords } from '@/lib/data-store';
import { Clock, ShieldCheck, CheckCircle2, Edit3, X, Calendar, Coins, LogOut, UserPlus, Users, Trash2, Key, Hash, UserCheck, BarChart3, Building2, Briefcase, MapPin, Settings, ShieldAlert, Navigation } from 'lucide-react';
import AttendanceCalendar from '@/components/AttendanceCalendar';
import DepartmentManagement from '@/components/DepartmentManagement';
import { useSortableData } from '@/hooks/useSortableData';
import SortHeader from '@/components/SortHeader';
import { formatTime12h, convert12to24, convert24to12 } from '@/lib/utils';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Tab State: 'ATTENDANCE' vs 'CALENDAR' vs 'EMPLOYEES' vs 'DEPARTMENTS' vs 'SETTINGS'
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'CALENDAR' | 'EMPLOYEES' | 'DEPARTMENTS' | 'SETTINGS'>('ATTENDANCE');

  // GPS Settings State
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsLatitude, setGpsLatitude] = useState('32.8872');
  const [gpsLongitude, setGpsLongitude] = useState('13.1913');
  const [gpsRadiusMeters, setGpsRadiusMeters] = useState('200');
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Time & Date Edit Modal State
  const hours12List = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editCheckOutDate, setEditCheckOutDate] = useState('');
  const [editInHour, setEditInHour] = useState('08');
  const [editInMinute, setEditInMinute] = useState('00');
  const [editInPeriod, setEditInPeriod] = useState<'AM' | 'PM'>('AM');
  const [editOutHour, setEditOutHour] = useState('04');
  const [editOutMinute, setEditOutMinute] = useState('00');
  const [editOutPeriod, setEditOutPeriod] = useState<'AM' | 'PM'>('PM');
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
  const [empDepartmentIds, setEmpDepartmentIds] = useState<string[]>([]);
  const [empJobRoleIds, setEmpJobRoleIds] = useState<string[]>([]);
  const [empMonthlySalary, setEmpMonthlySalary] = useState('0');
  const [empTargetHours, setEmpTargetHours] = useState('160');
  const [empRate, setEmpRate] = useState('50');
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [empRes, depRes, attRes, setRes] = await Promise.all([
        fetch('/api/employees').then((r) => r.json()),
        fetch('/api/departments').then((r) => r.json()),
        fetch('/api/attendance').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json())
      ]);

      if (empRes.success && empRes.users) setUsers(empRes.users);
      if (depRes.success && depRes.departments) setDepartments(depRes.departments);
      if (attRes.success && attRes.records) setRecords(attRes.records);

      if (setRes.success && setRes.settings) {
        const s: CompanySettings = setRes.settings;
        setGpsEnabled(Boolean(s.gpsEnabled));
        if (s.gpsLatitude) setGpsLatitude(String(s.gpsLatitude));
        if (s.gpsLongitude) setGpsLongitude(String(s.gpsLongitude));
        if (s.gpsRadiusMeters) setGpsRadiusMeters(String(s.gpsRadiusMeters));
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredRecords = selectedUserId === 'ALL'
    ? records
    : records.filter((r) => r.userId === selectedUserId);

  const { items: sortedFilteredRecords, requestSort: requestRecordSort, sortConfig: recordSortConfig } = useSortableData(filteredRecords, {
    key: 'date',
    direction: 'desc'
  });

  const { items: sortedUsers, requestSort: requestUserSort, sortConfig: userSortConfig } = useSortableData(users, {
    key: 'name',
    direction: 'asc'
  });

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
        if (data.record) {
          setRecords((prev) => prev.map((r) => (r.id === recordId ? data.record : r)));
        } else {
          setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, isVerified: true } : r)));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete attendance record action (حذف سجل الحضور)
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('هل أنت تأكد من حذف سجل الحضور هذا بالكامل؟')) return;

    try {
      const res = await fetch(`/api/attendance?id=${recordId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      } else {
        alert(data.error || 'خطأ في حذف السجل');
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const openEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setMsg(null);
    setEditDate(rec.date);
    setEditCheckOutDate(rec.date);
    const inState = convert24to12(rec.checkInTime);
    setEditInHour(inState.hour);
    setEditInMinute(inState.minute);
    setEditInPeriod(inState.period);

    if (rec.checkOutTime) {
      const outState = convert24to12(rec.checkOutTime);
      setEditOutHour(outState.hour);
      setEditOutMinute(outState.minute);
      setEditOutPeriod(outState.period);
    } else {
      setEditOutHour('04');
      setEditOutMinute('00');
      setEditOutPeriod('PM');
    }
  };

  // Save edited check-in / check-out dates and times
  const handleSaveTimeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const newIn = convert12to24(editInHour, editInMinute, editInPeriod);
    const newOut = convert12to24(editOutHour, editOutMinute, editOutPeriod);

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_TIME',
          recordId: editingRecord.id,
          date: editDate,
          checkInTime: newIn,
          checkOutDate: editCheckOutDate,
          checkOutTime: newOut
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
          departmentIds: empDepartmentIds,
          jobRoleIds: empJobRoleIds,
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
        setEmpDepartmentIds([]);
        setEmpJobRoleIds([]);
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
          departmentIds: empDepartmentIds,
          jobRoleIds: empJobRoleIds,
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
    setEmpDepartmentIds([]);
    setEmpJobRoleId('');
    setEmpJobRoleIds([]);
    setEmpMonthlySalary('0');
    setEmpRate('50');
    setUserMsg(null);
    setIsAddUserOpen(true);
  };

  // Save GPS settings action
  const handleSaveGpsSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gpsEnabled,
          gpsLatitude: Number(gpsLatitude) || 32.8872,
          gpsLongitude: Number(gpsLongitude) || 13.1913,
          gpsRadiusMeters: Number(gpsRadiusMeters) || 200
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMsg('تم حفظ إعدادات الموقع الجغرافي (GPS) بنجاح!');
      } else {
        setSettingsMsg(data.error || 'خطأ في حفظ الإعدادات');
      }
    } catch {
      setSettingsMsg('خطأ في الاتصال بالخادم');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Get current browser location for admin
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLatitude(pos.coords.latitude.toFixed(6));
          setGpsLongitude(pos.coords.longitude.toFixed(6));
          setSettingsMsg('تم جلب إحداثيات موقعك الحالي بنجاح!');
        },
        () => {
          alert('تعذر جلب موقعك الحالي. يُرجى منح إذن تحديد الموقع للمتصفح.');
        }
      );
    } else {
      alert('تحديد الموقع الجغرافي غير مدعوم في متصفحك.');
    }
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setEmpName(u.name);
    setEmpCode(u.employeeCode);
    setEmpPin(u.pinCode);
    const depIds = u.departments ? u.departments.map((d) => d.id) : (u.departmentId ? [u.departmentId] : []);
    const roleIds = u.jobRoles ? u.jobRoles.map((r) => r.id) : (u.jobRoleId ? [u.jobRoleId] : []);
    setEmpDepartmentIds(depIds);
    setEmpJobRoleIds(roleIds);
    // Sync single-select state for dropdowns
    setEmpDepartmentId(depIds[0] || '');
    setEmpJobRoleId(roleIds[0] || '');
    setEmpRate(String(u.hourlyRate || 50));
    setUserMsg(null);
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
            className="h-10 px-3.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
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
            className={`flex-1 h-12 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
            className={`flex-1 h-12 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
            className={`flex-1 h-12 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
            className={`flex-1 h-12 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'DEPARTMENTS'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-400" />
            إدارة الأقسام والوظائف
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex-1 h-12 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'SETTINGS'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-4 h-4 text-purple-400" />
            إعدادات GPS والموقع
          </button>
        </div>

        {/* TAB 1: ATTENDANCE LOG & VERIFICATION */}
        {activeTab === 'ATTENDANCE' && (
          <div className="space-y-6">
            {/* Top Summary Widgets with Equal Height h-24 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="bg-white h-24 p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي الساعات المسجلة</span>
                  <span className="text-2xl font-black text-slate-900">{totalMonthlyHours} ساعة</span>
                </div>
              </div>

              <div className="bg-white h-24 p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي الأجور المستحقة</span>
                  <span className="text-2xl font-black text-emerald-700">{totalMonthlyEarned} د.ل</span>
                </div>
              </div>

              <div className="bg-white h-24 p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-bold block">تصفية حسب الموظف</span>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
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
                      <SortHeader title="التاريخ" sortKey="date" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} />
                      <SortHeader title="الموظف" sortKey="userName" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} />
                      <SortHeader title="وقت الحضور" sortKey="checkInTime" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} />
                      <SortHeader title="وقت الانصراف" sortKey="checkOutTime" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} />
                      <SortHeader title="ساعات اليوم" sortKey="workHours" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} align="center" />
                      <SortHeader title="المبلغ المستحق" sortKey="earnedCost" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} align="center" />
                      <SortHeader title="توثيق الحضور" sortKey="isVerified" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} align="center" />
                      <th className="py-3.5 px-4 font-bold text-center">تعديل الساعات</th>
                      <th className="py-3.5 px-4 font-bold text-center">حذف السجل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {sortedFilteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 font-sans font-medium">
                          لا توجد سجلات حضور مسجلة.
                        </td>
                      </tr>
                    ) : (
                      sortedFilteredRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 font-sans">{r.date}</td>
                          <td className="py-3.5 px-4 font-sans font-extrabold text-slate-900">
                            <div>{r.userName} <span className="text-[10px] text-slate-400 font-mono font-normal">({r.employeeCode})</span></div>
                            {r.isOutsideGps && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold mt-0.5 font-sans">
                                <ShieldAlert className="w-3 h-3 text-amber-700" />
                                خارج نطاق GPS
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-600 font-bold">{formatTime12h(r.checkInTime)}</td>
                          <td className="py-3.5 px-4 text-rose-600 font-bold">{formatTime12h(r.checkOutTime)}</td>
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
                                className="px-3 h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1 mx-auto shadow-sm cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                توثيق الحضور
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center font-sans">
                            <button
                              onClick={() => openEditModal(r)}
                              className="px-3 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto cursor-pointer"
                              title="تعديل وقت الحضور والانصراف"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                              تعديل
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center font-sans">
                            <button
                              onClick={() => handleDeleteRecord(r.id)}
                              className="px-2.5 h-8 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto cursor-pointer"
                              title="حذف سجل الحضور هذا بالكامل"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              حذف
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
                className="px-4 h-11 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
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
                    <SortHeader title="اسم الموظف" sortKey="name" sortConfig={userSortConfig} onRequestSort={requestUserSort} />
                    <SortHeader title="القسم والوظيفة" sortKey="departmentName" sortConfig={userSortConfig} onRequestSort={requestUserSort} />
                    <SortHeader title="رقم الموظف (ID)" sortKey="employeeCode" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <SortHeader title="الرقم السري (PIN)" sortKey="pinCode" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <SortHeader title="أجر الساعة المباشر" sortKey="hourlyRate" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <SortHeader title="راتب الوظيفة الخاص" sortKey="monthlySalary" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <th className="py-3.5 px-4 font-bold text-center text-emerald-700">إجمالي المرتب الشهري</th>
                    <SortHeader title="نوع الحساب" sortKey="role" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <th className="py-3.5 px-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedUsers.map((u) => (
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
                        <div className="text-slate-900">
                          {u.departmentNames && u.departmentNames.length > 0
                            ? u.departmentNames.join(', ')
                            : (u.departmentName || 'عام')}
                        </div>
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                          {u.jobRoleTitles && u.jobRoleTitles.length > 0
                            ? u.jobRoleTitles.join(' + ')
                            : (u.jobTitle || 'بدون وظيفة خاصة')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-blue-700">{u.employeeCode}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-600">{u.pinCode}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-blue-700">
                        {u.hourlyRate || 0} د.ل/س
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black">
                        {(u.jobRoleIds?.length || (u.jobRoleId ? 1 : 0)) > 0 && u.monthlySalary && u.monthlySalary > 0 ? (
                          <span className="text-emerald-700">
                            {u.monthlySalary} د.ل <span className="text-[10px] text-slate-400 font-normal font-sans">/ شهري</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans font-medium text-[11px]">بدون وظيفة خاصة</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-700 bg-emerald-50/40">
                        {(((u.targetMonthlyHours || 160) * (u.hourlyRate || 0)) + (u.monthlySalary || 0)).toFixed(2)} د.ل
                        <span className="block text-[9px] text-slate-400 font-sans font-normal font-mono">
                          ({u.targetMonthlyHours || 160}س × {u.hourlyRate || 0} + {u.monthlySalary || 0})
                        </span>
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
                            className="px-2.5 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="تعديل بيانات الموظف"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            تعديل
                          </button>

                          {u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleDeleteEmployee(u.id, u.name)}
                              className="px-2.5 h-8 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
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
          <DepartmentManagement onDepartmentsChange={(deps) => setDepartments(deps)} />
        )}

        {/* TAB 5: GPS GEOFENCING & SYSTEM SETTINGS */}
        {activeTab === 'SETTINGS' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  إعدادات التحديد الجغرافي (GPS Geofencing)
                </h2>
                <p className="text-slate-500 text-xs font-semibold mt-1">
                  حدد موقع مقر الشركة وإحداثياته على الخريطة ونصف قطر النطاق الجغرافي المسموح به للموظفين.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveGpsSettings} className="space-y-6 max-w-2xl text-xs font-bold">
              {/* Toggle GPS Enabled */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">تفعيل نظام التحديد الجغرافي (GPS)</h4>
                  <p className="text-slate-500 text-[11px] font-semibold mt-0.5">
                    عند التفعيل، سيتم حساب مسافة الموظف عن النطاق وتنبيهه وتوثيق ما إذا كان الحضور من داخل أو خارج مقر العمل.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gpsEnabled}
                    onChange={(e) => setGpsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* GPS Location & Coordinates */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 font-extrabold text-sm">إحداثيات موقع مقر العمل (Latitude & Longitude)</label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-purple-200"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    استخدام موقعي الحالي
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
                  <div>
                    <label className="block text-slate-600 mb-1 font-sans">خط العرض (Latitude)</label>
                    <input
                      type="text"
                      required
                      value={gpsLatitude}
                      onChange={(e) => setGpsLatitude(e.target.value)}
                      placeholder="32.8872"
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-purple-500 text-left"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-sans">خط الطول (Longitude)</label>
                    <input
                      type="text"
                      required
                      value={gpsLongitude}
                      onChange={(e) => setGpsLongitude(e.target.value)}
                      placeholder="13.1913"
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-purple-500 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Radius in Meters */}
              <div>
                <label className="block text-slate-800 font-extrabold text-sm mb-1">
                  نصف قطر النطاق المسموح به (بالأمتار)
                </label>
                <p className="text-slate-500 text-[11px] font-semibold mb-2">
                  المسافة القصوى التي يُعتبر الموظف فيها متواجداً داخل مقر العمل (مثال: 200 متر).
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    required
                    min="10"
                    max="5000"
                    value={gpsRadiusMeters}
                    onChange={(e) => setGpsRadiusMeters(e.target.value)}
                    className="w-40 h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center text-base focus:outline-none focus:border-purple-500"
                    dir="ltr"
                  />
                  <span className="text-slate-600 font-bold">متر (م)</span>
                </div>
              </div>

              {settingsMsg && (
                <div className="p-3.5 rounded-2xl text-xs font-black text-center bg-purple-50 text-purple-900 border border-purple-200">
                  {settingsMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={settingsLoading}
                className="w-full sm:w-auto px-8 h-12 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {settingsLoading ? 'جاري الحفظ...' : 'حفظ إعدادات الموقع الجغرافي'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Add Employee Modal with Equal Height Inputs h-11 */}
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
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">القسم التابع له الموظف</label>
                  <select
                    value={empDepartmentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmpDepartmentId(val);
                      setEmpDepartmentIds(val ? [val] : []);
                      setEmpJobRoleId('');
                      setEmpJobRoleIds([]);
                    }}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
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
                    onChange={(e) => {
                      const val = e.target.value;
                      handleJobRoleChange(val);
                      setEmpJobRoleIds(val ? [val] : []);
                    }}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">بدون وظيفة خاصة (ساعات فقط)</option>
                    {availableJobRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.monthlySalary} د.ل - {r.isHourly !== false ? `${r.targetMonthlyHours}س` : 'راتب شهري ثابت'})
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
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
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
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
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
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                {empJobRoleId && (
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
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                )}
              </div>

              {/* Total Monthly Salary Calculation Live Preview */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl border border-blue-800 space-y-1 font-sans">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">إجمالي المرتب الشهري التقديري:</span>
                  <span className="text-emerald-400 font-mono font-black text-sm">
                    {(((Number(empTargetHours) || 160) * (Number(empRate) || 0)) + (Number(empMonthlySalary) || 0)).toFixed(2)} د.ل
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  ({Number(empTargetHours) || 160}س × {Number(empRate) || 0} د.ل) + (راتب الوظيفة {Number(empMonthlySalary) || 0} د.ل)
                </p>
              </div>

              {userMsg && <p className="text-rose-600 font-bold text-center">{userMsg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs flex items-center justify-center"
                >
                  {loading ? 'جاري الإضافة...' : 'إضافة الموظف الآن'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="w-full h-11 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs flex items-center justify-center"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal with Equal Height Inputs h-11 */}
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
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">القسم</label>
                  <select
                    value={empDepartmentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmpDepartmentId(val);
                      setEmpDepartmentIds(val ? [val] : []);
                      setEmpJobRoleId('');
                      setEmpJobRoleIds([]);
                    }}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
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
                    onChange={(e) => {
                      const val = e.target.value;
                      handleJobRoleChange(val);
                      setEmpJobRoleIds(val ? [val] : []);
                    }}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">بدون وظيفة خاصة (ساعات فقط)</option>
                    {availableJobRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.monthlySalary} د.ل - {r.isHourly !== false ? `${r.targetMonthlyHours}س` : 'راتب شهري ثابت'})
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
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
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
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
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
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                {empJobRoleId && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">راتب الوظيفة الخاص (د.ل)</label>
                  <input
                    type="text"
                    lang="en-US"
                    dir="ltr"
                    value={empMonthlySalary}
                    onChange={(e) => setEmpMonthlySalary(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                )}
              </div>

              {userMsg && <p className="text-rose-600 font-bold text-center">{userMsg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs flex items-center justify-center"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ البيانات الجديدة'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-full h-11 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs flex items-center justify-center"
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

            <form onSubmit={handleSaveTimeEdit} className="space-y-4 text-xs font-bold">
              {/* Check-in Date & Time */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-extrabold">تاريخ ووقت الحضور المعدل</label>
                <input
                  type="date"
                  lang="en-US"
                  dir="ltr"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                />
                <div className="grid grid-cols-3 gap-2 font-sans">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الساعة</label>
                    <select value={editInHour} onChange={(e) => setEditInHour(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-mono font-black text-sm">
                      {hours12List.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الدقيقة</label>
                    <select value={editInMinute} onChange={(e) => setEditInMinute(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-mono font-black text-sm">
                      {minutesList.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الفترة</label>
                    <select value={editInPeriod} onChange={(e) => setEditInPeriod(e.target.value as 'AM' | 'PM')} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-black text-sm">
                      <option value="AM">صباحاً (AM)</option>
                      <option value="PM">مساءً (PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Check-out Date & Time */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-extrabold">تاريخ ووقت الانصراف المعدل</label>
                <input
                  type="date"
                  lang="en-US"
                  dir="ltr"
                  value={editCheckOutDate}
                  onChange={(e) => setEditCheckOutDate(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                />
                <div className="grid grid-cols-3 gap-2 font-sans">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الساعة</label>
                    <select value={editOutHour} onChange={(e) => setEditOutHour(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-mono font-black text-sm">
                      {hours12List.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الدقيقة</label>
                    <select value={editOutMinute} onChange={(e) => setEditOutMinute(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-mono font-black text-sm">
                      {minutesList.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الفترة</label>
                    <select value={editOutPeriod} onChange={(e) => setEditOutPeriod(e.target.value as 'AM' | 'PM')} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-black text-sm">
                      <option value="AM">صباحاً (AM)</option>
                      <option value="PM">مساءً (PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {msg && <p className="text-rose-600 font-bold text-center">{msg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs flex items-center justify-center"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ الوقت الجديد'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="w-full h-11 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs flex items-center justify-center"
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
