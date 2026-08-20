'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FieldVisit } from '@/lib/types';
import {
  Car,
  Search,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Phone,
  MapPin,
  Calendar,
  User,
  Wrench,
  Loader2,
  Printer,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Trash2,
  Filter
} from 'lucide-react';
import { formatArabicDate } from '@/lib/utils';

export default function FieldVisitsManager() {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [stats, setStats] = useState<any>({
    totalVisits: 0,
    completedOtpCount: 0,
    disputedCount: 0,
    inProgressCount: 0,
    inspectionCount: 0,
    totalCollectedLYD: 0,
    totalPendingLYD: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED_OTP' | 'COMPLETED_DISPUTED' | 'INSPECTION_ONLY'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);

  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/field-visits');
      const data = await res.json();
      if (data.success) {
        setVisits(data.visits || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching field visits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        v.clientName.toLowerCase().includes(q) ||
        v.clientPhone.includes(q) ||
        (v.technicianName && v.technicianName.toLowerCase().includes(q)) ||
        (v.projectName && v.projectName.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [visits, statusFilter, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED_OTP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            مكتملة ومؤكدة (OTP)
          </span>
        );
      case 'COMPLETED_DISPUTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            متابعة إدارية (امتناع عميل)
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 animate-spin text-blue-600" />
            قيد العمل بالموقع
          </span>
        );
      case 'INSPECTION_ONLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <FileCheck className="w-3.5 h-3.5 text-amber-600" />
            كشف ومعاينة فقط
          </span>
        );
      default:
        return null;
    }
  };

  const getVisitTypeBadge = (type: string) => {
    switch (type) {
      case 'MAINTENANCE':
        return <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">🛠️ صيانة</span>;
      case 'INSTALLATION':
        return <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">🔌 تركيب</span>;
      case 'INSPECTION':
        return <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">🔍 معاينة</span>;
      case 'EMERGENCY':
        return <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">🚨 طوارئ</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">إدارة زيارات الصيانة والمواقع الميدانية</h2>
              <p className="text-xs text-slate-500">متابعة محاضر الزيارات، التحقق برمز OTP، وتحصيل المستحقات بالدينار (د.ل)</p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchVisits}
          className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Clock className="w-4 h-4 text-slate-500" />}
          <span>تحديث السجلات</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي الزيارات</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">{stats.totalVisits}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">زيارة ميدانية مسجلة</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">مكتملة ومؤكدة بـ OTP</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{stats.completedOtpCount}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-bold">
            المحصل: {stats.totalCollectedLYD} د.ل
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">متابعة إدارية (امتناع)</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">{stats.disputedCount}</div>
          <div className="text-[11px] text-red-700 mt-0.5 font-bold">
            معلق: {stats.totalPendingLYD} د.ل
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">قيد العمل بالموقع</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.inProgressCount}</div>
          <div className="text-[11px] text-amber-700 mt-0.5 font-bold">فنيون في الميدان حالياً</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              الكل ({visits.length})
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              جارية بالموقع ({stats.inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED_OTP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'COMPLETED_OTP'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              مؤكدة بـ OTP ({stats.completedOtpCount})
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED_DISPUTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'COMPLETED_DISPUTED'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              متابعة إدارية ({stats.disputedCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="بحث بالعميل أو الهاتف أو الفني..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 px-3.5 pr-9 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-slate-500 mt-2">جاري تحميل سجلات الزيارات الميدانية...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Car className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 mt-2">لا توجد زيارات ميدانية مطابقة</h4>
          <p className="text-xs text-slate-400 mt-1">لم يتم تسجيل أي زيارات مطابقة للفلتر المحدد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVisits.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedVisit(v)}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer space-y-3.5"
            >
              {/* Header: Client & Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-800">{v.clientName}</h4>
                    {getVisitTypeBadge(v.visitType)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {v.clientPhone}
                    </span>
                    {v.clientAddress && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {v.clientAddress}
                      </span>
                    )}
                  </div>
                </div>
                <div>{getStatusBadge(v.status)}</div>
              </div>

              {/* Technical Work Snippet */}
              {(v.diagnosisNotes || v.solutionNotes) && (
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1">
                  {v.diagnosisNotes && (
                    <p className="truncate">
                      <strong className="text-slate-800 font-semibold">العطل: </strong>
                      {v.diagnosisNotes}
                    </p>
                  )}
                  {v.solutionNotes && (
                    <p className="truncate text-emerald-700 font-medium">
                      <strong>الإصلاح: </strong>
                      {v.solutionNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Refusal Reason Banner if disputed */}
              {v.status === 'COMPLETED_DISPUTED' && v.customerRefusalReason && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-bold">سبب الامتناع: </span>
                    <span>{v.customerRefusalReason}</span>
                  </div>
                </div>
              )}

              {/* Footer: Technician, Time, and Pricing */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{v.technicianName}</span>
                  <span className="text-slate-400">•</span>
                  <span>{formatArabicDate(v.startedAt.split('T')[0])}</span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 ml-1">الإجمالي:</span>
                  <span className="text-sm font-black text-slate-900">{v.totalAmount}</span>
                  <span className="text-[11px] text-slate-500 mr-1">د.ل</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detail View */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-right">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">محضر تفاصيل الزيارة الميدانية</h3>
                  <p className="text-xs text-slate-500">{selectedVisit.clientName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVisit(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>{getStatusBadge(selectedVisit.status)}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatArabicDate(selectedVisit.startedAt.split('T')[0])}
                </div>
              </div>

              {/* Client & Tech Card */}
              <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">العميل</span>
                  <span className="font-bold text-slate-800">{selectedVisit.clientName}</span>
                  <span className="block font-mono text-slate-600 mt-0.5">{selectedVisit.clientPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">المهندس المنفذ</span>
                  <span className="font-bold text-slate-800">{selectedVisit.technicianName}</span>
                  <span className="block text-slate-500 mt-0.5">كود: {selectedVisit.technicianCode}</span>
                </div>
              </div>

              {/* Diagnosis & Solution */}
              <div className="space-y-2 text-xs">
                {selectedVisit.diagnosisNotes && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">تشخيص العطل:</span>
                    <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700">{selectedVisit.diagnosisNotes}</div>
                  </div>
                )}
                {selectedVisit.solutionNotes && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">الإجراء والحل المنفذ:</span>
                    <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-lg">{selectedVisit.solutionNotes}</div>
                  </div>
                )}
                {selectedVisit.partsUsed && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">قطع الغيار المستخدمة:</span>
                    <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700">{selectedVisit.partsUsed}</div>
                  </div>
                )}
              </div>

              {/* Pricing Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">أتعاب الكشف والصيانة:</span>
                  <span className="font-bold">{selectedVisit.serviceFee} د.ل</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">تكلفة قطع الغيار:</span>
                  <span className="font-bold">{selectedVisit.partsFee} د.ل</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black text-slate-900">
                  <span>الإجمالي المستحق:</span>
                  <span className="text-emerald-700">{selectedVisit.totalAmount} د.ل</span>
                </div>
              </div>

              {/* GPS Stamp */}
              {selectedVisit.checkInLat && selectedVisit.checkInLng && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between text-blue-900">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>موقع العميل موثق عبر الـ GPS</span>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${selectedVisit.checkInLat},${selectedVisit.checkInLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>عرض على الخريطة</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المحضر A4</span>
              </button>

              <button
                onClick={() => setSelectedVisit(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
