'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingDown,
  Calendar,
  Building2,
  Truck,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Sparkles,
  Bot,
  Layers,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function PharmacyDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/pharmacy/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'فشل جلب البيانات');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner with Welcome and Live Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              قاعدة بيانات PostgreSQL السحابية الموحدة
            </span>
            <span className="text-xs text-slate-400 font-bold">• مباشر</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            لوحة مؤشرات المشتريات وإدارة المخزون 🌿
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            متابعة حية للنواقص الحرجة، أوامر التوريد، وحركة المخزون مع سرعة السحب الحقيقية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <Link
            href="/pharmacy/shortages"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>معاينة النواقص ({stats?.outOfStockCount || 0})</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchStats} className="underline font-black">إعادة المحاولة</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Out of Stock Card */}
        <Link
          href="/pharmacy/shortages?filter=outOfStock"
          className="p-5 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 hover:scale-[1.01] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-100">أصناف منعدمة الرصيد</span>
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tracking-tight">
            {loading ? '...' : (stats?.outOfStockCount || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-100 font-bold mt-2 flex items-center justify-between">
            <span>تحتاج طلبية وتوريد عاجل</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </Link>

        {/* 2. Below Min Stock Level Card */}
        <Link
          href="/pharmacy/shortages?filter=lowStock"
          className="p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20 hover:scale-[1.01] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-100">أصناف قاربت على النفاد</span>
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tracking-tight">
            {loading ? '...' : (stats?.belowMinStockCount || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-blue-100 font-bold mt-2 flex items-center justify-between">
            <span>أقل من حد الأمان للمخزون</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </Link>

        {/* 3. Expiries Alert Card */}
        <Link
          href="/pharmacy/expiries"
          className="p-5 rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20 hover:scale-[1.01] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-rose-100">تنبيهات الصلاحية (عاجل)</span>
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tracking-tight">
            {loading ? '...' : (stats?.criticalExpiriesCount || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-100 font-bold mt-2 flex items-center justify-between">
            <span>منتهية أو خلال 30 يوماً</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </Link>

        {/* 4. Total Stock Value Card */}
        <Link
          href="/pharmacy/inventory"
          className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/20 hover:scale-[1.01] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">إجمالي قيمة المخزون (تكلفة)</span>
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
            {loading ? '...' : `${(stats?.totalInventoryValueCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-2 flex items-center justify-between">
            <span>سعر البيع: {(stats?.totalInventoryValueSell || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Main Split Grid: Critical Shortages & Expiry Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Top Critical Shortages */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">أبرز النواقص الحرجة وسرعة السحب الحقيقية</h3>
                <p className="text-[11px] text-slate-400 font-medium">مرتبة بحسب الأولوية ومعدل الاستهلاك الفعلي</p>
              </div>
            </div>

            <Link
              href="/pharmacy/shortages"
              className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>عرض كل النواقص</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold">جاري تحميل النواقص من قاعدة البيانات...</div>
          ) : stats?.topShortages?.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-600 font-bold">لا توجد نواقص حرجة حالياً!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400 font-bold">
                    <th className="pb-3 pr-2">الدواء / الصنف</th>
                    <th className="pb-3 text-center">الرصيد</th>
                    <th className="pb-3 text-center">سرعة السحب الحقيقية</th>
                    <th className="pb-3 text-center">المقترح للشراء</th>
                    <th className="pb-3 text-center">التكلفة</th>
                    <th className="pb-3 text-left pl-2">المورد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.topShortages.map((item: any) => (
                    <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pr-2 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.stockOnHand <= 0 ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                          <div>
                            <div>{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal">كود: {item.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center font-mono font-black">
                        <span className={`px-2 py-0.5 rounded-md ${item.stockOnHand <= 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {item.stockOnHand}
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-slate-800">
                        {item.trueDailyVelocity || 0} علبة/يوم
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-emerald-700">
                        +{item.suggestedOrderQty}
                      </td>
                      <td className="py-3 text-center font-mono text-slate-600">
                        {Number(item.costPrice).toFixed(2)} د.ل
                      </td>
                      <td className="py-3 text-left pl-2 text-[11px] text-slate-500 font-medium">
                        {item.supplierName || 'غير محدد'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Col: Expiry Summary & Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                رادار مراقبة الصلاحيات
              </h3>
              <Link href="/pharmacy/expiries" className="text-xs font-black text-rose-600 hover:underline">
                تفاصيل
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-900 font-bold">
                <span>أدوية منتهية الصلاحية:</span>
                <span className="font-mono font-black text-sm text-rose-700">
                  {stats?.expiringSoonSummary?.expiredCount || 0} صنف
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-100 text-amber-900 font-bold">
                <span>تنتهي خلال 30 يوماً:</span>
                <span className="font-mono font-black text-sm text-amber-700">
                  {stats?.expiringSoonSummary?.within30Days || 0} صنف
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900 font-bold">
                <span>تنتهي خلال 90 يوماً:</span>
                <span className="font-mono font-black text-sm text-blue-700">
                  {stats?.expiringSoonSummary?.within90Days || 0} صنف
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-bold">
                <span>تنتهي خلال 180 يوماً:</span>
                <span className="font-mono font-black text-sm text-slate-700">
                  {stats?.expiringSoonSummary?.within180Days || 0} صنف
                </span>
              </div>
            </div>

            <Link
              href="/pharmacy/expiries"
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all"
            >
              <span>تجهيز كشف مرتجعات الشركات</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Activity Log Summary */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              سجل جولات المشتريات والجرد
            </h3>
            <p className="text-[11px] text-slate-500">
              توثيق جولات التوريد الميدانية واحتساب العمولات الفورية وجلسات الجرد.
            </p>
            <Link
              href="/pharmacy/activities"
              className="w-full h-10 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all"
            >
              <span>فتح سجل العمليات</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
