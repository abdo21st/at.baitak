'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Sparkles, X, Smartphone, CheckCircle2, ChevronLeft, ArrowUpRight } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed / running in standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(Boolean(isStandaloneMode));
      return Boolean(isStandaloneMode);
    };

    if (checkStandalone()) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDevice);

    // Listen for beforeinstallprompt event (Android, Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto display prompt after small delay for optimal UX
      const dismissed = localStorage.getItem('pwa_prompt_dismissed_time');
      const now = Date.now();
      // Show immediately or after 1 hour if previously closed
      if (!dismissed || (now - Number(dismissed)) > 3600000) {
        setTimeout(() => setShowPrompt(true), 1200);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa_installed', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS and not standalone, show prompt after delay
    if (iosDevice && !checkStandalone()) {
      const dismissed = localStorage.getItem('pwa_prompt_dismissed_time');
      if (!dismissed || (Date.now() - Number(dismissed)) > 86400000) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    localStorage.setItem('pwa_prompt_dismissed_time', String(Date.now()));
  };

  if (isStandalone || installed || !showPrompt) {
    return null;
  }

  return (
    <aside aria-label="تثبيت التطبيق" className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500 font-cairo" dir="rtl">
      <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-5 border border-blue-500/30 shadow-2xl shadow-blue-950/80 relative overflow-hidden">
        
        {/* Glow background accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 left-3.5 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
          title="إغلاق مؤقت"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5">
          {/* Pharmacy Capsule App Icon */}
          <div className="relative w-14 h-14 rounded-2xl bg-white p-1.5 shrink-0 shadow-lg shadow-black/40 border border-white/20 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192.png"
              alt="شعار حضورك"
              className="w-full h-full object-contain"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-600/30 text-blue-300 border border-blue-400/30">
                تطبيق أندرويد الذكي
              </span>
              <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" /> صيدلية بيتك
              </span>
            </div>

            <h2 className="text-sm font-black text-white mt-1 leading-tight">
              تثبيت تطبيق حضورك على الشاشة الرئيسية
            </h2>
            
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              ثبّت التطبيق الآن لتسجيل الحضور والانصراف بلمسة واحدة وتفعيل تنبيهات الموقع والـ GPS تلقائياً.
            </p>
          </div>
        </div>

        {/* iOS Guide popup when requested */}
        {showIosGuide && (
          <div className="mt-3.5 p-3 rounded-2xl bg-white/10 border border-white/15 text-xs text-slate-200 space-y-2">
            <p className="font-extrabold text-amber-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> طريقة التثبيت على أجهزة iPhone / Safari:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
              <li>اضغط على زر المشاركة <span className="font-mono bg-white/20 px-1 py-0.5 rounded">⎋ (Share)</span> أسفل شاشة سفاري.</li>
              <li>مرر للأسفل واختر <span className="font-bold text-white bg-blue-600/40 px-1.5 py-0.5 rounded">إضافة إلى الصفحة الرئيسية (Add to Home Screen)</span>.</li>
              <li>اضغط على <span className="font-bold text-emerald-300">إضافة (Add)</span> أعلى الشاشة.</li>
            </ol>
          </div>
        )}

        {/* Actions Button */}
        <div className="mt-4 flex items-center gap-2.5 pt-1">
          <button
            onClick={handleInstallClick}
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-95"
          >
            <Download className="w-4 h-4 shrink-0" />
            {isIos ? 'عرض خطوات التثبيت على الآيفون' : 'تثبيت التطبيق على الشاشة الرئيسية الآن 📲'}
          </button>

          <button
            onClick={handleDismiss}
            className="px-3.5 h-12 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-2xl transition-all cursor-pointer"
          >
            لاحقاً
          </button>
        </div>

      </div>
    </aside>
  );
}
