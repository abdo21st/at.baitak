'use client';

import React, { useState } from 'react';
import { Baby, Calculator, X, CheckCircle2, AlertCircle, Info, Sparkles, Scale } from 'lucide-react';
import { PEDIATRIC_DRUGS_DB, calculatePediatricDose, CalculationResult } from '@/lib/dosingEngine';

interface PediatricDoseCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PediatricDoseCalculator({ isOpen, onClose }: PediatricDoseCalculatorProps) {
  const [selectedDrugId, setSelectedDrugId] = useState(PEDIATRIC_DRUGS_DB[0].id);
  const [weightKg, setWeightKg] = useState<string>('12');
  const [concentrationIdx, setConcentrationIdx] = useState<number>(0);
  const [durationDays, setDurationDays] = useState<number>(5);

  if (!isOpen) return null;

  const currentDrug = PEDIATRIC_DRUGS_DB.find((d) => d.id === selectedDrugId) || PEDIATRIC_DRUGS_DB[0];
  const weightNum = parseFloat(weightKg) || 0;
  const result: CalculationResult | null = weightNum > 0 ? calculatePediatricDose(selectedDrugId, weightNum, concentrationIdx, durationDays) : null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Baby className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">حاسبة جرعات الأطفال الدقيقة (BNF 83)</h3>
              <p className="text-xs text-slate-500 font-semibold">حساب جرعات المضادات والمسكنات التلقائي بالسنتيمتر/مل لمنع الخطأ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-semibold text-slate-700">
          {/* Drug Selector */}
          <div>
            <label className="block text-slate-900 font-bold mb-1.5">اختر الدواء:</label>
            <select
              value={selectedDrugId}
              onChange={(e) => {
                setSelectedDrugId(e.target.value);
                setConcentrationIdx(0);
              }}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {PEDIATRIC_DRUGS_DB.map((d) => (
                <option key={d.id} value={d.id}>
                  💊 {d.nameArabic}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Weight Input */}
            <div>
              <label className="block text-slate-900 font-bold mb-1">وزن الطفل (كغم):</label>
              <div className="relative">
                <input
                  type="number"
                  min="2"
                  max="60"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-mono font-bold text-center focus:outline-none focus:border-teal-500"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {[
                  { label: '6 أشهر (~8كغ)', w: '8' },
                  { label: '1 سنة (~10كغ)', w: '10' },
                  { label: '2 سنة (~12كغ)', w: '12' },
                  { label: '5 سنوات (~18كغ)', w: '18' },
                  { label: '8 سنوات (~25كغ)', w: '25' }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setWeightKg(preset.w)}
                    className="text-[9px] bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Concentration */}
            <div>
              <label className="block text-slate-900 font-bold mb-1">التركيز المتاح بالصيدلية:</label>
              <select
                value={concentrationIdx}
                onChange={(e) => setConcentrationIdx(Number(e.target.value))}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-slate-900 font-bold text-[11px] focus:outline-none focus:border-teal-500 cursor-pointer font-mono"
              >
                {currentDrug.concentrations.map((c, i) => (
                  <option key={i} value={i}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-slate-900 font-bold mb-1">مدة العلاج (بالأيام):</label>
              <input
                type="number"
                min="1"
                max="14"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value) || 5)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-mono font-bold text-center focus:outline-none focus:border-teal-500"
                dir="ltr"
              />
            </div>
          </div>

          {/* Dosage Result Card */}
          {result && (
            <div className="p-5 bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-3xl shadow-xl space-y-4 border border-teal-700/40 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-teal-700/60 pb-3">
                <span className="font-black text-sm text-teal-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  الجرعة المعتمدة المحسوبة
                </span>
                <span className="text-[11px] bg-teal-500/20 text-teal-200 px-2 py-0.5 rounded-md font-extrabold border border-teal-400/30">
                  BNF 83 Standard
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-teal-500/30 text-center">
                  <span className="text-[11px] text-teal-200 block mb-0.5">الجرعة في المرة الواحدة:</span>
                  <div className="text-2xl font-black text-white font-mono">
                    {result.singleDoseMl} <span className="text-sm font-sans text-teal-400">مل (سم³)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">({result.singleDoseMg} ملغ)</span>
                </div>

                <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-teal-500/30 text-center">
                  <span className="text-[11px] text-teal-200 block mb-0.5">التكرار اليومي:</span>
                  <div className="text-xs font-black text-white mt-1">
                    {result.frequencyText}
                  </div>
                  <span className="text-[10px] text-teal-300 block mt-1">إجمالي اليوم: {result.dailyDoseMl} مل</span>
                </div>
              </div>

              <div className="p-3 bg-teal-950/60 rounded-xl text-[11px] text-teal-100 border border-teal-800/60 leading-relaxed">
                <p className="font-bold text-teal-300 mb-0.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  إرشادات الصيدلي للمريض:
                </p>
                <p>{result.notes}</p>
                <p className="mt-1 font-extrabold text-teal-200">
                  📦 عدد العبوات المطلوبة للمدة كاملة ({durationDays} أيام): <span className="text-white font-mono text-xs underline">{result.totalBottlesNeeded} عبوة</span>.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            إغلاق الحاسبة
          </button>
        </div>
      </div>
    </div>
  );
}
