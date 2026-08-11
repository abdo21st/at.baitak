'use client';

import React, { useState, useEffect } from 'react';
import { Play, Square, Clock, Stethoscope, FileText, CheckCircle2, Award, Zap, Sparkles } from 'lucide-react';
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
        setMsg({ text: `تم بدء شفت المناوبة الصيدلانية بنجاح الساعة ${checkInTime}`, type: 'success' });
      } else {
        setMsg({ text: data.error || 'حدث خطأ أثناء بدء الدوام', type: 'error' });
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
        setMsg({ text: `تم تسليم المناوبة وإنهاء الشفت وتدوين ${data.record.workHours} ساعة بنجاح!`, type: 'success' });
        setTaskNotes('');
      } else {
        setMsg({ text: data.error || 'حدث خطأ في إنهاء الشفت', type: 'error' });
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

  const target = user.targetMonthlyHours || 160;
  const progressPercent = Math.min(100, Math.round((monthlyTotalHours / target) * 100));

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-lg relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4 animate-spin text-emerald-600" style={{ animationDuration: '6s' }} />
            <span>الساعة الحية لمناوبة الصيدلية</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{currentTime || '--:--:--'}</h2>
          <p className="text-slate-500 text-xs mt-0.5">{currentDate}</p>
        </div>

        {/* Live Status indicator */}
        <div>
          {isWorking ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
              على رأس شفت المناوبة الصيدلانية
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              خارج الشفت - جاهز لبدء المناوبة
            </div>
          )}
        </div>
      </div>

      {/* Main Stopwatch Counter */}
      <div className="my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              عدّاد ساعات المناوبة الحية
            </span>
            {activeRecord?.projectName && (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-0.5 rounded-full text-xs font-extrabold">
                {activeRecord.projectName}
              </span>
            )}
          </div>

          <div className="my-6 text-center">
            <div className="text-5xl sm:text-6xl font-black font-mono tracking-wider text-slate-900">
              {isWorking ? formatStopwatch(elapsedSeconds) : '00:00:00'}
            </div>
            <span className="text-slate-500 text-xs mt-2 block font-medium">
              {isWorking ? `تم استلام الشفت الساعة ${activeRecord.checkInTime}` : 'اختر الفرع/الشفت وانقر على بدء المناوبة'}
            </span>
          </div>

          {/* Target Progress Bar */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600 flex items-center gap-1 font-bold">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                هدف مناوبات الشهر ({monthlyTotalHours} / {target} ساعة)
              </span>
              <span className="text-emerald-700 font-black">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right 5 cols: Options & Start/Stop Controls */}
        <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between space-y-4">
          {!isWorking ? (
            <>
              <div>
                <label className="block text-slate-700 text-xs font-extrabold mb-1.5 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  اختيار فرع الصيدلية أو الشفت (اختياري)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="">بدون تحديد فرع (بدء دوام مناوبة سريع)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.clientName ? `(${p.clientName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-extrabold mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  ملاحظات أو مهام المناوبة (اختياري)
                </label>
                <input
                  type="text"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="مثال: استلام الوصفات الطبية، جرد الأدوية..."
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleStartSession(selectedProjectId ? 'PROJECT' : 'QUICK')}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {selectedProjectId ? 'بدء مناوبة الفرع' : 'بدء شفت سريع'}
                </button>

                <button
                  onClick={() => handleStartSession('QUICK')}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-emerald-700 border border-slate-300 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  تسجيل استلام الدوام
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-slate-700 text-xs font-extrabold mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  تعديل ملخص الإنجاز وتصفية الشفت قبل التسليم
                </label>
                <textarea
                  rows={3}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="اكتب تم تسليم الشفت والوصفات وحالة الصيدلية..."
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleStopSession}
                disabled={loading}
                className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                <Square className="w-5 h-5 fill-white" />
                {loading ? 'جاري إنهاء وتدوين الشفت...' : 'تسليم المناوبة وإنهاء الشفت'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold text-center transition-all ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
