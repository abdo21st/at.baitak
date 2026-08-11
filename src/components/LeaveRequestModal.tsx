'use client';

import React, { useState } from 'react';
import { X, Calendar, FileText, Send } from 'lucide-react';
import { User, LeaveType } from '@/lib/types';

interface LeaveRequestModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted: () => void;
}

export default function LeaveRequestModal({ user, isOpen, onClose, onRequestSubmitted }: LeaveRequestModalProps) {
  const [type, setType] = useState<LeaveType>('ANNUAL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      setMsg('يرجى تعبئة كافة التواريخ والسبب');
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          type,
          startDate,
          endDate,
          reason
        })
      });

      const data = await res.json();
      if (data.success) {
        onRequestSubmitted();
        onClose();
      } else {
        setMsg(data.error || 'حدث خطأ في تقديم الطلب');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-700 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            تقديم طلب إجازة / عذر رسمية
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-slate-300 mb-1.5 font-medium">نوع الإجازة / الطلب</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-sky-500"
            >
              <option value="ANNUAL">إجازة سنوية اعتيادية</option>
              <option value="SICK">إجازة مرضية (مستشفى/علاج)</option>
              <option value="EMERGENCY">إجازة طارئة</option>
              <option value="EXCUSE">استئذان ساعات دوام</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1.5 font-medium">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1.5 font-medium">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-medium">سبب طلب الإجازة بالتفصيل</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب التوضيح أو الأسباب هنا..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {msg && <p className="text-rose-400 text-xs text-center">{msg}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {loading ? 'جاري الإرسال...' : 'إرسال الطلب للإدارة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
