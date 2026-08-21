'use client';

import React, { useState, useEffect } from 'react';
import { Award, HelpCircle, CheckCircle2, XCircle, Sparkles, BookOpen, RefreshCw } from 'lucide-react';

export default function DailyQuizCard() {
  const [quiz, setQuiz] = useState<any | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchQuiz = async (forceRandom = false) => {
    try {
      setLoading(true);
      const url = forceRandom ? '/api/training/quiz?random=true' : '/api/training/quiz';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.quiz) {
        setQuiz(data.quiz);
        // Check localStorage for saved result of this quiz
        if (!forceRandom && typeof window !== 'undefined') {
          const today = new Date().toISOString().substring(0, 10);
          const savedKey = `hodoork_quiz_${data.quiz.id}_${today}`;
          const savedData = localStorage.getItem(savedKey);
          if (savedData) {
            const parsed = JSON.parse(savedData);
            setSelectedIdx(parsed.selectedIdx);
            setResult(parsed.result);
          } else {
            setSelectedIdx(null);
            setResult(null);
          }
        } else {
          setSelectedIdx(null);
          setResult(null);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, []);

  if (!quiz) return null;

  const handleSelect = async (idx: number) => {
    if (result || loading) return;
    setSelectedIdx(idx);
    setLoading(true);

    try {
      const res = await fetch('/api/training/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          selectedIndex: idx
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        if (typeof window !== 'undefined') {
          const today = new Date().toISOString().substring(0, 10);
          const savedKey = `hodoork_quiz_${quiz.id}_${today}`;
          localStorage.setItem(savedKey, JSON.stringify({ selectedIdx: idx, result: data }));
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-5 md:p-6 border border-indigo-500/30 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-indigo-800/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
              تحدي الكويز والتدريب اليومي
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold border border-indigo-400/30">
                {quiz.category}
              </span>
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              type="button"
              onClick={() => fetchQuiz(true)}
              className="text-[11px] bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 px-2.5 py-1 rounded-xl font-bold border border-indigo-700/50 flex items-center gap-1 transition-all cursor-pointer"
              title="تجربة سؤال تدريبي آخر"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>سؤال إضافي</span>
            </button>
          )}
          <span className="text-[11px] text-slate-400 font-medium">سؤال اليوم 🎯</span>
        </div>
      </div>

      <p className="text-xs sm:text-sm font-bold text-slate-200 leading-relaxed">
        {quiz.question}
      </p>

      <div className="space-y-2">
        {quiz.options.map((opt: string, idx: number) => {
          let btnClass = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-indigo-500';

          if (result) {
            if (idx === result.correctIndex) {
              btnClass = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-extrabold shadow-sm';
            } else if (idx === selectedIdx && !result.isCorrect) {
              btnClass = 'bg-red-950/80 border-red-500 text-red-200 font-extrabold';
            } else {
              btnClass = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={Boolean(result) || loading}
              onClick={() => handleSelect(idx)}
              className={`w-full text-right p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between gap-2 ${btnClass} cursor-pointer`}
            >
              <span>{opt}</span>
              {result && idx === result.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {result && idx === selectedIdx && !result.isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {result && (
        <div className={`p-3.5 rounded-2xl text-xs space-y-1.5 animate-in fade-in duration-200 ${
          result.isCorrect ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200' : 'bg-red-950/60 border border-red-800 text-red-200'
        }`}>
          <p className="font-extrabold flex items-center gap-1.5">
            {result.isCorrect ? <Sparkles className="w-4 h-4 text-emerald-400" /> : <BookOpen className="w-4 h-4 text-red-400" />}
            {result.message}
          </p>
          <p className="text-[11px] opacity-90 leading-relaxed font-normal">
            💡 <span className="font-bold">الشرح والتوضيح:</span> {result.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
