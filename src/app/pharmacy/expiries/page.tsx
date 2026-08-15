'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  Printer,
  Share2,
  Search,
  RefreshCw
} from 'lucide-react';

import PrintReportLayout from '@/components/PrintReportLayout';

export default function PharmacyExpiriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchExpiries = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/pharmacy/expiries?${params.toString()}`);
      const data = await res.json();
      if (data.success) setItems(data.items);
    } catch (err) {
      console.error('Fetch expiries error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchExpiries();
  }, [fetchExpiries]);

  const totalAtRiskCost = items.reduce((sum, item) => sum + item.stockOnHand * item.costPrice, 0);

  const generateWhatsAppReturnsText = () => {
    let text = `*كشف مرتجعات أدوية قريبة الانتهاء* 📦⏳\n`;
    text += `التاريخ: ${new Date().toLocaleDateString('ar-LY-u-nu-latn')}\n`;
    text += `عدد الأصناف: ${items.length}\n`;
    text += `------------------------------------\n`;
    items.forEach((item, idx) => {
      const invUnit = item.inventoryUnit || 'علبة';
      text += `${idx + 1}. *${item.productName}* (كود: ${item.productCode})\n`;
      text += `   الكمية: [ *${item.stockOnHand}* ${invUnit} ] | تاريخ الصلاحية: [ *${item.expiryDate}* ]\n`;
    });
    text += `------------------------------------\n`;
    text += `الرجاء التنسيق لاستبدال المرتجعات مع الشكر.`;
    return encodeURIComponent(text);
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-600" />
            رادار مراقبة الصلاحيات وكشوفات المرتجعات
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            حصر مبكر للأدوية قريبة الانتهاء لتجهيزها في كشوف مرتجعات الشركات واستبدالها
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <>
              <a
                href={`https://wa.me/?text=${generateWhatsAppReturnsText()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>واتساب المرتجعات</span>
              </a>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة كشف المرتجعات (A4)</span>
              </button>
            </>
          )}

          <button onClick={fetchExpiries} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 no-print">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الدواء أو الكود..."
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-500"
          >
          </input>
        </div>

        <div className="sm:col-span-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-500"
          >
            <option value="all">جميع الصلاحيات المهددة (&lt;= 6 أشهر)</option>
            <option value="expired">منتهية الصلاحية 🔴</option>
            <option value="30days">خلال 30 يوماً 🟠</option>
            <option value="90days">خلال 90 يوماً 🟡</option>
            <option value="180days">خلال 180 يوماً 🟢</option>
          </select>
        </div>
      </div>

      {/* Summary Cost Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 text-white text-xs border border-rose-900/50 no-print">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>إجمالي القيمة المالية المهددة في هذه القائمة (سعر التكلفة):</span>
        </div>
        <span className="font-mono font-black text-sm text-rose-300">
          {totalAtRiskCost.toFixed(2)} د.ل
        </span>
      </div>

      {/* Table & Print Report Container */}
      <PrintReportLayout
        systemName="منظومة إدارة المشتريات والمخزون الصيدلاني 🌿"
        reportTitle="كشف رادار مراقبة الصلاحيات ومرتجعات الأدوية"
        reportSubtitle="حصر الأدوية قريبة الانتهاء والمنتهية الصلاحية للتصريف والاسترجاع من الموردين"
        metaDetails={[
          { label: 'عدد الأصناف المعروضة', value: items.length },
          { label: 'معيار الفلترة', value: filter === 'all' ? 'أقل من 6 أشهر' : filter === 'expired' ? 'منتهية الصلاحية' : `خلال ${filter}` }
        ]}
        summaryCards={[
          { label: 'عدد الأصناف المهددة', value: items.length, unit: 'صنف' },
          { label: 'إجمالي قيمة المخاطرة التقديرية', value: totalAtRiskCost.toFixed(2), unit: 'د.ل' }
        ]}
      >
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:rounded-none">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-bold">جاري فحص تواريخ الصلاحية...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-xs text-emerald-600 font-bold">لا توجد أدوية مهددة بالانتهاء ضمن الفلتر!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold">
                    <th className="py-3.5 pr-4 hidden print:table-cell text-center w-10">#</th>
                    <th className="py-3.5 pr-4">اسم الدواء</th>
                    <th className="py-3.5 text-center">الكود</th>
                    <th className="py-3.5 text-center">تاريخ الصلاحية</th>
                    <th className="py-3.5 text-center">المدة المتبقية</th>
                    <th className="py-3.5 text-center">الكمية على الرف</th>
                    <th className="py-3.5 text-center">سعر التكلفة</th>
                    <th className="py-3.5 text-center">إجمالي القيمة</th>
                    <th className="py-3.5 text-left pl-4">الشركة / المورد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const invUnit = item.inventoryUnit || 'قطعة';
                    const orderUnit = item.orderUnit || 'عبوة';
                    const packSize = item.packSize || 1;

                    return (
                      <tr key={`${item.productId}-${item.expiryDate}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pr-4 hidden print:table-cell font-mono text-[10px] text-slate-500 text-center">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 pr-4">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          {packSize > 1 && (
                            <div className="text-[9px] text-purple-700 font-mono mt-0.5">
                              (1 {orderUnit} = {packSize} {invUnit})
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 text-center font-mono text-slate-500">{item.productCode}</td>
                        <td className="py-3.5 text-center font-mono font-bold text-slate-800">{item.expiryDate}</td>
                        <td className="py-3.5 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold print:border-none print:p-0 ${
                              item.status === 'EXPIRED'
                                ? 'bg-rose-100 text-rose-800 font-black'
                                : item.status === 'CRITICAL_30'
                                ? 'bg-amber-100 text-amber-800'
                                : item.status === 'WARNING_90'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.daysRemaining <= 0 ? 'منتهي الصلاحية' : `${item.daysRemaining} يوم`}
                          </span>
                        </td>
                        <td className="py-3.5 text-center font-mono font-black text-slate-900">
                          <div>{item.stockOnHand}</div>
                          <div className="text-[9px] text-slate-400 font-normal">{invUnit}</div>
                        </td>
                        <td className="py-3.5 text-center font-mono text-slate-600">{Number(item.costPrice).toFixed(2)} د.ل</td>
                        <td className="py-3.5 text-center font-mono font-bold text-rose-700">{(item.stockOnHand * item.costPrice).toFixed(2)} د.ل</td>
                        <td className="py-3.5 text-left pl-4 text-[11px] text-slate-500 font-medium">{item.supplierName || 'غير محدد'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PrintReportLayout>
    </div>
  );
}
