'use client';

import React from 'react';
import { Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface BatchExpiryTrackerProps {
  expiryDateString: string; // YYYY-MM-DD or YYYY-MM
  batchNumber?: string;
  quantity?: number;
}

export default function BatchExpiryTracker({ expiryDateString, batchNumber, quantity }: BatchExpiryTrackerProps) {
  if (!expiryDateString) return null;

  const now = new Date();
  const expiry = new Date(expiryDateString);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const diffMonths = Number((diffDays / 30).toFixed(1));

  let badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
  let statusText = `صالح (${diffMonths} شهر)`;
  let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;

  if (diffDays <= 0) {
    badgeColor = 'bg-red-600 text-white border-red-700 font-black animate-pulse';
    statusText = 'منتهي الصلاحية ⛔';
    icon = <AlertCircle className="w-3.5 h-3.5 text-white" />;
  } else if (diffDays <= 90) {
    badgeColor = 'bg-red-100 text-red-900 border-red-300 font-extrabold';
    statusText = `وشيك الانتهاء (أقل من 3 أشهر: ${diffDays} يوم) 🔥`;
    icon = <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
  } else if (diffDays <= 180) {
    badgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    statusText = `تنبيه FEFO (متبقي ${diffMonths} شهر)`;
    icon = <Clock className="w-3.5 h-3.5 text-amber-600" />;
  }

  return (
    <div className="inline-flex items-center gap-2 text-xs">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${badgeColor}`}>
        {icon}
        <span>{statusText}</span>
      </div>
      {batchNumber && (
        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
          تشغيلة: {batchNumber}
        </span>
      )}
      {quantity !== undefined && (
        <span className="text-[10px] text-slate-500 font-bold">
          (الكمية: {quantity})
        </span>
      )}
    </div>
  );
}
