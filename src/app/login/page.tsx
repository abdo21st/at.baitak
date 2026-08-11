'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ShieldCheck, UserCheck, ArrowLeft, Building2, Sparkles } from 'lucide-react';
import { initialUsers } from '@/lib/data-store';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@baitak.mtapp.ly');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const user = initialUsers.find((u) => u.email === email) || initialUsers[0];

    setTimeout(() => {
      if (user.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/employee');
      }
    }, 400);
  };

  const handleQuickDemoLogin = (targetUser: typeof initialUsers[0]) => {
    if (targetUser.role === 'ADMIN') {
      router.push('/dashboard/admin');
    } else {
      router.push('/dashboard/employee');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl relative overflow-hidden">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg shadow-sky-500/20 mb-4">
            <Clock className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            حضورك <span className="text-sky-600">HodoorK</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            نظام إدارة وتدوين ساعات العمل والمشاريع (at.baitak.mtapp.ly)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-semibold focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-semibold focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all text-sm mt-2"
          >
            <UserCheck className="w-4 h-4" />
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول للنظام'}
          </button>
        </form>

        {/* Demo Fast Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <span className="text-slate-400 text-[11px] font-bold block text-center mb-3">
            أو اختيار حساب تجريبي للدخول الفوري:
          </span>
          <div className="space-y-2">
            <button
              onClick={() => handleQuickDemoLogin(initialUsers[0])}
              className="w-full p-2.5 bg-slate-50 hover:bg-sky-50 text-slate-800 border border-slate-200 hover:border-sky-300 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span>حساب المدير (م. خالد العتيبي)</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => handleQuickDemoLogin(initialUsers[1])}
              className="w-full p-2.5 bg-slate-50 hover:bg-emerald-50 text-slate-800 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>حساب الموظف (أحمد علي)</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
