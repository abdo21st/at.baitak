'use client';

import React, { useState, useEffect } from 'react';
import {
  Pill,
  Send,
  Sparkles,
  Search,
  CheckCircle2,
  X,
  Share2,
  Smartphone,
  Check,
  Loader2
} from 'lucide-react';
import { generateClinicalCapsule } from '@/lib/clinicalKnowledge';
import { User, Department } from '@/lib/types';

interface ClinicalCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: any;
  productsList?: any[];
  employees?: User[];
  departments?: Department[];
}

export default function ClinicalCapsuleModal({
  isOpen,
  onClose,
  initialProduct,
  productsList = [],
  employees = [],
  departments = []
}: ClinicalCapsuleModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<any>(initialProduct || null);
  const [activeTab, setActiveTab] = useState<'smart' | 'chronic' | 'slow' | 'expiry' | 'top'>('smart');
  const [search, setSearch] = useState('');

  // Generated Capsule Data
  const [customMessage, setCustomMessage] = useState('');

  // Target Audience
  const [targetType, setTargetType] = useState<'all' | 'department' | 'selected'>('all');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  // Sending State
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ total: number; sent: number; failed: number; noPhone: number } | null>(null);

  useEffect(() => {
    if (initialProduct) {
      setSelectedProduct(initialProduct);
    } else if (productsList.length > 0) {
      setSelectedProduct((prev: any) => prev || productsList[0]);
    }
  }, [initialProduct, productsList]);

  useEffect(() => {
    if (selectedProduct) {
      const generated = generateClinicalCapsule({
        name: selectedProduct.name || selectedProduct.productName,
        scientificName: selectedProduct.scientificName,
        dosageForm: selectedProduct.dosageForm,
        category: selectedProduct.category
      });
      setCustomMessage(generated.fullMessageText);
      setSendResult(null);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  if (!isOpen) return null;

  // Filter products by category tabs
  const filteredProducts = productsList.filter((p) => {
    const name = (p.name || '').toLowerCase();
    const sci = (p.scientificName || '').toLowerCase();
    const matchesSearch = !search.trim() || name.includes(search.toLowerCase()) || sci.includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'chronic') {
      return name.includes('metformin') || name.includes('gluco') || name.includes('statin') || name.includes('prazole') || name.includes('losec') || name.includes('lipitor') || name.includes('amox') || name.includes('concor') || name.includes('aspirin');
    }
    if (activeTab === 'slow') {
      return (Number(p.stockOnHand) || 0) > 10;
    }
    if (activeTab === 'expiry') {
      return p.expiryDate || p.isNearExpiry;
    }
    if (activeTab === 'top') {
      return (Number(p.sellPrice) || 0) > 0;
    }
    return true; // smart: show all
  });

  const getRecipientCount = () => {
    if (targetType === 'all') return employees.length;
    if (targetType === 'department') {
      return employees.filter((e) => e.departments?.some((d) => d.id === selectedDeptId)).length;
    }
    return selectedEmpIds.length;
  };

  const handleBroadcastCapsule = async () => {
    if (!customMessage.trim()) return;

    try {
      setIsSending(true);
      setSendResult(null);

      const res = await fetch('/api/pharmacy/clinical-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          product: selectedProduct,
          message: customMessage,
          targetType,
          departmentId: targetType === 'department' ? selectedDeptId : undefined,
          employeeIds: targetType === 'selected' ? selectedEmpIds : undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setSendResult(data.summary);
      } else {
        alert(data.error || 'فشل إرسال الكبسولة الدوائية');
      }
    } catch (e: any) {
      alert(e.message || 'فشل الاتصال بالخادم');
    } finally {
      setIsSending(false);
    }
  };

  const previewFormatted = customMessage
    .replace(/{name}/g, 'فريق صيدلية بيتك')
    .replace(/{code}/g, 'EMP-101')
    .replace(/{appUrl}/g, 'https://at.ordermt.ly');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-dubai" dir="rtl">
      <div className="bg-white w-full max-w-5xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>الكبسولة الدوائية والتدريب السريري الذكي للموظفين</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">ذكاء اصطناعي 🤖</span>
              </h3>
              <p className="text-xs text-emerald-200 font-medium">توليد التداخلات، الأخطاء الشائعة، والنصائح السلوكية وإرسالها دورياً للواتساب</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {sendResult ? (
            /* Results Screen */
            <div className="p-8 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-emerald-950">تم إرسال الكبسولة الدوائية بنجاح لجميع الموظفين! 💊✨</h4>
              <p className="text-xs text-emerald-800 font-medium">
                تم تثقيف الفريق عن الصنف: <b>{selectedProduct?.name}</b> لتقديم أفضل مشورة للمرضى
              </p>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-white p-3 rounded-2xl border border-emerald-200">
                  <span className="text-[11px] text-slate-500 block font-bold">تم الإرسال</span>
                  <strong className="text-xl font-black text-emerald-600 font-mono">{sendResult.sent}</strong>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-amber-200">
                  <span className="text-[11px] text-slate-500 block font-bold">بدون هاتف</span>
                  <strong className="text-xl font-black text-amber-600 font-mono">{sendResult.noPhone}</strong>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-rose-200">
                  <span className="text-[11px] text-slate-500 block font-bold">فشل الإرسال</span>
                  <strong className="text-xl font-black text-rose-600 font-mono">{sendResult.failed}</strong>
                </div>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => setSendResult(null)}
                  className="px-5 h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                >
                  اختيار دواء آخر
                </button>
                <button
                  onClick={onClose}
                  className="px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Product Selection & Smart Categories */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-black text-slate-900 flex items-center justify-between">
                    <span>1. اختر الدواء من قاعدة البيانات المحلية:</span>
                    <span className="text-[10px] text-slate-400 font-mono">{filteredProducts.length} صنف</span>
                  </label>

                  {/* Smart Category Tabs (الطريقة 4: التوجيه الذكي) */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-xl border border-slate-200 text-[11px] font-bold">
                    <button
                      onClick={() => setActiveTab('smart')}
                      className={`py-1 rounded-lg transition-all ${activeTab === 'smart' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      🎯 مقترح سريرياً
                    </button>
                    <button
                      onClick={() => setActiveTab('chronic')}
                      className={`py-1 rounded-lg transition-all ${activeTab === 'chronic' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      🩺 أمراض مزمنة
                    </button>
                    <button
                      onClick={() => setActiveTab('slow')}
                      className={`py-1 rounded-lg transition-all ${activeTab === 'slow' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      📦 رصيد مرتفع
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث بالاسم التجاري أو العلمي..."
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg pr-8 pl-2 text-xs font-bold text-slate-800"
                    />
                  </div>

                  {/* Products List */}
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 text-xs">
                    {filteredProducts.map((p) => {
                      const isSelected = selectedProduct && (selectedProduct.id === p.id || selectedProduct.code === p.code || selectedProduct.name === p.name);
                      return (
                        <div
                          key={p.id || p.code || p.name}
                          onClick={() => setSelectedProduct(p)}
                          className={`p-2.5 flex items-center justify-between hover:bg-emerald-50/50 cursor-pointer transition-all ${
                            isSelected ? 'bg-emerald-50 border-r-4 border-r-emerald-600' : ''
                          }`}
                        >
                          <div>
                            <strong className="text-slate-900 block font-bold">{p.name}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.scientificName || p.category || `كود: ${p.code || p.id}`}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Target Audience */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-black text-slate-900 flex items-center justify-between">
                    <span>2. المستلمون (فريق الصيدلية):</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">
                      {getRecipientCount()} موظف
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      onClick={() => setTargetType('all')}
                      className={`py-1.5 rounded-lg transition-all ${
                        targetType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      جميع الموظفين ({employees.length})
                    </button>
                    <button
                      onClick={() => setTargetType('department')}
                      className={`py-1.5 rounded-lg transition-all ${
                        targetType === 'department' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      حسب القسم
                    </button>
                  </div>

                  {targetType === 'department' && (
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({employees.filter((e) => e.departments?.some((dep) => dep.id === d.id)).length} موظف)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Right Column: AI Generated Capsule & Editor */}
              <div className="lg:col-span-7 space-y-4">
                {/* Editor */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>3. المحتوى الدوائي المولد بالذكاء الاصطناعي (قابل للتعديل):</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                      جاهز للواتساب 🟢
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed font-bold text-slate-800 focus:outline-none focus:border-emerald-600 resize-none shadow-2xs"
                  />
                </div>

                {/* WhatsApp Live Preview */}
                <div className="bg-[#eef2f5] p-4 rounded-2xl border border-slate-300 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 block flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    معاينة حية لرسالة التدريب على واتساب الموظف:
                  </span>
                  <div className="bg-[#d9fdd3] p-3.5 rounded-2xl rounded-tr-xs shadow-xs border border-emerald-200/60 max-h-48 overflow-y-auto text-xs whitespace-pre-wrap leading-relaxed text-slate-900 font-medium font-dubai">
                    {previewFormatted}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(previewFormatted)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Share2 className="w-4 h-4 text-slate-600" />
                    <span>مشاركة واتساب ويب</span>
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={onClose}
                      disabled={isSending}
                      className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleBroadcastCapsule}
                      disabled={isSending || !customMessage.trim()}
                      className="px-6 h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري الإرسال للموظفين...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>إرسال الكبسولة الدوائية ({getRecipientCount()})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
