'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, AttendanceRecord, CompanySettings } from '@/lib/types';

import {
  Clock, Calendar, Coins, CheckCircle2, AlertCircle, LogOut,
  Play, Square, Zap, User as UserIcon, Lock,
  Building2, Briefcase, KeyRound, Eye, EyeOff, History,
  MapPin, Navigation, Bell, ShieldAlert
} from 'lucide-react';
import { getCurrentTimeFormatted, getCurrentDateFormatted, calculateGpsDistanceMeters } from '@/lib/utils';

type Tab = 'attendance' | 'history' | 'profile' | 'password';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const [pageLoading, setPageLoading] = useState(true);

  // GPS & Geofencing State
  const [gpsConfig, setGpsConfig] = useState<CompanySettings | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [isInsideZone, setIsInsideZone] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const prevZoneRef = useRef<boolean | null>(null);

  // Date / Time selectors
  const recentDatesList = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const hoursList   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const [selectedDate,   setSelectedDate]   = useState<string>(getCurrentDateFormatted());
  const [checkInHour,    setCheckInHour]    = useState<string>('08');
  const [checkInMinute,  setCheckInMinute]  = useState<string>('00');
  const [checkOutHour,   setCheckOutHour]   = useState<string>('16');
  const [checkOutMinute, setCheckOutMinute] = useState<string>('00');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Previous months
  const [allRecords,     setAllRecords]     = useState<AttendanceRecord[]>([]);
  const [selectedMonth,  setSelectedMonth]  = useState<string>('');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Profile
  const [profileData,    setProfileData]    = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change
  const [currentPin,  setCurrentPin]  = useState('');
  const [newPin,      setNewPin]      = useState('');
  const [confirmPin,  setConfirmPin]  = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pinMsg,      setPinMsg]      = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [pinLoading,  setPinLoading]  = useState(false);

  // Fetch Company Settings (GPS configuration)
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          setGpsConfig(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  // Request Notification permission
  const requestNotificationAccess = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Track Geolocation Position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('تحديد الموقع الجغرافي (GPS) غير مدعوم في هذا المتصفح');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        setGpsError(null);

        if (gpsConfig?.gpsEnabled && gpsConfig.gpsLatitude && gpsConfig.gpsLongitude) {
          const dist = calculateGpsDistanceMeters(lat, lng, gpsConfig.gpsLatitude, gpsConfig.gpsLongitude);
          setGpsDistance(dist);
          const inside = dist <= (gpsConfig.gpsRadiusMeters || 200);
          setIsInsideZone(inside);

          // Trigger Push Notification when entering or exiting zone
          if (prevZoneRef.current !== null && prevZoneRef.current !== inside) {
            if (inside) {
              if (Notification.permission === 'granted') {
                new Notification('📍 أهلاً بك في موقع العمل!', {
                  body: `لقد دخلت نطاق العمل المحدد (${dist} متر من المقر). يمكنك تسجيل الدوام الآن.`,
                  icon: '/favicon.ico'
                });
              }
            } else {
              if (Notification.permission === 'granted') {
                new Notification('⚠️ غادرت موقع العمل!', {
                  body: `لقد خرجت من نطاق العمل المحدد (${dist} متر من المقر). لا تنسَ تسجيل الانصراف.`,
                  icon: '/favicon.ico'
                });
              }
            }
          }
          prevZoneRef.current = inside;
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('تم رفض إذن تحديد الموقع الجغرافي. يُرجى التفعيل من إعدادات المتصفح.');
        } else {
          setGpsError('عذراً، متعذر تحديد الموقع الجغرافي حالياً.');
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsConfig]);

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (!stored) { router.push('/login'); return; }
    try {
      const parsedUser: User = JSON.parse(stored);
      setUser(parsedUser);
      // جلب سجلات الحضور الفعلية من API
      fetch(`/api/attendance?userId=${parsedUser.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.records) setRecords(data.records);
        })
        .catch(() => {})
        .finally(() => setPageLoading(false));
    } catch {
      router.push('/login');
    }
  }, []);

  const userRecords  = user ? records.filter((r) => r.userId === user.id) : [];
  const activeRecord = userRecords.find((r) => !r.checkOutTime) || null;
  const isCheckedIn  = !!activeRecord;

  const totalMonthlyHours  = Number(userRecords.reduce((a, r) => a + (r.workHours  || 0), 0).toFixed(2));
  const totalMonthlyEarned = Number(userRecords.reduce((a, r) => a + (r.earnedCost || 0), 0).toFixed(2));

  const formatHoursText = (h: number) => {
    if (!h && h !== 0) return '0 دقيقة';
    const total = Math.round(h * 60);
    const hrs   = Math.floor(total / 60);
    const mins  = total % 60;
    if (hrs > 0 && mins > 0)  return `${hrs} ساعة و ${mins} دقيقة`;
    if (hrs > 0 && mins === 0) return `${hrs} ساعة`;
    return `${mins} دقيقة`;
  };

  const monthOptions = React.useMemo(() => {
    const months = new Set<string>();
    allRecords.forEach((r) => { if (r.date) months.add(r.date.slice(0, 7)); });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [allRecords]);

  const historyRecords = selectedMonth ? allRecords.filter((r) => r.date?.startsWith(selectedMonth)) : [];
  const historyHours   = Number(historyRecords.reduce((a, r) => a + (r.workHours  || 0), 0).toFixed(2));
  const historyEarned  = Number(historyRecords.reduce((a, r) => a + (r.earnedCost || 0), 0).toFixed(2));

  const loadHistory = async () => {
    if (!user || allRecords.length > 0) return;
    setHistoryLoading(true);
    try {
      const res  = await fetch(`/api/attendance?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setAllRecords(data.records);
        const months = Array.from(new Set<string>(
          (data.records as AttendanceRecord[]).map((r) => r.date?.slice(0, 7) || '')
        )).filter(Boolean).sort((a, b) => b.localeCompare(a));
        if (months.length > 0) setSelectedMonth(months[0]);
      }
    } catch {}
    setHistoryLoading(false);
  };

  const loadProfile = async () => {
    if (!user || profileData) return;
    setProfileLoading(true);
    try {
      const res  = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        const found = data.users.find((u: User) => u.id === user.id);
        setProfileData(found || user);
      }
    } catch { setProfileData(user); }
    setProfileLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'profile') loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true); setMsg(null);
    try {
      const res  = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, userName: user.name, employeeCode: user.employeeCode,
          date: selectedDate, checkInTime: `${checkInHour}:${checkInMinute}:00`,
          checkInLat: userLat, checkInLng: userLng
        })
      });
      const data = await res.json();
      if (data.success) {
        setRecords((p) => [data.record, ...p]);
        let textMsg = `تم تسجيل وقت الحضور (${checkInHour}:${checkInMinute}) بنجاح!`;
        if (data.warning) textMsg = `${textMsg} — ${data.warning}`;
        setMsg({ text: textMsg, type: data.isOutsideGps ? 'error' : 'success' });
      } else setMsg({ text: data.error || 'خطأ في تسجيل الحضور', type: 'error' });
    } catch { setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' }); }
    setLoading(false);
  };

  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;
    const formattedCheckOut = `${checkOutHour}:${checkOutMinute}:00`;
    if (activeRecord.checkInTime) {
      const [inH, inM] = activeRecord.checkInTime.split(':').map(Number);
      const inMins  = inH * 60 + inM;
      const outMins = Number(checkOutHour) * 60 + Number(checkOutMinute);
      if (outMins < inMins && !(inH >= 18 && Number(checkOutHour) < 12)) {
        setMsg({ text: `خطأ: وقت الانصراف (${checkOutHour}:${checkOutMinute}) قبل وقت الحضور (${activeRecord.checkInTime})!`, type: 'error' });
        return;
      }
    }
    setLoading(true); setMsg(null);
    try {
      const res  = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: activeRecord.id,
          checkOutTime: formattedCheckOut,
          checkOutLat: userLat,
          checkOutLng: userLng
        })
      });
      const data = await res.json();
      if (data.success) {
        setRecords((p) => p.map((r) => r.id === data.record.id ? data.record : r));
        let textMsg = `تم تسجيل الانصراف — ${formatHoursText(data.record.workHours)} — ${data.record.earnedCost} د.ل`;
        if (data.warning) textMsg = `${textMsg} — ${data.warning}`;
        setMsg({ text: textMsg, type: data.isOutsideGps ? 'error' : 'success' });
      } else setMsg({ text: data.error || 'خطأ في تسجيل الانصراف', type: 'error' });
    } catch { setMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' }); }
    setLoading(false);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPinMsg(null);
    if (currentPin !== user.pinCode) { setPinMsg({ text: 'كلمة السر الحالية غير صحيحة', type: 'error' }); return; }
    if (newPin.length < 4)            { setPinMsg({ text: 'كلمة السر الجديدة يجب أن تكون 4 أرقام على الأقل', type: 'error' }); return; }
    if (newPin !== confirmPin)        { setPinMsg({ text: 'كلمة السر الجديدة وتأكيدها غير متطابقتين', type: 'error' }); return; }
    setPinLoading(true);
    try {
      const res  = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, pinCode: newPin })
      });
      const data = await res.json();
      if (data.success) {
        const updatedUser: User = { ...user, pinCode: newPin };
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setPinMsg({ text: 'تم تغيير كلمة السر بنجاح!', type: 'success' });
        setCurrentPin(''); setNewPin(''); setConfirmPin('');
      } else setPinMsg({ text: data.error || 'خطأ في تغيير كلمة السر', type: 'error' });
    } catch { setPinMsg({ text: 'خطأ في الاتصال بالخادم', type: 'error' }); }
    setPinLoading(false);
  };

  const handleLogout = () => { localStorage.removeItem('currentUser'); router.push('/login'); };

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    const names = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return `${names[Number(m) - 1]} ${y}`;
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'attendance', label: 'الدوام الحالي',    icon: <Clock    className="w-4 h-4" /> },
    { id: 'history',   label: 'الأشهر السابقة',   icon: <History  className="w-4 h-4" /> },
    { id: 'profile',   label: 'بياناتي',           icon: <UserIcon className="w-4 h-4" /> },
    { id: 'password',  label: 'تغيير كلمة السر',  icon: <KeyRound className="w-4 h-4" /> },
  ];

  const AttendanceTable = ({ rows }: { rows: AttendanceRecord[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
            {['التاريخ','وقت الحضور','وقت الانصراف','ساعات اليوم','قيمة الساعات','توثيق المدير'].map((h) => (
              <th key={h} className="py-3.5 px-4 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {rows.length === 0
            ? <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-sans">لا يوجد سجلات.</td></tr>
            : rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900 font-sans">{r.date}</td>
                <td className="py-3.5 px-4 text-blue-600 font-bold">{r.checkInTime  || '--:--'}</td>
                <td className="py-3.5 px-4 text-red-600  font-bold">{r.checkOutTime || '--:--'}</td>
                <td className="py-3.5 px-4 text-center font-black">{formatHoursText(r.workHours)}</td>
                <td className="py-3.5 px-4 text-center font-black text-teal-700">{r.earnedCost} د.ل</td>
                <td className="py-3.5 px-4 text-center font-sans">
                  {r.isVerified
                    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-extrabold"><CheckCircle2 className="w-3.5 h-3.5" />موثّق</span>
                    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-extrabold"><AlertCircle className="w-3.5 h-3.5" />بانتظار التوثيق</span>
                  }
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );

  // عرض شاشة التحميل حتى يُحمَّل المستخدم وسجلاته
  if (pageLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="text-slate-400 font-cairo font-bold text-sm">جاري تحميل بيانات الموظف...</div>
      </div>
    );
  }

  const p = profileData || user;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-cairo" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">تسجيل دوام الموظف ({user.name})</h1>
              <p className="text-slate-500 text-xs font-semibold">
                رقم الموظف: <span className="font-mono text-blue-700 font-bold">{user.employeeCode}</span>
                {' | '}أجر الساعة: <span className="font-mono text-slate-900 font-bold">{user.hourlyRate} د.ل</span>
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer">
            <LogOut className="w-4 h-4" />خروج
          </button>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-slate-100">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* TAB: الدوام الحالي */}
        {activeTab === 'attendance' && (<>
          {/* GPS Status & Geofencing Card */}
          {gpsConfig?.gpsEnabled && (
            <div className={`p-4 rounded-3xl border shadow-sm transition-all flex flex-col sm:flex-row items-center justify-between gap-4 font-cairo ${
              isInsideZone === true
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : isInsideZone === false
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center gap-3 text-xs">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                  isInsideZone === true
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isInsideZone === false
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {isInsideZone === true ? <MapPin className="w-5 h-5" /> : isInsideZone === false ? <ShieldAlert className="w-5 h-5" /> : <Navigation className="w-5 h-5 animate-pulse" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                    تحديد الموقع الجغرافي (GPS)
                    {isInsideZone === true && <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-black">داخل النطاق 🟢</span>}
                    {isInsideZone === false && <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">خارج النطاق ⚠️</span>}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-600">
                    {gpsError ? (
                      <span className="text-rose-600 font-bold">{gpsError}</span>
                    ) : gpsDistance !== null ? (
                      `تبعد حالياً ${gpsDistance} متر عن مقر العمل (المسافة المسموحة: ${gpsConfig.gpsRadiusMeters || 200} متر)`
                    ) : (
                      'جاري جلب إحداثيات الموقع الجغرافي...'
                    )}
                  </p>
                </div>
              </div>

              {notifPermission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
                <button
                  type="button"
                  onClick={requestNotificationAccess}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Bell className="w-4 h-4" />
                  تفعيل تنبيهات الدخول والخروج
                </button>
              )}
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />اختيار وقت الحضور والانصراف
              </h2>
            </div>
            {!isCheckedIn ? (
              <form onSubmit={handleCheckInSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-bold">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-800 font-black text-sm">اختيار التاريخ</label>
                      <button type="button" onClick={() => setSelectedDate(getCurrentDateFormatted())} className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-xs font-black rounded-lg transition-all cursor-pointer shadow-sm border border-sky-200 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />تاريخ اليوم
                      </button>
                    </div>
                    <div className="block text-[11px] text-transparent mb-1 select-none">.</div>
                    <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm">
                      {recentDatesList.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-800 font-black text-sm">اختيار وقت الحضور</label>
                      <button type="button" onClick={() => { const p = getCurrentTimeFormatted().split(':'); setCheckInHour(p[0]||'08'); setCheckInMinute(p[1]||'00'); }} className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-black rounded-lg transition-all cursor-pointer shadow-sm border border-blue-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />الوقت الحالي
                      </button>
                    </div>
                    <div className="flex items-center gap-2 font-mono" dir="ltr">
                      <div className="flex-1">
                        <label className="block text-sm text-slate-700 mb-1 text-center font-sans font-extrabold">Hour / الساعة</label>
                        <select value={checkInHour} onChange={(e) => setCheckInHour(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-center text-base font-black focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm">
                          {hoursList.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <span className="text-xl font-black text-slate-400 self-end pb-3">:</span>
                      <div className="flex-1">
                        <label className="block text-sm text-slate-700 mb-1 text-center font-sans font-extrabold">Min / الدقيقة</label>
                        <select value={checkInMinute} onChange={(e) => setCheckInMinute(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-center text-base font-black focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm">
                          {minutesList.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-4">
                  <Play className="w-5 h-5 fill-white" />{loading ? 'جاري التسجيل...' : 'تسجيل وقت الحضور'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCheckOutSubmit} className="space-y-5">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs font-bold text-blue-900">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-blue-600" /><span>تم تسجيل الحضور لهذا اليوم ({activeRecord.date}):</span></div>
                  <span className="font-mono text-sm font-black text-blue-700 bg-white px-3 py-1 rounded-xl border border-blue-200">{activeRecord.checkInTime}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-800 font-black text-sm">اختيار وقت الانصراف</label>
                    <button type="button" onClick={() => { const p = getCurrentTimeFormatted().split(':'); setCheckOutHour(p[0]||'16'); setCheckOutMinute(p[1]||'00'); }} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-black rounded-lg transition-all cursor-pointer shadow-sm border border-red-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />الوقت الحالي
                    </button>
                  </div>
                  <div className="flex items-center gap-2 font-mono" dir="ltr">
                    <div className="flex-1">
                      <label className="block text-sm text-slate-700 mb-1 text-center font-sans font-extrabold">Hour / الساعة</label>
                      <select value={checkOutHour} onChange={(e) => setCheckOutHour(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-center text-base font-black focus:outline-none focus:border-red-500 cursor-pointer shadow-sm">
                        {hoursList.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <span className="text-xl font-black text-slate-400 self-end pb-3">:</span>
                    <div className="flex-1">
                      <label className="block text-sm text-slate-700 mb-1 text-center font-sans font-extrabold">Min / الدقيقة</label>
                      <select value={checkOutMinute} onChange={(e) => setCheckOutMinute(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-center text-base font-black focus:outline-none focus:border-red-500 cursor-pointer shadow-sm">
                        {minutesList.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-base rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <Square className="w-5 h-5 fill-white" />{loading ? 'جاري التسجيل...' : 'تسجيل وقت الانصراف'}
                </button>
              </form>
            )}
            {msg && (
              <div className={`p-3.5 rounded-2xl text-xs font-extrabold text-center max-w-md mx-auto ${msg.type === 'success' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {msg.text}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Clock className="w-7 h-7" /></div>
              <div>
                <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي ساعات العمل هذا الشهر</span>
                <span className="text-3xl font-black text-slate-900">{formatHoursText(totalMonthlyHours)}</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center"><Coins className="w-7 h-7" /></div>
              <div>
                <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي قيمة الساعات لهذا الشهر</span>
                <span className="text-3xl font-black text-teal-700">{totalMonthlyEarned} د.ل</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" />جدول ساعات عمل الشهر الحالي</h2>
            <AttendanceTable rows={userRecords} />
          </div>
        </>)}

        {/* TAB: الأشهر السابقة */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><History className="w-5 h-5 text-blue-600" />سجل الأشهر السابقة</h2>
            {historyLoading ? (
              <div className="py-10 text-center text-slate-400">جاري تحميل السجلات...</div>
            ) : monthOptions.length === 0 ? (
              <div className="py-10 text-center text-slate-400">لا توجد سجلات سابقة.</div>
            ) : (<>
              <div className="flex items-center gap-3">
                <label className="text-slate-700 font-black text-sm whitespace-nowrap">اختر الشهر:</label>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm">
                  {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                </select>
              </div>
              {selectedMonth && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 font-sans font-bold">إجمالي الساعات</p>
                      <p className="text-xl font-black text-slate-900">{formatHoursText(historyHours)}</p>
                    </div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 flex items-center gap-3">
                    <Coins className="w-6 h-6 text-teal-600 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 font-sans font-bold">إجمالي المستحقات</p>
                      <p className="text-xl font-black text-teal-700">{historyEarned} د.ل</p>
                    </div>
                  </div>
                </div>
              )}
              <AttendanceTable rows={historyRecords} />
            </>)}
          </div>
        )}

        {/* TAB: بياناتي */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><UserIcon className="w-5 h-5 text-blue-600" />بياناتي الوظيفية</h2>
            {profileLoading ? (
              <div className="py-10 text-center text-slate-400">جاري تحميل البيانات...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold mb-1">اسم الموظف</p>
                  <p className="text-base font-black text-slate-900">{p.name}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold mb-1">رقم الموظف (ID)</p>
                  <p className="text-base font-black text-slate-900 font-mono">{p.employeeCode}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1">الأقسام المسندة</p>
                    <p className="text-base font-black text-slate-900">
                      {p.departmentNames && p.departmentNames.length > 0
                        ? p.departmentNames.join(' • ')
                        : (p.departmentName || 'غير محدد')}
                    </p>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1">الوظائف / الصفات الخاصة المسندة</p>
                    <p className="text-base font-black text-slate-900">
                      {p.jobRoleTitles && p.jobRoleTitles.length > 0
                        ? p.jobRoleTitles.join(' + ')
                        : (p.jobRoleId ? (p.jobRoleTitle || p.jobTitle) : 'بدون وظيفة خاصة (ساعات فقط)')}
                    </p>
                  </div>
                </div>
                <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100 flex items-start gap-3">
                  <Coins className="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1">أجر الساعة المباشر</p>
                    <p className="text-base font-black text-teal-700 font-mono">{p.hourlyRate} د.ل / ساعة</p>
                  </div>
                </div>
                {((p.jobRoles && p.jobRoles.length > 0) || (p.jobRoleId && (p.monthlySalary || 0) > 0)) && (
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
                    <Coins className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold mb-1">راتب الوظيفة الشهري والمستحقات</p>
                      <p className="text-base font-black text-amber-700 font-mono">{p.monthlySalary} د.ل / شهر</p>
                      <p className="text-[11px] text-amber-900 font-bold mt-0.5">
                        {p.isHourly !== false 
                          ? `مقابل ${p.targetMonthlyHours || 160} ساعة مستهدفة`
                          : `راتب شهري ثابت (مرتبط بأيام الحضور — اليومية: ${Number(((p.monthlySalary || 500) / 30).toFixed(2))} د.ل)`}
                      </p>
                    </div>
                  </div>
                )}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold mb-1">نوع الحساب</p>
                  <p className="text-base font-black text-slate-900">{p.role === 'ADMIN' ? '🔑 مدير' : '👤 موظف'}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400 text-center font-sans pt-2">⚠️ هذه البيانات للعرض فقط — لتعديلها يرجى مراجعة المدير المسؤول</p>
          </div>
        )}

        {/* TAB: تغيير كلمة السر */}
        {activeTab === 'password' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><KeyRound className="w-5 h-5 text-blue-600" />تغيير كلمة السر (PIN)</h2>
              <form onSubmit={handleChangePin} className="space-y-4">
                {[
                  { label: 'كلمة السر الحالية',       val: currentPin, set: setCurrentPin, show: showCurrent, toggle: () => setShowCurrent(!showCurrent), ph: 'أدخل كلمة السر الحالية' },
                  { label: 'كلمة السر الجديدة',       val: newPin,     set: setNewPin,     show: showNew,     toggle: () => setShowNew(!showNew),         ph: 'أدخل كلمة السر الجديدة' },
                  { label: 'تأكيد كلمة السر الجديدة', val: confirmPin, set: setConfirmPin, show: showConfirm, toggle: () => setShowConfirm(!showConfirm), ph: 'أعد كتابة كلمة السر الجديدة' },
                ].map(({ label, val, set, show, toggle, ph }) => (
                  <div key={label}>
                    <label className="block text-sm font-black text-slate-700 mb-2">{label}</label>
                    <div className="relative">
                      <input type={show ? 'text' : 'password'} value={val} onChange={(e) => set(e.target.value)} placeholder={ph} required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 pr-4 pl-10 text-slate-900 font-mono text-center text-base font-black focus:outline-none focus:border-blue-500 shadow-sm" />
                      <button type="button" onClick={toggle} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                {pinMsg && (
                  <div className={`p-3.5 rounded-2xl text-xs font-extrabold text-center ${pinMsg.type === 'success' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {pinMsg.text}
                  </div>
                )}
                <button type="submit" disabled={pinLoading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <Lock className="w-5 h-5" />{pinLoading ? 'جاري الحفظ...' : 'حفظ كلمة السر الجديدة'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
