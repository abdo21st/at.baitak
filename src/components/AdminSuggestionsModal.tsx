'use client';

import React, { useState, useEffect } from 'react';
import { Lock, X, CheckCircle2, ShieldCheck, MessageSquare, Filter, RefreshCw, Sparkles } from 'lucide-react';
import { formatArabicDate } from '@/lib/utils';

interface AdminSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSuggestionsModal({ isOpen, onClose }: AdminSuggestionsModalProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/suggestions');
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchSuggestions();
  }, [isOpen]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, { label: string; icon: string; bg: string }> = {
    WORK_ENVIRONMENT: { label: 'بيئة ومكان العمل', icon: '🏢', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
    IDEA: { label: 'فكرة تطوير ومبيعات', icon: '💡', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    COMPENSATION: { label: 'الرواتب والمستحقات', icon: '💰', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    MANAGEMENT: { label: 'التنظيم الإداري', icon: '📋', bg: 'bg-purple-50 text-purple-800 border-purple-200' }
  };

  const filtered = suggestions.filter((s) => categoryFilter === 'ALL' || s.category === categoryFilter);

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">صندوق مقترحات وشكاوى الموظفين</h3>
              <p className="text-xs text-slate-500 font-semibold">استعراض الملاحظات والمقترحات المشفرة (Zero-Knowledge)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                categoryFilter === 'ALL' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({suggestions.length})
            </button>
            {Object.entries(categoryLabels).map(([key, item]) => {
              const count = suggestions.filter((s) => s.category === key).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter(key)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    categoryFilter === key ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.icon} {item.label} ({count})
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={fetchSuggestions}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Suggestions List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل وفك تشفير المقترحات...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600">لا توجد مقترحات أو شكاوى مسجلة في هذا القسم حالياً.</p>
              <p className="text-[11px] text-slate-400">ستظهر هنا أي مقترحات يقدمها الموظفون عبر لوحاتهم الذاتية.</p>
            </div>
          ) : (
            filtered.map((s) => {
              const cat = categoryLabels[s.category] || categoryLabels.WORK_ENVIRONMENT;
              return (
                <div key={s.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 hover:bg-slate-100/60 transition-all">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <span className={`px-2.5 py-0.5 rounded-lg font-bold border text-[11px] flex items-center gap-1 ${cat.bg}`}>
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(s.createdAt).toLocaleDateString('ar-LY-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-800 font-semibold leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {s.content}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-purple-700 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>محتوى مشفر ومجهول الهوية بالكامل (Zero-Knowledge)</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
