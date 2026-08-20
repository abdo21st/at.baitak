'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Heart, Info } from 'lucide-react';

export type PregnancyCategory = 'A' | 'B' | 'C' | 'D' | 'X' | 'SAFE' | 'CAUTION' | 'CONTRAINDICATED';

interface PregnancySafetyBadgeProps {
  category?: PregnancyCategory | string;
  lactationSafe?: boolean;
  notes?: string;
}

export default function PregnancySafetyBadge({ category = 'B', lactationSafe = true, notes }: PregnancySafetyBadgeProps) {
  const cat = String(category).toUpperCase();

  let badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
  let badgeLabel = 'آمن للحوامل (فئة A/B)';
  let icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />;

  if (cat === 'C' || cat === 'CAUTION') {
    badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
    badgeLabel = 'يستخدم بحذر شديد (فئة C)';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />;
  } else if (cat === 'D' || cat === 'X' || cat === 'CONTRAINDICATED') {
    badgeColor = 'bg-red-100 text-red-900 border-red-300';
    badgeLabel = 'ممنوع تماماً للحوامل (فئة X/D)';
    icon = <AlertOctagon className="w-3.5 h-3.5 text-red-700" />;
  }

  return (
    <div className="inline-flex flex-col gap-1 text-[11px] font-bold">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${badgeColor}`}>
        {icon}
        <span>{badgeLabel}</span>
      </div>
      {lactationSafe !== undefined && (
        <span className={`text-[10px] font-semibold flex items-center gap-1 ${lactationSafe ? 'text-emerald-700' : 'text-amber-700'}`}>
          <Heart className="w-3 h-3" />
          {lactationSafe ? 'آمن أثناء الرضاعة الطبيعية' : 'يفرز في الحليب (استشر الطبيب)'}
        </span>
      )}
      {notes && <p className="text-[10px] text-slate-500 font-normal">{notes}</p>}
    </div>
  );
}
