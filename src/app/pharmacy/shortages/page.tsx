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
  Flame
} from 'lucide-react';

export default function PharmacyShortagesPage() {
  const [shortages, setShortages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected Items for Purchase Order Cart
  const [cart, setCart] = useState<{ [productId: number]: { item: any; requestedQty: number } }>({});
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const fetchShortages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

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
  }, [search, categoryFilter]);

  // Cart Management
  const toggleCartItem = (item: any) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[item.productId]) {
        delete updated[item.productId];
      } else {
        updated[item.productId] = {
          item,
          requestedQty: item.suggestedOrderQty || 10
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
        requestedQty: item.suggestedOrderQty || 10
      };
    });
    setCart(newCart);
  };

  const clearCart = () => {
    setCart({});
  };

  const cartItemsList = Object.values(cart);
  const totalCartEstimatedCost = cartItemsList.reduce(
    (sum, c) => sum + c.requestedQty * (Number(c.item.costPrice) || 0),
    0
  );

  const generateWhatsAppOrderText = () => {
    let text = `*طلب شراء أدوية ونواقص للصيدلية* 📦🌿\n`;
    text += `التاريخ: ${new Date().toLocaleDateString('ar-LY')}\n`;
    text += `عدد الأصناف المطلوبة: ${cartItemsList.length}\n`;
    text += `------------------------------------\n`;
    cartItemsList.forEach((c, idx) => {
      text += `${idx + 1}. *${c.item.name}* (كود: ${c.item.code})\n`;
      text += `   الكمية المطلوبة: [ *${c.requestedQty}* علبة ]\n`;
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
              مصنف بالذكاء الاصطناعي ومحرك موازنة البدائل
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            إدارة النواقص وتوليد طلبيات الشراء
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            احتساب سرعة البيع الحقيقية، تنبيهات البدائل المهددة بالانتهاء، وتوليد أوامر الشراء
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
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-7 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الدواء، المادة الفعالة، الكود..."
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="sm:col-span-5">
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
      </div>

      {/* Table Toolbar */}
      <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-3">
          <button onClick={selectAll} className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>تحديد الكل ({shortages.length})</span>
          </button>
          {cartItemsList.length > 0 && (
            <button onClick={clearCart} className="text-rose-600 hover:text-rose-700 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" />
              <span>إلغاء التحديد</span>
            </button>
          )}
        </div>
        <div>
          تم العثور على <span className="font-mono text-slate-900 font-black">{shortages.length}</span> دواء ناقص
        </div>
      </div>

      {/* Shortages Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">جاري تحميل النواقص...</div>
        ) : shortages.length === 0 ? (
          <div className="p-12 text-center text-xs text-emerald-600 font-bold">لا توجد نواقص تطابق معايير البحث!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold">
                  <th className="py-3.5 pr-4 text-center w-12">تحديد</th>
                  <th className="py-3.5 pr-2">اسم الدواء / التصنيف</th>
                  <th className="py-3.5 text-center">الرصيد</th>
                  <th className="py-3.5 text-center">سرعة السحب الحقيقية</th>
                  <th className="py-3.5 text-center">المقترح للشراء</th>
                  <th className="py-3.5 text-center">سعر التكلفة</th>
                  <th className="py-3.5 text-center">سعر البيع</th>
                  <th className="py-3.5 text-left pl-4">الشركة والملاحظات الذكية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shortages.map((item) => {
                  const isSelected = !!cart[item.productId];
                  const hasGenericRisk = item.genericRisk?.hasNearExpirySubstitute;

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

                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-slate-400">كود: {item.code}</span>
                              {item.subCategory && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">{item.subCategory}</span>}
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
                        <span className={`px-2 py-0.5 rounded-md ${item.stockOnHand <= 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {item.stockOnHand}
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-mono text-xs">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.trueDailyVelocity || 0} علبة/يوم
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-mono font-black text-emerald-700">
                        +{item.suggestedOrderQty}
                      </td>
                      <td className="py-3.5 text-center font-mono text-slate-700">
                        {Number(item.costPrice).toFixed(2)} د.ل
                      </td>
                      <td className="py-3.5 text-center font-mono text-slate-500">
                        {Number(item.sellPrice).toFixed(2)} د.ل
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
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 pr-3">الدواء</th>
                    <th className="py-2.5 text-center">الكمية المطلوبة</th>
                    <th className="py-2.5 text-center">التكلفة</th>
                    <th className="py-2.5 text-center">الإجمالي</th>
                    <th className="py-2.5 text-left pl-3">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItemsList.map(({ item, requestedQty }) => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-3 font-bold text-slate-900">
                        <div>{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">كود: {item.code}</div>
                      </td>
                      <td className="py-2.5 text-center">
                        <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                          <button onClick={() => updateCartQty(item.productId, requestedQty - 1)} className="p-1 text-slate-500 hover:bg-slate-200 rounded">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-black px-2 text-xs">{requestedQty}</span>
                          <button onClick={() => updateCartQty(item.productId, requestedQty + 1)} className="p-1 text-slate-500 hover:bg-slate-200 rounded">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 text-center font-mono text-slate-600">{Number(item.costPrice).toFixed(2)} د.ل</td>
                      <td className="py-2.5 text-center font-mono font-bold text-emerald-700">{(requestedQty * Number(item.costPrice)).toFixed(2)} د.ل</td>
                      <td className="py-2.5 text-left pl-3">
                        <button onClick={() => toggleCartItem(item)} className="text-rose-500 hover:text-rose-700 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
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
                className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
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
