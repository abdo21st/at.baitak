'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Package,
  Calendar,
  Building2,
  Activity,
  ArrowRight,
  Menu,
  X,
  UserCheck
} from 'lucide-react';


export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      label: 'لوحة التحكم والمؤشرات',
      href: '/pharmacy',
      icon: LayoutDashboard,
      color: 'text-blue-600',
      activeBg: 'bg-blue-50 text-blue-700 font-black border-r-4 border-blue-600'
    },
    {
      label: 'إدارة النواقص والطلبيات',
      href: '/pharmacy/shortages',
      icon: AlertTriangle,
      color: 'text-amber-600',
      badge: 'مهم',
      badgeColor: 'bg-amber-100 text-amber-800',
      activeBg: 'bg-amber-50 text-amber-700 font-black border-r-4 border-amber-600'
    },
    {
      label: 'سجل أنشطة المسؤولين',
      href: '/pharmacy/activities',
      icon: Activity,
      color: 'text-indigo-600',
      badge: 'عمليات',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      activeBg: 'bg-indigo-50 text-indigo-700 font-black border-r-4 border-indigo-600'
    },
    {
      label: 'دليل المخزون والجرد',
      href: '/pharmacy/inventory',
      icon: Package,
      color: 'text-cyan-600',
      activeBg: 'bg-cyan-50 text-cyan-700 font-black border-r-4 border-cyan-600'
    },
    {
      label: 'رادار مراقبة الصلاحيات',
      href: '/pharmacy/expiries',
      icon: Calendar,
      color: 'text-rose-600',
      badge: 'تنبيه',
      badgeColor: 'bg-rose-100 text-rose-800',
      activeBg: 'bg-rose-50 text-rose-700 font-black border-r-4 border-rose-600'
    },
    {
      label: 'دليل الشركات والموردين',
      href: '/pharmacy/suppliers',
      icon: Building2,
      color: 'text-purple-600',
      activeBg: 'bg-purple-50 text-purple-700 font-black border-r-4 border-purple-600'
    },
    {
      label: 'أوامر الشراء والتوريد',
      href: '/pharmacy/purchase-orders',
      icon: ShoppingCart,
      color: 'text-emerald-600',
      activeBg: 'bg-emerald-50 text-emerald-700 font-black border-r-4 border-emerald-600'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-cairo antialiased flex" dir="rtl">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-50 h-screen w-64 bg-white border-l border-slate-200 shadow-xl lg:shadow-none transition-transform duration-300 flex flex-col no-print ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xs font-black text-slate-900 leading-tight">إدارة المشتريات والمخزون</h1>
              <p className="text-[10px] text-emerald-600 font-bold">بوابة الصيدلية الذكية 🌿</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Back to Attendance System Link */}
        <div className="p-3">
          <Link
            href="/dashboard/admin"
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>نظام الحضور والرواتب</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
            أقسام المنظومة
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? item.activeBg
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-current' : item.color}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sync Status Badge */}
        <div className="p-3 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-slate-900 text-white text-[10px] space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-300">مزامنة سحابية لحظية</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <p className="text-slate-400 text-[9px]">متصل بـ PostgreSQL + Infinity</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:mr-64 min-h-screen flex flex-col transition-all print:mr-0 print:m-0 print:p-0 print:w-full print:block">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden sm:inline text-xs font-bold text-slate-600">
              منظومة إدارة المشتريات والمخزون الصيدلاني (مباشر)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pharmacy/shortages"
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
              <span>تجهيز طلبية شراء</span>
            </Link>

            <Link
              href="/pharmacy/activities"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>تسجيل جولة</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto print:max-w-full print:w-full print:p-0 print:m-0 print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
