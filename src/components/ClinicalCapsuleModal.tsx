'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Loader2,
  Dices,
  ExternalLink,
  BookOpen,
  Zap,
  RefreshCw,
  Globe2,
  Camera
} from 'lucide-react';
import { generateClinicalCapsule, DEFAULT_CLINICAL_PRODUCTS, ClinicalCapsuleData } from '@/lib/clinicalKnowledge';
import BarcodeScannerModal from './BarcodeScannerModal';
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
  const [internalProducts, setInternalProducts] = useState<any[]>(
    productsList.length > 0 ? productsList : DEFAULT_CLINICAL_PRODUCTS
  );
  const [selectedProduct, setSelectedProduct] = useState<any>(
    initialProduct || (productsList.length > 0 ? productsList[0] : DEFAULT_CLINICAL_PRODUCTS[0])
  );
  const [activeTab, setActiveTab] = useState<'smart' | 'chronic' | 'slow' | 'expiry' | 'top'>('smart');
  const [search, setSearch] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [totalDbCount, setTotalDbCount] = useState<number>(0);

  // Generated Capsule Data
  const [capsuleData, setCapsuleData] = useState<ClinicalCapsuleData | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isLiveFetching, setIsLiveFetching] = useState(false);
  const [liveSourceBadge, setLiveSourceBadge] = useState<string>('OpenFDA & DrugBank');

  // Target Audience
  const [targetType, setTargetType] = useState<'all' | 'department' | 'selected'>('all');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  // Sending State
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ total: number; sent: number; failed: number; noPhone: number } | null>(null);

  // جلب كامل أصناف الصيدلية من قاعدة البيانات السحابية بدون حصر بـ 200 صنف
  useEffect(() => {
    if (productsList && productsList.length > 0) {
      setInternalProducts(productsList);
      setTotalDbCount(productsList.length);
    } else {
      fetch('/api/pharmacy/inventory?pageSize=5000')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.products) && data.products.length > 0) {
            setInternalProducts(data.products);
            setTotalDbCount(data.totalCount || data.products.length);
          } else {
            setInternalProducts(DEFAULT_CLINICAL_PRODUCTS);
            setTotalDbCount(DEFAULT_CLINICAL_PRODUCTS.length);
          }
        })
        .catch(() => {
          setInternalProducts(DEFAULT_CLINICAL_PRODUCTS);
          setTotalDbCount(DEFAULT_CLINICAL_PRODUCTS.length);
        });
    }
  }, [productsList, isOpen]);

  // بحث ديناميكي مباشر في قاعدة البيانات بالاسم التجاري أو التركيبة الكيميائية
  useEffect(() => {
    if (!search || search.trim().length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/pharmacy/inventory?search=${encodeURIComponent(search.trim())}&pageSize=300`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.products) && data.products.length > 0) {
            // دمج النتائج الجديدة مع منع التكرار
            setInternalProducts((prev) => {
              const map = new Map();
              prev.forEach((p) => map.set(p.id || p.productCode || p.name, p));
              data.products.forEach((p: any) => map.set(p.id || p.productCode || p.name, p));
              return Array.from(map.values());
            });
            if (data.totalCount) setTotalDbCount(data.totalCount);
          }
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (initialProduct) {
      setSelectedProduct(initialProduct);
    } else if (!selectedProduct && internalProducts.length > 0) {
      setSelectedProduct(internalProducts[0]);
    }
  }, [initialProduct, internalProducts, selectedProduct]);

  // Real-time live online data fetcher
  const triggerLiveFetch = useCallback((prod: any) => {
    if (!prod) return;

    // 1. Instant base expert generation
    const base = generateClinicalCapsule({
      name: prod.name || prod.productName,
      scientificName: prod.scientificName,
      dosageForm: prod.dosageForm,
      category: prod.category
    });
    setCapsuleData(base);
    setCustomMessage(base.fullMessageText);
    setSendResult(null);

    // 2. Real-time Live Web Query (OpenFDA / PubChem / DrugBank)
    setIsLiveFetching(true);
    fetch('/api/pharmacy/clinical-capsule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate',
        product: prod,
        live: true
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.capsule) {
          setCapsuleData(data.capsule);
          setCustomMessage(data.capsule.fullMessageText);
          if (data.capsule.liveInfo?.source) {
            setLiveSourceBadge(data.capsule.liveInfo.source);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLiveFetching(false);
      });
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      triggerLiveFetch(selectedProduct);
    }
  }, [selectedProduct, triggerLiveFetch]);

  useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  // Filter products by active tab & search (supports Chemical Formula, Active Ingredient, Brand, Barcode, Code)
  const filteredProducts = useMemo(() => {
    const pool = internalProducts.length > 0 ? internalProducts : DEFAULT_CLINICAL_PRODUCTS;
    const term = search.trim().toLowerCase();

    return pool.filter((p: any) => {
      const name = (p.name || p.productName || '').toLowerCase();
      const sci = (p.scientificName || p.activeIngredient || '').toLowerCase();
      const code = (p.code || p.productCode || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();

      const matchesSearch = !term ||
        name.includes(term) ||
        sci.includes(term) ||
        code.includes(term) ||
        barcode.includes(term);

      if (!matchesSearch) return false;

      if (activeTab === 'chronic') {
        return (
          name.includes('metformin') || name.includes('gluco') || name.includes('statin') ||
          name.includes('prazole') || name.includes('losec') || name.includes('lipitor') ||
          name.includes('amox') || name.includes('concor') || name.includes('aspirin') ||
          name.includes('ventolin') || name.includes('inhal') || name.includes('eltroxin') ||
          sci.includes('metformin') || sci.includes('statin') || sci.includes('bisoprolol')
        );
      }
      if (activeTab === 'slow') {
        return (Number(p.stockOnHand) || 0) >= 15;
      }
      if (activeTab === 'expiry') {
        return p.expiryDate || p.isNearExpiry;
      }
      if (activeTab === 'top') {
        return (Number(p.sellPrice) || 0) > 0;
      }
      return true; // smart
    });
  }, [internalProducts, activeTab, search]);

  // 🎲 زر الاختيار العشوائي الذكي حسب الطريقة المختارة
  const handleRandomPick = useCallback(() => {
    const pool = filteredProducts.length > 0 ? filteredProducts : internalProducts;
    if (pool.length === 0) return;

    setIsRolling(true);
    let counter = 0;
    const interval = setInterval(() => {
      const rand = pool[Math.floor(Math.random() * pool.length)];
      setSelectedProduct(rand);
      counter++;
      if (counter >= 6) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 60);
  }, [filteredProducts, internalProducts]);

  // 📷 استجابة قراءة الباركود من كاميرا الهاتف
  const handleBarcodeScanned = useCallback((scannedCode: string) => {
    const clean = scannedCode.trim().toLowerCase();
    const matched = internalProducts.find((p: any) =>
      (p.barcode && p.barcode.toLowerCase() === clean) ||
      (p.code && p.code.toLowerCase() === clean) ||
      (p.productCode && p.productCode.toLowerCase() === clean) ||
      (p.name && p.name.toLowerCase().includes(clean)) ||
      (p.scientificName && p.scientificName.toLowerCase().includes(clean))
    );

    if (matched) {
      setSelectedProduct(matched);
    } else {
      setSelectedProduct({
        id: `scan-${Date.now()}`,
        name: scannedCode,
        scientificName: scannedCode,
        dosageForm: 'General'
      });
    }
  }, [internalProducts]);

  if (!isOpen) return null;

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

  const getTabLabel = () => {
    if (activeTab === 'chronic') return 'الأمراض المزمنة';
    if (activeTab === 'slow') return 'الأصناف ذات الرصيد المرتفع';
    if (activeTab === 'expiry') return 'الأصناف قريبة الانتهاء';
    return 'الأصناف المقترحة سريرياً';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-dubai" dir="rtl">
      <div className="bg-white w-full max-w-5xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>الكبسولة الدوائية والتدريب السريري الذكي للموظفين</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">جلب حي لحظي ⚡</span>
              </h3>
              <p className="text-xs text-emerald-200 font-medium">جلب حي ومباشر من OpenFDA / DailyMed ومطابقة معايير DrugBank السريرية</p>
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
                تم تثقيف الفريق عن الصنف: <b>{selectedProduct?.name}</b> بناءً على أحدث البيانات الصيدلانية الحية
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
              {/* Left Column: Product Selection & Random Pick */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-900">
                       1. اختر الدواء أو ابحث بالتركيبة الكيميائية:
                    </label>
                    <span className="text-[10px] text-emerald-800 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                      {filteredProducts.length} صنف {totalDbCount > filteredProducts.length ? `(من إجمالي ${totalDbCount})` : 'متاح'}
                    </span>
                  </div>

                  {/* Smart Category Tabs */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-xl border border-slate-200 text-[11px] font-bold">
                    <button
                      onClick={() => setActiveTab('smart')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'smart' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      🎯 مقترح سريرياً
                    </button>
                    <button
                      onClick={() => setActiveTab('chronic')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'chronic' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      🩺 أمراض مزمنة
                    </button>
                    <button
                      onClick={() => setActiveTab('slow')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'slow' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      📦 رصيد مرتفع
                    </button>
                  </div>

                  {/* Action Buttons: Camera Barcode Scanner & Random Pick */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBarcodeScannerOpen(true)}
                      className="h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer transform active:scale-98"
                      title="مسح باركود الدواء بكاميرا الهاتف"
                    >
                      <Camera className="w-4 h-4 text-emerald-100" />
                      <span>📷 مسح باركود</span>
                    </button>

                    {/* 🎲 زر الاختيار العشوائي الذكي */}
                    <button
                      type="button"
                      onClick={handleRandomPick}
                      disabled={isRolling}
                      className="h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer transform active:scale-98"
                      title={`اختيار دواء عشوائي من فئة: ${getTabLabel()}`}
                    >
                      <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
                      <span>🎲 دواء عشوائي</span>
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث بالتركيبة الكيميائية (Active Ingredient) أو الاسم التجاري..."
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg pr-8 pl-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Products List */}
                  <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 text-xs">
                    {filteredProducts.map((p) => {
                      const isSelected = selectedProduct && (
                        (selectedProduct.id && p.id && selectedProduct.id === p.id) ||
                        (selectedProduct.code && p.code && selectedProduct.code === p.code) ||
                        (selectedProduct.name === p.name)
                      );
                      return (
                        <div
                          key={p.id || p.code || p.name}
                          onClick={() => setSelectedProduct(p)}
                          className={`p-2.5 flex items-center justify-between hover:bg-emerald-50/60 cursor-pointer transition-all ${
                            isSelected ? 'bg-emerald-50 border-r-4 border-r-emerald-600 font-bold' : ''
                          }`}
                        >
                          <div>
                            <strong className="text-slate-900 block font-bold text-xs">{p.name}</strong>
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
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        targetType === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      جميع الموظفين ({employees.length})
                    </button>
                    <button
                      onClick={() => setTargetType('department')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        targetType === 'department' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
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
                {/* Editor with Live Sync Indicator & DrugBank Direct Link */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <label className="text-xs font-black text-slate-900">
                        3. المحتوى السريري المحدث لحظياً:
                      </label>
                      {isLiveFetching ? (
                        <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-bold animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>جاري الفحص المباشر عبر OpenFDA...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-black">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                          <span>تم التحقق الحي: {liveSourceBadge} 🟢</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => triggerLiveFetch(selectedProduct)}
                        disabled={isLiveFetching}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="إعادة الاستعلام الحي المباشر من المراجع الدوائية"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLiveFetching ? 'animate-spin' : ''}`} />
                        <span>تحديث حي</span>
                      </button>

                      {/* 🔗 زر DrugBank المباشر */}
                      {capsuleData?.drugBankUrl && (
                        <a
                          href={capsuleData.drugBankUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-black flex items-center gap-1.5 transition-all shadow-xs"
                          title="فتح المرجع الدوائي المباشر في قاعدة بيانات DrugBank العالمية"
                        >
                          <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>DrugBank</span>
                          <ExternalLink className="w-3 h-3 text-blue-500" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 📚 شريط المراجع العالمية والإقليمية المعتمدة (Drugs.com, Medscape, DailyMed, Altibbi, WebTeb, SFDA) */}
                  {selectedProduct && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <div className="text-[10px] font-black text-slate-500 mb-1.5 flex items-center gap-1">
                        <Globe2 className="w-3 h-3 text-emerald-600" />
                        <span>مراجع استخراج التركيبة والتحقق السريري المعتمدة:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <a
                          href={`https://www.drugs.com/search.php?searchterm=${encodeURIComponent(selectedProduct.scientificName || selectedProduct.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>💊 Drugs.com</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <a
                          href={`https://reference.medscape.com/search?q=${encodeURIComponent(selectedProduct.scientificName || selectedProduct.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🩺 Medscape</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <a
                          href={`https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(selectedProduct.scientificName || selectedProduct.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🏛️ DailyMed (NIH)</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <a
                          href={`https://altibbi.com/الادوية/ابحث-عن-دواء?query=${encodeURIComponent(selectedProduct.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-green-50 hover:text-green-700 hover:border-green-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🌿 الطبي (Altibbi)</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <a
                          href={`https://www.webteb.com/search?q=${encodeURIComponent(selectedProduct.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🔍 ويب طب</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(selectedProduct.name)}+site%3Adrugeye.org+OR+site%3Aegyptiandrugindex.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>📋 دليل الأدوية المصري</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={8}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed font-bold text-slate-800 focus:outline-none focus:border-emerald-600 resize-none shadow-2xs font-mono"
                  />
                </div>

                {/* WhatsApp Live Preview */}
                <div className="bg-[#eef2f5] p-4 rounded-2xl border border-slate-300 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 block flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    معاينة حية لرسالة التدريب على واتساب الموظف:
                  </span>
                  <div className="bg-[#d9fdd3] p-3.5 rounded-2xl rounded-tr-xs shadow-xs border border-emerald-200/60 max-h-44 overflow-y-auto text-xs whitespace-pre-wrap leading-relaxed text-slate-900 font-medium font-dubai">
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

      {/* 📷 نافذة قارئ الباركود بكاميرا الهاتف */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        title="مسح باركود الدواء بكاميرا الهاتف"
      />
    </div>
  );
}
