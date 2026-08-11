'use client';

import React, { useState } from 'react';
import { X, Type, Building2, Save, RotateCcw, Sparkles } from 'lucide-react';
import { CustomLabels } from '@/lib/types';
import { defaultCustomLabels } from '@/lib/data-store';

interface LabelCustomizerModalProps {
  currentLabels: CustomLabels;
  isOpen: boolean;
  onClose: () => void;
  onLabelsUpdated: (newLabels: CustomLabels) => void;
}

export default function LabelCustomizerModal({
  currentLabels,
  isOpen,
  onClose,
  onLabelsUpdated
}: LabelCustomizerModalProps) {
  const [labels, setLabels] = useState<CustomLabels>({ ...currentLabels });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof CustomLabels, value: string) => {
    setLabels((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customLabels: labels
        })
      });

      const data = await res.json();
      if (data.success) {
        onLabelsUpdated(labels);
        setMsg('تم حفظ العناوين والتسميات بنجاح!');
      } else {
        setMsg(data.error || 'خطأ في حفظ العناوين');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefault = () => {
    setLabels({ ...defaultCustomLabels });
    setMsg('تم استرجاع العناوين والأسماء الافتراضية.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Type className="w-5 h-5 text-emerald-600" />
            نافذة تخصيص وتسمية جميع عناوين البرنامج والشركة
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-slate-700">
            💡 يمكنك تغيير اسم البرنامج، اسم الشركة، وعناوين اللوحات والأزرار بما يلائم منظمتك مباشرة.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-extrabold mb-1">اسم البرنامج *</label>
              <input
                type="text"
                value={labels.appName}
                onChange={(e) => handleChange('appName', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">اسم الشركة / المؤسسة *</label>
              <input
                type="text"
                value={labels.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">عنوان لوحة التحكم الإدارية</label>
              <input
                type="text"
                value={labels.dashboardTitle}
                onChange={(e) => handleChange('dashboardTitle', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">عنوان عداد الوقت الحية</label>
              <input
                type="text"
                value={labels.timerTitle}
                onChange={(e) => handleChange('timerTitle', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">عنوان قسم الفروع / المشاريع</label>
              <input
                type="text"
                value={labels.projectsTitle}
                onChange={(e) => handleChange('projectsTitle', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">عنوان قسم الكادر / الموظفين</label>
              <input
                type="text"
                value={labels.employeesTitle}
                onChange={(e) => handleChange('employeesTitle', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">رمز العملة (مثال: د.ل أو LYD)</label>
              <input
                type="text"
                value={labels.currencySymbol}
                onChange={(e) => handleChange('currencySymbol', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">عنوان الهدف الشهري</label>
              <input
                type="text"
                value={labels.monthlyTargetTitle}
                onChange={(e) => handleChange('monthlyTargetTitle', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">نص زر بدء الدوام / المناوبة</label>
              <input
                type="text"
                value={labels.checkInBtnText}
                onChange={(e) => handleChange('checkInBtnText', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">نص زر إنهاء الدوام / التسليم</label>
              <input
                type="text"
                value={labels.checkOutBtnText}
                onChange={(e) => handleChange('checkOutBtnText', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {msg && <p className="text-emerald-700 font-bold text-center text-xs">{msg}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              استرجاع العناوين الافتراضية
            </button>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 cursor-pointer text-xs"
              >
                <Save className="w-4 h-4" />
                {loading ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
