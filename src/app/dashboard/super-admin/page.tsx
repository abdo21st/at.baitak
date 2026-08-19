'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  managerName?: string;
  managerPhone?: string;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED';
  createdAt: string;
  plan?: {
    id: string;
    name: string;
    code: string;
    priceMonthly: number;
    priceYearly: number;
    maxEmployees: number;
  };
  subscriptions?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    amountPaid: number;
    isActive: boolean;
    billingCycle: 'MONTHLY' | 'YEARLY';
  }>;
  _count?: {
    users: number;
    pharmacyProducts: number;
    departments: number;
  };
}

interface Plan {
  id: string;
  name: string;
  code: string;
  priceMonthly: number;
  priceYearly: number;
  maxEmployees: number;
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    planId: '',
    managerName: '',
    managerPhone: '',
    phone: '',
    billingCycle: 'MONTHLY',
    amountPaid: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/tenants');
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants || []);
        setPlans(data.plans || []);
        if (data.plans?.length > 0 && !form.planId) {
          setForm((prev) => ({ ...prev, planId: data.plans[0].id, amountPaid: data.plans[0].priceMonthly }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setForm({
          name: '',
          slug: '',
          planId: plans[0]?.id || '',
          managerName: '',
          managerPhone: '',
          phone: '',
          billingCycle: 'MONTHLY',
          amountPaid: plans[0]?.priceMonthly || 0,
        });
        fetchData();
      } else {
        alert(data.error || 'حدث خطأ أثناء إضافة النشاط');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال بالسيرفر');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.managerName && t.managerName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;
  const totalEmployeesAcrossTenants = tenants.reduce((acc, t) => acc + (t._count?.users || 0), 0);
  const totalMonthlyRevenue = tenants.reduce((acc, t) => {
    if (t.status === 'ACTIVE' && t.plan) {
      return acc + (t.plan.priceMonthly || 0);
    }
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم الفائقة بالأنشطة (Super Admin)</h1>
                <p className="text-sm text-slate-500 mt-0.5">إدارة الشركات المشتركة، الباقات، وتراخيص الاستخدام السحابي</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              إضافة نشاط تجاري جديد
            </button>
            <Link
              href="/dashboard/admin"
              className="h-11 px-4 border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-xl flex items-center gap-2 transition"
            >
              العودة للمنظومة الرئيسية
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">إجمالي الأنشطة</span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold">SaaS</span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-slate-900">{totalTenants}</span>
              <span className="text-xs text-slate-400 mr-2">شركة ومؤسسة</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">الاشتراكات النشطة</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold">Active</span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-emerald-600">{activeTenants}</span>
              <span className="text-xs text-slate-400 mr-2">من أصل {totalTenants}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">إجمالي الموظفين المسجلين</span>
              <span className="p-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-semibold">Users</span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-purple-600">{totalEmployeesAcrossTenants}</span>
              <span className="text-xs text-slate-400 mr-2">موظف في جميع الأنشطة</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">الدخل الشهري المتوقع (MRR)</span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold">Revenue</span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-slate-900">{totalMonthlyRevenue.toLocaleString('en-US')}</span>
              <span className="text-xs text-slate-500 mr-2 font-medium">د.ل شهرياً</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-96 relative">
            <input
              type="text"
              placeholder="بحث بالاسم، النطاق الفرعي (slug)، أو المدير..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="w-5 h-5 text-slate-400 absolute right-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">الحالة:</span>
            {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`h-9 px-3 text-xs font-medium rounded-lg transition ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' && 'الكل'}
                {st === 'ACTIVE' && 'نشط'}
                {st === 'TRIAL' && 'تجريبي'}
                {st === 'SUSPENDED' && 'موقوف'}
                {st === 'EXPIRED' && 'منتهي'}
              </button>
            ))}
          </div>
        </div>

        {/* Tenants List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">سجل الأنشطة التجارية ({filteredTenants.length})</h2>
            <button onClick={fetchData} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              تحديث البيانات
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">جاري تحميل بيانات الأنشطة...</div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-slate-400">لا توجد أنشطة تجارية مطابقة للبحث</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">النشاط التجاري</th>
                    <th className="py-3.5 px-4">النطاق الفرعي</th>
                    <th className="py-3.5 px-4">الباقة الحالية</th>
                    <th className="py-3.5 px-4">الموظفين</th>
                    <th className="py-3.5 px-4">المدير المسؤول</th>
                    <th className="py-3.5 px-4">حالة الاشتراك</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{tenant.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          تاريخ الانضمام: {new Date(tenant.createdAt).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-blue-700 font-medium">
                          {tenant.slug}.mtapp.ly
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {tenant.plan ? (
                          <div>
                            <span className="font-medium text-slate-800">{tenant.plan.name}</span>
                            <div className="text-xs text-slate-500">
                              {tenant.plan.priceMonthly} د.ل / شهر
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">بدون باقة</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-800">
                          {tenant._count?.users || 0}{' '}
                          <span className="text-xs text-slate-400">
                            / {tenant.plan?.maxEmployees || 10}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {tenant._count?.pharmacyProducts || 0} صنف
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-slate-800 font-medium">{tenant.managerName || '—'}</div>
                        <div className="text-xs text-slate-400 font-mono">{tenant.managerPhone || tenant.phone || ''}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            tenant.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : tenant.status === 'TRIAL'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {tenant.status === 'ACTIVE' && '● نشط'}
                          {tenant.status === 'TRIAL' && '● تجريبي'}
                          {tenant.status === 'SUSPENDED' && '● موقوف'}
                          {tenant.status === 'EXPIRED' && '● منتهي'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => alert(`ميزة الدخول كعميل لـ ${tenant.name} مفعّلة عبر النطاق ${tenant.slug}.mtapp.ly`)}
                          className="h-8 px-3 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-medium rounded-lg transition"
                        >
                          دخول النشاط ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Tenant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">إضافة نشاط تجاري جديد (New Tenant)</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم النشاط التجاري *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: صيدلية النقاء الكبرى"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  النطاق الفرعي (Subdomain Slug) *
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="alnaqaa"
                    value={form.slug}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      })
                    }
                    className="w-full h-11 px-3 border border-slate-200 rounded-r-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="h-11 px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs text-slate-500 flex items-center font-mono">
                    .mtapp.ly
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المدير</label>
                  <input
                    type="text"
                    placeholder="د. محمد"
                    value={form.managerName}
                    onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="0910000000"
                    value={form.managerPhone}
                    onChange={(e) => setForm({ ...form, managerPhone: e.target.value })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">باقة الاشتراك</label>
                  <select
                    value={form.planId}
                    onChange={(e) => {
                      const selectedPlan = plans.find((p) => p.id === e.target.value);
                      setForm({
                        ...form,
                        planId: e.target.value,
                        amountPaid:
                          form.billingCycle === 'YEARLY'
                            ? selectedPlan?.priceYearly || 0
                            : selectedPlan?.priceMonthly || 0,
                      });
                    }}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.priceMonthly} د.ل/شهر)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">دورة الفوترة</label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) => {
                      const cycle = e.target.value;
                      const selectedPlan = plans.find((p) => p.id === form.planId);
                      setForm({
                        ...form,
                        billingCycle: cycle,
                        amountPaid:
                          cycle === 'YEARLY'
                            ? selectedPlan?.priceYearly || 0
                            : selectedPlan?.priceMonthly || 0,
                      });
                    }}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="MONTHLY">شهري</option>
                    <option value="YEARLY">سنوي (خصم خاص)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المبلغ المدفوع عند التأسيس (د.ل)
                </label>
                <input
                  type="number"
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: parseFloat(e.target.value) || 0 })}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-11 px-4 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm"
                >
                  {submitting ? 'جاري الإنشاء...' : 'إنشاء وحفظ النشاط'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
