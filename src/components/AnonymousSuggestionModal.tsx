'use client';

import React, { useState } from 'react';
import { Lock, Send, X, ShieldCheck, Heart, Sparkles } from 'lucide-react';

interface AnonymousSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnonymousSuggestionModal({ isOpen, onClose }: AnonymousSuggestionModalProps) {
  const [category, setCategory] = useState('WORK_ENVIRONMENT');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content })
      });

      const data = await res.json();
      if (data.success) {
        setMsg({ text: data.message, type: 'success' });
        setContent('');
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setMsg({ text: data.error || 'فشل الإرسال', type: 'error' });
      }
    } catch {
      setMsg({ text: 'تعذر الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">صندوق المقترحات السري والمشفر</h3>
              <p className="text-xs text-slate-500 font-semibold">صوتك مسموع ومحمي بنسبة 100% بدون أي هوية</p>
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

        <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-[11px] text-purple-950 space-y-1 font-semibold">
          <p className="font-extrabold text-purple-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            ضمان الخصوصية والتشفير التام (Zero-Knowledge)
          </p>
          <p className="leading-relaxed">
            يتم تشفير نص المقترح بواسطة خوارزمية <span className="font-bold font-mono">AES-256</span> دون ربطه باسمك أو رقم حسابك أو كود موظفك. لا يمكن للإدارة معرفة هوية المرسل.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
          <div>
            <label className="block text-slate-900 font-bold mb-1">تصنيف الملاحظة أو المقترح:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="WORK_ENVIRONMENT">🏢 بيئة ومكان العمل والتجهيزات</option>
              <option value="IDEA">💡 فكرة لتطوير الخدمة وزيادة المبيعات</option>
              <option value="COMPENSATION">💰 الرواتب والعمولات والمستحقات</option>
              <option value="MANAGEMENT">📋 التنظيم الإداري وتوزيع الشفتات</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-900 font-bold mb-1">اكتب مقترحك أو ملاحظتك بكل حرية *</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="شاركنا رأيك أو أي مشكلة تواجهها بصراحة تامة..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {loading ? 'جاري التشفير والإرسال...' : 'إرسال المقترح بشكل مجهول ومشفر 🔒'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
