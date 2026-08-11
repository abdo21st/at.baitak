'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import AttendanceLogTable from '@/components/AttendanceLogTable';
import ProjectManagerModal from '@/components/ProjectManagerModal';
import EmployeeManagerModal from '@/components/EmployeeManagerModal';
import LabelCustomizerModal from '@/components/LabelCustomizerModal';
import { User, Project, AttendanceRecord, LeaveRequest, CompanySettings, CustomLabels } from '@/lib/types';
import { initialUsers, initialProjects, initialAttendanceRecords, initialLeaveRequests, initialCompanySettings } from '@/lib/data-store';
import { Clock, Users, FolderPlus, Coins, CheckCircle2, XCircle, RotateCcw, Send, Sparkles, HeartPulse, Bell, Settings, Type, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [settings, setSettings] = useState<CompanySettings>(initialCompanySettings);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const labels = settings.customLabels;

  // Compute live system stats
  const activeSessionsCount = records.filter((r) => !r.checkOutTime).length;
  const totalHoursWorked = Number(records.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(1));
  const totalEarnedCost = Number(records.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2));
  const pendingLeavesCount = leaves.filter((l) => l.status === 'PENDING').length;

  // Chart data
  const chartData = projects.map((p) => {
    const projRecords = records.filter((r) => r.projectId === p.id);
    const hrs = Number(projRecords.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(1));
    return { name: p.name.split(' ')[0], ساعات: hrs, budget: p.budgetHours };
  });

  const handleApproveLeave = (leaveId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === leaveId ? { ...l, status: newStatus } : l))
    );
  };

  const handleFactoryReset = async () => {
    if (window.confirm('هل أنت تأكد من إعادة ضبط المصنع واسترجاع بيانات النظام والأولية؟')) {
      setRecords([...initialAttendanceRecords]);
      setProjects([...initialProjects]);
      setUsers([...initialUsers]);
      setLeaves([...initialLeaveRequests]);
      setSettings({ ...initialCompanySettings });
      setMsg('تمت إعادة ضبط المصنع بنجاح!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-cairo" dir="rtl">
      {/* Navbar */}
      <Navbar
        user={currentUser}
        onSwitchUser={setCurrentUser}
        allUsers={users}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Control Bar & Dynamic Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {labels.dashboardTitle}
              </h2>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                {labels.companyName}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">
              مراقبة مناوبات الدوام المباشرة، الأجور بالعملة {labels.currencySymbol}، والتكامل مع n8n والسيرفر
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsLabelModalOpen(true)}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold rounded-xl shadow-sm flex items-center gap-2 text-xs transition-all cursor-pointer"
            >
              <Type className="w-4 h-4 text-emerald-600" />
              تخصيص جميع العناوين والشركة
            </button>

            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 text-xs transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              {labels.projectsTitle}
            </button>

            <button
              onClick={() => setIsEmployeeModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 text-xs transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              {labels.employeesTitle}
            </button>

            <button
              onClick={handleFactoryReset}
              className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="إعادة ضبط المصنع"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              ضبط المصنع
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block font-sans">المناوبات النشطة الآن</span>
              <span className="text-2xl font-black text-slate-900">{activeSessionsCount} عضو</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block font-sans">إجمالي ساعات الدوام المنجزة</span>
              <span className="text-2xl font-black text-slate-900">{totalHoursWorked} ساعة</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block font-sans">إجمالي الأجور المستحقة</span>
              <span className="text-2xl font-black text-emerald-700">{totalEarnedCost} {labels.currencySymbol}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block font-sans">طلبات التبديل المعلقة</span>
              <span className="text-2xl font-black text-slate-900">{pendingLeavesCount} طلب</span>
            </div>
          </div>
        </div>

        {/* Charts & Dedicated Settings Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Cols: Recharts Project Hours Analytics */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              تحليل ساعات الدوام وتوزيعها على {labels.projectsTitle}
            </h3>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="ساعات" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right 4 Cols: Dedicated Settings Section */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-100 pb-3">
                <Settings className="w-5 h-5 text-emerald-600" />
                قسم إعدادات النظام وتخصيص العناوين
              </div>

              <div className="mt-4 space-y-3">
                <button
                  onClick={() => setIsLabelModalOpen(true)}
                  className="w-full p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 border border-slate-200 hover:border-emerald-300 rounded-2xl text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-emerald-600" />
                    <span>تخصيص جميع العناوين والشركة</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">تعديل</span>
                </button>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    اسم الشركة: <span className="text-emerald-700">{labels.companyName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    اسم البرنامج: <span className="text-slate-900 font-semibold">{labels.appName}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-bold mb-1">رابط Webhook لـ n8n والواتساب</label>
                  <input
                    type="text"
                    value={settings.n8nWebhookUrl}
                    onChange={(e) => setSettings({ ...settings, n8nWebhookUrl: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold">
              ✅ إعدادات النظام وتسميات العناوين مفعلة وحية.
            </div>
          </div>
        </div>

        {/* Leave Requests Approval Table */}
        {leaves.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              مراجعة واعتماد طلبات الاستئذان وتبديل المناوبات
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4 font-bold">العضو / الصيدلي</th>
                    <th className="py-3 px-4 font-bold">نوع الطلب</th>
                    <th className="py-3 px-4 font-bold">من تاريخ</th>
                    <th className="py-3 px-4 font-bold">إلى تاريخ</th>
                    <th className="py-3 px-4 font-bold">السبب والتوضيح</th>
                    <th className="py-3 px-4 font-bold text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900 font-sans">{l.userName}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                          {l.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{l.startDate}</td>
                      <td className="py-3 px-4 text-slate-600">{l.endDate}</td>
                      <td className="py-3 px-4 text-slate-600 font-sans">{l.reason}</td>
                      <td className="py-3 px-4 text-center font-sans">
                        {l.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApproveLeave(l.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              موافقة
                            </button>
                            <button
                              onClick={() => handleApproveLeave(l.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              رفض
                            </button>
                          </div>
                        ) : (
                          <span className={`font-bold ${l.status === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {l.status === 'APPROVED' ? 'تمت الموافقة' : 'مرفوض'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Master Attendance Log Table */}
        <AttendanceLogTable
          records={records}
          title={`كشف المناوبات وتسلّم وتدوين ساعات ${labels.employeesTitle}`}
          showEmployeeName={true}
        />
      </main>

      {/* Modals */}
      <LabelCustomizerModal
        currentLabels={labels}
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        onLabelsUpdated={(newLabels) => {
          setSettings((prev) => ({ ...prev, customLabels: newLabels }));
        }}
      />

      <ProjectManagerModal
        projects={projects}
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectsUpdated={() => {}}
      />

      <EmployeeManagerModal
        users={users}
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onUsersUpdated={() => {}}
      />
    </div>
  );
}
