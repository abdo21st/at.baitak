'use client';

import React from 'react';

interface PrintReportLayoutProps {
  systemName?: string;
  reportTitle: string;
  reportSubtitle?: string;
  periodText?: string;
  metaDetails?: { label: string; value: string | number }[];
  summaryCards?: { label: string; value: string | number; unit?: string }[];
  children: React.ReactNode;
  showSignatures?: boolean;
}

export default function PrintReportLayout({
  systemName = 'منظومة إدارة المشتريات والمخزون الصيدلاني 🌿',
  reportTitle,
  reportSubtitle,
  periodText,
  metaDetails = [],
  summaryCards = [],
  children,
  showSignatures = true
}: PrintReportLayoutProps) {
  const printDateStr = new Date().toISOString().split('T')[0];
  const printTimeStr = new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="print-report-container w-full font-cairo">
      {/* ========================================================================= */}
      {/* 1. Official Report Print Header (ترويسة التقرير الرسمي لورق A4) */}
      {/* ========================================================================= */}
      <div className="print-report-header hidden print:block border-b-2 border-slate-800 pb-3 mb-4">
        <div className="flex items-start justify-between">
          
          {/* Right: Organization & System Name */}
          <div className="text-right space-y-1">
            <h1 className="text-base font-black text-slate-900 tracking-tight">
              {systemName}
            </h1>
            <p className="text-[11px] text-slate-600 font-bold">
              الفرع الرئيسي | نظام الحسابات والمخزون الآلي
            </p>
            {periodText && (
              <p className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mt-1 font-mono">
                {periodText}
              </p>
            )}
          </div>

          {/* Center: Report Title */}
          <div className="text-center space-y-0.5">
            <div className="text-sm font-black text-slate-900 uppercase border-b border-slate-300 pb-0.5 px-3">
              {reportTitle}
            </div>
            {reportSubtitle && (
              <p className="text-[10px] text-slate-500 font-medium">
                {reportSubtitle}
              </p>
            )}
          </div>

          {/* Left: Metadata & Print Timestamp */}
          <div className="text-left space-y-0.5 text-[10px] text-slate-600 font-mono">
            <div><span className="text-slate-400">تاريخ الإصدار:</span> <span className="font-bold text-slate-900">{printDateStr}</span></div>
            <div><span className="text-slate-400">وقت الطباعة:</span> <span className="font-bold text-slate-900">{printTimeStr}</span></div>
            <div><span className="text-slate-400">المستخدم:</span> <span className="font-bold text-slate-900">مدير النظام</span></div>
          </div>
        </div>

        {/* Dynamic Meta Details Badges */}
        {metaDetails.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200 text-[10px]">
            {metaDetails.map((meta, idx) => (
              <div key={idx} className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                <span className="text-slate-500">{meta.label}:</span>{' '}
                <span className="font-mono font-bold text-slate-900">{meta.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Summary Indicators Cards (Print-ready) */}
        {summaryCards.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2 text-center text-[10px]">
            {summaryCards.map((card, idx) => (
              <div key={idx} className="p-1.5 rounded-lg border border-slate-300 bg-slate-50">
                <div className="text-slate-500 text-[9px] font-bold">{card.label}</div>
                <div className="font-mono font-black text-xs text-slate-900 mt-0.5">
                  {card.value} {card.unit && <span className="text-[9px] font-normal text-slate-600">{card.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. Main Report Content (Table / List) */}
      {/* ========================================================================= */}
      <div className="print-content">
        {children}
      </div>

      {/* ========================================================================= */}
      {/* 3. Official Signature & Stamp Footer (ذيل التقرير الرسمي والتوقيعات) */}
      {/* ========================================================================= */}
      {showSignatures && (
        <div className="print-signatures hidden print:block mt-6 pt-4 border-t border-slate-400">
          <div className="grid grid-cols-3 gap-4 text-center text-[10px] text-slate-700">
            <div>
              <div className="font-bold text-slate-900 mb-6">إعداد المحاسب / المشرف:</div>
              <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
            </div>
            <div>
              <div className="font-bold text-slate-900 mb-6">المراجعة والتدقيق الداخلي:</div>
              <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
            </div>
            <div>
              <div className="font-bold text-slate-900 mb-6">اعتماد الإدارة / الختم:</div>
              <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[8px] text-slate-400 mt-4 pt-1 border-t border-slate-200">
            <span>تم التوليد آلياً بواسطة المنظومة - النسخة السحابية المعتمدة</span>
            <span className="font-mono">وثيقة رقمية صالحة للإجراء المالي والإداري</span>
          </div>
        </div>
      )}
    </div>
  );
}
