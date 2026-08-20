'use client';

import React, { useState, useEffect } from 'react';
import { FieldVisit, Project } from '@/lib/types';
import {
  Car,
  Phone,
  MapPin,
  Wrench,
  KeyRound,
  AlertTriangle,
  FileCheck,
  Camera,
  Coins,
  Send,
  Loader2,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

interface FieldVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicianId: string;
  technicianName: string;
  activeVisit?: FieldVisit | null;
  projects?: Project[];
  onVisitUpdated: () => void;
}

export default function FieldVisitModal({
  isOpen,
  onClose,
  technicianId,
  technicianName,
  activeVisit,
  projects = [],
  onVisitUpdated
}: FieldVisitModalProps) {
  // New Visit Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [visitType, setVisitType] = useState<'MAINTENANCE' | 'INSTALLATION' | 'INSPECTION' | 'EMERGENCY'>('MAINTENANCE');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [serviceFee, setServiceFee] = useState('50');
  const [partsFee, setPartsFee] = useState('0');
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [solutionNotes, setSolutionNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState('');

  // Complete Visit State
  const [completionMode, setCompletionMode] = useState<'OTP' | 'DISPUTED' | 'INSPECTION'>('OTP');
  const [otpInput, setOtpInput] = useState('');
  const [customerRefusalReason, setCustomerRefusalReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Sync state if active visit exists
  useEffect(() => {
    if (activeVisit) {
      setClientName(activeVisit.clientName);
      setClientPhone(activeVisit.clientPhone);
      setClientAddress(activeVisit.clientAddress || '');
      setVisitType(activeVisit.visitType);
      setSelectedProjectId(activeVisit.projectId || '');
      setServiceFee(String(activeVisit.serviceFee || '50'));
      setPartsFee(String(activeVisit.partsFee || '0'));
      setDiagnosisNotes(activeVisit.diagnosisNotes || '');
      setSolutionNotes(activeVisit.solutionNotes || '');
      setPartsUsed(activeVisit.partsUsed || '');
    } else {
      setClientName('');
      setClientPhone('');
      setClientAddress('');
      setVisitType('MAINTENANCE');
      setSelectedProjectId('');
      setServiceFee('50');
      setPartsFee('0');
      setDiagnosisNotes('');
      setSolutionNotes('');
      setPartsUsed('');
      setOtpInput('');
      setCustomerRefusalReason('');
    }
    setMsg(null);
  }, [activeVisit, isOpen]);

  // Capture GPS coordinates on open
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCalculated = Number(
    (Math.max(0, parseFloat(serviceFee) || 0) + Math.max(0, parseFloat(partsFee) || 0)).toFixed(2)
  );

  // Handle Start New Visit
  const handleStartVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setMsg({ text: 'يرجى إدخال اسم العميل أو المنشأة', type: 'error' });
      return;
    }
    if (!clientPhone.trim()) {
      setMsg({ text: 'يرجى إدخال رقم هاتف العميل للتواصل والتحقق', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setMsg(null);
      const res = await fetch('/api/field-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianId,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientAddress: clientAddress.trim() || undefined,
          visitType,
          projectId: selectedProjectId || undefined,
          serviceFee: parseFloat(serviceFee) || 0,
          partsFee: parseFloat(partsFee) || 0,
          diagnosisNotes: diagnosisNotes.trim() || undefined,
          lat: gpsLocation?.lat,
          lng: gpsLocation?.lng
        })
      });
      const data = await res.json();
      if (!data.success) {
        setMsg({ text: data.error || 'فشل بدء الزيارة الميدانية', type: 'error' });
      } else {
        setMsg({ text: data.message || 'تم بدء الزيارة الميدانية بنجاح 🚗', type: 'success' });
        setTimeout(() => {
          onVisitUpdated();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Send OTP to Client WhatsApp
  const handleSendOtp = async () => {
    if (!activeVisit) return;
    try {
      setSendingOtp(true);
      setMsg(null);
      const res = await fetch('/api/field-visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeVisit.id,
          action: 'SEND_OTP',
          serviceFee: parseFloat(serviceFee) || 0,
          partsFee: parseFloat(partsFee) || 0,
          diagnosisNotes,
          solutionNotes,
          partsUsed
        })
      });
      const data = await res.json();
      if (!data.success) {
        setMsg({ text: data.error || 'فشل إرسال الرمز', type: 'error' });
      } else {
        setMsg({ text: data.message, type: 'success' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'خطأ في إرسال الرمز', type: 'error' });
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle Complete Visit
  const handleCompleteVisit = async () => {
    if (!activeVisit) return;

    try {
      setLoading(true);
      setMsg(null);

      let actionPayload: any = {
        id: activeVisit.id,
        diagnosisNotes,
        solutionNotes,
        partsUsed,
        serviceFee: parseFloat(serviceFee) || 0,
        partsFee: parseFloat(partsFee) || 0,
        lat: gpsLocation?.lat,
        lng: gpsLocation?.lng
      };

      if (completionMode === 'OTP') {
        if (!otpInput.trim()) {
          setMsg({ text: 'يرجى إدخال رمز التحقق (OTP) المكون من 4 أرقام من العميل', type: 'error' });
          setLoading(false);
          return;
        }
        actionPayload.action = 'COMPLETE_OTP';
        actionPayload.otpCodeInput = otpInput.trim();
      } else if (completionMode === 'DISPUTED') {
        if (!customerRefusalReason.trim()) {
          setMsg({ text: 'يرجى توضيح سبب امتناع العميل عن التوقيع أو السداد لتوثيق المحضر', type: 'error' });
          setLoading(false);
          return;
        }
        actionPayload.action = 'COMPLETE_DISPUTED';
        actionPayload.customerRefusalReason = customerRefusalReason.trim();
      } else if (completionMode === 'INSPECTION') {
        actionPayload.action = 'INSPECTION_ONLY';
      }

      const res = await fetch('/api/field-visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionPayload)
      });
      const data = await res.json();

      if (!data.success) {
        setMsg({ text: data.error || 'فشل إغلاق الزيارة', type: 'error' });
      } else {
        setMsg({ text: data.message || 'تم توثيق وإنهاء الزيارة بنجاح ✨', type: 'success' });
        setTimeout(() => {
          onVisitUpdated();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {activeVisit ? 'إنهاء وتوثيق الزيارة الميدانية' : 'بدء زيارة ميدانية جديدة'}
              </h3>
              <p className="text-xs text-slate-500">
                المهندس المنفذ: <span className="font-semibold text-slate-700">{technicianName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Notification Msg */}
          {msg && (
            <div
              className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
                msg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : msg.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {msg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          {/* Active Visit Info Banner */}
          {activeVisit && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-600 font-semibold">مهمة زيارة جارية</div>
                <div className="text-sm font-bold text-slate-800">{activeVisit.clientName}</div>
                <div className="text-xs text-slate-500 mt-0.5">{activeVisit.clientPhone}</div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>قيد العمل بالموقع</span>
              </div>
            </div>
          )}

          {!activeVisit ? (
            /* =================== START NEW VISIT FORM =================== */
            <form onSubmit={handleStartVisit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل / المنشأة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شركة النور / د. أحمد"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم هاتف العميل (واتساب) *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="09XXXXXXXX"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full h-11 px-3.5 pl-9 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الزيارة</label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="MAINTENANCE">🛠️ صيانة وإصلاح أعطال</option>
                    <option value="INSTALLATION">🔌 تركيب وتشغيل أجهزة</option>
                    <option value="INSPECTION">🔍 كشف ومعاينة فنية</option>
                    <option value="EMERGENCY">🚨 طوارئ واستجابة عاجلة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المشروع / المهمة (اختياري)</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- بدون ربط بمشروع --</option>
                    {projects
                      .filter((p) => p.status === 'OPEN')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان أو موقع العميل</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="مثال: طرابلس - زاوية الدهماني"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full h-11 px-3.5 pl-9 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">أتعاب الكشف / الصيانة (د.ل)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الإجمالي التقديري</label>
                  <div className="h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-sm font-bold text-slate-800">
                    <span>{totalCalculated}</span>
                    <span className="text-xs font-normal text-slate-500">(د.ل)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف مبدئي للعطل / الطلب</label>
                <textarea
                  rows={2}
                  placeholder="وصف المشكلة التي أبلغ عنها العميل..."
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Car className="w-5 h-5" />}
                <span>بدء الزيارة وتوثيق الحضور في الموقع 🚀</span>
              </button>
            </form>
          ) : (
            /* =================== COMPLETE ONGOING VISIT FORM =================== */
            <div className="space-y-4">
              {/* Technical Diagnosis & Solution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تشخيص العطل الفعلي</label>
                  <textarea
                    rows={2}
                    placeholder="مثال: تلف وحدة التغذية / خطأ في إعدادات الشبكة"
                    value={diagnosisNotes}
                    onChange={(e) => setDiagnosisNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الإجراء والحل المنفذ</label>
                  <textarea
                    rows={2}
                    placeholder="مثال: تم استبدال الباور وإعادة برمجة السويتش"
                    value={solutionNotes}
                    onChange={(e) => setSolutionNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Parts & Pricing Breakdown */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>الفوترة والأسعار المستحقة</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">أتعاب الصيانة (د.ل)</label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={serviceFee}
                      onChange={(e) => setServiceFee(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">قطع الغيار (د.ل)</label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={partsFee}
                      onChange={(e) => setPartsFee(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">الإجمالي المستحق</label>
                    <div className="h-10 px-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-black text-emerald-700">
                      <span>{totalCalculated}</span>
                      <span>(د.ل)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">وصف قطع الغيار المستخدمة</label>
                  <input
                    type="text"
                    placeholder="مثال: كابل شبكة 10م + كونكتور RJ45"
                    value={partsUsed}
                    onChange={(e) => setPartsUsed(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Verification & Sign-off Mode Tabs */}
              <div className="space-y-3 pt-1">
                <div className="text-xs font-bold text-slate-800">طريقة اعتماد وإغلاق الزيارة:</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCompletionMode('OTP')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      completionMode === 'OTP'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span>رمز تأكيد OTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompletionMode('DISPUTED')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      completionMode === 'DISPUTED'
                        ? 'bg-red-50 border-red-500 text-red-800 shadow-sm ring-2 ring-red-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>امتناع العميل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompletionMode('INSPECTION')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      completionMode === 'INSPECTION'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm ring-2 ring-amber-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileCheck className="w-4 h-4 text-amber-600" />
                    <span>كشف ومعاينة</span>
                  </button>
                </div>

                {/* Sub-Panel: OTP Mode */}
                {completionMode === 'OTP' && (
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">
                        إرسال الرمز لواتساب العميل: <span className="font-mono text-emerald-700">{activeVisit.clientPhone}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                      >
                        {sendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>إرسال الرمز 📲</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">أدخل رمز التحقق (4 أرقام) من العميل:</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="••••"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full h-12 text-center font-mono text-xl tracking-widest font-black rounded-xl border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-Panel: Disputed Mode */}
                {completionMode === 'DISPUTED' && (
                  <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl space-y-2.5 animate-fadeIn">
                    <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-red-600" />
                      <span>توثيق الإنجاز وإحالة الفاتورة للإدارة للمتابعة</span>
                    </div>
                    <p className="text-[11px] text-red-700 leading-relaxed">
                      سيتم حفظ إحداثيات الـ GPS والوقت كإثبات، وإرسال إشعار رسمي مسجل لواتساب العميل، مع حفظ أجر ساعاتك كاملاً.
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">سبب امتناع العميل عن التوقيع/السداد *</label>
                      <input
                        type="text"
                        placeholder="مثال: المسؤول غير متواجد / يرغب بالسداد عبر حوالة مصرفية لاحقاً"
                        value={customerRefusalReason}
                        onChange={(e) => setCustomerRefusalReason(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-red-300 bg-white text-xs text-slate-800"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-Panel: Inspection Only Mode */}
                {completionMode === 'INSPECTION' && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed animate-fadeIn">
                    سيتم توثيق الزيارة ككشف ومعاينة أولية وتحصيل أتعاب الكشفية فقط `({serviceFee} د.ل)` دون إغلاق نهائي للصيانة.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleCompleteVisit}
                disabled={loading}
                className={`w-full h-12 rounded-xl text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 ${
                  completionMode === 'OTP'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                    : completionMode === 'DISPUTED'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/25'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : completionMode === 'OTP' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : completionMode === 'DISPUTED' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <FileCheck className="w-5 h-5" />
                )}
                <span>
                  {completionMode === 'OTP'
                    ? `تأكيد واعتماد الزيارة (${totalCalculated} د.ل) 🟢`
                    : completionMode === 'DISPUTED'
                    ? `توثيق الامتناع والإحالة للإدارة (${totalCalculated} د.ل) 🔴`
                    : `توثيق الكشف والمعاينة (${serviceFee} د.ل) 🟡`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
