'use client';

import React from 'react';
import { Sparkles, X, CheckCircle2, Tag, Calendar } from 'lucide-react';
import changelogData from '@/data/changelog.json';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">سجل التحديثات والميزات الجديدة</h3>
              <p className="text-xs text-slate-500 font-semibold">تعرف على آخر التحسينات المضافة للمنظومة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto pr-1 flex-1 text-xs">
          {changelogData.map((release, idx) => (
            <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-mono font-black text-xs">
                    {release.version}
                  </span>
                  <span className="text-[11px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-md">
                    {release.badge}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{release.date}</span>
                </div>
              </div>

              <h4 className="font-black text-slate-900 text-sm">{release.title}</h4>

              <div className="space-y-3">
                {release.features.map((feat, fIdx) => (
                  <div key={fIdx} className="space-y-1.5">
                    <h5 className="font-extrabold text-purple-950 text-xs flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-600" />
                      <span>{feat.category}</span>
                    </h5>
                    <ul className="space-y-1 pr-4">
                      {feat.items.map((item, iIdx) => (
                        <li key={iIdx} className="text-slate-600 font-medium flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            إغلاق ومتابعة العمل
          </button>
        </div>
      </div>
    </div>
  );
}
