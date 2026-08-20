'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, Send, X, MessageSquare, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportTicketModal({ isOpen, onClose }: SupportTicketModalProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'NEW' | 'LIST'>('NEW');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [priority, setPriority] = useState('NORMAL');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets');
      const data = await res.json();
      if (data.success) setTickets(data.tickets);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isOpen) fetchTickets();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, category, priority })
      });

      const data = await res.json();
      if (data.success) {
        setMsg({ text: data.message, type: 'success' });
        setSubject('');
        setMessage('');
        fetchTickets();
        setTimeout(() => setActiveTab('LIST'), 1200);
      } else {
        setMsg({ text: data.error || 'فشل إرسال التذكرة', type: 'error' });
      }
    } catch {
      setMsg({ text: 'تعذر الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">مركز الدعم الفني وتذاكر المساعدة</h3>
              <p className="text-xs text-slate-500 font-semibold">فريق الدعم الفني متاح لمساعدتك على مدار الساعة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-black">
          <button
            type="button"
            onClick={() => setActiveTab('NEW')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'NEW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✍️ فتح تذكرة جديدة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LIST')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'LIST' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 تذاكري السابقة ({tickets.length})
          </button>
        </div>

        {msg && (
          <div className={`p-3.5 rounded-xl text-xs font-black text-center ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            {msg.text}
          </div>
        )}

        {activeTab === 'NEW' ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-900 font-bold mb-1">نوع الاستفسار / المشكلة:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="TECHNICAL">⚙️ مشكلة تقنية / خلل فني</option>
                  <option value="BILLING">💳 الفوترة والدفع والاشتراك</option>
                  <option value="FEATURE">💡 اقتراح ميزة أو تحسين</option>
                  <option value="GENERAL">💬 استفسار عام</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-900 font-bold mb-1">درجة الأهمية:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="LOW">عادية</option>
                  <option value="NORMAL">متوسطة</option>
                  <option value="HIGH">عالية</option>
                  <option value="URGENT">🚨 طارئة جداً</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-900 font-bold mb-1">عنوان التذكرة *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="ملخص المشكلة أو الاستفسار..."
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-900 font-bold mb-1">تفاصيل الرسالة *</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اشرح المشكلة بالتفصيل لمساعدتنا في حلها سريعاً..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {loading ? 'جاري الإرسال...' : 'إرسال تذكرة الدعم الفني'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold">
                لا توجد تذاكر دعم سابقة
              </div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 text-sm">{t.subject}</h4>
                    <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                      t.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : (t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800')
                    }`}>
                      {t.status === 'RESOLVED' ? 'تم الحل ✅' : (t.status === 'IN_PROGRESS' ? 'قيد المتابعة ⏳' : 'جديدة 🟢')}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium">{t.message}</p>
                  {t.response && (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-950 font-medium mt-2">
                      <p className="font-bold text-[11px] text-blue-900 mb-0.5">💬 رد فريق الدعم الفني:</p>
                      <p>{t.response}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-mono" dir="ltr">
                    {new Date(t.createdAt).toLocaleDateString('en-GB')} {new Date(t.createdAt).toLocaleTimeString('en-GB')}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
