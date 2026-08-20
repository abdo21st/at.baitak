import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Camera,
  FileText,
  AlertTriangle,
  Image as ImageIcon,
  Save
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
  // useRef لضمان أن handleBarcodeScanned يقرأ آخر نسخة من المنتجات دائماً (حل مشكلة stale closure)
  const internalProductsRef = useRef<any[]>(productsList.length > 0 ? productsList : DEFAULT_CLINICAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<any>(
    initialProduct || (productsList.length > 0 ? productsList[0] : DEFAULT_CLINICAL_PRODUCTS[0])
  );
  const [activeTab, setActiveTab] = useState<'smart' | 'chronic' | 'slow' | 'expiry' | 'top'>('smart');
  const [search, setSearch] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [barcodeNotFoundNotice, setBarcodeNotFoundNotice] = useState<string | null>(null);
  const [totalDbCount, setTotalDbCount] = useState<number>(0);

  // Leaflet Photo & Manual Data Enrichment
  const leafletCameraInputRef = useRef<HTMLInputElement>(null);
  const [leafletImage, setLeafletImage] = useState<string | null>(null);
  const [isUploadingLeaflet, setIsUploadingLeaflet] = useState(false);
  const [manualIngredient, setManualIngredient] = useState('');
  const [isSavingLeafletData, setIsSavingLeafletData] = useState(false);
  const [leafletSaveSuccess, setLeafletSaveSuccess] = useState(false);

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
      internalProductsRef.current = productsList;
      setTotalDbCount(productsList.length);
    } else {
      fetch('/api/pharmacy/inventory?pageSize=5000')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.products) && data.products.length > 0) {
            setInternalProducts(data.products);
            internalProductsRef.current = data.products;
            setTotalDbCount(data.totalCount || data.products.length);
          } else {
            setInternalProducts(DEFAULT_CLINICAL_PRODUCTS);
            internalProductsRef.current = DEFAULT_CLINICAL_PRODUCTS;
            setTotalDbCount(DEFAULT_CLINICAL_PRODUCTS.length);
          }
        })
        .catch(() => {
          setInternalProducts(DEFAULT_CLINICAL_PRODUCTS);
          internalProductsRef.current = DEFAULT_CLINICAL_PRODUCTS;
          setTotalDbCount(DEFAULT_CLINICAL_PRODUCTS.length);
        });
    }
  }, [productsList, isOpen]);

  // مزامنة الـ ref مع آخر نسخة من internalProducts (لحل stale closure في handleBarcodeScanned)
  useEffect(() => {
    internalProductsRef.current = internalProducts;
  }, [internalProducts]);

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

    // توحيد أسماء الحقول من كلا مصدري البيانات (قاعدة البيانات السحابية والقاموس المحلي)
    const normalizedProduct = {
      id: prod.id,
      name: prod.name || prod.productName || prod.brandName || '',
      scientificName: prod.scientificName || prod.activeIngredient || prod.genericName || '',
      activeIngredient: prod.activeIngredient || prod.scientificName || '',
      dosageForm: prod.dosageForm || prod.form || '',
      category: prod.category || prod.subCategory || '',
      code: prod.code || prod.productCode || prod.barcode || '',
      stockOnHand: prod.stockOnHand,
      sellPrice: prod.sellPrice,
    };

    // 1. Instant base expert generation
    const base = generateClinicalCapsule(normalizedProduct);
    setCapsuleData(base);
    setCustomMessage(base.fullMessageText);
    setSendResult(null);

    // 2. Real-time Live Web Query (OpenFDA / Drugs.com / Pharco / DrugBank)
    setIsLiveFetching(true);
    fetch('/api/pharmacy/clinical-capsule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate',
        product: normalizedProduct,
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

  // Helper to check if a product matches any of its multiple barcodes or text search
  const checkProductMatchesBarcode = useCallback((p: any, query: string): boolean => {
    if (!query || !p) return false;
    const rawQ = query.trim().toLowerCase();
    if (!rawQ) return false;

    // تمييز ما إذا كان الإدخال باركود رقمي ممسوح (4 إلى 16 رقماً)
    const isNumericScan = /^\d{4,16}$/.test(rawQ);
    const qNoZero = rawQ.replace(/^0+/, '');

    // جمع كافة الباركودات المسجلة للصنف
    const rawBarcodes = `${p.barcodes || ''},${p.barcode || ''},${p.code || ''},${p.productCode || ''}`;
    const tokens = rawBarcodes
      .split(/[\s,;|/]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    for (const token of tokens) {
      const tokenNoZero = token.replace(/^0+/, '');
      // 1. تطابق تام مع الباركود أو الكود
      if (token === rawQ) return true;
      // 2. تطابق مع تجاهل الأصفار البادئة
      if (tokenNoZero && tokenNoZero === qNoZero) return true;
      // 3. إذا كان كلاهما باركود دولي كامل (8 أرقام فأكثر) وتطابق
      if (token.length >= 8 && rawQ.length >= 8 && (token === rawQ || tokenNoZero === qNoZero)) return true;
    }

    // إذا كان الإدخال باركود رقمي بحت من الماسح/الكاميرا، نمنع المطابقة النصية الجزئية منعاً للخلط بين الأصناف
    if (isNumericScan) {
      return false;
    }

    // البحث النصي العادي (الاسم التجاري أو التركيبة العلمية أو الفئة)
    const name = (p.name || p.productName || '').toLowerCase();
    const sci = (p.scientificName || p.activeIngredient || '').toLowerCase();
    const cat = (p.category || p.subCategory || '').toLowerCase();
    if (name.includes(rawQ) || sci.includes(rawQ) || cat.includes(rawQ)) return true;

    return false;
  }, []);

  // Filter products by active tab & search (supports Multi-Barcodes, Chemical Formula, Active Ingredient, Brand)
  const filteredProducts = useMemo(() => {
    const pool = internalProducts.length > 0 ? internalProducts : DEFAULT_CLINICAL_PRODUCTS;
    const term = search.trim().toLowerCase();

    return pool.filter((p: any) => {
      if (!term) {
        if (activeTab === 'chronic') {
          const name = (p.name || p.productName || '').toLowerCase();
          const sci = (p.scientificName || p.activeIngredient || '').toLowerCase();
          return (
            name.includes('metformin') || name.includes('gluco') || name.includes('statin') ||
            name.includes('prazole') || name.includes('losec') || name.includes('lipitor') ||
            name.includes('amox') || name.includes('concor') || name.includes('aspirin') ||
            name.includes('ventolin') || name.includes('inhal') || name.includes('eltroxin') ||
            sci.includes('metformin') || sci.includes('statin') || sci.includes('bisoprolol')
          );
        }
        if (activeTab === 'slow') return (Number(p.stockOnHand) || 0) >= 15;
        if (activeTab === 'expiry') return p.expiryDate || p.isNearExpiry;
        if (activeTab === 'top') return (Number(p.sellPrice) || 0) > 0;
        return true;
      }

      return checkProductMatchesBarcode(p, term);
    });
  }, [internalProducts, activeTab, search, checkProductMatchesBarcode]);

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

  // 📷 استجابة قراءة الباركود من كاميرا الهاتف (دعم الباركودات المتعددة والبحث السحابي الفوري)
  const handleBarcodeScanned = useCallback(async (scannedCode: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;
    setBarcodeNotFoundNotice(null);
    setIsSearchingBarcode(true);
    // ملاحظة: BarcodeScannerModal يستدعي onClose() تلقائياً بعد onScanSuccess

    // 1. البحث المحلي أولاً — نستخدم ref لضمان رؤية أحدث نسخة من المنتجات
    const currentProducts = internalProductsRef.current;
    const matched = currentProducts.find((p: any) => checkProductMatchesBarcode(p, clean));
    if (matched) {
      const normalized = {
        ...matched,
        name: matched.name || matched.productName || '',
        scientificName: matched.scientificName || matched.activeIngredient || '',
        activeIngredient: matched.activeIngredient || matched.scientificName || '',
      };
      setSelectedProduct(normalized);
      setSearch(normalized.name);
      setIsSearchingBarcode(false);
      return;
    }

    // 2. البحث السحابي الدقيق بحقل الباركود تحديداً
    try {
      const noZero = clean.replace(/^0+/, '');
      const withZero = clean.length === 12 ? '0' + clean : '';
      const queries = [clean, noZero, withZero].filter(Boolean);

      let dbProduct: any = null;
      for (const q of queries) {
        const res = await fetch(`/api/pharmacy/inventory?search=${encodeURIComponent(q)}&pageSize=5`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.products) && data.products.length > 0) {
            const exactMatch = data.products.find((p: any) => checkProductMatchesBarcode(p, clean))
              || data.products[0];
            dbProduct = exactMatch;
            break;
          }
        }
      }

      if (dbProduct) {
        const normalized = {
          ...dbProduct,
          name: dbProduct.name || dbProduct.productName || '',
          scientificName: dbProduct.scientificName || dbProduct.activeIngredient || '',
          activeIngredient: dbProduct.activeIngredient || dbProduct.scientificName || '',
        };
        setInternalProducts((prev) => [normalized, ...prev.filter((x: any) => x.id !== normalized.id)]);
        setSelectedProduct(normalized);
        setSearch(normalized.name);
        setIsSearchingBarcode(false);
        return;
      }
    } catch (e) {
      console.error('Dynamic barcode search error:', e);
    }

    // 3. في حال لم يتم العثور على باركود الصنف في قاعدة البيانات:
    setIsSearchingBarcode(false);
    setSearch(clean);
    setBarcodeNotFoundNotice(clean);
  }, [checkProductMatchesBarcode]);

  // 📸 التقاط ورفع صورة نشرة المنتج
  const handleLeafletPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLeaflet(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success && data.file?.filePath) {
        setLeafletImage(data.file.filePath);
      } else {
        alert(data.error || 'فشل رفع صورة النشرة');
      }
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء رفع صورة النشرة');
    } finally {
      setIsUploadingLeaflet(false);
    }
  };

  // 💾 حفظ بيانات النشرة والمادة الفعالة في قاعدة البيانات السحابية
  const handleSaveLeafletData = async () => {
    if (!selectedProduct) return;
    try {
      setIsSavingLeafletData(true);
      const ingredient = manualIngredient.trim() || selectedProduct.scientificName || selectedProduct.name;

      const res = await fetch('/api/pharmacy/clinical-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandPattern: (selectedProduct.code || selectedProduct.name).toLowerCase(),
          brandName: selectedProduct.name,
          activeIngredients: ingredient,
          therapeuticClass: 'تم التوثيق عبر نشرة المنتج 📷',
          indications: customMessage,
          sourceReference: 'نشرة الدواء الموثقة بالكاميرا 📷',
          patientCounselingTip: 'تم التوثيق والتحقق بواسطة الصيدلي'
        })
      });

      const data = await res.json();
      if (data.success) {
        setLeafletSaveSuccess(true);
        setSelectedProduct({
          ...selectedProduct,
          scientificName: ingredient
        });
        setTimeout(() => setLeafletSaveSuccess(false), 3000);
      }
    } catch (e: any) {
      alert(e.message || 'فشل حفظ بيانات النشرة');
    } finally {
      setIsSavingLeafletData(false);
    }
  };

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

  const dynamicAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://at.baitak.mtapp.ly';

  const previewFormatted = customMessage
    .replace(/{name}/g, 'فريق صيدلية بيتك')
    .replace(/{code}/g, 'EMP-101')
    .replace(/{appUrl}/g, dynamicAppUrl);

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
            <div className="space-y-4">
              {/* 🔍 جاري البحث عن الباركود */}
              {isSearchingBarcode && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-xs text-emerald-950 font-bold shadow-sm animate-pulse">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                  <span>🔍 جاري التحقق من الباركود والبحث عن بيانات الصنف في قاعدة البيانات والمراجع السريرية...</span>
                </div>
              )}

              {/* ⚠️ تنبيه عند عدم توفر باركود الصنف في قاعدة البيانات */}
              {barcodeNotFoundNotice && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start justify-between gap-3 text-xs text-rose-950 font-bold shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/20">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <strong className="text-sm font-black text-rose-950 block">
                        ⚠️ لا يتوفر كود الصنف ({barcodeNotFoundNotice}) في قاعدة البيانات
                      </strong>
                      <p className="text-xs text-rose-800 font-medium leading-relaxed">
                        لم يتم العثور على أي صنف مطابق للباركود الممسوح في قاعدة بيانات الأدوية. يمكنك البحث عنه يدوياً بالاسم أو تصوير نشرة المنتج (Leaflet) لإضافته وتوثيق تركيبته.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeNotFoundNotice(null);
                        leafletCameraInputRef.current?.click();
                      }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer transform active:scale-98"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>📸 تصوير النشرة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcodeNotFoundNotice(null)}
                      className="w-8 h-8 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center justify-center transition-all cursor-pointer"
                      title="إغلاق التنبيه"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

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

                  {/* Action Buttons: Camera Barcode Scanner, Leaflet Camera & Random Pick */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsBarcodeScannerOpen(true)}
                      className="h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[11px] font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1 transition-all cursor-pointer transform active:scale-98"
                      title="مسح باركود الدواء بكاميرا الهاتف"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-100" />
                      <span>📷 باركود</span>
                    </button>

                    {/* 📸 زر تصوير نشرة المنتج */}
                    <button
                      type="button"
                      onClick={() => leafletCameraInputRef.current?.click()}
                      disabled={isUploadingLeaflet}
                      className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-black shadow-md shadow-blue-600/20 flex items-center justify-center gap-1 transition-all cursor-pointer transform active:scale-98"
                      title="تصوير نشرة أو عبوة الدواء لإضافتها للبيانات السحابية"
                    >
                      {isUploadingLeaflet ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-blue-100" />
                      )}
                      <span>📸 تصوير نشرة</span>
                    </button>

                    {/* 🎲 زر الاختيار العشوائي الذكي */}
                    <button
                      type="button"
                      onClick={handleRandomPick}
                      disabled={isRolling}
                      className="h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[11px] font-black shadow-md shadow-amber-500/20 flex items-center justify-center gap-1 transition-all cursor-pointer transform active:scale-98"
                      title={`اختيار دواء عشوائي من فئة: ${getTabLabel()}`}
                    >
                      <Dices className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
                      <span>🎲 عشوائي</span>
                    </button>

                    {/* Hidden Native Camera Input for Leaflet */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={leafletCameraInputRef}
                      onChange={handleLeafletPhotoUpload}
                      className="hidden"
                    />
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

                  {/* ⚠️ تنبيه عند عدم توفر معلومات سريرية معتمدة للصنف */}
                  {capsuleData && (!capsuleData.isInfoAvailable || customMessage.includes('لا تتوفر معلومات')) && (
                    <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950 font-bold shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <strong className="block font-black text-amber-950">⚠️ لا تتوفر معلومات سريرية حالياً لهذا الصنف</strong>
                          <span className="text-[11px] text-amber-800 font-medium">يرجى تصوير نشرة المنتج أو العبوة لإضافتها وتوثيق المادة الفعالة فوراً.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => leafletCameraInputRef.current?.click()}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer transform active:scale-98"
                      >
                        <Camera className="w-4 h-4" />
                        <span>📸 تصوير النشرة</span>
                      </button>
                    </div>
                  )}

                  {/* 📸 بطاقة معاينة وتوثيق صورة نشرة المنتج المرفوعة */}
                  {leafletImage && (
                    <div className="p-3.5 bg-blue-50/80 border-2 border-blue-200 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-blue-950">
                          <ImageIcon className="w-4 h-4 text-blue-600" />
                          <span>نشرة المنتج الموثقة بالكاميرا 📷</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLeafletImage(null)}
                          className="text-[10px] text-rose-600 hover:underline font-bold"
                        >
                          إزالة الصورة
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <a href={leafletImage} target="_blank" rel="noopener noreferrer" className="shrink-0 relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={leafletImage}
                            alt="نشرة الدواء"
                            className="w-16 h-16 object-cover rounded-xl border border-blue-300 shadow-xs group-hover:opacity-90 transition-all"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-xl text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-all">
                            تكبير 🔍
                          </span>
                        </a>

                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            value={manualIngredient}
                            onChange={(e) => setManualIngredient(e.target.value)}
                            placeholder="اكتب المادة الفعالة المستخرجة من النشرة..."
                            className="w-full h-8 bg-white border border-blue-200 rounded-lg px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSaveLeafletData}
                              disabled={isSavingLeafletData}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer"
                            >
                              {isSavingLeafletData ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              <span>حفظ وتوثيق بالسيرفر السحابي</span>
                            </button>
                            {leafletSaveSuccess && (
                              <span className="text-[11px] text-emerald-700 font-black flex items-center gap-1 animate-bounce">
                                <Check className="w-3.5 h-3.5" />
                                <span>تم الحفظ السحابي بنجاح!</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedProduct && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="text-[10px] font-black text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>مراجع الشركات المصنعة ونشرات الـ SPC المعتمدة:</span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-normal">انقر لفتح صفحة الصنف مباشرة</span>
                      </div>
                      
                      {/* Global & European Formularies */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <a
                          href={`https://bnf.nice.org.uk/drugs/${encodeURIComponent((selectedProduct.scientificName || selectedProduct.name).toLowerCase().replace(/[^\w-]/g, '-'))}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 text-amber-900 border border-amber-300 font-black rounded-lg transition-all flex items-center gap-1 shadow-xs"
                          title="الدليل الدوائي البريطاني الرسمي (BNF 83) - الجمعية الصيدلانية البريطانية و NHS NICE"
                        >
                          <span>🇬🇧 BNF 83 (الدليل البريطاني)</span>
                          <ExternalLink className="w-2.5 h-2.5 text-amber-700" />
                        </a>

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
                          href={`https://www.medicines.org.uk/emc/search?q=${encodeURIComponent(selectedProduct.scientificName || selectedProduct.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🇬🇧 EMC UK (نشرات المصنعين)</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <a
                          href={`https://www.vidal.fr/recherche.html?query=${encodeURIComponent(selectedProduct.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🇫🇷 Vidal (الدليل الفرنسي)</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <a
                          href={`https://www.torrinomedica.it/?s=${encodeURIComponent(selectedProduct.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🇮🇹 Torrinomedica (الإيطالي)</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <a
                          href={`https://www.ilacrehberi.com/arama/?q=${encodeURIComponent(selectedProduct.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🇹🇷 İlaç Rehberi (التركي)</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>

                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(selectedProduct.name)}+site%3Adrugeye.org+OR+site%3Aegyptiandrugindex.com+OR+site%3Aedaegypt.gov.eg`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🇪🇬 هيئة الدواء و DrugEye</span>
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
                          href={`https://www.sfda.gov.sa/ar/drugs-list`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>🇸🇦 الغذاء والدواء (SFDA)</span>
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
