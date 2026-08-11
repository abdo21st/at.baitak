'use client';

import React from 'react';
import { X, Printer, ShieldCheck, QrCode, Building2 } from 'lucide-react';
import { User } from '@/lib/types';

interface EmployeeBadgeModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function EmployeeBadgeModal({ user, isOpen, onClose }: EmployeeBadgeModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const qrData = encodeURIComponent(`EMPLOYEE_ID:${user.employeeCode}|EMAIL:${user.email}|NAME:${user.name}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-sky-600" />
            بطاقة الموظف المعرفية الرسمية (ID Badge)
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable ID Card */}
        <div id="printable-badge" className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white rounded-2xl p-6 shadow-xl border border-sky-500/30 text-center relative overflow-hidden my-2">
          {/* Badge Background Watermark */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              <span className="text-xs font-black tracking-wider text-sky-300">at.baitak.mtapp.ly</span>
            </div>
            <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/40">
              بطاقة رسمية
            </span>
          </div>

          {/* Photo & Main Info */}
          <div className="flex flex-col items-center my-3">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-sky-400 shadow-lg mb-3"
            />
            <h4 className="text-xl font-black text-white">{user.name}</h4>
            <p className="text-sky-300 text-xs font-semibold mt-0.5">{user.jobTitle}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700 text-xs font-mono font-bold text-sky-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              {user.employeeCode}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-center justify-between px-4">
            <div className="text-right text-[11px] text-slate-300 space-y-1">
              <div><strong className="text-slate-400">البريد:</strong> {user.email}</div>
              <div><strong className="text-slate-400">الهاتف:</strong> {user.phone || 'غير مدخل'}</div>
              <div><strong className="text-slate-400">الدور:</strong> {user.role === 'ADMIN' ? 'مدير نظام' : 'عضو فريق'}</div>
            </div>

            <div className="bg-white p-1.5 rounded-xl shadow-md border border-slate-200">
              <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 rounded" />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all text-sm"
          >
            <Printer className="w-4 h-4" />
            طباعة البطاقة مباشرة
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 text-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
