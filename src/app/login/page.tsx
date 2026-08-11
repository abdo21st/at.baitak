'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { initialUsers } from '@/lib/data-store';
import { Clock, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [employeeCode, setEmployeeCode] = useState('101');
  const [pinCode, setPinCode] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const foundUser = initialUsers.find(
      (u) => u.employeeCode === employeeCode.trim() && u.pinCode === pinCode.trim()
    );

    if (foundUser) {
      localStorage.setItem('currentUser', JSON.stringify(foundUser));

      if (foundUser.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/employee');
      }
    } else {
      setError('رقم الموظف أو الرقم السري غير صحيح');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        {/* App Branding Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Clock className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            نظام تدوين الساعات اليومي
          </h1>
          <p className="text-slate-500 text-xs font-semibold">
            أدخل رقم الموظف والرقم السري لبدء وتسجيل وقت الحضور والانصراف
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-slate-700 text-xs font-extrabold mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-4 h-4 text-emerald-600" />
              رقم الموظف (Employee ID)
            </label>
            <input
              type="text"
              required
              lang="en-US"
              dir="ltr"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="101"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold font-mono text-center text-lg focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-extrabold mb-1.5 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-600" />
              الرقم السري (PIN)
            </label>
            <input
              type="password"
              required
              lang="en-US"
              dir="ltr"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold font-mono text-center text-lg focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول للنظام'}
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
