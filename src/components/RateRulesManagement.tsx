'use client';

import React, { useState, useEffect } from 'react';
import { RateRule, Department, User } from '@/lib/types';
import { 
  TrendingUp, Plus, Edit3, Trash2, CheckCircle2, Clock, Calendar, 
  Sparkles, Zap, ShieldCheck, AlertCircle, Percent, DollarSign, Users, Building2,
  CalendarDays, PlayCircle, HelpCircle, RefreshCw
} from 'lucide-react';
import { calculateShiftWithRateRules } from '@/lib/rateEngine';

interface RateRulesManagementProps {
  departments?: Department[];
  users?: User[];
}

const dayNames = [
  { id: 0, name: 'الأحد' },
  { id: 1, name: 'الإثنين' },
  { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' },
  { id: 4, name: 'الخميس' },
  { id: 5, name: 'الجمعة' },
  { id: 6, name: 'السبت' }
];

export default function RateRulesManagement({ departments = [], users = [] }: RateRulesManagementProps) {
  const [rules, setRules] = useState<RateRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recalcLoading, setRecalcLoading] = useState<boolean>(false);
  const [recalcMsg, setRecalcMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<RateRule | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState<'RECURRING' | 'ONE_TIME'>('RECURRING');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([5]); // default Friday
  const [specificDate, setSpecificDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('08:00');
  const [increaseType, setIncreaseType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [value, setValue] = useState('50');
  const [appliesTo, setAppliesTo] = useState<'ALL' | 'DEPARTMENT' | 'EMPLOYEE'>('ALL');
  const [targetId, setTargetId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Live Simulator State
  const [simRate, setSimRate] = useState('10');
  const [simDate, setSimDate] = useState(new Date().toISOString().split('T')[0]);
  const [simIn, setSimIn] = useState('20:00');
  const [simOut, setSimOut] = useState('02:00');

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rate-rules');
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error('Error fetching rate rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const openAddModal = () => {
    setEditingRule(null);
    setName('');
    setRuleType('RECURRING');
    setDaysOfWeek([5]);
    setSpecificDate(new Date().toISOString().split('T')[0]);
    setIsAllDay(false);
    setStartTime('00:00');
    setEndTime('08:00');
    setIncreaseType('PERCENTAGE');
    setValue('50');
    setAppliesTo('ALL');
    setTargetId('');
    setIsActive(true);
    setMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (r: RateRule) => {
    setEditingRule(r);
    setName(r.name);
    setRuleType(r.ruleType);
    setDaysOfWeek(r.daysOfWeek || []);
    setSpecificDate(r.specificDate || new Date().toISOString().split('T')[0]);
    const allDay = !r.startTime && !r.endTime;
    setIsAllDay(allDay);
    setStartTime(r.startTime || '00:00');
    setEndTime(r.endTime || '24:00');
    setIncreaseType(r.increaseType);
    setValue(String(r.value));
    setAppliesTo(r.appliesTo);
    setTargetId(r.targetId || '');
    setIsActive(r.isActive);
    setMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMsg('يرجى إدخال اسم القاعدة');
      return;
    }

    setLoading(true);
    setMsg(null);

    const payload = {
      id: editingRule?.id,
      name: name.trim(),
      ruleType,
      daysOfWeek: ruleType === 'RECURRING' ? daysOfWeek : [],
      specificDate: ruleType === 'ONE_TIME' ? specificDate : null,
      startTime: isAllDay ? null : startTime,
      endTime: isAllDay ? null : endTime,
      increaseType,
      value: Number(value) || 0,
      appliesTo,
      targetId: appliesTo === 'ALL' ? null : targetId,
      isActive
    };

    try {
      const res = await fetch('/api/rate-rules', {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
        setIsModalOpen(false);
      } else {
        setMsg(data.error || 'حدث خطأ أثناء حفظ القاعدة');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (r: RateRule) => {
    try {
      const res = await fetch('/api/rate-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, isActive: !r.isActive })
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, ruleName: string) => {
    if (!confirm(`هل أنت متأكد من حذف قاعدة (${ruleName})؟`)) return;

    try {
      const res = await fetch(`/api/rate-rules?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDay = (dayId: number) => {
    if (daysOfWeek.includes(dayId)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== dayId));
    } else {
      setDaysOfWeek([...daysOfWeek, dayId].sort());
    }
  };

  const handleRecalculateMonth = async () => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!confirm(`هل أنت متأكد من إعادة احتساب كافة سجلات دوام الشهر الحالي (${currentMonthStr}) وفق القواعد النشطة الآن؟`)) {
      return;
    }

    setRecalcLoading(true);
    setRecalcMsg(null);
    try {
      const res = await fetch('/api/rate-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECALCULATE_MONTH', month: currentMonthStr })
      });
      const data = await res.json();
      if (data.success) {
        setRecalcMsg({ text: data.message || 'تمت إعادة الاحتساب بنجاح', type: 'success' });
      } else {
        setRecalcMsg({ text: data.error || 'خطأ أثناء إعادة الاحتساب', type: 'error' });
      }
    } catch {
      setRecalcMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setRecalcLoading(false);
    }
  };

  // Run live simulation calculation
  const simResult = calculateShiftWithRateRules(
    simDate,
    simIn,
    simOut,
    Number(simRate) || 0,
    0,
    0,
    true,
    true,
    rules
  );

  return (
    <div className="space-y-6 font-dubai" dir="rtl">
      {/* Top Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-orange-600 text-white rounded-2xl flex items-center justify-center font-black shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                نظام قواعد تسعير الساعات والبدلات المخصصة
                <span className="text-[11px] bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-lg font-bold border border-amber-200">
                  تسعير ديناميكي ذكي
                </span>
              </h2>
              <p className="text-slate-500 text-xs font-semibold">
                تحديد زيادات مخصصة (نسبة % أو قيمة ثابتة) لأيام معينة، شفتات السهر الليلية، أو مناسبات محددة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRecalculateMonth}
              disabled={recalcLoading}
              className="px-4 h-11 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              title="تطبيق القواعد النشطة على كافة سجلات دوام الشهر الحالي"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${recalcLoading ? 'animate-spin' : ''}`} />
              {recalcLoading ? 'جاري إعادة الاحتساب...' : 'إعادة احتساب سجلات الشهر الحالي 🔄'}
            </button>

            <button
              onClick={openAddModal}
              className="px-4 h-11 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              إضافة قاعدة تسعير جديدة
            </button>
          </div>
        </div>

        {recalcMsg && (
          <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            recalcMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{recalcMsg.text}</span>
          </div>
        )}
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {rules.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-10 border border-dashed border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm">لا توجد قواعد تسعير مضافة بعد</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto">
              يمكنك إضافة قواعد لزيادة أجر الساعة مثل: «زيادة ليلة الجمعة 50%» أو «شفت السهر بعد منتصف الليل +3 د.ل/س» أو «بونص يوم العيد».
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              + إضافة أول قاعدة تسعير الآن
            </button>
          </div>
        ) : (
          rules.map((rule) => {
            const isRecurring = rule.ruleType === 'RECURRING';
            const isPercent = rule.increaseType === 'PERCENTAGE';

            return (
              <div
                key={rule.id}
                className={`bg-white rounded-3xl border shadow-sm transition-all overflow-hidden flex flex-col justify-between ${
                  rule.isActive
                    ? 'border-slate-200 hover:shadow-md'
                    : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{rule.name}</span>
                        {isRecurring ? (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            مستمرة أسبوعياً
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            لمرة واحدة ({rule.specificDate})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700">
                        <span className="px-2.5 py-0.5 bg-emerald-100/80 rounded-lg text-emerald-900 font-black">
                          {isPercent ? `+${rule.value}% زيادة` : `+${rule.value} د.ل/ساعة`}
                        </span>
                      </div>
                    </div>

                    {/* Active Toggle Switch */}
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        rule.isActive ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                      title={rule.isActive ? 'تعطيل القاعدة مؤقتاً' : 'تفعيل القاعدة'}
                    >
                      <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition"></span>
                    </button>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 space-y-3 text-xs">
                    {/* Timing */}
                    <div className="space-y-1">
                      <span className="text-slate-400 text-[11px] font-bold block">التوقيت والساعات:</span>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 space-y-1">
                        {isRecurring && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              الأيام المشمولة:{' '}
                              {rule.daysOfWeek && rule.daysOfWeek.length > 0
                                ? rule.daysOfWeek.map(d => dayNames.find(x => x.id === d)?.name).join('، ')
                                : 'كافة أيام الأسبوع'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {rule.startTime && rule.endTime
                              ? `من الساعة ${rule.startTime} حتى ${rule.endTime}`
                              : 'طوال الـ 24 ساعة (كامل اليوم)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Scope */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        نطاق التطبيق:
                      </span>
                      <span className="font-bold text-slate-800">
                        {rule.appliesTo === 'ALL'
                          ? 'كافة الموظفين'
                          : rule.appliesTo === 'DEPARTMENT'
                          ? `قسم: ${departments.find(d => d.id === rule.targetId)?.name || 'مخصص'}`
                          : `موظف: ${users.find(u => u.id === rule.targetId)?.name || 'مخصص'}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${
                    rule.isActive ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${rule.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    {rule.isActive ? 'مفعلة وتطبق تلقائياً' : 'متوقفة حالياً'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(rule)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="تعديل القاعدة"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id, rule.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="حذف القاعدة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* LIVE SIMULATOR / TESTER (محاكي احتساب الأجر الذكي) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 border border-blue-900 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-black text-white">محاكي واختبار تسعير الساعات المباشر</h3>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold border border-emerald-500/30">
            اختبار فوري للقواعد
          </span>
        </div>
        <p className="text-slate-300 text-xs">
          جرب إدخال أي وقت شفت لترى كيف يوزع المحرك الرياضي الساعات الأساسية والبدلات الإضافية وفق القواعد النشطة:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs">
          <div>
            <label className="text-slate-400 font-bold block mb-1">الأجر الأساسي (د.ل/س)</label>
            <input
              type="text"
              lang="en-US"
              dir="ltr"
              value={simRate}
              onChange={(e) => setSimRate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 font-mono font-bold text-center text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">تاريخ الشفت</label>
            <input
              type="date"
              value={simDate}
              onChange={(e) => setSimDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 font-mono font-bold text-center text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">وقت الحضور</label>
            <input
              type="time"
              value={simIn}
              onChange={(e) => setSimIn(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 font-mono font-bold text-center text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">وقت الانصراف</label>
            <input
              type="time"
              value={simOut}
              onChange={(e) => setSimOut(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 font-mono font-bold text-center text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Calculation Result */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-bold block">تفصيل المستحق الناتج:</span>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="text-slate-300 font-mono">
                الساعات: <strong className="text-white">{simResult.workHours} ساعة</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-blue-300 font-mono">
                الأساسي: <strong>{simResult.baseCost} د.ل</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-300 font-mono">
                علاوات القواعد: <strong>+{simResult.bonusCost} د.ل</strong>
              </span>
            </div>
            {simResult.appliedRules.length > 0 && (
              <div className="text-[11px] text-emerald-400 space-x-2 space-x-reverse pt-1 font-semibold">
                <span>القواعد المطبقة:</span>
                {simResult.appliedRules.map((ar) => (
                  <span key={ar.ruleId} className="px-2 py-0.5 bg-emerald-950 border border-emerald-700 rounded-md font-mono">
                    {ar.ruleName} ({ar.hours}س ➔ +{ar.bonusAmount} د.ل)
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-left">
            <span className="text-slate-400 text-[10px] font-bold block">إجمالي أجر الشفت:</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              {simResult.totalCost.toFixed(2)} د.ل
            </span>
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingRule ? 'تعديل قاعدة التسعير' : 'إضافة قاعدة تسعير وبدلات جديدة'}
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">
                    تخصيص زيادات الأجر للأوقات والمناسبات الخاصة
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              {/* Rule Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">1. اسم القاعدة *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: زيادة ليلة الجمعة أو شفت السهر بعد منتصف الليل أو بونص العيد"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Rule Type: Recurring vs One-time */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">2. نمط تكرار القاعدة *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleType('RECURRING')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      ruleType === 'RECURRING'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    مستمرة أسبوعياً
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleType('ONE_TIME')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      ruleType === 'ONE_TIME'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    لمرة واحدة بتاريخ محدد
                  </button>
                </div>
              </div>

              {/* Days of Week (if Recurring) */}
              {ruleType === 'RECURRING' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الأيام المشمولة بالزيادة:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {dayNames.map((d) => {
                      const isSelected = daysOfWeek.includes(d.id);
                      return (
                        <button
                          type="button"
                          key={d.id}
                          onClick={() => toggleDay(d.id)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {d.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ اليوم المحدد *</label>
                  <input
                    type="date"
                    required
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Time of Day */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-bold">3. نطاق الساعات باليوم:</label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-bold">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded"
                    />
                    طوال اليوم (24 ساعة)
                  </label>
                </div>

                {!isAllDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">من الساعة:</span>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-center text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">إلى الساعة:</span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-center text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Increase Type & Value */}
              <div className="space-y-2">
                <label className="block text-slate-700 font-bold">4. نوع وقيمة الزيادة *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIncreaseType('PERCENTAGE')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      increaseType === 'PERCENTAGE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    نسبة مئوية (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncreaseType('FIXED_AMOUNT')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      increaseType === 'FIXED_AMOUNT'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    مبلغ ثابت إضافي (د.ل/س)
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={increaseType === 'PERCENTAGE' ? 'مثال: 50 (أي 50%)' : 'مثال: 3.5 (أي 3.5 د.ل لكل ساعة)'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-center focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold text-center">
                    {increaseType === 'PERCENTAGE'
                      ? `سيتم ضرب أجر الساعة للموظف في (1 + ${Number(value) || 0}%) خلال هذه الساعات.`
                      : `سيتم إضافة ${Number(value) || 0} د.ل لكل ساعة دوام منجزة في هذه الفترة.`}
                  </p>
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">5. من تنطبق عليهم القاعدة:</label>
                <select
                  value={appliesTo}
                  onChange={(e) => {
                    setAppliesTo(e.target.value as any);
                    setTargetId('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer mb-2"
                >
                  <option value="ALL">👥 كافة موظفي الصيدلية</option>
                  <option value="DEPARTMENT">🏢 قسم محدد</option>
                  <option value="EMPLOYEE">👤 موظف بعينه</option>
                </select>

                {appliesTo === 'DEPARTMENT' && (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- اختر القسم --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}

                {appliesTo === 'EMPLOYEE' && (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- اختر الموظف --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.employeeCode})</option>
                    ))}
                  </select>
                )}
              </div>

              {msg && <p className="text-rose-600 font-bold text-center">{msg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ قاعدة التسعير'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs cursor-pointer"
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
