'use client';

import React from 'react';
import { Clock, ShieldCheck, User as UserIcon, LogOut, Sparkles, Building2, QrCode } from 'lucide-react';
import { User } from '@/lib/types';

interface NavbarProps {
  user: User;
  onSwitchUser: (newUser: User) => void;
  allUsers: User[];
  onOpenBadge?: () => void;
}

export default function Navbar({ user, onSwitchUser, allUsers, onOpenBadge }: NavbarProps) {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  حضورك <span className="text-sky-600 font-extrabold text-sm">HodoorK</span>
                </h1>
                <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  الساعات المرنة v2.0
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                at.baitak.mtapp.ly
              </p>
            </div>
          </div>

          {/* User Profile & Demo Account Switcher */}
          <div className="flex items-center gap-4">
            {/* Printable ID Badge Button */}
            {onOpenBadge && (
              <button
                onClick={onOpenBadge}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-sky-600" />
                بطاقة ID المعرفية
              </button>
            )}

            {/* Quick Demo Role Switcher */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[11px] font-semibold px-2">تبديل الحساب التجريبي:</span>
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onSwitchUser(u)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    user.id === u.id
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {u.name.split(' ')[0]} ({u.role === 'ADMIN' ? 'مدير' : 'موظف'})
                </button>
              ))}
            </div>

            {/* User Avatar Info */}
            <div className="flex items-center gap-3 border-r border-slate-200 pr-4">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-sky-500 shadow-sm"
              />
              <div className="hidden sm:block text-right">
                <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  {user.name}
                  {user.role === 'ADMIN' && (
                    <ShieldCheck className="w-4 h-4 text-sky-600 fill-sky-100" />
                  )}
                </div>
                <div className="text-xs text-slate-500">{user.jobTitle}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
