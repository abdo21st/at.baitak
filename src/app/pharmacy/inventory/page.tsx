'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Sliders,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Edit3,
  Printer,
  Pill,
  Sparkles
} from 'lucide-react';
import PrintReportLayout from '@/components/PrintReportLayout';
import ClinicalCapsuleModal from '@/components/ClinicalCapsuleModal';

export default function PharmacyInventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');

  // Clinical Capsule Modal State
  const [isCapsuleModalOpen, setIsCapsuleModalOpen] = useState(false);
  const [selectedCapsuleProduct, setSelectedCapsuleProduct] = useState<any>(null);

  // Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<any | null>(null);
  const [newStock, setNewStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '25');
      if (search) params.set('search', search);
      if (filter !== 'all') params.set('filter', filter);
      if (category !== 'all') params.set('category', category);

      const res = await fetch(`/api/pharmacy/inventory?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Fetch inventory error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, category]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAdjust = (p: any) => {
    setAdjustingProduct(p);
    setNewStock(String(p.stockOnHand));
    setMinStock(String(p.minStockLevel));
    setMaxStock(String(p.maxStockLevel));
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/pharmacy/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjustingProduct.id,
          newStock: Number(newStock),
          minStock: Number(minStock),
          maxStock: Number(maxStock)
        })
      });

      const data = await res.json();
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === adjustingProduct.id
              ? { ...p, stockOnHand: Number(newStock), minStockLevel: Number(minStock), maxStockLevel: Number(maxStock) }
              : p
          )
        );
        setAdjustingProduct(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-dubai">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-600" />
            دليل المخزون الصيدلاني والجرد
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            استعراض وتصفح الأصناف المسجلة وإجراء تسويات الرصيد وحدود الأمان
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedCapsuleProduct(null); setIsCapsuleModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            title="إرسال كبسولة دوائية وتدريب الموظفين عبر واتساب"
          >
            <Pill className="w-4 h-4" />
            <span>كبسولة دوائية للموظفين 💊</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة كشف الجرد (A4)</span>
          </button>

          <button
            onClick={() => {
              setPage(1);
              fetchProducts();
            }}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 no-print">
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ابحث باسم الدواء، الكود، أو المادة الفعالة..."
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
          >
            <option value="all">جميع الأصناف ({totalCount})</option>
            <option value="inStock">أصناف متوفرة (Stock &gt; 0)</option>
            <option value="outOfStock">أصناف منعدمة (Stock = 0)</option>
            <option value="lowStock">أصناف منخفضة (Below Min)</option>
          </select>
        </div>

        <div className="sm:col-span-4">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
          >
            <option value="all">جميع التصنيفات</option>
            <option value="MEDICINES">أدوية ومستحضرات علاجية 💊</option>
            <option value="MOTHER_BABY">مستلزمات الأم والطفل 🍼</option>
            <option value="COSMETICS_CARE">العناية والتجميل 🧴</option>
            <option value="MEDICAL_EQUIPMENT">المعدات والمستلزمات الطبية 🩺</option>
            <option value="SUPPLEMENTS">الفيتامينات والمكملات 🌿</option>
          </select>
        </div>
      </div>

      {/* Products Table & Print Report Container */}
      <PrintReportLayout
        systemName="منظومة إدارة المشتريات والمخزون الصيدلاني 🌿"
        reportTitle="كشف جرد المخزون الصيدلاني والأرصدة"
        reportSubtitle="بيان حالة توفر الأصناف المسجلة وحدود الأمان والأسعار المعتمدة"
        metaDetails={[
          { label: 'إجمالي الأصناف بالدليل', value: totalCount },
          { label: 'حالة الفلترة', value: filter === 'all' ? 'كافة الأصناف' : filter === 'inStock' ? 'المتوفرة' : filter === 'outOfStock' ? 'المنعدمة' : 'منخفضة الرصيد' },
          { label: 'التصنيف', value: category === 'all' ? 'جميع التصنيفات' : category }
        ]}
        summaryCards={[
          { label: 'إجمالي الأصناف', value: totalCount, unit: 'صنف' },
          { label: 'الصفحة الحالية', value: `${page} / ${totalPages || 1}` }
        ]}
      >
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:rounded-none">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-bold">جاري تحميل دليل الأدوية...</div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-bold">لم يتم العثور على أدوية مطابقة للبحث!</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block print:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold">
                    <th className="py-3.5 pr-4 hidden print:table-cell text-center w-10">#</th>
                    <th className="py-3.5 pr-4">اسم الدواء والمواصفات</th>
                    <th className="py-3.5 text-center">الكود</th>
                    <th className="py-3.5 text-center">الرصيد الفعلي</th>
                    <th className="py-3.5 text-center">حد الأمان</th>
                    <th className="py-3.5 text-center">سعر التكلفة</th>
                    <th className="py-3.5 text-center">سعر البيع</th>
                    <th className="py-3.5 text-center">الصلاحية</th>
                    <th className="py-3.5 text-left pl-4">الشركة الموردة</th>
                    <th className="py-3.5 text-center w-16 no-print">تسوية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((item, idx) => {
                    const packSize = item.packSize || 1;
                    const orderUnit = item.orderUnit || 'عبوة';
                    const invUnit = item.inventoryUnit || 'قطعة';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pr-4 hidden print:table-cell font-mono text-[10px] text-slate-500 text-center">
                          {(page - 1) * 25 + idx + 1}
                        </td>
                        <td className="py-3.5 pr-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-2 mt-0.5">
                            {item.activeIngredient && (
                              <span className="text-slate-400 font-mono">{item.activeIngredient}</span>
                            )}
                            {packSize > 1 && (
                              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200 text-[9px] font-mono">
                                1 {orderUnit} = {packSize} {invUnit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-center font-mono text-slate-500">{item.code}</td>
                        <td className="py-3.5 text-center font-mono font-black">
                          <div className="flex flex-col items-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg print:border-none print:p-0 ${
                                item.stockOnHand <= 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : item.stockOnHand <= item.minStockLevel
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {item.stockOnHand}
                            </span>
                            <span className="text-[9px] text-slate-400 font-normal mt-0.5">{invUnit}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-center font-mono text-slate-500">
                          <span>{item.minStockLevel}</span>
                          <span className="text-[9px] text-slate-400 font-normal block">{invUnit}</span>
                        </td>
                        <td className="py-3.5 text-center font-mono text-slate-700 font-bold">
                          <div>{Number(item.costPrice).toFixed(2)} د.ل</div>
                          {packSize > 1 && (
                            <div className="text-[9px] text-slate-400 font-normal">({Number(item.purchaseUnitCost || (item.costPrice * packSize)).toFixed(2)} /{orderUnit})</div>
                          )}
                        </td>
                        <td className="py-3.5 text-center font-mono text-slate-500">{Number(item.sellPrice).toFixed(2)} د.ل</td>
                        <td className="py-3.5 text-center font-mono text-[11px] text-slate-600">{item.expiryDate || '—'}</td>
                        <td className="py-3.5 text-left pl-4 text-[11px] text-slate-500">{item.supplierName || 'غير محدد'}</td>
                        <td className="py-3.5 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setSelectedCapsuleProduct(item); setIsCapsuleModalOpen(true); }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-emerald-200"
                              title="إرسال كبسولة دوائية وتدريب الموظفين عن هذا الصنف"
                            >
                              <Pill className="w-3 h-3 text-emerald-600" />
                              <span>كبسولة</span>
                            </button>
                            <button
                              onClick={() => openAdjust(item)}
                              className="p-1.5 bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="تعديل الرصيد"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (<768px) */}
            <div className="block md:hidden print:hidden space-y-3 p-3">
              {products.map((item) => {
                const packSize = item.packSize || 1;
                const orderUnit = item.orderUnit || 'عبوة';
                const invUnit = item.inventoryUnit || 'قطعة';

                return (
                  <div key={`mob-prod-${item.id}`} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                    {/* Header: Name & Stock Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          كود: {item.code} {item.activeIngredient ? `• ${item.activeIngredient}` : ''}
                        </div>
                      </div>
                      <div className="text-left">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono inline-block ${
                            item.stockOnHand <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : item.stockOnHand <= item.minStockLevel
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.stockOnHand} {invUnit}
                        </span>
                      </div>
                    </div>

                    {/* Body Details Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl font-mono text-center">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans">سعر التكلفة</span>
                        <span className="font-bold text-slate-800 inline-block mt-0.5">{Number(item.costPrice).toFixed(2)} د.ل</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans">سعر البيع</span>
                        <span className="font-bold text-blue-700 inline-block mt-0.5">{Number(item.sellPrice).toFixed(2)} د.ل</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans">الصلاحية</span>
                        <span className="font-bold text-slate-700 inline-block mt-0.5">{item.expiryDate || '—'}</span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => { setSelectedCapsuleProduct(item); setIsCapsuleModalOpen(true); }}
                        className="flex-1 h-11 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Pill className="w-4 h-4 text-emerald-600" />
                        <span>كبسولة سريرية</span>
                      </button>
                      <button
                        onClick={() => openAdjust(item)}
                        className="flex-1 h-11 bg-slate-100 hover:bg-cyan-50 hover:text-cyan-800 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Edit3 className="w-4 h-4 text-slate-600" />
                        <span>تسوية الرصيد</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
          )}

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 no-print">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابقة</span>
            </button>
            <span className="font-mono">صفحة {page} من {totalPages || 1}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl transition-all cursor-pointer"
            >
              <span>التالية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </PrintReportLayout>

      {/* Adjust Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-600" />
                  تسوية رصيد ({adjustingProduct.name})
                </h3>
              </div>
              <button onClick={() => setAdjustingProduct(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveAdjust} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الرصيد الفعلي الجديد على الرف *</label>
                <input
                  type="number"
                  required
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">حد الأمان الأدنى (Min)</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">حد الأمان الأقصى (Max)</label>
                  <input
                    type="number"
                    value={maxStock}
                    onChange={(e) => setMaxStock(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'تأكيد وحفظ التسوية'}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="w-full h-11 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clinical Capsule & Employee Training Modal */}
      <ClinicalCapsuleModal
        isOpen={isCapsuleModalOpen}
        onClose={() => setIsCapsuleModalOpen(false)}
        initialProduct={selectedCapsuleProduct}
        productsList={products}
      />
    </div>
  );
}
