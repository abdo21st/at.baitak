'use client';

import React, { useState, useEffect } from 'react';
import { Play, Square, Clock, FolderKanban, FileText, CheckCircle2, Award, Zap, Sparkles } from 'lucide-react';
import { User, AttendanceRecord, Project } from '@/lib/types';
import { getCurrentTimeFormatted } from '@/lib/utils';

interface WorkTimerCardProps {
  user: User;
  projects: Project[];
  activeRecord: AttendanceRecord | null;
  monthlyTotalHours: number;
  onAttendanceUpdated: (record: AttendanceRecord) => void;
}

export default function WorkTimerCard({
  user,
  projects,
  activeRecord,
  monthlyTotalHours,
  onAttendanceUpdated
}: WorkTimerCardProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [taskNotes, setTaskNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Live real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Elapsed stopwatch calculation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeRecord && activeRecord.checkInTime && !activeRecord.checkOutTime) {
      const calcElapsed = () => {
        const [h, m, s] = activeRecord.checkInTime.split(':').map(Number);
        const start = new Date();
        start.setHours(h, m, s || 0, 0);

        const now = new Date();
        const diff = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
        setElapsedSeconds(diff);
      };

      calcElapsed();
      interval = setInterval(calcElapsed, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeRecord]);

  const isWorking = !!activeRecord?.checkInTime && !activeRecord?.checkOutTime;

  const handleStartSession = async (method: 'QUICK' | 'PROJECT') => {
    setLoading(true);
    setMsg(null);

    const proj = projects.find((p) => p.id === selectedProjectId);
    const checkInTime = getCurrentTimeFormatted();

    try {
      const payload = {
        userId: user.id,
        userName: user.name,
        employeeCode: user.employeeCode,
        date: new Date().toISOString().split('T')[0],
        checkInTime,
        projectId: method === 'PROJECT' ? selectedProjectId : undefined,
        projectName: method === 'PROJECT' ? proj?.name : undefined,
        taskNotes: taskNotes || undefined,
        method
      };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onAttendanceUpdated(data.record);
        setMsg({ text: `تم بدء جلسة العمل في تمام الساعة ${checkInTime}`, type: 'success' });
      } else {
        setMsg({ text: data.error || 'حدث خطأ أثناء بدء العمل', type: 'error' });
      }
    } catch {
      setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (!activeRecord) return;
    setLoading(true);
    setMsg(null);

    const checkOutTime = getCurrentTimeFormatted();

    try {
      const payload = {
        recordId: activeRecord.id,
        checkOutTime,
        checkInTime: activeRecord.checkInTime,
        taskNotes: taskNotes || activeRecord.taskNotes
      };

      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onAttendanceUpdated(data.record);
        setMsg({ text: `تم إنهاء جلسة العمل وتدوين ${data.record.workHours} ساعة بنجاح!`, type: 'success' });
        setTaskNotes('');
      } else {
        setMsg({ text: data.error || 'حدث خطأ في إنهاء العمل', type: 'error' });
      }
    } catch {
      setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatStopwatch = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress towards target monthly hours
  const target = user.targetMonthlyHours || 160;
  const progressPercent = Math.min(100, Math.round((monthlyTotalHours / target) * 100));

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-sky-500/20 shadow-2xl relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full filter blur-3xl opacity-10 pointer-events-none ${isWorking ? 'bg-emerald-500' : 'bg-sky-500'}`} />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4 animate-spin text-sky-400" style={{ animationDuration: '6s' }} />
            <span>الساعة الحالية للنظام</span>
          </div>
          <h2 className="text-3xl font-black text-white mt-1 tracking-tight">{currentTime || '--:--:--'}</h2>
          <p className="text-slate-400 text-xs mt-0.5">{currentDate}</p>
        </div>

        {/* Live Status indicator */}
        <div>
          {isWorking ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              نشط الآن - قيد تدوين ساعات العمل
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              متوقف - جاهز لبدء الدوام
            </div>
          )}
        </div>
      </div>

      {/* Main Stopwatch Counter & Target Goal */}
      <div className="my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 cols: Stopwatch */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-400" />
              عداد الوقت المباشر للجلسة الحالية
            </span>
            {activeRecord?.projectName && (
              <span className="bg-sky-950 text-sky-300 border border-sky-800/60 px-3 py-0.5 rounded-full text-xs font-semibold">
                {activeRecord.projectName}
              </span>
            )}
          </div>

          <div className="my-6 text-center">
            <div className="text-5xl sm:text-6xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-300">
              {isWorking ? formatStopwatch(elapsedSeconds) : '00:00:00'}
            </div>
            <span className="text-slate-400 text-xs mt-2 block font-medium">
              {isWorking ? `تم بدء الجلسة في الساعة ${activeRecord.checkInTime}` : 'انقر على زر البدء لتدوين وقت العمل'}
            </span>
          </div>

          {/* Target Progress Bar */}
          <div className="border-t border-slate-800/80 pt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                إنجاز الهدف الشهري ({monthlyTotalHours} / {target} ساعة)
              </span>
              <span className="text-sky-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right 5 cols: Options & Start/Stop Controls */}
        <div className="lg:col-span-5 bg-slate-900/50 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-4">
          {!isWorking ? (
            <>
              {/* Optional Project Selector */}
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-sky-400" />
                  اختيار مشروع الدوام (اختياري)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="">بدون مشروع (تسجيل دوام حر مباشر)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.clientName ? `(${p.clientName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Notes */}
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-400" />
                  ملاحظات أو مهام الجلسة (اختياري)
                </label>
                <input
                  type="text"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="مثال: تطوير واجهة التسجيل وإصلاح الثغرات..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleStartSession(selectedProjectId ? 'PROJECT' : 'QUICK')}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {selectedProjectId ? 'بدء عمل المشروع' : 'بدء دوام سريع'}
                </button>

                <button
                  onClick={() => handleStartSession('QUICK')}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  تدوين فوري
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Working Session Notes update */}
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  تعديل ملخص الإنجاز أو الملاحظات عند الإنهاء
                </label>
                <textarea
                  rows={3}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="اكتب ماذا أنجزت في هذه الجلسة قبل الإنهاء..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Stop Session Button */}
              <button
                onClick={handleStopSession}
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-base rounded-xl shadow-xl flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                <Square className="w-5 h-5 fill-white" />
                {loading ? 'جاري إنهاء وتدوين الساعات...' : 'إنهاء الجلسة وتدوين ساعات العمل'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold text-center transition-all ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
