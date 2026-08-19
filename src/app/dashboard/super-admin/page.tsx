'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  customDomain?: string | null;
  logo?: string | null;
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

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    logo: '',
    planId: '',
    managerName: '',
    managerPhone: '',
    phone: '',
    managerEmployeeCode: '101',
    managerPinCode: '1234',
    billingCycle: 'MONTHLY',
    amountPaid: 0,
  });

  // Edit / Logo Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    customDomain: '',
    logo: '',
    planId: '',
    managerName: '',
    managerPhone: '',
    phone: '',
    status: 'ACTIVE',
  });

  // Created Credentials Success Dialog State
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    employeeCode: string;
    pinCode: string;
    url: string;
    managerPhone?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
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
  }, [form.planId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Logo File Upload for Add/Edit Modal
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isEdit) {
        setEditForm((prev) => ({ ...prev, logo: base64 }));
      } else {
        setForm((prev) => ({ ...prev, logo: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

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
        const credentials = data.credentials || {
          employeeCode: form.managerEmployeeCode || '101',
          pinCode: form.managerPinCode || '1234',
          url: `https://${form.slug}.mtapp.ly`,
        };
        setCreatedCredentials({
          name: form.name,
          employeeCode: credentials.employeeCode,
          pinCode: credentials.pinCode,
          url: credentials.url,
          managerPhone: form.managerPhone || form.phone,
        });
        setForm({
          name: '',
          slug: '',
          logo: '',
          planId: plans[0]?.id || '',
          managerName: '',
          managerPhone: '',
          phone: '',
          managerEmployeeCode: '101',
          managerPinCode: '1234',
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

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name,
      slug: tenant.slug,
      customDomain: tenant.customDomain || '',
      logo: tenant.logo || '',
      planId: tenant.plan?.id || '',
      managerName: tenant.managerName || '',
      managerPhone: tenant.managerPhone || '',
      phone: tenant.phone || '',
      status: tenant.status,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTenant.id, ...editForm }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        setEditingTenant(null);
        fetchData();
      } else {
        alert(data.error || 'حدث خطأ أثناء تحديث النشاط');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال بالسيرفر');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentialsToClipboard = () => {
    if (!createdCredentials) return;
    const msg = `مرحباً بكم في منظومة حضورك السحابية 🌟\n\n🏢 اسم النشاط: ${createdCredentials.name}\n🌐 رابط الدخول المباشر: ${createdCredentials.url}\n👤 رقم الموظف (ID): ${createdCredentials.employeeCode}\n🔐 الرقم السري (PIN): ${createdCredentials.pinCode}\n\nنتمنى لكم تجربة عمل متميزة! 🚀`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20">
                  {/* HodoorK Attendance & Time Tracker Distinctive Logo */}
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                    <path d="M16 2v4" />
                    <path d="M8 2v4" />
                    <path d="M9 16l2 2 4-4" />
                  </svg>
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  ✓
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">حضورك السحابية (HodoorK Multi-Tenant)</h1>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200/60 font-mono">
                    v2.5 SaaS Hub
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5 font-medium">المركز السحابي الموحد لإدارة تراخيص واشتراكات وشعارات الأنشطة التجارية</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
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
                    <th className="py-3.5 px-4">النشاط التجاري والشعار</th>
                    <th className="py-3.5 px-4">النطاق الفرعي والرابط</th>
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
                        <div className="flex items-center gap-3">
                          {tenant.logo ? (
                            <img
                              src={tenant.logo}
                              alt={tenant.name}
                              className="w-10 h-10 rounded-xl object-contain border border-slate-200 bg-white p-0.5 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                              {tenant.name.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{tenant.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              تاريخ الانضمام: {new Date(tenant.createdAt).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-blue-700 font-medium">
                          {tenant.slug}.mtapp.ly
                        </span>
                        {tenant.customDomain && (
                          <div className="text-[11px] text-emerald-600 font-mono mt-1">
                            🌐 {tenant.customDomain}
                          </div>
                        )}
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(tenant)}
                            className="h-8 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            تعديل النشاط والرابط ✏️
                          </button>
                          <a
                            href={`https://${tenant.slug}.mtapp.ly`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition flex items-center gap-1"
                          >
                            دخول ↗
                          </a>
                        </div>
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
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">إضافة نشاط تجاري جديد (New Tenant)</h3>
                <p className="text-xs text-slate-400 mt-0.5">تأسيس النشاط مع الرابط وحساب المدير والأقسام فوراً</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
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
                  رابط النشاط والنطاق الفرعي (Subdomain Slug) *
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="at.mt أو alnaqaa"
                    value={form.slug}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''),
                      })
                    }
                    className="w-full h-11 px-3 border border-slate-200 rounded-r-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="h-11 px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs text-slate-500 flex items-center font-mono">
                    .mtapp.ly
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">الرابط المباشر: https://{form.slug || '...'}.mtapp.ly</p>
              </div>

              {/* Logo Upload & Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">شعار النشاط التجاري (Logo)</label>
                <div className="flex items-center gap-3">
                  {form.logo ? (
                    <img
                      src={form.logo}
                      alt="Logo Preview"
                      className="w-12 h-12 rounded-xl object-contain border border-slate-200 bg-slate-50 p-1"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                      شعار
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, false)}
                    className="text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {/* Manager Details & Credentials Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  بيانات وحساب المدير الأولي للدخول
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المدير المسئول</label>
                    <input
                      type="text"
                      placeholder="د. محمد"
                      value={form.managerName}
                      onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">رقم هاتف المدير (واتساب)</label>
                    <input
                      type="text"
                      placeholder="0910000000"
                      value={form.managerPhone}
                      onChange={(e) => setForm({ ...form, managerPhone: e.target.value })}
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الموظف للمدير (ID) *</label>
                    <input
                      type="text"
                      required
                      placeholder="101"
                      value={form.managerEmployeeCode}
                      onChange={(e) => setForm({ ...form, managerEmployeeCode: e.target.value })}
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">الرقم السري (PIN) *</label>
                    <input
                      type="text"
                      required
                      placeholder="1234"
                      value={form.managerPinCode}
                      onChange={(e) => setForm({ ...form, managerPinCode: e.target.value })}
                      className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white font-mono font-bold"
                    />
                  </div>
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
                  className="h-11 px-4 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm cursor-pointer"
                >
                  {submitting ? 'جاري التأسيس والربط...' : 'تأسيس النشاط والربط الفوري 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant & Logo Modal */}
      {isEditModalOpen && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">تعديل النشاط والرابط</h3>
                <p className="text-xs text-slate-400 mt-0.5">{editingTenant.name}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم النشاط التجاري *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Edit Subdomain Slug */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رابط النشاط والنطاق الفرعي (Subdomain Slug) *
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="at.mt أو mt"
                    value={editForm.slug}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''),
                      })
                    }
                    className="w-full h-11 px-3 border border-slate-200 rounded-r-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="h-11 px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs text-slate-500 flex items-center font-mono">
                    .mtapp.ly
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">الرابط المباشر: https://{editForm.slug || '...'}.mtapp.ly</p>
              </div>

              {/* Edit Custom Domain */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نطاق مخصص إضافي (Custom Domain - اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: at.mycompany.com"
                  value={editForm.customDomain}
                  onChange={(e) => setEditForm({ ...editForm, customDomain: e.target.value })}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">شعار ورمز التطبيق (Logo Icon)</label>
                <div className="flex items-center gap-3">
                  {editForm.logo ? (
                    <img
                      src={editForm.logo}
                      alt="Logo Preview"
                      className="w-14 h-14 rounded-2xl object-contain border border-slate-200 bg-slate-50 p-1 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                      بدون شعار
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, true)}
                      className="text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">يظهر الشعار كأيقونة رئيسية للتطبيق في صفحة تسجيل الدخول واللوحة</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المدير</label>
                  <input
                    type="text"
                    value={editForm.managerName}
                    onChange={(e) => setEditForm({ ...editForm, managerName: e.target.value })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={editForm.managerPhone}
                    onChange={(e) => setEditForm({ ...editForm, managerPhone: e.target.value })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">باقة الاشتراك</label>
                  <select
                    value={editForm.planId}
                    onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">حالة النشاط</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="ACTIVE">نشط (Active)</option>
                    <option value="TRIAL">فترة تجريبية (Trial)</option>
                    <option value="SUSPENDED">موقوف (Suspended)</option>
                    <option value="EXPIRED">منتهي (Expired)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-11 px-4 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm cursor-pointer"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات والشعار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Credentials Card Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-slate-900">تم تأسيس وربط النشاط بنجاح!</h3>
              <p className="text-xs text-slate-500">تم إنشاء بيئة العمل ورابط الدخول وحساب المدير فورياً</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 font-mono text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-cairo">اسم النشاط:</span>
                <span className="font-bold text-slate-900 font-cairo">{createdCredentials.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-cairo">رابط الدخول المباشر:</span>
                <a
                  href={createdCredentials.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-bold hover:underline break-all"
                >
                  {createdCredentials.url} ↗
                </a>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 block font-cairo">رقم الموظف (ID):</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block mt-0.5">
                    {createdCredentials.employeeCode}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-cairo">الرقم السري (PIN):</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block mt-0.5">
                    {createdCredentials.pinCode}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={copyCredentialsToClipboard}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition"
              >
                {copied ? '✓ تم النسخ بنجاح!' : '📋 نسخ رسالة بيانات الدخول'}
              </button>

              {createdCredentials.managerPhone && (
                <a
                  href={`https://wa.me/${createdCredentials.managerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `مرحباً بكم في منظومة حضورك السحابية 🌟\n\n🏢 اسم النشاط: ${createdCredentials.name}\n🌐 رابط الدخول المباشر: ${createdCredentials.url}\n👤 رقم الموظف (ID): ${createdCredentials.employeeCode}\n🔐 الرقم السري (PIN): ${createdCredentials.pinCode}\n\nنتمنى لكم تجربة عمل متميزة! 🚀`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  💬 إرسال البيانات عبر واتساب للمدير
                </a>
              )}

              <button
                onClick={() => setCreatedCredentials(null)}
                className="w-full h-10 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
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
