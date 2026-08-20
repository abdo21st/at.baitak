'use client';

import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X, Plus, Trash2, CheckCircle2, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';

interface DrugInteractionCheckerProps {
  isOpen: boolean;
  onClose: () => void;
  initialDrugs?: string[];
}

export default function DrugInteractionChecker({ isOpen, onClose, initialDrugs = [] }: DrugInteractionCheckerProps) {
  const [drugs, setDrugs] = useState<string[]>(initialDrugs.length > 0 ? initialDrugs : ['Warfarin', 'Aspirin']);
  const [newDrugInput, setNewDrugInput] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddDrug = () => {
    if (!newDrugInput.trim()) return;
    setDrugs([...drugs, newDrugInput.trim()]);
    setNewDrugInput('');
    setHasChecked(false);
  };

  const handleRemoveDrug = (index: number) => {
    const updated = drugs.filter((_, i) => i !== index);
    setDrugs(updated);
    setHasChecked(false);
  };

  const handleCheckInteractions = async () => {
    if (drugs.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch('/api/pharmacy/clinical-knowledge/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs })
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.interactions || []);
        setHasChecked(true);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">فاحص التداخلات الدوائية اللحظي (BNF 83)</h3>
              <p className="text-xs text-slate-500 font-semibold">تحليل التعارضات الدوائية الخطيرة والتحذيرات السريرية المعتمدة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-semibold text-slate-700">
          {/* Drugs List to check */}
          <div>
            <label className="block text-slate-900 font-bold mb-1.5">الأدوية المحددة في الوصفة / الفاتورة:</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {drugs.map((d, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl font-bold border border-slate-200 text-xs"
                >
                  💊 {d}
                  <button
                    type="button"
                    onClick={() => handleRemoveDrug(idx)}
                    className="text-slate-400 hover:text-red-600 p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Input to add more */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDrugInput}
                onChange={(e) => setNewDrugInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDrug())}
                placeholder="أدخل اسم دواء أو مادة فعالة (مثل: Clarithromycin / Atorvastatin)..."
                className="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddDrug}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={drugs.length < 2 || loading}
            onClick={handleCheckInteractions}
            className="w-full h-12 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'جاري الفحص ومطابقة BNF 83...' : `فحص التعارضات بين (${drugs.length}) أدوية الآن`}
          </button>

          {/* Results Display */}
          {hasChecked && (
            <div className="space-y-3 pt-2">
              {results.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    لا توجد تعارضات أو تداخلات دوائية خطيرة مسجلة
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    الأدوية المحددة آمنة للجمع في وصفة واحدة وفقاً لمونوغرافات المرجع البريطاني الرسمي BNF 83.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-red-900 font-black text-xs">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      تم اكتشاف ({results.length}) تداخلات دوائية تتطلب انتباه الصيدلي:
                    </span>
                  </div>

                  {results.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-red-50/90 border border-red-200 rounded-2xl space-y-2 text-xs text-red-950"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-red-900">{item.titleArabic}</h4>
                        <span className="px-2 py-0.5 bg-red-600 text-white rounded font-bold text-[10px]">
                          {item.severity === 'SEVERE' ? 'خطر شديد 🚨' : 'متوسط ⚠️'}
                        </span>
                      </div>
                      <p className="text-red-900 font-medium leading-relaxed">{item.effectArabic}</p>
                      <div className="p-2.5 bg-white/80 rounded-xl border border-red-200 text-slate-800 space-y-1">
                        <p className="font-black text-red-800 text-[11px]">🛡️ الإجراء الصيدلاني الموصى به:</p>
                        <p className="font-semibold">{item.actionArabic}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        المرجع: {item.reference}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            إغلاق الفاحص
          </button>
        </div>
      </div>
    </div>
  );
}
