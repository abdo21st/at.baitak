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
  hasClinicalCapsule?: boolean;
  hasInventory?: boolean;
  hasPurchases?: boolean;
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
    hasClinicalCapsule: true,
    hasInventory: true,
    hasPurchases: true,
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
    hasClinicalCapsule: true,
    hasInventory: true,
    hasPurchases: true,
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
          url: `https://${form.slug.toLowerCase().trim()}.mtapp.ly`,
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
          hasClinicalCapsule: true,
          hasInventory: true,
          hasPurchases: true,
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
      hasClinicalCapsule: tenant.hasClinicalCapsule !== false,
      hasInventory: tenant.hasInventory !== false,
      hasPurchases: tenant.hasPurchases !== false,
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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-cairo" dir="rtl">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20 text-white">
              H
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                لوحة الإدارة المركزية للمنصة
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono font-normal">
                  Super Admin
                </span>
              </h1>
              <p className="text-xs text-slate-400">إدارة كافة الأنشطة والمشتركين والاشتراكات والمزايا</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/admin"
              className="h-10 px-4 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition flex items-center gap-2 border border-slate-700"
            >
              <span>← العودة للوحة النشاط الحالي</span>
            </Link>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <span>+ إضافة نشاط تجاري جديد</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-slate-400 font-medium">إجمالي الأنشطة المسجلة</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">{totalTenants}</div>
            <div className="text-[11px] text-slate-500 mt-1">مشترك في المنصة</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-emerald-400 font-medium">الأنشطة النشطة (Active)</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{activeTenants}</div>
            <div className="text-[11px] text-slate-500 mt-1">اشتراكات مفعلة بالكامل</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-blue-400 font-medium">إجمالي الموظفين في المنظومة</div>
            <div className="text-2xl font-black text-blue-400 mt-1 font-mono">{totalEmployeesAcrossTenants}</div>
            <div className="text-[11px] text-slate-500 mt-1">موظف مسجل بجميع الأنشطة</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
            <div className="text-xs text-purple-400 font-medium">العائد الشهري المتكرر (MRR)</div>
            <div className="text-2xl font-black text-purple-400 mt-1 font-mono">{totalMonthlyRevenue} د.ل</div>
            <div className="text-[11px] text-slate-500 mt-1">بناءً على باقات الاشتراك الحالية</div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <input
                type="text"
                placeholder="بحث بالاسم أو الرابط الفرعي أو اسم المدير..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 bg-slate-950/60 border border-slate-800 rounded-xl px-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 bg-slate-950/60 border border-slate-800 rounded-xl px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">كافة الحالات</option>
              <option value="ACTIVE">نشط فقط</option>
              <option value="TRIAL">تجريبي</option>
              <option value="SUSPENDED">موقوف</option>
              <option value="EXPIRED">منتهي</option>
            </select>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">جاري تحميل الأنشطة والمشتركين...</div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">لم يتم العثور على أي أنشطة تطابق معايير البحث</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-semibold">
                    <th className="py-4 px-4">النشاط التجاري والشعار</th>
                    <th className="py-4 px-4">رابط الدخول (Subdomain)</th>
                    <th className="py-4 px-4">المدير والاتصال</th>
                    <th className="py-4 px-4 text-center">المزايا المفعلة</th>
                    <th className="py-4 px-4 text-center">الموظفين</th>
                    <th className="py-4 px-4">الباقة</th>
                    <th className="py-4 px-4 text-center">الحالة</th>
                    <th className="py-4 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-900/30 transition">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-white border border-slate-700 p-1 flex items-center justify-center shrink-0 shadow-sm">
                            {tenant.logo ? (
                              <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-contain rounded-lg" />
                            ) : (
                              <span className="text-slate-800 font-bold text-sm">
                                {tenant.name.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{tenant.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {new Date(tenant.createdAt).toLocaleDateString('ar-LY')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono">
                        <a
                          href={`https://${tenant.slug}.mtapp.ly`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-bold"
                        >
                          {tenant.slug}.mtapp.ly ↗
                        </a>
                        {tenant.customDomain && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {tenant.customDomain}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-200">{tenant.managerName || 'غير محدد'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{tenant.managerPhone || tenant.phone || '-'}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap max-w-[170px] mx-auto">
                          {tenant.hasClinicalCapsule !== false && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                              💊 كبسولة
                            </span>
                          )}
                          {tenant.hasInventory !== false && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                              📦 مخزون
                            </span>
                          )}
                          {tenant.hasPurchases !== false && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                              🛒 مشتريات
                            </span>
                          )}
                          {tenant.hasClinicalCapsule === false && tenant.hasInventory === false && tenant.hasPurchases === false && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                              حضور ورواتب فقط
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-200">
                        {tenant._count?.users || 0}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{tenant.plan?.name || 'مخصصة'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{tenant.plan?.priceMonthly || 0} د.ل/شهر</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            tenant.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : tenant.status === 'TRIAL'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
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
                            className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition flex items-center gap-1 cursor-pointer border border-slate-700"
                          >
                            تعديل والمزايا ✏️
                          </button>
                          <a
                            href={`https://${tenant.slug}.mtapp.ly`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-medium rounded-lg transition flex items-center gap-1 border border-blue-500/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 text-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">إضافة نشاط تجاري جديد (New Tenant)</h3>
                <p className="text-xs text-slate-400 mt-0.5">تأسيس النشاط مع الرابط وحساب المدير وتحديد المزايا فوراً</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم النشاط التجاري *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: صيدلية النقاء الكبرى أو شركة مدار التقنية"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-r-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                  <span className="h-11 px-3 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-xs text-slate-300 flex items-center font-mono">
                    .mtapp.ly
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">الرابط المباشر: https://{form.slug || '...'}.mtapp.ly</p>
              </div>

              {/* Logo Upload & Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">شعار النشاط التجاري (Logo)</label>
                <div className="flex items-center gap-3">
                  {form.logo ? (
                    <img
                      src={form.logo}
                      alt="Logo Preview"
                      className="w-12 h-12 rounded-xl object-contain border border-slate-700 bg-white p-1"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
                      شعار
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, false)}
                    className="text-xs text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/30"
                  />
                </div>
              </div>

              {/* Feature Modules Selection */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    الوحدات والمزايا المتاحة للنشاط (Feature Modules)
                  </span>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    تخصيص الميزات
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Clinical Capsule */}
                  <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">💊</span>
                      <div>
                        <div className="text-xs font-bold text-slate-100">الكبسولة الدوائية والذكاء السريري</div>
                        <div className="text-[10px] text-slate-400">مسح باركود الأدوية، مونوغرافات BNF 83، والتحذيرات السريرية</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.hasClinicalCapsule}
                      onChange={(e) => setForm({ ...form, hasClinicalCapsule: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </label>

                  {/* Inventory & Shortages */}
                  <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-blue-500/40 transition cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">📦</span>
                      <div>
                        <div className="text-xs font-bold text-slate-100">إدارة المخزون وتتبع النواقص</div>
                        <div className="text-[10px] text-slate-400">جرد الأصناف، تنبيهات الصلاحيات، واستخراج نواقص واتساب</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.hasInventory}
                      onChange={(e) => setForm({ ...form, hasInventory: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </label>

                  {/* Purchasing & Orders */}
                  <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-purple-500/40 transition cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🛒</span>
                      <div>
                        <div className="text-xs font-bold text-slate-100">المشتريات وأوامر التوريد والموردين</div>
                        <div className="text-[10px] text-slate-400">إنشاء طلبيات الشراء، تصدير PDF، وتتبع حسابات الموردين</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.hasPurchases}
                      onChange={(e) => setForm({ ...form, hasPurchases: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </label>
                </div>
              </div>

              {/* Manager Details Section */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  بيانات وحساب المدير الأولي للدخول
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المدير المسئول</label>
                    <input
                      type="text"
                      placeholder="د. محمد"
                      value={form.managerName}
                      onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                      className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">رقم هاتف المدير (واتساب)</label>
                    <input
                      type="text"
                      placeholder="0910000000"
                      value={form.managerPhone}
                      onChange={(e) => setForm({ ...form, managerPhone: e.target.value })}
                      className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الموظف للمدير (ID) *</label>
                    <input
                      type="text"
                      required
                      placeholder="101"
                      value={form.managerEmployeeCode}
                      onChange={(e) => setForm({ ...form, managerEmployeeCode: e.target.value })}
                      className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">الرقم السري (PIN) *</label>
                    <input
                      type="text"
                      required
                      placeholder="1234"
                      value={form.managerPinCode}
                      onChange={(e) => setForm({ ...form, managerPinCode: e.target.value })}
                      className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">باقة الاشتراك</label>
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
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.priceMonthly} د.ل/شهر)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">دورة الفوترة</label>
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
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  >
                    <option value="MONTHLY">شهري</option>
                    <option value="YEARLY">سنوي (خصم خاص)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  المبلغ المدفوع عند التأسيس (د.ل)
                </label>
                <input
                  type="number"
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: parseFloat(e.target.value) || 0 })}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-11 px-4 text-slate-400 hover:bg-slate-800 rounded-xl text-sm font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-sm cursor-pointer"
                >
                  {submitting ? 'جاري التأسيس والربط...' : 'تأسيس النشاط والربط الفوري 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant & Features Modal */}
      {isEditModalOpen && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">تعديل النشاط والمزايا والرابط</h3>
                <p className="text-xs text-slate-400 mt-0.5">{editingTenant.name}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم النشاط التجاري *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              {/* Edit Subdomain Slug */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-r-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                  <span className="h-11 px-3 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-xs text-slate-300 flex items-center font-mono">
                    .mtapp.ly
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">الرابط المباشر: https://{editForm.slug || '...'}.mtapp.ly</p>
              </div>

              {/* Edit Custom Domain */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  نطاق مخصص إضافي (Custom Domain - اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: at.mycompany.com"
                  value={editForm.customDomain}
                  onChange={(e) => setEditForm({ ...editForm, customDomain: e.target.value })}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">شعار ورمز التطبيق (Logo Icon)</label>
                <div className="flex items-center gap-3">
                  {editForm.logo ? (
                    <img
                      src={editForm.logo}
                      alt="Logo Preview"
                      className="w-14 h-14 rounded-2xl object-contain border border-slate-700 bg-white p-1 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
                      بدون شعار
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, true)}
                      className="text-xs text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/30"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">يظهر الشعار كأيقونة رئيسية للتطبيق في صفحة الدخول واللوحة</p>
                  </div>
                </div>
              </div>

              {/* Feature Modules Selection */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    الوحدات والمزايا المتاحة للنشاط
                  </span>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    تفعيل / تعطيل
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Clinical Capsule */}
                  <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">💊</span>
                      <div>
                        <div className="text-xs font-bold text-slate-100">الكبسولة الدوائية والذكاء السريري</div>
                        <div className="text-[10px] text-slate-400">مسح باركود الأدوية، مونوغرافات BNF 83، والتحذيرات السريرية</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editForm.hasClinicalCapsule}
                      onChange={(e) => setEditForm({ ...editForm, hasClinicalCapsule: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </label>

                  {/* Inventory & Shortages */}
                  <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-blue-500/40 transition cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">📦</span>
                      <div>
                        <div className="text-xs font-bold text-slate-100">إدارة المخزون وتتبع النواقص</div>
                        <div className="text-[10px] text-slate-400">جرد الأصناف، تنبيهات الصلاحيات، واستخراج نواقص واتساب</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editForm.hasInventory}
                      onChange={(e) => setEditForm({ ...editForm, hasInventory: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </label>

                  {/* Purchasing & Orders */}
                  <label className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-purple-500/40 transition cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🛒</span>
                      <div>
                        <div className="text-xs font-bold text-slate-100">المشتريات وأوامر التوريد والموردين</div>
                        <div className="text-[10px] text-slate-400">إنشاء طلبيات الشراء، تصدير PDF، وتتبع حسابات الموردين</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editForm.hasPurchases}
                      onChange={(e) => setEditForm({ ...editForm, hasPurchases: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المدير</label>
                  <input
                    type="text"
                    value={editForm.managerName}
                    onChange={(e) => setEditForm({ ...editForm, managerName: e.target.value })}
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={editForm.managerPhone}
                    onChange={(e) => setEditForm({ ...editForm, managerPhone: e.target.value })}
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">باقة الاشتراك</label>
                  <select
                    value={editForm.planId}
                    onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">حالة النشاط</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  >
                    <option value="ACTIVE">نشط (Active)</option>
                    <option value="TRIAL">فترة تجريبية (Trial)</option>
                    <option value="SUSPENDED">موقوف (Suspended)</option>
                    <option value="EXPIRED">منتهي (Expired)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-11 px-4 text-slate-400 hover:bg-slate-800 rounded-xl text-sm font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold border border-emerald-500/30">
                ✓
              </div>
              <h3 className="text-xl font-bold text-white">تم تأسيس وربط النشاط بنجاح!</h3>
              <p className="text-xs text-slate-400">تم إنشاء بيئة العمل وتحديد المزايا ورابط الدخول وحساب المدير فورياً</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-cairo">اسم النشاط:</span>
                <span className="font-bold text-white font-cairo">{createdCredentials.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-cairo">رابط الدخول المباشر:</span>
                <a
                  href={createdCredentials.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 font-bold hover:underline break-all"
                >
                  {createdCredentials.url} ↗
                </a>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block font-cairo">رقم الموظف (ID):</span>
                  <span className="text-blue-400 font-bold text-base">{createdCredentials.employeeCode}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-cairo">الرقم السري (PIN):</span>
                  <span className="text-emerald-400 font-bold text-base">{createdCredentials.pinCode}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyCredentialsToClipboard}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
              >
                {copied ? '✓ تم النسخ للحافظة!' : '📋 نسخ بيانات الدخول للعميل (واتساب)'}
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="h-11 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
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
