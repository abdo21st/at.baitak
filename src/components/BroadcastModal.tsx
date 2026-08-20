'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Users,
  Building2,
  CheckSquare,
  Square,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  X,
  Share2,
  Smartphone,
  ExternalLink,
  Search,
  Save,
  RotateCcw,
  Check
} from 'lucide-react';
import { User, Department } from '@/lib/types';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: User[];
  departments: Department[];
}

const TEMPLATES = [
  {
    id: 'welcome',
    title: '🌿 ترحيب بالمنظومة وحفظ الحقوق',
    badge: 'موصى به',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    content: `🌿 مرحباً بك يا *{name}* في *{company}*! 🤍

نحن فخورون بجهودك وعطائك، وحرصاً منا على حفظ حقوقك وتقدير كل دقيقة من وقتك، تم تفعيل منظومة تدوين الساعات الذكية:
📱 *نظام حضورك الذكي* 🚀

━━━━━━━━━━━━━━━━━━━
💡 *لماذا صُمم هذا النظام لمصلحتك؟*
━━━━━━━━━━━━━━━━━━━
✨ *حقك محفوظ بالثانية:* احتساب كامل ساعات عملك بدقة وبدون أي نقص.
✨ *شفافية على هاتفك:* يمكنك في أي وقت فتح التطبيق ورؤية ساعاتك ومستحقاتك.
✨ *مرونة وراحة:* سجّل حضورك وانصرافك بلمسة واحدة من هاتفك.

━━━━━━━━━━━━━━━━━━━
📲 *كيف تبدأ في 3 خطوات بسيطة؟*
━━━━━━━━━━━━━━━━━━━
1️⃣ *افتح الرابط:*
👉 {appUrl}

2️⃣ *كودك الوظيفي:* (*{code}*)

3️⃣ *سجّل حضورك:*
• 🔵 عند بدء العمل: اضغط *(تسجيل الحضور)*.
• 🔴 عند انتهاء الشفت: اضغط *(تسجيل الانصراف)*.

🌿 نجاحنا دائماً يبدأ من تقديركم.. معاً نحو بيئة عمل أرقى وأسهل! ✨`
  },
  {
    id: 'reminder',
    title: '⏰ تذكير تسجيل الدوام والانصراف',
    badge: 'تذكير',
    badgeColor: 'bg-amber-100 text-amber-800',
    content: `⏰ *تذكير من إدارة {company}* 🌿

مرحباً بك يا *{name}*،
نود تذكيرك بالحرص على تسجيل الحضور والانصراف بانتظام عبر النظام لضمان توثيق كامل ساعات دوامك وحساب مستحقاتك بدقة:
👉 {appUrl}

(كودك الوظيفي: *{code}*)
شكراً لالتزامك وتعاونك الدائم! ✨`
  },
  {
    id: 'payroll',
    title: '💰 إشعار كشف الرواتب والمستحقات',
    badge: 'مالي',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    content: `📄 *إشعار جاهزية كشف حساب الساعات والراتب* 💰

مرحباً *{name}*،
تم اعتماد وحساب ساعات دوامك لهذا الشهر بنجاح عبر نظام حضورك المعتمد لدى *{company}*.
يمكنك الآن تسجيل الدخول للاطلاع على تفاصيل الساعات ومستحقاتك:
👉 {appUrl}

نشكرك على جهودك وتفانيك المتميز! 🌿`
  },
  {
    id: 'clinical_capsule',
    title: '💊 كبسولة دوائية وتدريب سريري',
    badge: 'تدريب 🌿',
    badgeColor: 'bg-teal-100 text-teal-800',
    content: `🌿 *كبسولة {company} الدوائية • تدريب وتطوير* 💊✨
━━━━━━━━━━━━━━━━━━━
👤 مرحباً بك يا *{name}* في فقرة التدريب الصيدلاني الدوري!
📦 الصنف: *[اسم الدواء والمادة الفعالة]*
━━━━━━━━━━━━━━━━━━━
🎯 *1. التوقيت والاستخدام المثالي:*
• [قبل/بعد الأكل - مع وفرة من الماء].

⚠️ *2. أشهر الأخطاء الشائعة عند المرضى:*
• [أخطاء الجرعات والاستخدام غير السليم].

🚫 *3. التداخلات الدوائية والغذائية الحرجة:*
• [تفاعلات الأدوية والغذاء وموانع الاستعمال].

🌟 *4. نصائح وسلوكيات لرفع فعالية العلاج:*
• [نصائح غذائية ونمط حياة تسرع الشفاء].

💡 *5. النصيحة الذهبية للصيدلي عند الصرف:*
• [نصيحة الصيدلي المتميزة للمريض].
━━━━━━━━━━━━━━━━━━━
🌿 *{company}.. رعاية صيدلانية متكاملة بمعايير عالمية!* ✨`
  },
  {
    id: 'announcement',
    title: '📢 إعلان عام وإداري',
    badge: 'عام',
    badgeColor: 'bg-slate-100 text-slate-800',
    content: `📢 *إعلان هام لفريق {company}* 🌿

عزيزنا *{name}*،
نحيطكم علماً بـ [اكتب تفاصيل الإعلان أو التوجيهات هنا]...

👉 لمتابعة لوحة تحكمك: {appUrl}
مع تمنياتنا للجميع بالتوفيق! ✨`
  }
];

