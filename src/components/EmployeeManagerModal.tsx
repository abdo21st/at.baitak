'use client';

import React, { useState } from 'react';
import { X, UserPlus, Users, FileSpreadsheet, Download, ShieldCheck, Mail, Phone, HeartPulse } from 'lucide-react';
import { User } from '@/lib/types';
import * as XLSX from 'xlsx';

interface EmployeeManagerModalProps {
  users: User[];
  isOpen: boolean;
  onClose: () => void;
  onUsersUpdated: () => void;
}

export default function EmployeeManagerModal({ users, isOpen, onClose, onUsersUpdated }: EmployeeManagerModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState('50');
  const [targetMonthlyHours, setTargetMonthlyHours] = useState('160');
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setMsg('يرجى تعبئة الاسم والبريد الإلكتروني');
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          employeeCode,
          jobTitle,
          phone,
          hourlyRate: Number(hourlyRate) || 0,
          targetMonthlyHours: Number(targetMonthlyHours) || 160,
          role
        })
      });

      const data = await res.json();
      if (data.success) {
        onUsersUpdated();
        setName('');
        setEmail('');
        setEmployeeCode('');
        setJobTitle('');
        setPhone('');
        setMsg('تمت إضافة الصيدلي/الموظف بنجاح!');
      } else {
        setMsg(data.error || 'خطأ في إضافة الموظف');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const exportEmployeesExcel = () => {
    const data = users.map((u) => ({
      'كود الصيدلي': u.employeeCode,
      'الاسم الكامل': u.name,
      'البريد الإلكتروني': u.email,
      'المسمى الوظيفي': u.jobTitle,
      'الهاتف': u.phone,
      'أجر الساعة (د.ل)': u.hourlyRate,
      'ساعات المناوبة المستهدفة شهرياً': u.targetMonthlyHours,
      'الدور': u.role === 'ADMIN' ? 'مدير الصيدلية' : 'صيدلي'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الكادر_الصيدلاني');
    XLSX.writeFile(wb, `قائمة_الأطقم_الصيدلانية_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-600" />
            إدارة الكادر الصيدلاني وأجر الساعة بالدينار الليبي (د.ل)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={exportEmployeesExcel}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              تصدير Excel
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* New Employee Form */}
          <form onSubmit={handleAddEmployee} className="md:col-span-5 space-y-3 text-xs">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
              إضافة صيدلي / موظف جديد
            </h4>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">الاسم الكامل *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="د. علي الشريف..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">البريد الإلكتروني *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ali@baitak.mtapp.ly"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">الكود الوظيفي</label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="PHARM-105"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">المسمى الوظيفي</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="صيدلي مناوب"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">سعر الساعة (د.ل)</label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">الهدف الشهري (ساعة)</label>
                <input
                  type="number"
                  value={targetMonthlyHours}
                  onChange={(e) => setTargetMonthlyHours(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">الدور والصلاحية</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'EMPLOYEE')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="EMPLOYEE">صيدلي / كادر صيدلاني (EMPLOYEE)</option>
                <option value="ADMIN">مدير الصيدليات (ADMIN)</option>
              </select>
            </div>

            {msg && <p className="text-emerald-600 font-semibold text-center">{msg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs"
            >
              {loading ? 'جاري الإضافة...' : 'حفظ الصيدلي في النظام'}
            </button>
          </form>

          {/* Existing Pharmacy Staff List */}
          <div className="md:col-span-7 border-r border-slate-100 pr-0 md:pr-4 flex flex-col justify-between">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-3">
                الأطقم الصيدلانية الحالية ({users.length})
              </h4>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {users.map((u) => (
                  <div key={u.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-emerald-500" />
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {u.name}
                          <span className="text-[10px] text-slate-400 font-mono">({u.employeeCode})</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{u.jobTitle} - {u.email}</div>
                      </div>
                    </div>

                    <div className="text-left font-mono font-bold text-emerald-700">
                      <div>{u.hourlyRate} د.ل/ساعة</div>
                      <div className="text-[10px] text-slate-400">هدف: {u.targetMonthlyHours}h</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 mt-4 text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
