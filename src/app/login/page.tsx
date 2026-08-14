'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { initialUsers } from '@/lib/data-store';
import { User } from '@/lib/types';
import { Clock, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [employeeCode, setEmployeeCode] = useState('101');
  const [pinCode, setPinCode] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const inputCode = employeeCode.trim();
    const inputPin = pinCode.trim();

    try {
      // Fetch live employees from PostgreSQL database
      const res = await fetch('/api/employees');
      const data = await res.json();
      const liveUsers: User[] = (data.success && data.users?.length > 0) ? data.users : initialUsers;

      const foundUser = liveUsers.find(
        (u) => u.employeeCode === inputCode && u.pinCode === inputPin
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
      }
    } catch {
      // Offline / fallback check
      const foundUser = initialUsers.find(
        (u) => u.employeeCode === inputCode && u.pinCode === inputPin
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
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        {/* App Branding Logo */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-white rounded-3xl p-2 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10 border border-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192.png"
              alt="صيدلية بيتك"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            حضورك | صيدلية بيتك
          </h1>
          <p className="text-slate-500 text-xs font-semibold">
            أدخل رقم الموظف والرقم السري لتسجيل أوقات الدوام ومتابعة المستحقات
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
              className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 font-bold font-mono text-center text-lg focus:outline-none focus:border-emerald-500 transition-all"
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
              className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 font-bold font-mono text-center text-lg focus:outline-none focus:border-emerald-500 transition-all"
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
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول للنظام'}
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