function getTemplateContent(templateId: string, customTenantName?: string) {
  const t = TEMPLATES.find((tpl) => tpl.id === templateId);
  if (!t) return '';
  const company = customTenantName || 'المنظومة';
  return t.content.replace(/{company}/g, company);
}

export default function BroadcastModal({
  isOpen,
  onClose,
  employees,
  departments
}: BroadcastModalProps) {
  const [targetType, setTargetType] = useState<'all' | 'department' | 'selected'>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [empSearch, setEmpSearch] = useState('');

  const [tenantName, setTenantName] = useState<string>('');
  const [tenantSlug, setTenantSlug] = useState<string>('default');
  const [hasClinicalCapsule, setHasClinicalCapsule] = useState<boolean>(false);

  const [savedTemplates, setSavedTemplates] = useState<Record<string, string>>({});
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const [message, setMessage] = useState(TEMPLATES[0].content);
  const [activeTemplate, setActiveTemplate] = useState('welcome');

  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    summary: { total: number; sent: number; noPhone: number; failed: number };
    results: Array<{ id: string; name: string; code: string; phone: string | null; status: 'sent' | 'no_phone' | 'failed'; reason?: string }>;
  } | null>(null);

  // Fetch tenant info and saved custom templates
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/tenant/info')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.tenant) {
          const tName = data.tenant.name || 'المنظومة';
          const tSlug = data.tenant.slug || 'default';
          setTenantName(tName);
          setTenantSlug(tSlug);
          setHasClinicalCapsule(data.tenant.hasClinicalCapsule === true);

          // Load custom templates for this tenant
          try {
            const storageKey = `hodoork_broadcast_templates_${tSlug}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              setSavedTemplates(parsed);
              if (parsed['welcome']) {
                setMessage(parsed['welcome']);
              } else {
                setMessage(getTemplateContent('welcome', tName));
              }
            } else {
              setMessage(getTemplateContent('welcome', tName));
            }
          } catch (e) {
            setMessage(getTemplateContent('welcome', tName));
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  if (!isOpen) return null;

  // Filter employees
  const filteredEmployees = employees.filter((e) => {
    if (!empSearch.trim()) return true;
    const term = empSearch.toLowerCase();
    return e.name.toLowerCase().includes(term) || (e.employeeCode && e.employeeCode.toLowerCase().includes(term));
  });

  const getRecipientCount = () => {
    if (targetType === 'all') return employees.length;
    if (targetType === 'department') {
      return employees.filter((e) => e.departments?.some((d) => d.id === selectedDeptId)).length;
    }
    return selectedEmpIds.length;
  };

  const toggleSelectAll = () => {
    if (selectedEmpIds.length === employees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(employees.map((e) => e.id));
    }
  };

  const toggleEmp = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setActiveTemplate(template.id);
    if (savedTemplates[template.id]) {
      setMessage(savedTemplates[template.id]);
    } else {
      setMessage(getTemplateContent(template.id, tenantName));
    }
  };

  const handleSaveEdit = () => {
    if (!message.trim()) return;
    try {
      const updated = {
        ...savedTemplates,
        [activeTemplate]: message
      };
      setSavedTemplates(updated);
      const storageKey = `hodoork_broadcast_templates_${tenantSlug}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSaveToast('تم حفظ التعديل بنجاح ليبقى هذا النص معتمداً دائماً ✅');
      setTimeout(() => setSaveToast(null), 3500);
    } catch (e) {
      setSaveToast('تعذر الحفظ في الذاكرة المحلية');
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  const handleResetToDefault = () => {
    const def = getTemplateContent(activeTemplate, tenantName);
    setMessage(def);
    const updated = { ...savedTemplates };
    delete updated[activeTemplate];
    setSavedTemplates(updated);
    const storageKey = `hodoork_broadcast_templates_${tenantSlug}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSaveToast('تمت استعادة النص الافتراضي بنجاح 🔄');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const insertTag = (tag: string) => {
    setMessage((prev) => prev + ' ' + tag);
  };

  const handleSendBroadcast = async () => {
    if (!message.trim()) return;

    try {
      setIsSending(true);
      setSendResult(null);

      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          departmentId: targetType === 'department' ? selectedDeptId : undefined,
          employeeIds: targetType === 'selected' ? selectedEmpIds : undefined,
          message,
          appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://at.baitak.mtapp.ly'
        })
      });

      const data = await res.json();
      if (data.success) {
        setSendResult(data);
      } else {
        alert(data.error || 'حدث خطأ أثناء الإرسال');
      }
    } catch (err: any) {
      alert(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setIsSending(false);
    }
  };

  const dynamicAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://at.baitak.mtapp.ly';

  // Preview message with dummy user
  const previewText = message
    .replace(/{name}/g, 'أحمد المنصوري')
    .replace(/{code}/g, 'EMP-101')
    .replace(/{appUrl}/g, dynamicAppUrl)
    .replace(/{company}/g, tenantName || 'المنظومة');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-dubai" dir="rtl">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">مركز الرسائل والإشعارات الجماعية (واتساب) 📢</h3>
              <p className="text-xs text-slate-400 font-medium">
                إرسال رسائل ترحيبية وتذكيرات مباشرة لجميع موظفي {tenantName || 'المؤسسة'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {sendResult ? (
            /* Results Screen */
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-emerald-950">اكتملت عملية الإرسال الجماعي بنجاح! 🟢</h4>
                <p className="text-xs text-emerald-800 font-medium">
                  تمت معالجة وتوجيه الرسائل عبر خادم واتساب لجميع المستلمين المحددين
                </p>

                {/* Stat Counters */}
                <div className="grid grid-cols-3 gap-3 pt-3 max-w-lg mx-auto">
                  <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-xs">
                    <span className="text-[11px] text-slate-500 block font-bold">تم الإرسال</span>
                    <strong className="text-xl font-black text-emerald-600 font-mono">{sendResult.summary.sent}</strong>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-xs">
                    <span className="text-[11px] text-slate-500 block font-bold">بدون هاتف</span>
                    <strong className="text-xl font-black text-amber-600 font-mono">{sendResult.summary.noPhone}</strong>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-rose-200 shadow-xs">
                    <span className="text-[11px] text-slate-500 block font-bold">فشل الإرسال</span>
                    <strong className="text-xl font-black text-rose-600 font-mono">{sendResult.summary.failed}</strong>
                  </div>
                </div>
              </div>

              {/* Detailed Results List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                  سجل تفاصيل الموظفين ({sendResult.results.length})
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {sendResult.results.map((r) => (
                    <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <strong className="text-slate-900 font-bold block">{r.name}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">كود: {r.code} {r.phone ? `| هاتف: ${r.phone}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.status === 'sent' && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            تم الإرسال
                          </span>
                        )}
                        {r.status === 'no_phone' && (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-black flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            لا يوجد هاتف
                          </span>
                        )}
                        {r.status === 'failed' && (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-black flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            {r.reason || 'فشل'}
                          </span>
                        )}
                        {r.phone && (
                          <a
                            href={`https://wa.me/${r.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(previewText.replace(/أحمد المنصوري/g, r.name).replace(/EMP-101/g, r.code))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                            title="فتح في واتساب يدوياً"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSendResult(null)}
                  className="px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                >
                  إرسال رسالة جديدة
                </button>
                <button
                  onClick={onClose}
                  className="px-5 h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          ) : (
            /* Compose Screen */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Audience & Templates */}
              <div className="lg:col-span-5 space-y-4">
                {/* Step 1: Target Audience */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-black text-slate-900 flex items-center justify-between">
                    <span>1. تحديد المستلمين:</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">
                      {getRecipientCount()} مستلم
                    </span>
                  </label>

                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      onClick={() => setTargetType('all')}
                      className={`py-1.5 rounded-lg transition-all ${
                        targetType === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      الجميع ({employees.length})
                    </button>
                    <button
                      onClick={() => setTargetType('department')}
                      className={`py-1.5 rounded-lg transition-all ${
                        targetType === 'department' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      حسب القسم
                    </button>
                    <button
                      onClick={() => setTargetType('selected')}
                      className={`py-1.5 rounded-lg transition-all ${
                        targetType === 'selected' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      تحديد مخصص
                    </button>
                  </div>

                  {targetType === 'department' && (
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({employees.filter((e) => e.departments?.some((dep) => dep.id === d.id)).length} موظف)
                        </option>
                      ))}
                    </select>
                  )}

                  {targetType === 'selected' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5" />
                          <input
                            type="text"
                            value={empSearch}
                            onChange={(e) => setEmpSearch(e.target.value)}
                            placeholder="بحث عن موظف..."
                            className="w-full h-9 bg-white border border-slate-200 rounded-lg pr-8 pl-2 text-xs"
                          />
                        </div>
                        <button
                          onClick={toggleSelectAll}
                          className="px-2.5 h-9 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 shrink-0"
                        >
                          {selectedEmpIds.length === employees.length ? 'إلغاء' : 'تحديد الكل'}
                        </button>
                      </div>

                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 text-xs">
                        {filteredEmployees.map((e) => {
                          const isChecked = selectedEmpIds.includes(e.id);
                          return (
                            <div
                              key={e.id}
                              onClick={() => toggleEmp(e.id)}
                              className="p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                {isChecked ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                                <span className="font-bold text-slate-900">{e.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{e.employeeCode}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Choose Template */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <label className="block text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>2. اختر نموذج رسالة جاهز:</span>
                  </label>

                  <div className="grid grid-cols-1 gap-2">
                    {TEMPLATES.filter((t) => hasClinicalCapsule || t.id !== 'clinical_capsule').map((t) => {
                      const isCustomized = Boolean(savedTemplates[t.id]);
                      return (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t)}
                          className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                            activeTemplate === t.id
                              ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/10'
                              : 'bg-white/60 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{t.title}</span>
                            {isCustomized && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="تم تعديل وحفظ هذا النموذج" />
                            )}
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${t.badgeColor}`}>
                            {t.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Editor & Preview */}
              <div className="lg:col-span-7 space-y-4">
                {/* Step 3: Message Editor */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        <span>3. نص الرسالة (قابل للتعديل):</span>
                      </label>
                      {savedTemplates[activeTemplate] && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> تم حفظ تعديلك
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Save Edit Button */}
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                        title="حفظ هذا التعديل ليبقى معتمداً دائماً عند اختيار هذا النموذج"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>حفظ التعديل</span>
                      </button>

                      {/* Reset to Default Button */}
                      {savedTemplates[activeTemplate] && (
                        <button
                          onClick={handleResetToDefault}
                          className="px-2.5 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="استعادة النص الافتراضي الأصلي للنموذج"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>استعادة الأصلي</span>
                        </button>
                      )}

                      {/* Tag Inserters */}
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          onClick={() => insertTag('{name}')}
                          className="px-2 h-7 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition-all"
                          title="إدراج اسم الموظف ديناميكياً"
                        >
                          + {`{name}`}
                        </button>
                        <button
                          onClick={() => insertTag('{company}')}
                          className="px-2 h-7 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold transition-all"
                          title="إدراج اسم الشركة / المنشأة ديناميكياً"
                        >
                          + {`{company}`}
                        </button>
                        <button
                          onClick={() => insertTag('{code}')}
                          className="px-2 h-7 rounded-md bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-bold transition-all"
                          title="إدراج كود الموظف"
                        >
                          + {`{code}`}
                        </button>
                        <button
                          onClick={() => insertTag('{appUrl}')}
                          className="px-2 h-7 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10px] font-bold transition-all"
                          title="إدراج رابط النظام"
                        >
                          + {`{appUrl}`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {saveToast && (
                    <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{saveToast}</span>
                    </div>
                  )}

                  <textarea
                    rows={8}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="اكتب نص الرسالة هنا..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed font-bold text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs resize-none"
                  />
                </div>

                {/* Step 4: WhatsApp Live Preview */}
                <div className="bg-[#eef2f5] p-4 rounded-2xl border border-slate-300 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 block flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    معاينة حية لشكل الرسالة على واتساب الموظف:
                  </span>
                  <div className="bg-[#d9fdd3] p-3.5 rounded-2xl rounded-tr-xs shadow-xs border border-emerald-200/60 max-h-48 overflow-y-auto text-xs whitespace-pre-wrap leading-relaxed text-slate-900 font-medium font-dubai">
                    {previewText}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 font-bold">
                    سيتم إرسال الرسالة إلى <span className="text-emerald-600 font-mono font-black">{getRecipientCount()}</span> موظف عبر السيرفر.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={onClose}
                      disabled={isSending}
                      className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSendBroadcast}
                      disabled={isSending || getRecipientCount() === 0 || !message.trim()}
                      className="px-6 h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري الإرسال للموظفين...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>إرسال واتساب للجميع ({getRecipientCount()})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
