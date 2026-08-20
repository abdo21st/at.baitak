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
  Sparkles,
  ArrowRightLeft,
  Clock,
  Download,
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  MessageSquare,
  ImageIcon,
  Eye,
  ExternalLink,
  Check,
  X,
  Settings,
  Link2,
  ShieldCheck
} from 'lucide-react';

import PrintReportLayout from '@/components/PrintReportLayout';
import { generatePurchaseOrderPdf } from '@/lib/pdfEngine';
import ClinicalCapsuleModal from '@/components/ClinicalCapsuleModal';

export default function PharmacyShortagesPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'whatsapp'>('inventory');
  const [shortages, setShortages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // WhatsApp Group Shortages State
  const [whatsappRequests, setWhatsappRequests] = useState<any[]>([]);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappFilter, setWhatsappFilter] = useState<'PENDING' | 'ORDERED' | 'ALL'>('PENDING');
  const [imagePreviewModal, setImagePreviewModal] = useState<string | null>(null);
  const [customQuantities, setCustomQuantities] = useState<Record<string, string>>({});
  const [pendingWhatsAppCount, setPendingWhatsAppCount] = useState<number>(0);

  // WhatsApp Authorized Group Settings
  const [isGroupConfigModalOpen, setIsGroupConfigModalOpen] = useState(false);
  const [groupLinkInput, setGroupLinkInput] = useState('');
  const [groupJidInput, setGroupJidInput] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('صيدلية بيتك');
  const [isSavingGroupConfig, setIsSavingGroupConfig] = useState(false);
  const [groupConfigSaveStatus, setGroupConfigSaveStatus] = useState<string | null>(null);

  // Clinical Knowledge & Web/DB Lookup Modal
  const [selectedCapsuleProduct, setSelectedCapsuleProduct] = useState<any>(null);
  const [isCapsuleModalOpen, setIsCapsuleModalOpen] = useState(false);

  const handleOpenClinicalLookup = (req: any) => {
    setSelectedCapsuleProduct({
      id: req.id,
      name: req.productName,
      code: req.matchedCode || '',
      category: req.activeIngredient || '',
      description: req.clinicalNotes || req.rawMessage || ''
    });
    setIsCapsuleModalOpen(true);
  };

  // PDF Generation State
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfActionStatus, setPdfActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [recipientPhone, setRecipientPhone] = useState('');

  // نمط دراسة حركة المخزون (فترات سريعة أو نطاق زمني مخصص)
  const [studyMode, setStudyMode] = useState<'presets' | 'custom'>('presets');
  const [studyPeriod, setStudyPeriod] = useState<number>(30);

  // التواريخ المخصصة
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultFromStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(defaultFromStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  // الفترة المطلوبة للتوفير (Target Coverage Days)
  const [coverageDays, setCoverageDays] = useState<number>(30);

  // Selected Items for Purchase Order Cart
  const [cart, setCart] = useState<{ [productId: number]: { item: any; requestedQty: number } }>({});
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // احتساب عدد أيام الدراسة الفعلية
  const calculatedCustomDays = React.useMemo(() => {
    if (!fromDate || !toDate) return 30;
    const fromTime = new Date(fromDate).getTime();
    const toTime = new Date(toDate).getTime();
    if (isNaN(fromTime) || isNaN(toTime) || toTime < fromTime) return 1;
    return Math.max(1, Math.round((toTime - fromTime) / (1000 * 3600 * 24)));
  }, [fromDate, toDate]);

  const activeStudyDays = studyMode === 'presets' ? studyPeriod : calculatedCustomDays;

  const fetchShortages = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (branchFilter !== 'all') params.set('branch', branchFilter);
      params.set('coverageDays', String(coverageDays));

      if (studyMode === 'custom') {
        params.set('fromDate', fromDate);
        params.set('toDate', toDate);
        params.set('studyPeriod', String(calculatedCustomDays));
      } else {
        params.set('studyPeriod', String(studyPeriod));
      }

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
  }, [search, categoryFilter, branchFilter, coverageDays, studyMode, fromDate, toDate, calculatedCustomDays, studyPeriod]);

  useEffect(() => {
    fetchShortages();
  }, [fetchShortages]);

  const fetchWhatsAppShortages = React.useCallback(async () => {
    try {
      setWhatsappLoading(true);
      const res = await fetch(`/api/pharmacy/whatsapp-shortages?status=${whatsappFilter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setWhatsappRequests(data.requests || []);
        setPendingWhatsAppCount(data.counts?.pending || 0);
      }
    } catch (err) {
      console.error('Fetch whatsapp shortages error:', err);
    } finally {
      setWhatsappLoading(false);
    }
  }, [whatsappFilter, search]);

  useEffect(() => {
    fetchWhatsAppShortages();
    const interval = setInterval(fetchWhatsAppShortages, 15000); // Live poll every 15s
    return () => clearInterval(interval);
  }, [fetchWhatsAppShortages]);

  const fetchGroupSettings = React.useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setGroupLinkInput(data.settings.whatsappGroupLink || '');
        setGroupJidInput(data.settings.whatsappGroupJid || '');
        setGroupNameInput(data.settings.whatsappGroupName || 'صيدلية بيتك');
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchGroupSettings();
  }, [fetchGroupSettings]);

  const handleSaveGroupConfig = async () => {
    try {
      setIsSavingGroupConfig(true);
      setGroupConfigSaveStatus(null);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappGroupLink: groupLinkInput,
          whatsappGroupJid: groupJidInput,
          whatsappGroupName: groupNameInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setGroupConfigSaveStatus('تم حفظ إعدادات المجموعة المعتمدة بنجاح! 🔒✅');
        fetchGroupSettings();
        setTimeout(() => {
          setIsGroupConfigModalOpen(false);
          setGroupConfigSaveStatus(null);
        }, 1500);
      } else {
        setGroupConfigSaveStatus(data.error || 'فشل حفظ الإعدادات');
      }
    } catch (e: any) {
      setGroupConfigSaveStatus(e.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsSavingGroupConfig(false);
    }
  };

  const handleWhatsAppStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch('/api/pharmacy/whatsapp-shortages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      fetchWhatsAppShortages();
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  const handleDeleteWhatsAppRequest = async (id: string) => {
    if (!confirm('هل تريد بالتأكيد إزالة هذا الصنف من طلبات الواتساب؟')) return;
    try {
      await fetch(`/api/pharmacy/whatsapp-shortages?id=${id}`, { method: 'DELETE' });
      fetchWhatsAppShortages();
    } catch (err) {
      console.error('Delete whatsapp request error:', err);
    }
  };

  const handleAddWhatsAppToCart = (req: any) => {
    const rawQty = customQuantities[req.id] !== undefined ? customQuantities[req.id] : req.requestedQty;
    const finalQty = Number(rawQty);

    if (!finalQty || isNaN(finalQty) || finalQty <= 0) {
      alert(`⚠️ يُرجى إدخال الكمية المطلوبة لصنف (${req.productName}) أولاً في الخانة المخصصة قبل ضمه للطلبية.`);
      return;
    }

    const matchedInShortages = shortages.find(
      (s) => (req.matchedCode && s.code === req.matchedCode) || s.name.toLowerCase().includes(req.productName.toLowerCase())
    );

    const productId = matchedInShortages ? matchedInShortages.productId : (900000 + Math.floor(Math.random() * 90000));
    const itemToAdd = matchedInShortages || {
      productId,
      code: req.matchedCode || `WA-${req.id.slice(0, 5)}`,
      name: req.productName,
      activeIngredient: req.activeIngredient || req.productName,
      stockOnHand: 0,
      minStockLevel: 10,
      costPrice: 0,
      sellPrice: 0,
      orderUnit: req.unit || 'عبوة',
      inventoryUnit: req.unit || 'عبوة',
      packSize: 1,
      suggestedOrderPackages: finalQty,
      supplierName: 'مورد الواتساب'
    };

    setCart((prev) => ({
      ...prev,
      [productId]: {
        item: itemToAdd,
        requestedQty: finalQty
      }
    }));

    handleWhatsAppStatusChange(req.id, 'ORDERED');
  };

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

  const totalAllShortagesEstimatedCost = shortages.reduce(
    (sum, i) => sum + (Number(i.suggestedOrderPackages || 1) * (Number(i.purchaseUnitCost) || (Number(i.costPrice) * (Number(i.packSize) || 1)))),
    0
  );

  const getOrderPdfData = () => {
    const today = new Date().toISOString().split('T')[0];
    const orderNo = `PO-${today.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    return {
      orderNumber: orderNo,
      orderDate: today,
      supplierName: 'السادة / مندوب التوريد والشركات المحترمين',
      items: cartItemsList.map(({ item, requestedQty }) => {
        const packSize = item.packSize || 1;
        const unitPrice = Number(item.purchaseUnitCost) || (Number(item.costPrice) * packSize);
        return {
          code: item.code,
          name: item.name,
          currentStock: item.stockOnHand,
          requestedQty,
          unitPrice,
          totalPrice: requestedQty * unitPrice
        };
      }),
      totalAmount: totalCartEstimatedCost,
      notes: `فترة دراسة حركة المخزون: [ ${studyMode === 'custom' ? `من ${fromDate} إلى ${toDate}` : `آخر ${studyPeriod} يوماً`} ] - تغطية مستهدفة: ${coverageDays} يوماً`
    };
  };

  const handleDownloadPdf = async () => {
    try {
      setIsPdfLoading(true);
      setPdfActionStatus(null);
      const pdf = await generatePurchaseOrderPdf(getOrderPdfData());
      pdf.download();
      setPdfActionStatus({ type: 'success', message: 'تم تحميل ملف الـ PDF بنجاح! 📄' });
    } catch (err: any) {
      setPdfActionStatus({ type: 'error', message: err.message || 'فشل إنشاء ملف الـ PDF' });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSharePdfWhatsApp = async () => {
    try {
      setIsPdfLoading(true);
      setPdfActionStatus(null);
      const pdf = await generatePurchaseOrderPdf(getOrderPdfData());
      const shared = await pdf.shareViaWebShare();
      if (shared) {
        setPdfActionStatus({ type: 'success', message: 'تم فتح تطبيق واتساب لمشاركة ملف الـ PDF بنجاح! 🟢' });
      }
    } catch (err: any) {
      setPdfActionStatus({ type: 'error', message: err.message || 'فشل مشاركة ملف الـ PDF' });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSendPdfToWhatsAppDirect = async () => {
    const targetPhone = recipientPhone.trim();

    if (!targetPhone) {
      setPdfActionStatus({ type: 'error', message: 'يُرجى إدخال رقم هاتف المستلم (واتساب) للإرسال المباشر' });
      return;
    }

    try {
      setIsPdfLoading(true);
      setPdfActionStatus(null);
      const orderData = getOrderPdfData();
      const pdf = await generatePurchaseOrderPdf(orderData);

      const res = await fetch('/api/pharmacy/send-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          pdfBase64: pdf.base64,
          fileName: pdf.fileName,
          orderNumber: orderData.orderNumber,
          supplierName: orderData.supplierName,
          itemsCount: cartItemsList.length,
          totalAmount: totalCartEstimatedCost
        })
      });

      const data = await res.json();
      if (data.success) {
        setPdfActionStatus({ type: 'success', message: `تم إرسال مستند الـ PDF عبر واتساب إلى (${targetPhone}) بنجاح! 📄🟢` });
      } else {
        setPdfActionStatus({ type: 'error', message: data.error || 'فشل الإرسال عبر واتساب' });
      }
    } catch (err: any) {
      setPdfActionStatus({ type: 'error', message: err.message || 'حدث خطأ أثناء الإرسال' });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const generateWhatsAppOrderText = () => {
    const nowStr = new Date().toISOString().split('T')[0];
    let text = `*طلب شراء وتوريد أدوية ونواقص للصيدلية* 📦🌿\n`;
    text += `التاريخ: ${nowStr}\n`;
    text += `فترة دراسة حركة المخزون: [ ${studyMode === 'custom' ? `من ${fromDate} إلى ${toDate} (${calculatedCustomDays} يوم)` : `آخر ${studyPeriod} يوماً`} ]\n`;
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
    <div className="space-y-6 font-cairo">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center gap-1 border border-indigo-200">
              <Bot className="w-3 h-3 text-indigo-600" />
              محرك حساب النواقص بالوحدات الكبرى والنطاق الزمني المرن
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>إدارة النواقص وتوليد طلبيات الشراء</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تحديد حركة المخزون بالتاريخ (من تاريخ إلى تاريخ) وتحديد فترة التغطية المطلوبة بدقة
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {shortages.length > 0 && (
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة (A4)</span>
            </button>
          )}

          {cartItemsList.length > 0 && (
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>الطلبية ({cartItemsList.length})</span>
              <span className="font-mono bg-emerald-700/80 px-2 py-0.5 rounded-md text-[11px]">
                {totalCartEstimatedCost.toFixed(2)} د.ل
              </span>
            </button>
          )}

          <button
            onClick={fetchShortages}
            className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Responsive for Mobile) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>📉 دراسة النواقص وسرعة السحب ({shortages.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('whatsapp'); fetchWhatsAppShortages(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>📱 نواقص وطلبيات الواتساب الحية</span>
          {pendingWhatsAppCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
              {pendingWhatsAppCount} جديد
            </span>
          )}
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Control Panel: Study Period (Presets vs Custom Range) & Target Coverage */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Study Period Window (7 cols) */}
          <div className="lg:col-span-7 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>فترة دراسة حركة المخزون:</span>
              </label>

              {/* Mode Toggle: Presets vs Custom Date Range */}
              <div className="flex items-center bg-blue-100/80 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setStudyMode('presets')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    studyMode === 'presets'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-blue-700 hover:text-blue-900'
                  }`}
                >
                  فترات سريعة
                </button>
                <button
                  onClick={() => setStudyMode('custom')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    studyMode === 'custom'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-blue-700 hover:text-blue-900'
                  }`}
                >
                  تحديد بالتواريخ (من - إلى)
                </button>
              </div>
            </div>

            {studyMode === 'presets' ? (
              <div className="space-y-2">
                <p className="text-[10px] text-blue-700/80">
                  اختر نافذة التحليل السريعة لقياس سرعة السحب اليومية (Velocity):
                </p>
                <div className="flex items-center gap-1.5">
                  {[15, 30, 60, 90, 180].map((days) => (
                    <button
                      key={days}
                      onClick={() => setStudyPeriod(days)}
                      className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
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
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-blue-800 block mb-1">من تاريخ:</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full h-9 bg-white border border-blue-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-blue-800 block mb-1">إلى تاريخ:</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full h-9 bg-white border border-blue-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-blue-700/80">
                    يتم قياس المبيعات الفعلية خلال هذا النطاق الزمني بدقة.
                  </span>
                  <span className="text-[11px] font-bold font-mono text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    المدة: {calculatedCustomDays} يوماً
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Target Coverage Days (5 cols) */}
          <div className="lg:col-span-5 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>الفترة المطلوبة للتوفير والتغطية:</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                يكفي {coverageDays} يوماً
              </span>
            </div>
            <p className="text-[10px] text-emerald-700/80">
              كم يوماً تريد أن يكفيك المخزون بعد الشراء؟
            </p>
            <div className="flex items-center gap-1.5">
              {[10, 15, 30, 45, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setCoverageDays(days)}
                  className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
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
          <span>صنف يحتاج للتوريد (دراسة:</span>
          <span className="font-mono text-blue-700 font-black">
            {studyMode === 'custom' ? `${calculatedCustomDays} يوم [من ${fromDate} إلى ${toDate}]` : `${studyPeriod} يوم`}
          </span>
          <span>- تغطية:</span>
          <span className="font-mono text-emerald-700 font-black">{coverageDays} يوم</span>
          <span>)</span>
        </div>
      </div>

      {/* Shortages Table & Print Report Container */}
      <PrintReportLayout
        systemName="منظومة إدارة المشتريات والمخزون الصيدلاني 🌿"
        reportTitle="تقرير النواقص وأمر الشراء المقترح"
        reportSubtitle="تحليل حركة المخزون وسرعة السحب وتغطية الطلبية الدورية"
        periodText={studyMode === 'custom' ? `فترة دراسة حركة المخزون: من ${fromDate} إلى ${toDate} (${calculatedCustomDays} يوم) - التغطية المطلوبة: ${coverageDays} يوم` : `فترة دراسة حركة المخزون: آخر ${studyPeriod} يوماً - التغطية المطلوبة: ${coverageDays} يوم`}
        metaDetails={[
          { label: 'عدد الأصناف الناقصة', value: shortages.length },
          { label: 'فترة التغطية المستهدفة', value: `${coverageDays} يوم` },
          { label: 'الأصناف المحددة للطلب', value: cartItemsList.length > 0 ? cartItemsList.length : 'الكل' }
        ]}
        summaryCards={[
          { label: 'إجمالي الأصناف الناقصة', value: shortages.length, unit: 'صنف' },
          { label: 'قيمة الطلبية المقترحة', value: (totalCartEstimatedCost > 0 ? totalCartEstimatedCost : totalAllShortagesEstimatedCost).toFixed(2), unit: 'د.ل' }
        ]}
      >
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:rounded-none">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-bold">جاري تحليل حركة المخزون للفترة المحددة...</div>
          ) : shortages.length === 0 ? (
            <div className="p-12 text-center text-xs text-emerald-600 font-bold">لا توجد نواقص تطابق معايير البحث والتغطية المحددة!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold">
                    <th className="py-3.5 pr-4 text-center w-12 no-print">تحديد</th>
                    <th className="py-3.5 pr-4 hidden print:table-cell text-center w-10">#</th>
                    <th className="py-3.5 pr-2">اسم الدواء / التصنيف</th>
                    <th className="py-3.5 text-center">الرصيد الفعلي</th>
                    <th className="py-3.5 text-center">سرعة السحب</th>
                    <th className="py-3.5 text-center">المقترح للشراء</th>
                    <th className="py-3.5 text-center">تكلفة الشراء</th>
                    <th className="py-3.5 text-center">إجمالي القيمة</th>
                    <th className="py-3.5 text-left pl-4">الشركة الموردة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shortages.map((item, idx) => {
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
                        <td className="py-3.5 text-center pr-4 no-print" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleCartItem(item)} className="text-slate-400 hover:text-emerald-600">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-3.5 text-center pr-4 hidden print:table-cell font-mono text-[10px] text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 pr-2">
                          <div className="flex items-start gap-2">
                            <span className={`w-2 h-2 rounded-full mt-1.5 no-print ${item.stockOnHand <= 0 ? 'bg-rose-500' : 'bg-amber-500'}`} />
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
                                <div className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 font-bold flex items-center gap-1 no-print">
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
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs print:border-none print:p-0">
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
                            <span className="text-[9px] text-slate-400 font-normal">لكل {orderUnit}</span>
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
      </PrintReportLayout>
      </>
    ) : (
      /* WhatsApp Group Shortages Live Feed View */
      <div className="space-y-4 no-print">
        {/* Controls & Filter Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>نواقص وطلبيات مجموعة {groupNameInput || 'صيدلية بيتك'}</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  بث مباشر حي
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  <span>مجموعة معتمدة: {groupNameInput || 'صيدلية بيتك'}</span>
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                استخراج وتفريغ آلي للرسائل والصور الواردة حصراً من مجموعة [{groupNameInput || 'صيدلية بيتك'}] وحظر المجموعات الأخرى
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Group Link Config Button */}
            <button
              onClick={() => setIsGroupConfigModalOpen(true)}
              className="h-9 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="تخصيص رابط أو معرف مجموعة الواتساب المعتمدة لمنع جلب بيانات من مجموعات أخرى"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-700" />
              <span>⚙️ تخصيص رابط المجموعة</span>
            </button>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setWhatsappFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  whatsappFilter === 'PENDING' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                قيد الانتظار ({pendingWhatsAppCount})
              </button>
              <button
                onClick={() => setWhatsappFilter('ORDERED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  whatsappFilter === 'ORDERED' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تم ضمها للطلبية
              </button>
              <button
                onClick={() => setWhatsappFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  whatsappFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
            </div>

            <button
              onClick={fetchWhatsAppShortages}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
              title="تحديث طلبات الواتساب"
            >
              <RefreshCw className={`w-4 h-4 ${whatsappLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* WhatsApp Requests Container (Table for Desktop + Cards for Mobile) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {whatsappLoading && whatsappRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs font-bold">جاري تحميل رسائل ونواقص الواتساب...</span>
            </div>
          ) : whatsappRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">لا توجد طلبات نواقص واردة حالياً من الواتساب</p>
              <p className="text-xs text-slate-400">
                عند إرسال أي قائمة أدوية أو صور علب/روشتات في مجموعة الواتساب، ستظهر هنا فورياً ومطابقة مع الأصناف.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Mobile Cards View (Visible on Phones & Small Screens) */}
              <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {whatsappRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-50/50 rounded-2xl border border-slate-200 p-3.5 space-y-3 transition-all"
                  >
                    {/* Top: Photo + Title + Urgency */}
                    <div className="flex items-start gap-3">
                      {req.imageUrl ? (
                        <div
                          onClick={() => setImagePreviewModal(req.imageUrl)}
                          className="relative w-16 h-16 rounded-2xl overflow-hidden border border-emerald-200 cursor-pointer shrink-0 shadow-xs active:scale-95 transition-all"
                          title="انقر لتكبير صورة الواتساب"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={req.imageUrl} alt="صورة الصنف" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center text-white text-[9px] font-bold">
                            🔍 تكبير
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-black text-slate-900 leading-snug">
                            {req.productName}
                          </h4>
                          {req.urgency === 'CRITICAL' ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-black shrink-0">
                              🔴 عاجل
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold shrink-0">
                              🟠 ضروري
                            </span>
                          )}
                        </div>

                        {req.matchedCode && (
                          <div className="mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                              كود: {req.matchedCode}
                            </span>
                          </div>
                        )}

                        {req.activeIngredient && (
                          <div className="text-[10px] text-blue-700 font-mono mt-1 line-clamp-1">
                            🧪 {req.activeIngredient}
                          </div>
                        )}

                        <div className="pt-1.5">
                          <button
                            onClick={() => handleOpenClinicalLookup(req)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer w-fit shadow-2xs"
                            title="مطابقة وبحث عن الدواء في BNF 83 والإنترنت وقاعدة بيانات الصيدلية"
                          >
                            <Search className="w-3 h-3 text-blue-600" />
                            <span>🔍 بحث بالإنترنت والمراجع</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sender & Timestamp */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-800">{req.senderName || 'صيدلية بيتك'}</span>
                      <span>{new Date(req.createdAt).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</span>
                      {req.status === 'ORDERED' ? (
                        <span className="text-emerald-600 font-black">✅ في الطلبية</span>
                      ) : (
                        <span className="text-amber-600 font-bold">⏳ بانتظار الطلب</span>
                      )}
                    </div>

                    {/* Quantity Input Row (Mobile Touch Friendly) */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-slate-700 shrink-0">
                        الكمية المطلوبة:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={customQuantities[req.id] !== undefined ? customQuantities[req.id] : (req.requestedQty ?? '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomQuantities((prev) => ({ ...prev, [req.id]: val }));
                          }}
                          placeholder="أدخل الكمية..."
                          className={`w-32 h-11 px-3 text-center text-xs font-black rounded-xl border transition-all ${
                            (req.requestedQty === null || req.requestedQty === undefined || req.requestedQty === 0) && (customQuantities[req.id] === undefined || customQuantities[req.id] === '')
                              ? 'border-amber-400 bg-amber-50 text-amber-950 placeholder:text-amber-600 font-bold focus:ring-2 focus:ring-amber-400'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400'
                          }`}
                        />
                        <span className="text-[11px] font-bold text-slate-600">{req.unit || 'عبوة'}</span>
                      </div>
                    </div>

                    {/* Action Row for Mobile */}
                    <div className="flex items-center gap-2 pt-1">
                      {req.status === 'PENDING' && (
                        <button
                          onClick={() => handleAddWhatsAppToCart(req)}
                          className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>ضم للطلبية</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleWhatsAppStatusChange(req.id, req.status === 'ORDERED' ? 'PENDING' : 'ORDERED')}
                        className="h-11 px-4 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-700 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                        title="تغيير حالة الطلب"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWhatsAppRequest(req.id)}
                        className="h-11 px-4 bg-white border border-slate-200 hover:bg-rose-50 active:scale-95 text-slate-400 hover:text-rose-600 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                        title="حذف من النواقص"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. Desktop Table View (Visible on Medium & Large Screens) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold">
                    <tr>
                      <th className="py-3.5 pr-4">الصورة / المعاينة</th>
                      <th className="py-3.5">اسم الصنف المستخرج</th>
                      <th className="py-3.5 text-center">الكمية المطلوبة</th>
                      <th className="py-3.5 text-center">الأهمية</th>
                      <th className="py-3.5">المرسل والمجموعة</th>
                      <th className="py-3.5">الحالة</th>
                      <th className="py-3.5 text-left pl-4">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {whatsappRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Photo / Thumbnail Preview */}
                        <td className="py-3 pr-4">
                          {req.imageUrl ? (
                            <div
                              onClick={() => setImagePreviewModal(req.imageUrl)}
                              className="relative w-12 h-12 rounded-xl overflow-hidden border border-emerald-200 cursor-pointer group shadow-xs hover:border-emerald-500 transition-all"
                              title="انقر لتكبير صورة الواتساب"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={req.imageUrl} alt="صورة الصنف" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white text-[9px] font-bold">
                                🔍 تكبير
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                        </td>

                        {/* Product Name & Extraction */}
                        <td className="py-3">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{req.productName}</span>
                            {req.matchedCode && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                                كود: {req.matchedCode}
                              </span>
                            )}
                          </div>
                          {req.activeIngredient && (
                            <div className="text-[10px] text-blue-700 font-mono mt-0.5">
                              🧪 {req.activeIngredient}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => handleOpenClinicalLookup(req)}
                              className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="مطابقة وبحث عن الدواء في BNF 83 والإنترنت وقاعدة بيانات الصيدلية"
                            >
                              <Search className="w-3 h-3 text-blue-600" />
                              <span>🔍 بحث سريري والمراجع</span>
                            </button>
                            <span className="text-[10px] text-slate-400 line-clamp-1 italic">
                              &ldquo;{req.rawMessage}&rdquo;
                            </span>
                          </div>
                        </td>

                        {/* Quantity & Unit (Editable by Procurement Manager) */}
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              value={customQuantities[req.id] !== undefined ? customQuantities[req.id] : (req.requestedQty ?? '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomQuantities((prev) => ({ ...prev, [req.id]: val }));
                              }}
                              placeholder="أدخل الكمية..."
                              className={`w-28 h-9 px-2 text-center text-xs font-black rounded-xl border transition-all ${
                                (req.requestedQty === null || req.requestedQty === undefined || req.requestedQty === 0) && (customQuantities[req.id] === undefined || customQuantities[req.id] === '')
                                  ? 'border-amber-400 bg-amber-50 text-amber-950 placeholder:text-amber-600 font-bold focus:ring-2 focus:ring-amber-400'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400'
                              }`}
                            />
                            <span className="text-[11px] font-bold text-slate-500">{req.unit || 'عبوة'}</span>
                          </div>
                          {(req.requestedQty === null || req.requestedQty === undefined || req.requestedQty === 0) && (customQuantities[req.id] === undefined || customQuantities[req.id] === '') && (
                            <div className="text-[9px] text-amber-600 font-bold mt-1">
                              ✍️ بانتظار تحديد الكمية
                            </div>
                          )}
                        </td>

                        {/* Urgency */}
                        <td className="py-3 text-center">
                          {req.urgency === 'CRITICAL' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                              🔴 عاجل جداً
                            </span>
                          ) : req.urgency === 'HIGH' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                              🟠 ضروري
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                              🔵 عادي
                            </span>
                          )}
                        </td>

                        {/* Sender & Group */}
                        <td className="py-3 text-xs">
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <span>{req.senderName || 'عضو المجموعة'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{req.groupName || 'واتساب'}</span>
                            <span>•</span>
                            <span>{new Date(req.createdAt).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3">
                          {req.status === 'ORDERED' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>مضموم للطلبية</span>
                            </span>
                          ) : req.status === 'RECEIVED' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1 w-fit">
                              <Check className="w-3.5 h-3.5" />
                              <span>تم الاستلام</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold flex items-center gap-1 w-fit">
                              <Clock className="w-3.5 h-3.5" />
                              <span>في انتظار الطلب</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 text-left pl-4">
                          <div className="flex items-center gap-1.5 justify-end">
                            {req.status === 'PENDING' && (
                              <button
                                onClick={() => handleAddWhatsAppToCart(req)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                                title="إضافة الصنف مباشرة لسلة طلبية الشراء"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>ضم للطلبية</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleWhatsAppStatusChange(req.id, req.status === 'ORDERED' ? 'PENDING' : 'ORDERED')}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all cursor-pointer"
                              title="تغيير حالة الطلب"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteWhatsAppRequest(req.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                              title="حذف من النواقص"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    )}

    {/* Fullscreen Image Preview Modal */}
    {imagePreviewModal && (
      <div
        onClick={() => setImagePreviewModal(null)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-pointer no-print"
      >
        <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setImagePreviewModal(null)}
            className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-sm font-black cursor-pointer transition-all"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreviewModal} alt="معاينة صورة الدواء أو الروشتة" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl" />
        </div>
      </div>
    )}

      {/* Cart Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  تجهيز ومراجعة طلبية الشراء ({cartItemsList.length} صنف)
                </h3>
                <p className="text-[11px] text-slate-500">
                  فترة التغطية المستهدفة: {coverageDays} يوماً | دراسة: {studyMode === 'custom' ? `من ${fromDate} إلى ${toDate}` : `آخر ${studyPeriod} يوماً`}
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

            {/* Status Feedback Alert */}
            {pdfActionStatus && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                pdfActionStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {pdfActionStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{pdfActionStatus.message}</span>
              </div>
            )}

            {/* Direct Phone Input for WhatsApp API */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>رقم هاتف المورد / المستلم (واتساب):</span>
                <span className="text-[10px] text-slate-400">مثال: 0912345678 أو 218912345678</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="أدخل رقم واتساب المورد للإرسال المباشر..."
                  className="flex-1 h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSendPdfToWhatsAppDirect}
                  disabled={isPdfLoading}
                  className="px-4 h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {isPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>إرسال PDF مباشر</span>
                </button>
              </div>
            </div>

            {/* PDF & Share Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={handleSharePdfWhatsApp}
                disabled={isPdfLoading}
                className="h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
              >
                {isPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                <span>مشاركة PDF عبر واتساب</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isPdfLoading}
                className="h-11 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل مستند PDF</span>
              </button>

              <a
                href={`https://wa.me/?text=${generateWhatsAppOrderText()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>إرسال نصي سريع</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Cart Pill (For Phone View) */}
      {cartItemsList.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden no-print">
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-2xl shadow-xl shadow-emerald-950/30 flex items-center justify-between px-4 font-black text-xs transition-all cursor-pointer border border-emerald-400/30"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span>معاينة وتأكيد طلبية الشراء</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-700/90 px-2 py-1 rounded-lg text-[11px] font-mono">
                {cartItemsList.length} صنف
              </span>
              <span className="font-mono text-xs font-black">
                {totalCartEstimatedCost.toFixed(2)} د.ل
              </span>
            </div>
          </button>
        </div>
      )}

      {/* WhatsApp Group Configuration Modal */}
      {isGroupConfigModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تخصيص مجموعة الواتساب المعتمدة للنواقص</h3>
                  <p className="text-[11px] text-slate-500 font-medium">حصر جلب النواقص من مجموعتك وتجاهل المجموعات الأخرى 🔒</p>
                </div>
              </div>
              <button
                onClick={() => setIsGroupConfigModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1.5 text-slate-900">
                  🔗 رابط دعوة مجموعة الواتساب أو معرّف الـ JID:
                </label>
                <input
                  type="text"
                  value={groupLinkInput}
                  onChange={(e) => setGroupLinkInput(e.target.value)}
                  placeholder="https://chat.whatsapp.com/XXXXX أو 120363044711297774@g.us"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  dir="ltr"
                />
                <p className="text-[10px] text-slate-400 font-normal mt-1">
                  يمكنك لصق رابط الدعوة المباشر للمجموعة أو معرف المجموعة الرقمي (JID).
                </p>
              </div>

              <div>
                <label className="block mb-1.5 text-slate-900">
                  🏷️ اسم المجموعة المعتمدة (للتطابق والفلترة):
                </label>
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="مثال: صيدلية بيتك"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-[11px] text-emerald-900 space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>حماية الفلترة الصارمة (Strict Group Isolation)</span>
                </div>
                <p className="text-emerald-800 leading-relaxed font-normal">
                  أي رسالة أو قائمة أدوية أو صورة علبة تصل من أي مجموعة واتساب أخرى غير مطابقة لهذا الرابط أو الاسم سيتم تجاهلها آلياً ولن تُسجل في قائمة النواقص.
                </p>
              </div>

              {groupConfigSaveStatus && (
                <div className="p-3 bg-slate-900 text-white rounded-xl text-center font-bold text-xs">
                  {groupConfigSaveStatus}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveGroupConfig}
                disabled={isSavingGroupConfig}
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {isSavingGroupConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>حفظ إعدادات المجموعة المعتمدة</span>
              </button>
              <button
                onClick={() => setIsGroupConfigModalOpen(false)}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Capsule & Drug Knowledge Lookup Modal */}
      {isCapsuleModalOpen && selectedCapsuleProduct && (
        <ClinicalCapsuleModal
          isOpen={isCapsuleModalOpen}
          onClose={() => setIsCapsuleModalOpen(false)}
          initialProduct={selectedCapsuleProduct}
          productsList={[]}
        />
      )}
    </div>
  );
}
