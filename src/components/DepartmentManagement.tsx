'use client';

import React, { useState, useEffect } from 'react';
import { Department, JobRole } from '@/lib/types';
import { Building2, Briefcase, Plus, Trash2, Edit3, X, Coins, Clock } from 'lucide-react';

interface Props {
  onDepartmentsChange?: (departments: Department[]) => void;
}

export default function DepartmentManagement({ onDepartmentsChange }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Modals state
  const [isAddDepOpen, setIsAddDepOpen] = useState(false);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [selectedDepId, setSelectedDepId] = useState<string>('');

  // Edit Modals state
  const [editingDep, setEditingDep] = useState<Department | null>(null);
  const [editingRole, setEditingRole] = useState<JobRole | null>(null);

  // Forms inputs
  const [depNameInput, setDepNameInput] = useState('');
  const [roleTitleInput, setRoleTitleInput] = useState('');
  const [monthlySalaryInput, setMonthlySalaryInput] = useState('');
  const [targetHoursInput, setTargetHoursInput] = useState('');
  const [isHourlyInput, setIsHourlyInput] = useState(true);
  const [hasCommissionInput, setHasCommissionInput] = useState(false);
  const [commissionTypeInput, setCommissionTypeInput] = useState<'SALES' | 'PURCHASES'>('SALES');
  const [commissionRateInput, setCommissionRateInput] = useState('');

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
        onDepartmentsChange?.(data.departments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // 1. Add Department
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depNameInput.trim()) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_DEPARTMENT',
          departmentName: depNameInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
        onDepartmentsChange?.(data.departments);
        setIsAddDepOpen(false);
        setDepNameInput('');
      } else {
        setMsg(data.error || 'خطأ في إضافة القسم');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // 2. Add Job Role
  const handleAddJobRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepId || !roleTitleInput.trim()) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_JOB_ROLE',
          departmentId: selectedDepId,
          roleTitle: roleTitleInput,
          monthlySalary: Number(monthlySalaryInput) || 0,
          targetMonthlyHours: isHourlyInput ? (Number(targetHoursInput) || 0) : 0,
          isHourly: isHourlyInput,
          hasCommission: hasCommissionInput,
          commissionType: commissionTypeInput,
          commissionRate: hasCommissionInput ? (Number(commissionRateInput) || 0) : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
        onDepartmentsChange?.(data.departments);
        setIsAddRoleOpen(false);
        setRoleTitleInput('');
        setMonthlySalaryInput('');
        setTargetHoursInput('');
        setIsHourlyInput(true);
        setHasCommissionInput(false);
        setCommissionTypeInput('SALES');
        setCommissionRateInput('');
      } else {
        setMsg(data.error || 'خطأ في إضافة الوظيفة');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // 3. Edit Job Role
  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_JOB_ROLE',
          id: editingRole.id,
          title: roleTitleInput,
          monthlySalary: Number(monthlySalaryInput) || 0,
          targetMonthlyHours: isHourlyInput ? (Number(targetHoursInput) || 0) : 0,
          isHourly: isHourlyInput,
          hasCommission: hasCommissionInput,
          commissionType: commissionTypeInput,
          commissionRate: hasCommissionInput ? (Number(commissionRateInput) || 0) : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
        onDepartmentsChange?.(data.departments);
        setEditingRole(null);
      } else {
        setMsg(data.error || 'خطأ في تعديل الوظيفة');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // 4. Delete Department
  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`هل أنت تأكد من حذف قسم (${name}) وكافة الوظائف التابعة له؟`)) return;

    try {
      const res = await fetch(`/api/departments?action=DELETE_DEPARTMENT&id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
        onDepartmentsChange?.(data.departments);
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  // 5. Delete Job Role
  const handleDeleteJobRole = async (id: string, title: string) => {
    if (!confirm(`هل أنت تأكد من حذف وظيفة (${title})؟`)) return;

    try {
      const res = await fetch(`/api/departments?action=DELETE_JOB_ROLE&id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
        onDepartmentsChange?.(data.departments);
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const openAddRoleModal = (depId: string) => {
    setSelectedDepId(depId);
    setRoleTitleInput('');
    setMonthlySalaryInput('');
    setTargetHoursInput('');
    setIsHourlyInput(true);
    setHasCommissionInput(false);
    setCommissionTypeInput('SALES');
    setCommissionRateInput('');
    setMsg(null);
    setIsAddRoleOpen(true);
  };

  const openEditRoleModal = (r: JobRole) => {
    setEditingRole(r);
    setRoleTitleInput(r.title);
    setMonthlySalaryInput(r.monthlySalary ? String(r.monthlySalary) : '');
    setTargetHoursInput(r.targetMonthlyHours ? String(r.targetMonthlyHours) : '');
    setIsHourlyInput(r.isHourly !== false);
    setHasCommissionInput(Boolean(r.hasCommission));
    setCommissionTypeInput((r.commissionType as any) || 'SALES');
    setCommissionRateInput(r.commissionRate ? String(r.commissionRate) : '');
    setMsg(null);
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Main Header & Add Department Button */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            قائمة أقسام ووظائف المؤسسة ({departments.length} قسم)
          </h3>
          <p className="text-slate-500 text-xs font-semibold">
            أضف قسماً (مثل: قسم المبيعات، الإدارة، الصيدلة) وضمن تحته الوظائف بقيمها الشهرية
          </p>
        </div>

        <button
          onClick={() => {
            setDepNameInput('');
            setMsg(null);
            setIsAddDepOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          إضافة قسم جديد
        </button>
      </div>

      {/* Departments & Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs font-bold bg-white rounded-3xl border border-dashed border-slate-200">
            لا توجد أقسام مسجلة. انقر على زر "إضافة قسم جديد" للبدء.
          </div>
        ) : (
          departments.map((dep) => (
            <div key={dep.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              {/* Department Card Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-white">{dep.name}</h4>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {dep.jobRoles?.length || 0} وظائف متوفرة • {dep.userCount || 0} موظفين
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openAddRoleModal(dep.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    وظيفة جديدة
                  </button>

                  <button
                    onClick={() => handleDeleteDepartment(dep.id, dep.name)}
                    className="p-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="حذف القسم"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Job Roles List inside Department */}
              <div className="p-5 space-y-3 flex-1">
                <span className="text-slate-400 text-xs font-bold block mb-2">الوظائف والصفات المتاحة بالقسم:</span>

                {!dep.jobRoles || dep.jobRoles.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    لا توجد وظائف مضافة بهذا القسم بعد.
                  </div>
                ) : (
                  dep.jobRoles.map((role) => {
                    const isHourly = role.isHourly !== false;
                    const sampleResult = isHourly
                      ? (role.targetMonthlyHours && role.targetMonthlyHours > 0
                          ? Number(((100 * role.monthlySalary) / role.targetMonthlyHours).toFixed(2))
                          : 0)
                      : Number((role.monthlySalary / 30).toFixed(2));

                    return (
                      <div key={role.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-all flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Briefcase className="w-4 h-4 text-blue-600" />
                            <span className="font-extrabold text-slate-900 text-sm">{role.title}</span>
                            {isHourly ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-bold">
                                مرتبطة بساعات
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-bold">
                                راتب شهري ثابت
                              </span>
                            )}
                            {role.hasCommission && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-850 border border-emerald-300 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                                🛒 عمولة {role.commissionType === 'PURCHASES' ? 'المشتريات' : 'المبيعات'}: {role.commissionRate}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
                            <span className="flex items-center gap-1 text-emerald-700 font-bold">
                              <Coins className="w-3.5 h-3.5 text-emerald-600" />
                              الراتب الشهري: {role.monthlySalary} د.ل
                            </span>
                            {isHourly ? (
                              <span className="flex items-center gap-1 text-blue-700 font-bold">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                ساعات الشهر: {role.targetMonthlyHours} س
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-700 font-bold">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                اليومية الثابتة: {Number((role.monthlySalary / 30).toFixed(2))} د.ل
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 font-mono">
                            {isHourly ? (
                              <>مثال دقيقة 100 س حضور ➔ <span className="font-bold text-slate-900">{sampleResult} د.ل</span></>
                            ) : (
                              <>حساب استحقاق يوم الحضور ➔ <span className="font-bold text-slate-900">{sampleResult} د.ل / يوم</span> (الراتب الكامل {role.monthlySalary} د.ل)</>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditRoleModal(role)}
                            className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="تعديل الوظيفة والقيمة الشهرية"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            تعديل
                          </button>

                          <button
                            onClick={() => handleDeleteJobRole(role.id, role.title)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="حذف الوظيفة"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal 1: Add Department */}
      {isAddDepOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                إضافة قسم جديد في المؤسسة
              </h3>
              <button onClick={() => setIsAddDepOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم القسم *</label>
                <input
                  type="text"
                  required
                  value={depNameInput}
                  onChange={(e) => setDepNameInput(e.target.value)}
                  placeholder="مثال: قسم المبيعات / قسم الصيدلة / قسم الإدارة"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {msg && <p className="text-rose-600 font-bold text-center">{msg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs"
                >
                  {loading ? 'جاري الإضافة...' : 'إضافة القسم الآن'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddDepOpen(false)}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Job Role to Department */}
      {isAddRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                إضافة وظيفة وقيمة شهرية بالقسم
              </h3>
              <button onClick={() => setIsAddRoleOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddJobRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">1. المسمى الوظيفي / صفة الموظف *</label>
                <input
                  type="text"
                  required
                  value={roleTitleInput}
                  onChange={(e) => setRoleTitleInput(e.target.value)}
                  placeholder="مثال: مسؤول مبيعات / صيدلي أول"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">2. نوع احتساب أجر الوظيفة *</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsHourlyInput(true)}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      isHourlyInput
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    مرتبطة بساعات
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHourlyInput(false)}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      !isHourlyInput
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    راتب شهري ثابت
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">3. قيمة الوظيفة الشهرية (بالدينار الليبي د.ل) *</label>
                <input
                  type="text"
                  required
                  lang="en-US"
                  dir="ltr"
                  value={monthlySalaryInput}
                  onChange={(e) => setMonthlySalaryInput(e.target.value)}
                  placeholder="500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                />
              </div>

              {isHourlyInput && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">4. ساعات الوظيفة المطلوبة بالشهر (ساعة) *</label>
                  <input
                    type="text"
                    required={isHourlyInput}
                    lang="en-US"
                    dir="ltr"
                    value={targetHoursInput}
                    onChange={(e) => setTargetHoursInput(e.target.value)}
                    placeholder="مثال: 120 أو 200"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Commission Section in Add Modal */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 block">نظام عمولة المبيعات / المشتريات للوردية</span>
                    <span className="text-[10px] text-slate-500 font-semibold block">إلزام الموظف بتسجيل قيمة مبيعاته أو مشترياته عند الانصراف لاحتساب نسبة مئوية</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCommissionInput}
                      onChange={(e) => setHasCommissionInput(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {hasCommissionInput && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نوع العملية *</label>
                      <select
                        value={commissionTypeInput}
                        onChange={(e) => setCommissionTypeInput(e.target.value as 'SALES' | 'PURCHASES')}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="SALES">مبيعات (Sales)</option>
                        <option value="PURCHASES">مشتريات (Purchases)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نسبة العمولة (%) *</label>
                      <input
                        type="text"
                        required={hasCommissionInput}
                        lang="en-US"
                        dir="ltr"
                        value={commissionRateInput}
                        onChange={(e) => setCommissionRateInput(e.target.value)}
                        placeholder="مثال: 2.5 أو 5"
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {msg && <p className="text-rose-600 font-bold text-center">{msg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ الوظيفة والراتب الشهري'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddRoleOpen(false)}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Job Role */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                تعديل الوظيفة والقيمة الشهرية ({editingRole.title})
              </h3>
              <button onClick={() => setEditingRole(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">1. المسمى الوظيفي *</label>
                <input
                  type="text"
                  required
                  value={roleTitleInput}
                  onChange={(e) => setRoleTitleInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">2. نوع احتساب أجر الوظيفة *</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsHourlyInput(true)}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      isHourlyInput
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    مرتبطة بساعات
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHourlyInput(false)}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      !isHourlyInput
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    راتب شهري ثابت
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">3. قيمة الوظيفة الشهرية (د.ل) *</label>
                <input
                  type="text"
                  required
                  lang="en-US"
                  dir="ltr"
                  value={monthlySalaryInput}
                  onChange={(e) => setMonthlySalaryInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>

              {isHourlyInput && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">4. ساعات الوظيفة بالشهر *</label>
                  <input
                    type="text"
                    required={isHourlyInput}
                    lang="en-US"
                    dir="ltr"
                    value={targetHoursInput}
                    onChange={(e) => setTargetHoursInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Commission Section in Edit Modal */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 block">نظام عمولة المبيعات / المشتريات للوردية</span>
                    <span className="text-[10px] text-slate-500 font-semibold block">إلزام الموظف بتسجيل قيمة مبيعاته أو مشترياته عند الانصراف لاحتساب نسبة مئوية</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCommissionInput}
                      onChange={(e) => setHasCommissionInput(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {hasCommissionInput && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نوع العملية *</label>
                      <select
                        value={commissionTypeInput}
                        onChange={(e) => setCommissionTypeInput(e.target.value as 'SALES' | 'PURCHASES')}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                      >
                        <option value="SALES">مبيعات (Sales)</option>
                        <option value="PURCHASES">مشتريات (Purchases)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نسبة العمولة (%) *</label>
                      <input
                        type="text"
                        required={hasCommissionInput}
                        lang="en-US"
                        dir="ltr"
                        value={commissionRateInput}
                        onChange={(e) => setCommissionRateInput(e.target.value)}
                        placeholder="مثال: 2.5 أو 5"
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {msg && <p className="text-rose-600 font-bold text-center">{msg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ التعديلات الجيدة'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
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
