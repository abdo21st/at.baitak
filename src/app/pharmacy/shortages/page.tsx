'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShoppingCart,
  Search,
  CheckSquare,
  Square,
  Share2,
  Printer,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  Bot,
  ShieldAlert,
  Calendar,
  Layers,
  Building2,
  Sparkles
} from 'lucide-react';

export default function PharmacyShortagesPage() {
  const [shortages, setShortages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // فترات الدراسة والتغطية (Study Period & Target Coverage Days)
  const [studyPeriod, setStudyPeriod] = useState<number>(30);
  const [coverageDays, setCoverageDays] = useState<number>(30);

  // Selected Items for Purchase Order Cart
  const [cart, setCart] = useState<{ [productId: number]: { item: any; requestedQty: number } }>({});
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const fetchShortages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (branchFilter !== 'all') params.set('branch', branchFilter);
      params.set('studyPeriod', String(studyPeriod));
      params.set('coverageDays', String(coverageDays));

      const res = await fetch(`/api/pharmacy/shortages?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setShortages(data.shortages);
      }
    } catch (err) {
      console.error('Fetch shortages error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortages();
  }, [search, categoryFilter, branchFilter, studyPeriod, coverageDays]);

  // Cart Management
  const toggleCartItem = (item: any) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[item.productId]) {
        delete updated[item.productId];
      } else {
        updated[item.productId] = {
          item,
          requestedQty: item.suggestedOrderPackages || item.suggestedOrderQty || 1
        };
      }
      return updated;
    });
  };

  const updateCartQty = (productId: number, qty: number) => {
    if (qty <= 0) return;
    setCart((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        requestedQty: qty
      }
    }));
  };

  const selectAll = () => {
    const newCart: { [id: number]: { item: any; requestedQty: number } } = {};
    shortages.forEach((item) => {
      newCart[item.productId] = {
        item,
        requestedQty: item.suggestedOrderPackages || item.suggestedOrderQty || 1
      };
    });
    setCart(newCart);
  };

  const clearCart = () => {
    setCart({});
  };

  const cartItemsList = Object.values(cart);
  const totalCartEstimatedCost = cartItemsList.reduce(
    (sum, c) => sum + c.requestedQty * (Number(c.item.purchaseUnitCost) || (Number(c.item.costPrice) * (Number(c.item.packSize) || 1))),
    0
  );

  const generateWhatsAppOrderText = () => {
    const nowStr = new Date().toISOString().split('T')[0];
    let text = `*طلب شراء وتوريد أدوية ونواقص للصيدلية* 📦🌿\n`;
    text += `التاريخ: ${nowStr}\n`;
    text += `الفترة المستهدفة للتغطية: [ ${coverageDays} يوماً ]\n`;
    text += `عدد الأصناف المطلوبة: ${cartItemsList.length}\n`;
    text += `------------------------------------\n`;
    cartItemsList.forEach((c, idx) => {
      const p = c.item;
      const orderUnit = p.orderUnit || 'عبوة';
      const invUnit = p.inventoryUnit || 'قطعة';
      const packSize = p.packSize || 1;
      const totalSmall = c.requestedQty * packSize;

      text += `${idx + 1}. *${p.name}* (كود: ${p.code})\n`;
      text += `   الكمية المطلوبة: [ *${c.requestedQty}* ${orderUnit} ]`;
      if (packSize > 1) {
        text += ` (تعادل ${totalSmall} ${invUnit} - العبوة بها ${packSize} ${invUnit})`;
      }
      text += `\n`;
    });
    text += `------------------------------------\n`;
    text += `الرجاء تأكيد التوفر وعروض الأسعار مع الشكر.`;
    return encodeURIComponent(text);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center gap-1 border border-indigo-200">
              <Bot className="w-3 h-3 text-indigo-600" />
              محرك حساب النواقص بالوحدات الكبرى والتغطية الزمنية
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            إدارة النواقص وتوليد طلبيات الشراء
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تحديد فترة دراسة حركة المخزون، وتحديد فترة التغطية المطلوبة مع التحويل التلقائي للوحدات الكبرى
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cartItemsList.length > 0 && (
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>معاينة الطلبية ({cartItemsList.length})</span>
              <span className="font-mono bg-emerald-700/80 px-2 py-0.5 rounded-md text-[11px]">
                {totalCartEstimatedCost.toFixed(2)} د.ل
              </span>
            </button>
          )}

          <button
            onClick={fetchShortages}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Control Panel: Study Period & Target Coverage Periods */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Study Period Window */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>فترة دراسة حركة المخزون (تحليل المبيعات):</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                آخر {studyPeriod} يوماً
              </span>
            </div>
            <p className="text-[10px] text-blue-700/80">
              تحديد الفترة الزمنية السابقة لقياس سرعة السحب اليومية الحقيقية (Velocity) لكل صنف
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              {[15, 30, 60, 90, 180].map((days) => (
                <button
                  key={days}
                  onClick={() => setStudyPeriod(days)}
                  className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
                    studyPeriod === days
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  {days} يوم
                </button>
              ))}
            </div>
          </div>

          {/* Target Coverage Days */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>الفترة المطلوبة للتوفير (تغطية الطلبية القادمة):</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                يكفي {coverageDays} يوماً
              </span>
            </div>
            <p className="text-[10px] text-emerald-700/80">
              كم يوماً تريد أن يكفيك المخزون بعد الشراء؟ يتم حساب الكمية المقترحة وفق هذه الفترة
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              {[10, 15, 30, 45, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setCoverageDays(days)}
                  className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
                    coverageDays === days
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {days} يوم
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Search, Categories, and Branch Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الدواء، المادة الفعالة، الكود..."
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
            >
              <option value="all">جميع التصنيفات الطبية</option>
              <option value="MEDICINES">أدوية ومستحضرات علاجية 💊</option>
              <option value="MOTHER_BABY">مستلزمات الأم والطفل 🍼</option>
              <option value="COSMETICS_CARE">العناية والتجميل 🧴</option>
              <option value="MEDICAL_EQUIPMENT">المعدات والمستلزمات الطبية 🩺</option>
              <option value="SUPPLEMENTS">الفيتامينات والمكملات 🌿</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
            >
              <option value="all">كافة الفروع والمصادر 🏢</option>
              <option value="MAIN_BRANCH">الفرع الرئيسي</option>
              <option value="BRANCH_02">فرع 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-3">
          <button onClick={selectAll} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>تحديد الكل ({shortages.length})</span>
          </button>
          {cartItemsList.length > 0 && (
            <button onClick={clearCart} className="text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
              <span>إلغاء التحديد</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>تم العثور على</span>
          <span className="font-mono text-slate-900 font-black">{shortages.length}</span>
          <span>صنف يحتاج للشراء لتغطية</span>
          <span className="font-mono text-emerald-700 font-black">({coverageDays} يوم)</span>
        </div>
      </div>

      {/* Shortages Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">جاري تحليل المخزون وحساب المقترحات...</div>
        ) : shortages.length === 0 ? (
          <div className="p-12 text-center text-xs text-emerald-600 font-bold">لا توجد نواقص تطابق معايير البحث والتغطية المحددة!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold">
                  <th className="py-3.5 pr-4 text-center w-12">تحديد</th>
                  <th className="py-3.5 pr-2">اسم الدواء / التصنيف</th>
                  <th className="py-3.5 text-center">الرصيد الفعلي</th>
                  <th className="py-3.5 text-center">سرعة السحب اليومية</th>
                  <th className="py-3.5 text-center">المقترح للشراء (وحدة كبرى)</th>
                  <th className="py-3.5 text-center">تكلفة الشراء</th>
                  <th className="py-3.5 text-center">إجمالي القيمة المقترحة</th>
                  <th className="py-3.5 text-left pl-4">الشركة والملاحظات الذكية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shortages.map((item) => {
                  const isSelected = !!cart[item.productId];
                  const hasGenericRisk = item.genericRisk?.hasNearExpirySubstitute;
                  const packSize = item.packSize || 1;
                  const orderUnit = item.orderUnit || 'عبوة';
                  const invUnit = item.inventoryUnit || 'قطعة';

                  return (
                    <tr
                      key={item.productId}
                      onClick={() => toggleCartItem(item)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50/60 font-bold' : ''
                      } ${hasGenericRisk ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="py-3.5 text-center pr-4" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleCartItem(item)} className="text-slate-400 hover:text-emerald-600">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3.5 pr-2">
                        <div className="flex items-start gap-2">
                          <span className={`w-2 h-2 rounded-full mt-1.5 ${item.stockOnHand <= 0 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                          <div>
                            <div className="font-black text-slate-900 flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {item.strength && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                                  {item.strength}
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="font-mono text-slate-400">كود: {item.code}</span>
                              {item.subCategory && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">{item.subCategory}</span>}
                              {packSize > 1 && (
                                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded font-mono text-[9px]">
                                  1 {orderUnit} = {packSize} {invUnit}
                                </span>
                              )}
                              {item.activeIngredient && (
                                <span className="text-slate-600 font-mono text-[9px] bg-slate-50 border border-slate-200 px-1 rounded">
                                  {item.activeIngredient}
                                </span>
                              )}
                            </div>

                            {hasGenericRisk && (
                              <div className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 font-bold flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{item.genericRisk.recommendationMessage}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-mono font-black">
                        <div className="flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded-md ${item.stockOnHand <= 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {item.stockOnHand}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal mt-0.5">{invUnit}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-mono text-xs">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            {Number(item.trueDailyVelocity || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal mt-0.5">{invUnit}/يوم</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-mono font-black text-emerald-700">
                        <div className="flex flex-col items-center">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-sm">
                            +{item.suggestedOrderPackages} {orderUnit}
                          </span>
                          {packSize > 1 && (
                            <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                              ({item.suggestedTotalSmallUnits} {invUnit})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-mono text-slate-700">
                        <div className="flex flex-col items-center">
                          <span>{Number(item.purchaseUnitCost || item.costPrice).toFixed(2)} د.ل</span>
                          <span className="text-[10px] text-slate-400 font-normal">لكل {orderUnit}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-mono font-bold text-slate-900">
                        {Number(item.estimatedOrderCost || (item.suggestedOrderPackages * (item.purchaseUnitCost || item.costPrice))).toFixed(2)} د.ل
                      </td>
                      <td className="py-3.5 text-left pl-4 text-[11px] text-slate-500 font-medium">
                        {item.supplierName || 'غير محدد'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cart Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  تجهيز ومراجعة طلبية الشراء ({cartItemsList.length} صنف)
                </h3>
                <p className="text-[11px] text-slate-500">
                  فترة التغطية المستهدفة: {coverageDays} يوماً | محسوبة بالوحدة الكبرى
                </p>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer text-lg">✕</button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 pr-3">الدواء والوحدة</th>
                    <th className="py-2.5 text-center">الكمية المطلوبة (وحدة كبرى)</th>
                    <th className="py-2.5 text-center">تكلفة الوحدة</th>
                    <th className="py-2.5 text-center">الإجمالي</th>
                    <th className="py-2.5 text-left pl-3">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItemsList.map(({ item, requestedQty }) => {
                    const orderUnit = item.orderUnit || 'عبوة';
                    const invUnit = item.inventoryUnit || 'قطعة';
                    const packSize = item.packSize || 1;
                    const unitPrice = Number(item.purchaseUnitCost) || (Number(item.costPrice) * packSize);

                    return (
                      <tr key={item.productId} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-3 font-bold text-slate-900">
                          <div>{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                            <span>كود: {item.code}</span>
                            {packSize > 1 && (
                              <span className="text-purple-600 font-bold">({requestedQty * packSize} {invUnit})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                            <button onClick={() => updateCartQty(item.productId, requestedQty - 1)} className="p-1 text-slate-500 hover:bg-slate-200 rounded">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-black px-2 text-xs">{requestedQty} {orderUnit}</span>
                            <button onClick={() => updateCartQty(item.productId, requestedQty + 1)} className="p-1 text-slate-500 hover:bg-slate-200 rounded">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 text-center font-mono text-slate-600">{unitPrice.toFixed(2)} د.ل</td>
                        <td className="py-2.5 text-center font-mono font-bold text-emerald-700">{(requestedQty * unitPrice).toFixed(2)} د.ل</td>
                        <td className="py-2.5 text-left pl-3">
                          <button onClick={() => toggleCartItem(item)} className="text-rose-500 hover:text-rose-700 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">إجمالي التكلفة التقديرية للطلبية:</span>
              <span className="font-mono font-black text-base text-emerald-400">
                {totalCartEstimatedCost.toFixed(2)} د.ل
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={`https://wa.me/?text=${generateWhatsAppOrderText()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>إرسال عبر واتساب</span>
              </a>

              <button
                onClick={() => window.print()}
                className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة أمر الشراء</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
