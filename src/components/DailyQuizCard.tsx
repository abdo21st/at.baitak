'use client';

import React, { useState, useEffect } from 'react';
import { Award, HelpCircle, CheckCircle2, XCircle, Sparkles, BookOpen } from 'lucide-react';

export default function DailyQuizCard() {
  const [quiz, setQuiz] = useState<any | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/training/quiz')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setQuiz(data.quiz);
      })
      .catch(() => {});
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
              تحدي الكويز اليومي
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold border border-indigo-400/30">
                {quiz.category}
              </span>
            </h4>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">سؤال اليوم 🎯</span>
      </div>

      <p className="text-xs sm:text-sm font-bold text-slate-200 leading-relaxed">
        {quiz.question}
      </p>

      <div className="space-y-2">
        {quiz.options.map((opt: string, idx: number) => {
          let btnClass = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-indigo-500';

          if (result) {
            if (idx === result.correctIndex) {
              btnClass = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-extrabold';
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
