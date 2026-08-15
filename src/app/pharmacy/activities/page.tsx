'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Truck,
  ClipboardList,
  Coins,
  RefreshCw,
  Plus
} from 'lucide-react';

export default function PharmacyActivitiesPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Trip Modal
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [officerName, setOfficerName] = useState('مسؤول المشتريات');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [tripStart, setTripStart] = useState('10:00');
  const [tripEnd, setTripEnd] = useState('16:00');
  const [suppliersVisited, setSuppliersVisited] = useState('');
  const [invoicesAmount, setInvoicesAmount] = useState('');
  const [commissionRate, setCommissionRate] = useState('0.5');
  const [tripNotes, setTripNotes] = useState('');

  // New Audit Modal
  const [isNewAuditOpen, setIsNewAuditOpen] = useState(false);
  const [invOfficerName, setInvOfficerName] = useState('مسؤول المخزون');
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [sectionAudited, setSectionAudited] = useState('رفوف أدوية الضغط والسكري');
  const [checkedCount, setCheckedCount] = useState('30');
  const [matchedCount, setMatchedCount] = useState('28');
  const [auditNotes, setAuditNotes] = useState('مطابقة تامة');

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pharmacy/activities');
      const data = await res.json();
      if (data.success) {
        setTrips(data.trips);
        setAudits(data.audits);
      }
    } catch (err) {
      console.error('Fetch activities error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(invoicesAmount) || 0;
    const comm = (amount * (Number(commissionRate) || 0)) / 100;

    const res = await fetch('/api/pharmacy/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ADD_TRIP',
        trip: {
          officerName,
          date: tripDate,
          startTime: tripStart,
          endTime: tripEnd,
          suppliersVisited: suppliersVisited.split(',').map((s) => s.trim()).filter(Boolean),
          totalInvoicesAmount: amount,
          commissionEarned: comm,
          notes: tripNotes
        }
      })
    });

    const data = await res.json();
    if (data.success) {
      setIsNewTripOpen(false);
      setInvoicesAmount('');
      setSuppliersVisited('');
      fetchActivities();
    }
  };

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(checkedCount) || 0;
    const match = Number(matchedCount) || 0;

    const res = await fetch('/api/pharmacy/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ADD_AUDIT',
        audit: {
          officerName: invOfficerName,
          date: auditDate,
          sectionAudited,
          totalItemsChecked: total,
          matchedCount: match,
          discrepancyCount: Math.max(0, total - match),
          notes: auditNotes
        }
      })
    });

    const data = await res.json();
    if (data.success) {
      setIsNewAuditOpen(false);
      fetchActivities();
    }
  };

  const totalTripsAmount = trips.reduce((sum, t) => sum + (Number(t.totalInvoicesAmount) || 0), 0);
  const totalCommissions = trips.reduce((sum, t) => sum + (Number(t.commissionEarned) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            سجل أنشطة وعمليات مسؤولي المشتريات والمخزون
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            توثيق جولات التوريد الميدانية، احتساب العمولات، وجلسات الجرد والمطابقة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewTripOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>توثيق جولة شراء</span>
          </button>

          <button
            onClick={() => setIsNewAuditOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>توثيق جلسة جرد</span>
          </button>

          <button onClick={fetchActivities} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-bold">جولات الشراء الموثقة</div>
            <div className="text-2xl font-black font-mono text-slate-900">{trips.length} جولة</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1">
              مشتريات: {totalTripsAmount.toLocaleString()} د.ل
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] text-indigo-200 font-bold">إجمالي عمولات المشتريات المكتسبة</div>
            <div className="text-2xl font-black font-mono text-amber-300">
              {totalCommissions.toFixed(2)} د.ل
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              محسوبة آلياً من فواتير الجولات
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center font-bold">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-bold">جلسات الجرد المنفذة</div>
            <div className="text-2xl font-black font-mono text-emerald-700">{audits.length} جلسة</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-600" />
            سجل جولات مسؤول المشتريات
          </h3>
          <div className="space-y-3">
            {trips.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{t.officerName} • <span className="font-mono text-slate-400 font-normal">{t.date}</span></span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">{t.startTime} - {t.endTime || 'مباشر'}</span>
                </div>
                {t.notes && <p className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-100">{t.notes}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-mono">
                  <span className="text-slate-500">مشتريات: <strong className="text-slate-900">{Number(t.totalInvoicesAmount).toFixed(2)} د.ل</strong></span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">عمولة: +{Number(t.commissionEarned).toFixed(2)} د.ل</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            سجل جلسات جرد ومطابقة مسؤول المخزون
          </h3>
          <div className="space-y-3">
            {audits.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{a.officerName} • <span className="font-mono text-slate-400 font-normal">{a.date}</span></span>
                  <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">{a.sectionAudited}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400">المفحوص</div>
                    <div className="font-black text-slate-900">{a.totalItemsChecked}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <div className="text-[10px] text-emerald-700">مطابق</div>
                    <div className="font-black text-emerald-800">{a.matchedCount}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-200">
                    <div className="text-[10px] text-rose-700">عجز</div>
                    <div className="font-black text-rose-800">{a.discrepancyCount}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Trip Modal */}
      {isNewTripOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                توثيق جولة شراء جديدة
              </h3>
              <button onClick={() => setIsNewTripOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveTrip} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم المسؤول</label>
                  <input type="text" value={officerName} onChange={(e) => setOfficerName(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الجولة</label>
                  <input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-mono font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وقت الخروج</label>
                  <input type="time" value={tripStart} onChange={(e) => setTripStart(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وقت العودة</label>
                  <input type="time" value={tripEnd} onChange={(e) => setTripEnd(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-mono font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الشركات والمستودعات التي تمت زيارتها (مفصولة بفاصلة)</label>
                <input type="text" placeholder="مثال: شركة الدواء، مستودع الأمل" value={suppliersVisited} onChange={(e) => setSuppliersVisited(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">إجمالي فواتير الجولة (د.ل) *</label>
                  <input type="number" step="0.01" required value={invoicesAmount} onChange={(e) => setInvoicesAmount(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-mono font-black" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نسبة العمولة (%)</label>
                  <input type="number" step="0.1" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-mono font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات الجولة</label>
                <input type="text" value={tripNotes} onChange={(e) => setTripNotes(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer">حفظ واحتساب العمولة</button>
                <button type="button" onClick={() => setIsNewTripOpen(false)} className="w-full h-11 bg-slate-100 text-slate-700 font-bold rounded-xl">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Audit Modal */}
      {isNewAuditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
                توثيق جلسة جرد
              </h3>
              <button onClick={() => setIsNewAuditOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveAudit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم المسؤول</label>
                  <input type="text" value={invOfficerName} onChange={(e) => setInvOfficerName(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الجلسة</label>
                  <input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-mono font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">القسم / الرفوف التي تم جردها *</label>
                <input type="text" required value={sectionAudited} onChange={(e) => setSectionAudited(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">عدد الأصناف المفحوصة *</label>
                  <input type="number" required value={checkedCount} onChange={(e) => setCheckedCount(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">عدد الأصناف المطابقة *</label>
                  <input type="number" required value={matchedCount} onChange={(e) => setMatchedCount(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-mono font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الملاحظات</label>
                <input type="text" value={auditNotes} onChange={(e) => setAuditNotes(e.target.value)} className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer">حفظ جلسة الجرد</button>
                <button type="button" onClick={() => setIsNewAuditOpen(false)} className="w-full h-11 bg-slate-100 text-slate-700 font-bold rounded-xl">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
