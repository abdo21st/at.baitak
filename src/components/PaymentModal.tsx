'use client';

import React, { useState } from 'react';
import { CreditCard, CheckCircle2, X, ShieldCheck, Zap, Building, Sparkles } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: {
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
  };
  onSuccess?: () => void;
}

export default function PaymentModal({ isOpen, onClose, plan, onSuccess }: PaymentModalProps) {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [gateway, setGateway] = useState<'SADAD' | 'MOAMALAT' | 'TADAWUL' | 'TPAY' | 'BANK_TRANSFER'>('SADAD');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen || !plan) return null;

  const currentPrice = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/payments/libya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
          gateway,
          amount: currentPrice,
          referenceNumber: referenceNumber || `${gateway}-${Date.now().toString().slice(-6)}`
        })
      });

      const data = await res.json();
      if (data.success) {
        setMsg({ text: data.message || 'تم تجديد الاشتراك بنجاح!', type: 'success' });
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setMsg({ text: data.error || 'فشلت عملية الدفع', type: 'error' });
      }
    } catch {
      setMsg({ text: 'تعذر الاتصال بخادم الدفع', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">تجديد الاشتراك بالدفع الإلكتروني</h3>
              <p className="text-xs text-slate-500 font-semibold">{plan.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className={`p-3.5 rounded-xl text-xs font-black text-center ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
          {/* Billing Cycle Selector */}
          <div>
            <label className="block text-slate-900 font-black mb-1.5">دورة الفوترة:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBillingCycle('YEARLY')}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  billingCycle === 'YEARLY'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-black shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>اشتراك سنوي</span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-extrabold">خصم 20%</span>
                </div>
                <div className="text-base font-black text-emerald-700 font-mono mt-1">
                  {plan.priceYearly} <span className="text-xs font-sans">د.ل / سنة</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('MONTHLY')}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  billingCycle === 'MONTHLY'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-black shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <span className="font-bold">اشتراك شهري</span>
                <div className="text-base font-black text-slate-900 font-mono mt-1">
                  {plan.priceMonthly} <span className="text-xs font-sans">د.ل / شهر</span>
                </div>
              </button>
            </div>
          </div>

          {/* Libyan Payment Gateways */}
          <div>
            <label className="block text-slate-900 font-black mb-1.5">اختر بوابة الدفع المحلية:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-extrabold">
              {[
                { id: 'SADAD', name: 'سداد (Sadad)', icon: '🟢' },
                { id: 'MOAMALAT', name: 'معاملات (Moamalat)', icon: '💳' },
                { id: 'TADAWUL', name: 'تداول (Tadawul)', icon: '🔷' },
                { id: 'TPAY', name: 'ت-باي (T-Pay)', icon: '⚡' },
                { id: 'BANK_TRANSFER', name: 'حوالة مصرفية', icon: '🏛️' }
              ].map((gw) => (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => setGateway(gw.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    gateway === gw.id
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm block mb-0.5">{gw.icon}</span>
                  {gw.name}
                </button>
              ))}
            </div>
          </div>

          {gateway !== 'BANK_TRANSFER' ? (
            <div>
              <label className="block text-slate-900 font-bold mb-1">رقم هاتف حساب الدفع (المربوط بالخدمة):</label>
              <input
                type="tel"
                required
                dir="ltr"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="091XXXXXXX"
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-mono font-bold text-left focus:outline-none focus:border-emerald-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-slate-900 font-bold mb-1">رقم إشعار الإيداع أو الحوالة المصرفية:</label>
              <input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="مثال: REF-984214"
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'جاري معالجة الدفع...' : `تأكيد الدفع وسداد ${currentPrice} د.ل`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
