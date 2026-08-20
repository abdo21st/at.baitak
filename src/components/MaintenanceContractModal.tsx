'use client';

import React, { useState } from 'react';
import { Wrench, CheckCircle2, X, ShieldAlert, Calendar, DollarSign, Clock } from 'lucide-react';

interface MaintenanceContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MaintenanceContractModal({ isOpen, onClose, onSuccess }: MaintenanceContractModalProps) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [visitFrequency, setVisitFrequency] = useState('MONTHLY');
  const [contractValue, setContractValue] = useState('350');
  const [slaHours, setSlaHours] = useState('24');
  const [nextVisitDate, setNextVisitDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/maintenance-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientPhone,
          clientAddress,
          equipmentName,
          visitFrequency,
          contractValue,
          slaHours,
          nextVisitDate,
          notes
        })
      });

      const data = await res.json();
      if (data.success) {
        setMsg({ text: data.message, type: 'success' });
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setMsg({ text: data.error || 'فشل حفظ العقد', type: 'error' });
      }
    } catch {
      setMsg({ text: 'تعذر الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">عقد صيانة دورية مجدول (SLA)</h3>
              <p className="text-xs text-slate-500 font-semibold">جدولة الزيارات الفنية الدورية وتوثيق التزامات الخدمة</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-900 font-bold mb-1">اسم العميل أو الجهة *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="مثال: مستشفى الصفوة / بنك الأمان"
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-900 font-bold mb-1">رقم هاتف العميل *</label>
              <input
                type="tel"
                required
                dir="ltr"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="091XXXXXXX"
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-mono font-bold text-left focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-900 font-bold mb-1">الأجهزة أو المعدات المشمولة *</label>
              <input
                type="text"
                required
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                placeholder="مثال: 12 مكيف مركزي + مولد 100KVA"
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-900 font-bold mb-1">تكرار الزيارات المجدولة:</label>
              <select
                value={visitFrequency}
                onChange={(e) => setVisitFrequency(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="MONTHLY">📅 شهرياً (كل 30 يوم)</option>
                <option value="QUARTERLY">📅 ربع سنوي (كل 3 أشهر)</option>
                <option value="BIANNUAL">📅 نصف سنوي (كل 6 أشهر)</option>
                <option value="YEARLY">📅 سنوياً</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-900 font-bold mb-1">قيمة العقد (د.ل):</label>
              <input
                type="number"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-slate-900 font-bold mb-1">زمن الاستجابة (SLA):</label>
              <select
                value={slaHours}
                onChange={(e) => setSlaHours(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="4">🚨 طوارئ (خلال 4 ساعات)</option>
                <option value="12">⚡ سريع (خلال 12 ساعة)</option>
                <option value="24">🕒 قياسي (خلال 24 ساعة)</option>
                <option value="48">🗓️ عادي (خلال 48 ساعة)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-900 font-bold mb-1">تاريخ الزيارة القادمة:</label>
              <input
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'جاري الحفظ...' : 'حفظ وتفعيل عقد الصيانة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
