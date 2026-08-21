'use client';

import React, { useState, useEffect } from 'react';
import { Compass, ArrowLeft, ArrowRight, CheckCircle2, X, Sparkles } from 'lucide-react';

interface TourStep {
  targetId?: string;
  title: string;
  description: string;
  icon?: string;
}

const ONBOARDING_STEPS: TourStep[] = [
  {
    title: 'مرحباً بك في منظومة حضورك الذكية! 🚀',
    description: 'تم تصميم المنظومة لتوفر لك تجربة حضور وانصراف فائقة السرعة مع إدارة شاملة للعمليات والمستحقات.',
    icon: '👋'
  },
  {
    title: 'تسجيل الحضور والانصراف بضغطة واحدة',
    description: 'الزر الأزرق لتسجيل الدخول الفوري، والزر الأحمر لتسجيل الانصراف مع احتساب ساعات العمل ومستحقات الوردية بدقة تامة.',
    icon: '🔵'
  },
  {
    title: 'تسجيل الدخول بالبصمة (Passkey)',
    description: 'يمكنك تفعيل بصمة الإصبع أو الوجه من زر الأمان للدخول الفوري دون الحاجة لكتابة كلمة المرور.',
    icon: '🔒'
  },
  {
    title: 'الدعم الفني وصندوق المقترحات',
    description: 'يمكنك دائماً فتح تذكرة دعم فني أو إرسال مقترح سري ومشفر من القائمة العلوية في أي وقت.',
    icon: '💡'
  }
];

interface OnboardingTourProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function OnboardingTour({ isOpen: controlledIsOpen, onClose }: OnboardingTourProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  useEffect(() => {
    if (controlledIsOpen === undefined) {
      const completed = localStorage.getItem('hodoork_onboarding_completed');
      if (!completed) {
        const timer = setTimeout(() => setInternalIsOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [controlledIsOpen]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setInternalIsOpen(false);
    localStorage.setItem('hodoork_onboarding_completed', 'true');
    if (onClose) onClose();
  };

  if (!isModalOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{step.icon}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-blue-400">
                خطوة {currentStep + 1} من {ONBOARDING_STEPS.length}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleComplete}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-black text-white">{step.title}</h3>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 h-11 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              السابق
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{currentStep === ONBOARDING_STEPS.length - 1 ? 'ابدأ الاستخدام الآن 🚀' : 'التالي'}</span>
            {currentStep < ONBOARDING_STEPS.length - 1 && <ArrowLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
