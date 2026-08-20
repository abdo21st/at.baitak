'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project } from '@/lib/types';
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  Lock,
  Unlock,
  Clock,
  Coins,
  Users,
  Calendar,
  AlertCircle,
  FileText,
  Loader2,
  X,
  Check,
  Building2,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatHoursText, formatArabicDate } from '@/lib/utils';

export default function TaskManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'CLOSED' | 'ALL'>('OPEN');
  const [search, setSearch] = useState('');

  // Modal State for New Task
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskClient, setTaskClient] = useState('');
  const [taskHourlyRate, setTaskHourlyRate] = useState('0');
  const [taskBudgetHours, setTaskBudgetHours] = useState('0');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskColor, setTaskColor] = useState('#0284c7');
  const [savingTask, setSavingTask] = useState(false);
  const [formMsg, setFormMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State for Task Details & Worker Logs
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) {
      setFormMsg({ text: 'يرجى إدخال اسم المهمة', type: 'error' });
      return;
    }

    try {
      setSavingTask(true);
      setFormMsg(null);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: taskName,
          clientName: taskClient,
          hourlyRate: parseFloat(taskHourlyRate) || 0,
          budgetHours: parseFloat(taskBudgetHours) || 0,
          description: taskDescription,
          color: taskColor
        })
      });
      const data = await res.json();
      if (data.success) {
        setFormMsg({ text: data.message || 'تم إنشاء المهمة بنجاح!', type: 'success' });
        fetchProjects();
        setTimeout(() => {
          setIsAddModalOpen(false);
          setTaskName('');
          setTaskClient('');
          setTaskHourlyRate('0');
          setTaskBudgetHours('0');
          setTaskDescription('');
          setFormMsg(null);
        }, 1200);
      } else {
        setFormMsg({ text: data.error || 'خطأ في إنشاء المهمة', type: 'error' });
      }
    } catch (err: any) {
      setFormMsg({ text: err.message || 'حدث خطأ في الاتصال', type: 'error' });
    } finally {
      setSavingTask(false);
    }
  };

  // Handle Close / Reopen Task
  const handleToggleTaskStatus = async (project: Project) => {
    const isClosing = project.status === 'OPEN';
    const confirmMsg = isClosing
      ? `هل تريد بالتأكيد إغلاق المهمة (${project.name})؟\n\nعند الإغلاق، لن يتمكن أي موظف من تسجيل الحضور عليها، وستبقى مسجلة في السجل والتقارير المالية 🔒`
      : `هل تريد إعادة فتح المهمة (${project.name}) لإتاحة تسجيل الحضور عليها للموظفين؟`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          action: isClosing ? 'CLOSE_TASK' : 'OPEN_TASK'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
      } else {
        alert(data.error || 'فشلت العملية');
      }
    } catch (err: any) {
      alert(err.message || 'خطأ في الاتصال');
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.clientName && p.clientName.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [projects, statusFilter, search]);

  // Overall Statistics
  const openCount = projects.filter((p) => p.status === 'OPEN').length;
  const closedCount = projects.filter((p) => p.status === 'CLOSED').length;
  const totalHoursAll = Number(projects.reduce((sum, p) => sum + (p.totalHours || 0), 0).toFixed(2));
  const totalCostAll = Number(projects.reduce((sum, p) => sum + (p.totalCost || 0), 0).toFixed(2));

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 border border-blue-800/40 shadow-xl space-y-4 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold shrink-0 shadow-inner">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                نظام الحضور والانصراف بحسب المهام والمشاريع
              </h2>
              <p className="text-slate-300 text-xs font-semibold mt-0.5">
                إنشاء وفتح المهام للموظفين، تدوين الساعات المستحقة، وإغلاق المهمة عند اكتمالها لمنع التسجيل عليها 🔒
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-11 px-5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-extrabold rounded-xl shadow-lg shadow-blue-600/25 flex items-center gap-2 text-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>فتح وإنشاء مهمة جديدة</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>المهام المفتوحة حالياً</span>
            </div>
            <div className="text-xl font-black text-white font-mono">{openCount} مهمة</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>المهام المنجزة والمغلقة</span>
            </div>
            <div className="text-xl font-black text-slate-300 font-mono">{closedCount} مهمة</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>إجمالي ساعات المهام</span>
            </div>
            <div className="text-xl font-black text-blue-300 font-mono">{totalHoursAll} ساعة</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>إجمالي تكلفة المهام</span>
            </div>
            <div className="text-xl font-black text-amber-300 font-mono">{totalCostAll.toFixed(2)} د.ل</div>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المهمة أو العميل..."
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Toggle Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'OPEN'
                ? 'bg-white text-blue-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🟢 المهام المفتوحة ({openCount})
          </button>

          <button
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'CLOSED'
                ? 'bg-white text-slate-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔒 المهام المغلقة ({closedCount})
          </button>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({projects.length})
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading && projects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs font-bold">جاري تحميل قائمة المهام والمشاريع...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3">
          <Briefcase className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">لا توجد مهام تطابق الفلترة المحددة</p>
          <p className="text-xs text-slate-400">انقر على زر &quot;فتح وإنشاء مهمة جديدة&quot; لبدء تدوين ساعات الحضور المخصصة للموظفين.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const isOpen = p.status === 'OPEN';

            return (
              <div
                key={p.id}
                className={`bg-white rounded-3xl p-5 border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 ${
                  isOpen ? 'border-slate-200' : 'border-slate-200/60 bg-slate-50/60 opacity-90'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header: Color Tag + Title + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full mt-1 shrink-0 shadow-xs"
                        style={{ backgroundColor: p.color || '#0284c7' }}
                      />
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-snug">
                          {p.name}
                        </h3>
                        {p.clientName && (
                          <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{p.clientName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {isOpen ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        مفتوحة للدوام
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700 border border-slate-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3 text-slate-500" />
                        مغلقة ومؤرشفة
                      </span>
                    )}
                  </div>

                  {/* Description if present */}
                  {p.description && (
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {p.description}
                    </p>
                  )}

                  {/* Metrics Box */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 border border-slate-200/60 p-3 rounded-2xl text-center">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold">الساعات المنجزة</span>
                      <span className="text-xs font-black text-blue-700 font-mono">{p.totalHours || 0} س</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold">الموظفين المساهمين</span>
                      <span className="text-xs font-black text-slate-800 font-mono">{p.activeEmployeesCount || 0}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold">التكلفة الإجمالية</span>
                      <span className="text-xs font-black text-emerald-700 font-mono">{(p.totalCost || 0).toFixed(2)} د.ل</span>
                    </div>
                  </div>

                  {/* Date Metadata */}
                  <div className="text-[10px] text-slate-400 font-medium space-y-0.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span>تاريخ الفتح:</span>
                      <span className="font-mono font-bold text-slate-600">{p.openedAt.split('T')[0]}</span>
                    </div>
                    {p.closedAt && (
                      <div className="flex items-center justify-between text-rose-600 font-semibold">
                        <span>تاريخ الإغلاق:</span>
                        <span className="font-mono">{p.closedAt.split('T')[0]}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleTaskStatus(p)}
                    className={`flex-1 h-10 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      isOpen
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isOpen ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>إغلاق المهمة</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>إعادة فتح المهمة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create New Task */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">فتح وإنشاء مهمة / مشروع جديد</h3>
                  <p className="text-[11px] text-slate-500 font-medium">ستكون المهمة مفتوحة ومتاحة فوراً للموظفين لتسجيل الحضور عليها</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1 text-slate-900">اسم المهمة أو المشروع *</label>
                <input
                  type="text"
                  required
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="مثال: جرد الرفوف السنوي / مشروع تركيب السيرفرات"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-900">العميل / القسم المستفيد</label>
                  <input
                    type="text"
                    value={taskClient}
                    onChange={(e) => setTaskClient(e.target.value)}
                    placeholder="مثال: الإدارة العامة / فرع طرابلس"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-900">ميزانية الساعات المستهدفة</label>
                  <input
                    type="number"
                    value={taskBudgetHours}
                    onChange={(e) => setTaskBudgetHours(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-900">وصف المهمة والتعليمات للموظف</label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="اكتب تفاصيل وإرشادات تنفيذ المهمة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-slate-900">اللون التعريفي للمهمة</label>
                <div className="flex items-center gap-2">
                  {['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6'].map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setTaskColor(color)}
                      className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${
                        taskColor === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {formMsg && (
                <div
                  className={`p-3 rounded-xl text-center font-bold text-xs ${
                    formMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {formMsg.text}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingTask}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  {savingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>فتح وتفعيل المهمة الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
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
