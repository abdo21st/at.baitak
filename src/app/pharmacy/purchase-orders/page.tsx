'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Printer,
  Share2,
  Trash2,
  Search,
  FileText
} from 'lucide-react';

import PrintReportLayout from '@/components/PrintReportLayout';

export default function PharmacyPurchaseOrdersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNotes, setOrderNotes] = useState('طلبية أدوية ونواقص دورية');

  const [items, setItems] = useState<any[]>([]);
  const [searchProd, setSearchProd] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/pharmacy/suppliers');
      const data = await res.json();
      if (data.success) setSuppliers(data.suppliers);
    } catch (err) {}
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSearch = async (term: string) => {
    setSearchProd(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    const res = await fetch(`/api/pharmacy/inventory?search=${encodeURIComponent(term)}&pageSize=8`);
    const data = await res.json();
    if (data.success) setSearchResults(data.products);
  };

  const addItemToOrder = (p: any) => {
    if (items.some((i) => i.productId === p.id)) return;
    setItems((prev) => [
      ...prev,
      {
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        currentStock: p.stockOnHand,
        requestedQty: p.minStockLevel > 0 ? p.minStockLevel * 2 : 10,
        estimatedUnitCost: Number(p.costPrice) || 10,
        estimatedTotal: (p.minStockLevel > 0 ? p.minStockLevel * 2 : 10) * (Number(p.costPrice) || 10)
      }
    ]);
    setSearchProd('');
    setSearchResults([]);
  };

  const updateItemQty = (productId: number, qty: number) => {
    if (qty <= 0) return;
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, requestedQty: qty, estimatedTotal: qty * item.estimatedUnitCost }
          : item
      )
    );
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const totalEstimated = items.reduce((sum, i) => sum + i.estimatedTotal, 0);

  const generateWhatsAppPOText = () => {
    let text = `*أمر شراء أدوية رسمي* 📄🌿\n`;
    text += `إلى: *${selectedSupplier || 'الشركة الموردة'}*\n`;
    text += `التاريخ: ${orderDate}\n`;
    text += `عدد الأصناف: ${items.length}\n`;
    text += `------------------------------------\n`;
    items.forEach((item, idx) => {
      text += `${idx + 1}. *${item.productName}* (كود: ${item.productCode})\n`;
      text += `   الكمية المطلوبة: [ *${item.requestedQty}* علبة ]\n`;
    });
    text += `------------------------------------\n`;
    text += `الملاحظات: ${orderNotes}\n`;
    text += `الرجاء تأكيد التوريد مع الشكر.`;
    return encodeURIComponent(text);
  };

  return (
    <div className="space-y-6 font-cairo">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            أوامر وطلبيات الشراء والتوريد
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تجهيز وطباعة ومشاركة طلبيات الشراء للشركات والمندوبين
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <>
              <a
                href={`https://wa.me/?text=${generateWhatsAppPOText()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>إرسال واتساب</span>
              </a>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة أمر الشراء (A4)</span>
              </button>
            </>
          )}

          <Link
            href="/pharmacy/shortages"
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all"
          >
            استيراد من النواقص
          </Link>
        </div>
      </div>

      {/* PO Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 no-print">
        <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          بيانات أمر الشراء
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">الشركة / المورد الموجه إليه الطلب</label>
            <input
              type="text"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              placeholder="اسم الشركة أو المندوب"
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">تاريخ أمر الشراء</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-mono font-bold text-center text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">ملاحظات الطلبية</label>
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Product Search */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <label className="block text-slate-800 font-bold text-xs">إضافة أدوية إلى أمر الشراء:</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            <input
              type="text"
              value={searchProd}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الكود لإضافة الدواء للطلبية..."
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 text-xs font-bold text-slate-900"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl max-h-40 overflow-y-auto divide-y divide-slate-100 shadow-xl">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addItemToOrder(p)}
                  className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-900">{p.name}</span>
                  <span className="font-mono text-emerald-700 font-bold">التكلفة: {Number(p.costPrice).toFixed(2)} د.ل</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Printable Document Container */}
      <PrintReportLayout
        systemName="منظومة إدارة المشتريات والمخزون الصيدلاني 🌿"
        reportTitle="أمر شراء وتوريد أدوية ومستلزمات صيدلانية"
        reportSubtitle={`رقم الأمر: PO-${orderDate.replace(/-/g, '')} | الملاحظات: ${orderNotes}`}
        metaDetails={[
          { label: 'الشركة / المورد', value: selectedSupplier || 'مورد عام / غير محدد' },
          { label: 'تاريخ الطلب', value: orderDate },
          { label: 'عدد الأصناف', value: items.length }
        ]}
        summaryCards={[
          { label: 'إجمالي الأصناف المطلوبة', value: items.length, unit: 'صنف' },
          { label: 'إجمالي القيمة التقديرية', value: totalEstimated.toFixed(2), unit: 'د.ل' }
        ]}
      >
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 print:border-none print:p-0">
          {items.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-bold">
              لم تقم بإضافة أي أصناف للطلبية بعد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold">
                    <th className="py-3 pr-3 text-center w-10">#</th>
                    <th className="py-3 pr-2">اسم الدواء والمواصفات</th>
                    <th className="py-3 text-center">الكود</th>
                    <th className="py-3 text-center">الكمية المطلوبة</th>
                    <th className="py-3 text-center">سعر التكلفة المقدر</th>
                    <th className="py-3 text-center">الإجمالي</th>
                    <th className="py-3 text-left pl-3 no-print">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="py-3 pr-3 font-mono font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td className="py-3 pr-2 font-bold text-slate-900">{item.productName}</td>
                      <td className="py-3 text-center font-mono text-slate-500">{item.productCode}</td>
                      <td className="py-3 text-center">
                        <span className="hidden print:inline-block font-mono font-black text-sm">
                          {item.requestedQty}
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={item.requestedQty}
                          onChange={(e) => updateItemQty(item.productId, parseInt(e.target.value, 10) || 1)}
                          className="w-16 h-8 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono font-black text-slate-900 no-print"
                        />
                      </td>
                      <td className="py-3 text-center font-mono text-slate-600">{item.estimatedUnitCost.toFixed(2)} د.ل</td>
                      <td className="py-3 text-center font-mono font-bold text-emerald-700">{item.estimatedTotal.toFixed(2)} د.ل</td>
                      <td className="py-3 text-left pl-3 no-print">
                        <button onClick={() => removeItem(item.productId)} className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PrintReportLayout>
    </div>
  );
}
