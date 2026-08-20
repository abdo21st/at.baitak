'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Clock, Users, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessType, setBusinessType] = useState<'PHARMACY' | 'FIELD_SERVICE' | 'COMPANY'>('PHARMACY');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ tenantUrl: string; slug: string } | null>(null);

  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          slug,
          managerName,
          managerPhone,
          email,
          password,
          businessType
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessData({ tenantUrl: data.tenantUrl, slug });
      } else {
        setError(data.error || 'حدث خطأ أثناء التسجيل');
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white" dir="rtl">
      <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl my-8">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تجربة مجانية كاملة الميزات لمدة 14 يوماً</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            ابدأ مع منظومة «حضورك» الذكية
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            أنشئ بيئة العمل الخاصة بنشاطك التجاري في أقل من 30 ثانية
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 text-red-200 rounded-2xl text-xs font-bold mb-6 text-center">
            {error}
          </div>
        )}

        {successData ? (
          <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">تم إنشاء حساب ونطاق منشأتك بنجاح!</h3>
              <p className="text-xs text-slate-300">
                رابط تسجيل الدخول ولوحة التحكم الخاصة بنشاطك:
              </p>
              <div className="p-3.5 bg-slate-800/90 border border-indigo-500/40 rounded-xl font-mono text-sm text-blue-400 font-bold select-all" dir="ltr">
                https://{successData.slug}.mtapp.ly
              </div>
            </div>

            <a
              href={`/login`}
              className="inline-flex items-center justify-center gap-2 w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
            >
              الانتقال إلى لوحة التحكم وتسجيل الدخول
              <ArrowLeft className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-xs font-bold text-slate-300">
            {/* Business Type */}
            <div>
              <label className="block text-slate-200 mb-1.5">نوع النشاط التجاري:</label>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                {[
                  { id: 'PHARMACY', label: '🏥 صيدلية / مركز طبي' },
                  { id: 'FIELD_SERVICE', label: '🔧 خدمات فنية وميدانية' },
                  { id: 'COMPANY', label: '🏢 شركة / منشأة تجارية' }
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBusinessType(b.id as any)}
                    className={`p-3 rounded-xl border transition-all ${
                      businessType === b.id
                        ? 'border-blue-500 bg-blue-600/20 text-white font-extrabold shadow-inner'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Company Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-200 mb-1">اسم المنشأة أو الصيدلية *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="مثال: صيدلية الأمل"
                  className="w-full h-11 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-200 mb-1">النطاق الفرعي (Subdomain) *</label>
                <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl px-3 h-11 focus-within:border-blue-500" dir="ltr">
                  <span className="text-slate-500 text-xs font-mono select-none">.mtapp.ly</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="alamal"
                    className="w-full bg-transparent text-white font-mono font-bold focus:outline-none text-right pr-1"
                  />
                </div>
              </div>
            </div>

            {/* Manager Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-200 mb-1">اسم المسؤول / المدير *</label>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="مثال: د. محمد الفيتوري"
                  className="w-full h-11 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-200 mb-1">رقم واتساب المدير (مع الرمز) *</label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="+21891XXXXXXX"
                  className="w-full h-11 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 text-white font-mono text-left focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-200 mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@company.ly"
                  className="w-full h-11 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 text-white font-mono text-left focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-200 mb-1">كلمة المرور / الرقم السري *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'جاري تهيئة النشاط...' : 'إنشاء بيئة العمل وبدء التجربة المجانية 🚀'}
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-400 pt-2">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="text-blue-400 font-bold hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
