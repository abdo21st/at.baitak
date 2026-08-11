'use client';

import React, { useState } from 'react';
import { X, FolderPlus, DollarSign, Clock, Building, Palette, Check } from 'lucide-react';
import { Project } from '@/lib/types';

interface ProjectManagerModalProps {
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onProjectsUpdated: () => void;
}

export default function ProjectManagerModal({ projects, isOpen, onClose, onProjectsUpdated }: ProjectManagerModalProps) {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('50');
  const [budgetHours, setBudgetHours] = useState('100');
  const [color, setColor] = useState('#0284c7');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setMsg('يرجى كتابة اسم المشروع');
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          clientName,
          hourlyRate: Number(hourlyRate) || 0,
          budgetHours: Number(budgetHours) || 0,
          color
        })
      });

      const data = await res.json();
      if (data.success) {
        onProjectsUpdated();
        setName('');
        setClientName('');
        setMsg('تمت إضافة المشروع بنجاح!');
      } else {
        setMsg(data.error || 'خطأ في إضافة المشروع');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-sky-600" />
            إدارة المشاريع، العملاء، وميزانيات الساعات
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* New Project Form */}
          <form onSubmit={handleAddProject} className="md:col-span-6 space-y-4 text-xs">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
              إضافة مشروع جديد
            </h4>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">اسم المشروع *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: تطوير منصة التجارة..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">اسم العميل / الجهة</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="مثال: شركة الأفق الرقمي..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">سعر الساعة ($ / د.ل)</label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">ميزانية الساعات</label>
                <input
                  type="number"
                  value={budgetHours}
                  onChange={(e) => setBudgetHours(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">لون التمييز</label>
              <div className="flex gap-2">
                {['#0284c7', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#64748b'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full flex items-center justify-center border border-white shadow-sm"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {msg && <p className="text-emerald-600 font-semibold text-center">{msg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs"
            >
              {loading ? 'جاري الإضافة...' : 'إضافة المشروع للنظام'}
            </button>
          </form>

          {/* Existing Projects List */}
          <div className="md:col-span-6 border-r border-slate-100 pr-0 md:pr-4 flex flex-col justify-between">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-3">
                المشاريع الحالية ({projects.length})
              </h4>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {projects.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                      <span className="text-sky-600 font-mono font-bold">{p.hourlyRate} $/ساعة</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 mt-1.5 text-[11px]">
                      <span>العميل: {p.clientName || 'غير مخصص'}</span>
                      <span>الميزانية: {p.budgetHours} ساعة</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 mt-4 text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
