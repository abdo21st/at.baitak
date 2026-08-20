'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AttendanceRecord, Department, JobRole, CompanySettings } from '@/lib/types';
import { 
  Clock, ShieldCheck, CheckCircle2, Edit3, X, Calendar, Coins, LogOut, 
  UserPlus, Users, Trash2, Key, Hash, UserCheck, BarChart3, Building2, 
  Briefcase, MapPin, Settings, ShieldAlert, Navigation, MessageSquare, 
  Send, Check, Bell, PanelRightClose, PanelRightOpen, Menu, Sparkles, 
  RefreshCw, ChevronLeft, ChevronRight, Phone, CheckCircle, AlertTriangle, FileText, Zap, Package, Printer, Pill
} from 'lucide-react';
import AttendanceCalendar from '@/components/AttendanceCalendar';
import DepartmentManagement from '@/components/DepartmentManagement';
import RateRulesManagement from '@/components/RateRulesManagement';
import BroadcastModal from '@/components/BroadcastModal';
import ClinicalCapsuleModal from '@/components/ClinicalCapsuleModal';
import { useSortableData } from '@/hooks/useSortableData';
import SortHeader from '@/components/SortHeader';
import { formatTime12h, convert12to24, convert24to12, formatHoursText } from '@/lib/utils';
import PrintReportLayout from '@/components/PrintReportLayout';
import TaskManagement from '@/components/TaskManagement';
import FieldVisitsManager from '@/components/FieldVisitsManager';
import { Car } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Broadcast & Clinical Modal States
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'CALENDAR' | 'PROJECTS' | 'FIELD_VISITS' | 'EMPLOYEES' | 'DEPARTMENTS' | 'RATE_RULES' | 'SETTINGS' | 'WHATSAPP'>('ATTENDANCE');

  // Sidebar Collapsed & Mobile States (الخيار رقم 2: القائمة الجانبية الفاخرة)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // WhatsApp & n8n Automation Settings State
  const [managerPhone, setManagerPhone] = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('https://n8n.ordermt.ly/webhook/attendance-alert');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
  const [whatsappGroupName, setWhatsappGroupName] = useState('صيدلية بيتك');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappActionMsg, setWhatsappActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [whatsappActionLoading, setWhatsappActionLoading] = useState(false);

  // GPS Settings State
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsLatitude, setGpsLatitude] = useState('32.8872');
  const [gpsLongitude, setGpsLongitude] = useState('13.1913');
  const [gpsRadiusMeters, setGpsRadiusMeters] = useState('200');
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Time & Date Edit Modal State
  const hours12List = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editCheckOutDate, setEditCheckOutDate] = useState('');
  const [editInHour, setEditInHour] = useState('08');
  const [editInMinute, setEditInMinute] = useState('00');
  const [editInPeriod, setEditInPeriod] = useState<'AM' | 'PM'>('AM');
  const [editOutHour, setEditOutHour] = useState('04');
  const [editOutMinute, setEditOutMinute] = useState('00');
  const [editOutPeriod, setEditOutPeriod] = useState<'AM' | 'PM'>('PM');
  const [editShiftAmount, setEditShiftAmount] = useState('0');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter state for Attendance Tab
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');

  // Employee Management Modals & State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empPin, setEmpPin] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDepartmentId, setEmpDepartmentId] = useState('');
  const [empJobRoleId, setEmpJobRoleId] = useState('');
  const [empDepartmentIds, setEmpDepartmentIds] = useState<string[]>([]);
  const [empJobRoleIds, setEmpJobRoleIds] = useState<string[]>([]);
  const [empMonthlySalary, setEmpMonthlySalary] = useState('0');
  const [empTargetHours, setEmpTargetHours] = useState('');
  const [empRate, setEmpRate] = useState('50');
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const [tenantInfo, setTenantInfo] = useState<{
    name: string;
    logo: string | null;
    slug: string;
    hasClinicalCapsule?: boolean;
    hasInventory?: boolean;
    hasPurchases?: boolean;
  }>({
    name: '',
    logo: null,
    slug: '',
    hasClinicalCapsule: false,
    hasInventory: false,
    hasPurchases: false,
  });

  const fetchDashboardData = async () => {
    try {
      const [empRes, depRes, attRes, setRes, tenantRes] = await Promise.all([
        fetch('/api/employees').then((r) => r.json()),
        fetch('/api/departments').then((r) => r.json()),
        fetch('/api/attendance').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/tenant/info').then((r) => r.json()).catch(() => ({}))
      ]);

      if (tenantRes.success && tenantRes.tenant) {
        setTenantInfo({
          name: tenantRes.tenant.name || '',
          logo: tenantRes.tenant.logo || null,
          slug: tenantRes.tenant.slug || '',
          hasClinicalCapsule: tenantRes.tenant.hasClinicalCapsule === true,
          hasInventory: tenantRes.tenant.hasInventory === true,
          hasPurchases: tenantRes.tenant.hasPurchases === true,
        });
      }

      if (empRes.success && empRes.users) setUsers(empRes.users);
      if (depRes.success && depRes.departments) setDepartments(depRes.departments);
      if (attRes.success && attRes.records) setRecords(attRes.records);

      if (setRes.success && setRes.settings) {
        const s: CompanySettings = setRes.settings;
        setGpsEnabled(Boolean(s.gpsEnabled));
        if (s.gpsLatitude) setGpsLatitude(String(s.gpsLatitude));
        if (s.gpsLongitude) setGpsLongitude(String(s.gpsLongitude));
        if (s.gpsRadiusMeters) setGpsRadiusMeters(String(s.gpsRadiusMeters));
        if (s.managerPhone) setManagerPhone(String(s.managerPhone));
        if (s.n8nWebhookUrl) setN8nWebhookUrl(String(s.n8nWebhookUrl));
        if (s.whatsappGroupLink) setWhatsappGroupLink(String(s.whatsappGroupLink));
        if (s.whatsappGroupName) setWhatsappGroupName(String(s.whatsappGroupName));
        if (s.whatsappNotificationsEnabled !== undefined) setWhatsappEnabled(Boolean(s.whatsappNotificationsEnabled));
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  // WhatsApp & n8n Automation Handlers
  const handleSaveWhatsAppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappActionLoading(true);
    setWhatsappActionMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerPhone,
          n8nWebhookUrl,
          whatsappGroupLink,
          whatsappGroupName,
          whatsappNotificationsEnabled: whatsappEnabled
        })
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappActionMsg({ text: '✅ تم حفظ إعدادات واتساب و n8n بنجاح!', type: 'success' });
      } else {
        setWhatsappActionMsg({ text: data.error || 'خطأ في حفظ الإعدادات', type: 'error' });
      }
    } catch {
      setWhatsappActionMsg({ text: 'تعذر الاتصال بالخادم', type: 'error' });
    } finally {
      setWhatsappActionLoading(false);
    }
  };

  const [payrollMonth, setPayrollMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [payrollEmpId, setPayrollEmpId] = useState('ALL');

  const handleTriggerWhatsAppAction = async (action: 'TEST' | 'DAILY_DIGEST' | 'REMIND_OPEN_SHIFTS') => {
    setWhatsappActionLoading(true);
    setWhatsappActionMsg(null);

    try {
      const res = await fetch('/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, managerPhone, webhookUrl: n8nWebhookUrl })
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappActionMsg({ text: data.message || 'تمت العملية بنجاح!', type: 'success' });
      } else {
        setWhatsappActionMsg({ text: data.error || 'فشلت العملية', type: 'error' });
      }
    } catch {
      setWhatsappActionMsg({ text: 'تعذر إرسال الطلب إلى الـ Webhook', type: 'error' });
    } finally {
      setWhatsappActionLoading(false);
    }
  };

  const handleSendMonthlyPayroll = async () => {
    setWhatsappActionLoading(true);
    setWhatsappActionMsg(null);

    try {
      const res = await fetch('/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MONTHLY_PAYROLL',
          month: payrollMonth,
          employeeId: payrollEmpId === 'ALL' ? undefined : payrollEmpId,
          webhookUrl: n8nWebhookUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappActionMsg({ text: data.message || 'تم إرسال كشوفات الرواتب بنجاح! 🟢', type: 'success' });
      } else {
        setWhatsappActionMsg({ text: data.error || 'فشل إرسال كشوفات الرواتب', type: 'error' });
      }
    } catch {
      setWhatsappActionMsg({ text: 'تعذر الاتصال بالخادم', type: 'error' });
    } finally {
      setWhatsappActionLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // تحديث عنوان تبويب المتصفح ديناميكيًا بمجرد تحميل اسم الشركة
  useEffect(() => {
    if (tenantInfo.name) {
      document.title = `حضورك | ${tenantInfo.name}`;
    }
  }, [tenantInfo.name]);


  const filteredRecords = selectedUserId === 'ALL'
    ? records
    : records.filter((r) => r.userId === selectedUserId);

  const { items: sortedFilteredRecords, requestSort: requestRecordSort, sortConfig: recordSortConfig } = useSortableData(filteredRecords, {
    key: 'date',
    direction: 'desc'
  });

  const { items: sortedUsers, requestSort: requestUserSort, sortConfig: userSortConfig } = useSortableData(users, {
    key: 'name',
    direction: 'asc'
  });

  // Calculate monthly stats for the current month and respects employee filter
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const currentMonthRecords = filteredRecords.filter((r) => r.date?.startsWith(currentMonthPrefix));
  const totalMonthlyHours = Number(currentMonthRecords.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(2));
  const totalMonthlyEarned = Number(currentMonthRecords.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2));

  // Verify attendance action (توثيق الحضور)
  const handleVerifyRecord = async (recordId: string) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VERIFY', recordId })
      });

      const data = await res.json();
      if (data.success) {
        if (data.record) {
          setRecords((prev) => prev.map((r) => (r.id === recordId ? data.record : r)));
        } else {
          setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, isVerified: true } : r)));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete attendance record action (حذف سجل الحضور)
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('هل أنت متأكد من حذف سجل الحضور هذا بالكامل؟')) return;

    try {
      const res = await fetch(`/api/attendance?id=${recordId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      } else {
        alert(data.error || 'خطأ في حذف السجل');
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const openEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setMsg(null);
    setEditDate(rec.date);
    setEditCheckOutDate(rec.date);
    setEditShiftAmount(rec.shiftAmount !== undefined ? String(rec.shiftAmount) : '0');
    const inState = convert24to12(rec.checkInTime);
    setEditInHour(inState.hour);
    setEditInMinute(inState.minute);
    setEditInPeriod(inState.period);

    if (rec.checkOutTime) {
      const outState = convert24to12(rec.checkOutTime);
      setEditOutHour(outState.hour);
      setEditOutMinute(outState.minute);
      setEditOutPeriod(outState.period);
    } else {
      setEditOutHour('04');
      setEditOutMinute('00');
      setEditOutPeriod('PM');
    }
  };

  // Save edited check-in / check-out dates and times
  const handleSaveTimeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const newIn = convert12to24(editInHour, editInMinute, editInPeriod);
    const newOut = convert12to24(editOutHour, editOutMinute, editOutPeriod);

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_TIME',
          recordId: editingRecord.id,
          date: editDate,
          checkInTime: newIn,
          checkOutDate: editCheckOutDate,
          checkOutTime: newOut,
          shiftAmount: Number(editShiftAmount) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.map((r) => (r.id === data.record.id ? data.record : r)));
        setEditingRecord(null);
      } else {
        setMsg(data.error || 'خطأ في التعديل');
      }
    } catch {
      setMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // All available job roles across all departments
  const allAvailableJobRoles = departments.flatMap((d) => (d.jobRoles || []).map((r) => ({ ...r, departmentName: d.name })));
  const availableJobRoles = departments.find((d) => d.id === empDepartmentId)?.jobRoles || [];

  const toggleJobRoleSelection = (roleId: string) => {
    setEmpJobRoleIds((prev) => {
      const exists = prev.includes(roleId);
      const newIds = exists ? prev.filter((id) => id !== roleId) : [...prev, roleId];

      const selectedRoles = allAvailableJobRoles.filter((r) => newIds.includes(r.id));
      const totalSalary = selectedRoles.reduce((sum, r) => sum + (r.monthlySalary || 0), 0);
      const primaryRole = selectedRoles[0];

      setEmpMonthlySalary(String(totalSalary));
      setEmpTargetHours(primaryRole ? String(primaryRole.targetMonthlyHours || 0) : '0');
      setEmpJobRoleId(primaryRole ? primaryRole.id : '');

      const relatedDepIds = Array.from(new Set(selectedRoles.map((r) => r.departmentId).filter(Boolean)));
      setEmpDepartmentIds(relatedDepIds);
      setEmpDepartmentId(relatedDepIds[0] || '');

      return newIds;
    });
  };

  const handleJobRoleChange = (roleId: string) => {
    setEmpJobRoleId(roleId);
    if (!roleId) {
      setEmpMonthlySalary('0');
      return;
    }
    const role = availableJobRoles.find((r) => r.id === roleId);
    if (role) {
      setEmpMonthlySalary(String(role.monthlySalary));
      setEmpTargetHours(String(role.targetMonthlyHours));
    }
  };

  // Add New Employee Action
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg(null);

    if (!empName || !empCode || !empPin) {
      setUserMsg('الاسم، رقم الموظف، والرقم السري مطلوبة');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empName,
          employeeCode: empCode,
          pinCode: empPin,
          phone: empPhone,
          departmentIds: empDepartmentIds,
          jobRoleIds: empJobRoleIds,
          hourlyRate: Number(empRate) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setIsAddUserOpen(false);
        setEmpName('');
        setEmpCode('');
        setEmpPin('');
        setEmpPhone('');
        setEmpDepartmentIds([]);
        setEmpJobRoleIds([]);
      } else {
        setUserMsg(data.error || 'حدث خطأ في إضافة الموظف');
      }
    } catch {
      setUserMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Save Edited Employee Action
  const handleSaveEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserMsg(null);

    setLoading(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: empName,
          employeeCode: empCode,
          pinCode: empPin,
          phone: empPhone,
          departmentIds: empDepartmentIds,
          jobRoleIds: empJobRoleIds,
          hourlyRate: Number(empRate) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setEditingUser(null);
        setEmpPhone('');
      } else {
        setUserMsg(data.error || 'حدث خطأ في تعديل الموظف');
      }
    } catch {
      setUserMsg('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Delete Employee Action
  const handleDeleteEmployee = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من إرادتك لحذف الموظف (${userName}) نهائياً؟`)) return;

    try {
      const res = await fetch(`/api/employees?id=${userId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        alert(data.error || 'خطأ في حذف الموظف');
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const openAddUserModal = () => {
    setEmpName('');
    setEmpCode('');
    setEmpPin('1234');
    setEmpPhone('');
    setEmpDepartmentId('');
    setEmpDepartmentIds([]);
    setEmpJobRoleId('');
    setEmpJobRoleIds([]);
    setEmpMonthlySalary('0');
    setEmpRate('50');
    setUserMsg(null);
    setIsAddUserOpen(true);
  };

  // Save GPS settings action
  const handleSaveGpsSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gpsEnabled,
          gpsLatitude: Number(gpsLatitude) || 32.8872,
          gpsLongitude: Number(gpsLongitude) || 13.1913,
          gpsRadiusMeters: Number(gpsRadiusMeters) || 200
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMsg('تم حفظ إعدادات الموقع الجغرافي (GPS) بنجاح!');
      } else {
        setSettingsMsg(data.error || 'خطأ في حفظ الإعدادات');
      }
    } catch {
      setSettingsMsg('خطأ في الاتصال بالخادم');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Get current browser location for admin
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLatitude(pos.coords.latitude.toFixed(6));
          setGpsLongitude(pos.coords.longitude.toFixed(6));
          setSettingsMsg('تم جلب إحداثيات موقعك الحالي بنجاح!');
        },
        () => {
          alert('تعذر جلب موقعك الحالي. يُرجى منح إذن تحديد الموقع للمتصفح.');
        }
      );
    } else {
      alert('تحديد الموقع الجغرافي غير مدعوم في متصفحك.');
    }
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setEmpName(u.name);
    setEmpCode(u.employeeCode);
    setEmpPin(u.pinCode);
    setEmpPhone(u.phone || '');
    const depIds = u.departments ? u.departments.map((d) => d.id) : (u.departmentId ? [u.departmentId] : []);
    const roleIds = u.jobRoles ? u.jobRoles.map((r) => r.id) : (u.jobRoleId ? [u.jobRoleId] : []);
    setEmpDepartmentIds(depIds);
    setEmpJobRoleIds(roleIds);
    setEmpDepartmentId(depIds[0] || '');
    setEmpJobRoleId(roleIds[0] || '');
    
    const selectedRoles = allAvailableJobRoles.filter((r) => roleIds.includes(r.id));
    const totalSalary = selectedRoles.reduce((sum, r) => sum + (r.monthlySalary || 0), 0);
    setEmpMonthlySalary(String(totalSalary || u.monthlySalary || 0));
    setEmpTargetHours(String(selectedRoles[0]?.targetMonthlyHours || u.targetMonthlyHours || 0));
    setEmpRate(String(u.hourlyRate || 50));
    setUserMsg(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-cairo flex flex-col" dir="rtl">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Modern Collapsible Sidebar (الخيار رقم 2: القائمة الجانبية الفاخرة) */}
      <aside
        className={`fixed top-0 right-0 h-screen z-50 bg-slate-950 text-white flex flex-col justify-between border-l border-slate-800 shadow-2xl transition-all duration-300 print:hidden ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } ${mobileSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}
      >
        {/* Sidebar Header: Brand & Collapse Toggle */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg shrink-0 border border-slate-700">
              {tenantInfo.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={tenantInfo.logo} alt={tenantInfo.name} className="w-full h-full object-contain rounded-xl" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src="/icon-192.png" alt={tenantInfo.name || 'حضورك'} className="w-full h-full object-contain" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white truncate tracking-tight">{tenantInfo.name || 'حضورك'}</h1>
                <p className="text-[10px] text-blue-400 font-bold truncate">لوحة التحكم المركزية</p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
            title={sidebarCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {sidebarCollapsed ? <PanelRightOpen className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('ATTENDANCE'); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              activeTab === 'ATTENDANCE'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
            title="سجل وتوثيق الدوام"
          >
            <Calendar className="w-5 h-5 shrink-0 text-emerald-400" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-right truncate">سجل وتوثيق الدوام</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-mono font-bold">
                  {records.length}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('CALENDAR'); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              activeTab === 'CALENDAR'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
            title="تقويم ساعات الحضور والخط الزمني"
          >
            <BarChart3 className="w-5 h-5 shrink-0 text-teal-400" />
            {!sidebarCollapsed && <span className="flex-1 text-right truncate">تقويم الحضور الزمني</span>}
          </button>

          <button
            onClick={() => { setActiveTab('EMPLOYEES'); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              activeTab === 'EMPLOYEES'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
            title="قسم إدارة الموظفين"
          >
            <Users className="w-5 h-5 shrink-0 text-blue-400" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-right truncate">إدارة الموظفين</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-mono font-bold">
                  {users.filter(u => u.role !== 'ADMIN').length}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('DEPARTMENTS'); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              activeTab === 'DEPARTMENTS'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
            title="إدارة الأقسام والوظائف"
          >
            <Building2 className="w-5 h-5 shrink-0 text-indigo-400" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-right truncate">الأقسام والوظائف</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-mono font-bold">
                  {departments.length}
                </span>
              </>
            )}
          </button>

          {/* Tab: Tasks & Projects */}
          <button
            onClick={() => { setActiveTab('PROJECTS'); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              activeTab === 'PROJECTS'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
            title="إدارة المهام والمشاريع"
          >
            <Briefcase className="w-5 h-5 shrink-0 text-cyan-400" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-right truncate">المهام والمشاريع</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                  جديد
                </span>
              </>
            )}
          </button>

          {/* Tab: Field Visits & Maintenance */}
          <button
            onClick={() => { setActiveTab('FIELD_VISITS'); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              activeTab === 'FIELD_VISITS'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
            title="الزيارات الميدانية والصيانة"
          >
            <Car className="w-5 h-5 shrink-0 text-emerald-400" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-right truncate">الزيارات الميدانية</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                  جديد 🚗
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('RATE_RULES'); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              activeTab === 'RATE_RULES'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
            title="قواعد وزيادات الساعات"
          >
            <Zap className="w-5 h-5 shrink-0 text-amber-400" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-right truncate">قواعد وزيادات الساعات</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                  جديد
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('SETTINGS'); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              activeTab === 'SETTINGS'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
            title="إعدادات GPS والموقع"
          >
            <MapPin className="w-5 h-5 shrink-0 text-purple-400" />
            {!sidebarCollapsed && <span className="flex-1 text-right truncate">إعدادات GPS والموقع</span>}
          </button>

          <button
            onClick={() => { setActiveTab('WHATSAPP'); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              activeTab === 'WHATSAPP'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
            title="إشعارات واتساب و n8n"
          >
            <MessageSquare className="w-5 h-5 shrink-0 text-emerald-400" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-right truncate">إشعارات واتساب & n8n</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </>
            )}
          </button>

          {/* WhatsApp Broadcast Center Button */}
          <button
            onClick={() => { setIsBroadcastModalOpen(true); setMobileSidebarOpen(false); }}
            className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer border ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
            } bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white shadow-sm`}
            title="إرسال رسائل جماعية للواتساب"
          >
            <Send className="w-5 h-5 shrink-0 text-emerald-400" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-right truncate">رسائل جماعية للموظفين</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                  واتساب 📢
                </span>
              </>
            )}
          </button>

          {/* Clinical Drug Capsule Button */}
          {tenantInfo.hasClinicalCapsule === true && (
            <button
              onClick={() => { setIsClinicalModalOpen(true); setMobileSidebarOpen(false); }}
              className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer border ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
              } bg-teal-600/20 border-teal-500/40 text-teal-300 hover:bg-teal-600 hover:text-white shadow-sm`}
              title="الكبسولة الدوائية والتدريب السريري الذكي للموظفين"
            >
              <Pill className="w-5 h-5 shrink-0 text-teal-400" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-right truncate">الكبسولة الدوائية والتدريب</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500 text-white text-[10px] font-bold">
                    سريري 💊
                  </span>
                </>
              )}
            </button>
          )}

          {/* Pharmacy Portal Link */}
          {(tenantInfo.hasInventory === true || tenantInfo.hasPurchases === true) && (
            <button
              onClick={() => router.push('/pharmacy')}
              className={`w-full h-12 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer border ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
              } bg-emerald-950/60 border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/80 hover:text-white hover:border-emerald-500`}
              title="منظومة المشتريات والمخزون الصيدلاني"
            >
              <Package className="w-5 h-5 shrink-0 text-emerald-400" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-right truncate">المشتريات والمخزون</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                    صيدلية 🌿
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Sidebar Footer: User profile & Logout */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {!sidebarCollapsed && (
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-black shrink-0">
                م
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-200 truncate">مدير النظام</p>
                <p className="text-[10px] text-emerald-400 font-mono">متصل الآن 🟢</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`w-full h-10 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3'
            } text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50`}
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area (يتكيف تلقائياً مع حجم القائمة الجانبية) */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'md:mr-20' : 'md:mr-72'} flex-1 flex flex-col`}>
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
          <div className="px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
                  {activeTab === 'ATTENDANCE' && 'سجل وتوثيق دوام الموظفين'}
                  {activeTab === 'CALENDAR' && 'تقويم ساعات الحضور والخط الزمني'}
                  {activeTab === 'EMPLOYEES' && 'قسم إدارة الموظفين'}
                  {activeTab === 'DEPARTMENTS' && 'إدارة الأقسام والوظائف'}
                  {activeTab === 'RATE_RULES' && 'قواعد وبدلات تسعير الساعات الديناميكية'}
                  {activeTab === 'SETTINGS' && 'إعدادات GPS والموقع الجغرافي'}
                  {activeTab === 'WHATSAPP' && 'إعدادات وإشعارات واتساب عبر n8n'}
                </h1>
                <p className="text-slate-500 text-[11px] font-semibold hidden sm:block">
                  {activeTab === 'ATTENDANCE' && 'توثيق الحضور وتعديل ساعات الدوام وإجمالي الأجور المستحقة'}
                  {activeTab === 'CALENDAR' && 'استعراض الحضور والشفتات عبر التقويم اليومي والشهري'}
                  {activeTab === 'EMPLOYEES' && 'إضافة وتعديل بيانات الموظفين وأجورهم ومستحقاتهم'}
                  {activeTab === 'DEPARTMENTS' && 'إدارة الهيكل الإداري والأقسام والوظائف ورواتبها'}
                  {activeTab === 'RATE_RULES' && 'تحديد زيادات الأجر بالساعة لأيام معينة، شفتات الليل، أو مناسبات محددة'}
                  {activeTab === 'SETTINGS' && 'ضبط نطاق مقر العمل الجغرافي والتسجيل الذكي'}
                  {activeTab === 'WHATSAPP' && 'الربط التلقائي مع واتساب لإرسال ملخصات الدوام وتنبيهات الشفتات'}
                </p>
              </div>
            </div>

            {/* Quick Actions & Metrics Badge */}
            <div className="flex items-center gap-2">
              {tenantInfo.hasClinicalCapsule === true && (
                <button
                  onClick={() => setIsClinicalModalOpen(true)}
                  className="h-10 px-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl text-xs font-black shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="الكبسولة الدوائية والتدريب السريري للموظفين"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>الكبسولة الدوائية 💊</span>
                </button>
              )}

              <button
                onClick={() => setIsBroadcastModalOpen(true)}
                className="h-10 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                title="إرسال رسائل جماعية للواتساب"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال واتساب للموظفين 📢</span>
              </button>

              <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-600 font-sans">السجلات:</span>
                <span className="text-blue-700 font-black">{records.length}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 font-sans">الموظفون:</span>
                <span className="text-emerald-700 font-black">{users.filter(u => u.role !== 'ADMIN').length}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 px-4 md:px-8 py-6 space-y-6">

        {/* TAB 1: ATTENDANCE LOG & VERIFICATION */}
        {activeTab === 'ATTENDANCE' && (
          <div className="space-y-6">
            {/* Top Summary Widgets with Equal Height h-24 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="bg-white h-24 p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي الساعات المسجلة</span>
                  <span className="text-2xl font-black text-slate-900 font-sans">{formatHoursText(totalMonthlyHours)}</span>
                </div>
              </div>

              <div className="bg-white h-24 p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-bold block font-sans">إجمالي الأجور المستحقة</span>
                  <span className="text-2xl font-black text-emerald-700">{totalMonthlyEarned} د.ل</span>
                </div>
              </div>

              <div className="bg-white h-24 p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-bold block">تصفية حسب الموظف</span>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">جميع الموظفين ({records.length})</option>
                    {users.filter(u => u.role !== 'ADMIN').map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (كود: {u.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Attendance Verification & Editing Log Table & Print Report Container */}
            <PrintReportLayout
              systemName="نظام حضورك لإدارة الحضور والرواتب"
              reportTitle="كشف الحضور والانصراف ومسير الرواتب المعتمد"
              reportSubtitle="بيان ساعات العمل والدوام الفعلي والمبالغ المستحقة للموظفين"
              metaDetails={[
                { label: 'عدد السجلات المعروضة', value: sortedFilteredRecords.length },
                { label: 'تصفية الموظف', value: selectedUserId === 'ALL' ? 'كافة الموظفين' : (users.find(u => u.id === selectedUserId)?.name || selectedUserId) }
              ]}
              summaryCards={[
                { label: 'إجمالي الساعات المسجلة', value: totalMonthlyHours, unit: 'ساعة' },
                { label: 'إجمالي الأجور المستحقة', value: totalMonthlyEarned, unit: 'د.ل' }
              ]}
            >
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 print:border-none print:p-0">
                <div className="flex flex-wrap items-center justify-between gap-4 no-print">
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    سجل الحضور والانصراف وتوثيق ساعات الموظفين
                  </h2>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة كشف الحضور والرواتب (A4)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="py-3.5 px-4 hidden print:table-cell text-center w-10">#</th>
                        <SortHeader title="التاريخ" sortKey="date" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} />
                        <SortHeader title="الموظف" sortKey="userName" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} />
                        <SortHeader title="وقت الحضور" sortKey="checkInTime" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} />
                        <SortHeader title="وقت الانصراف" sortKey="checkOutTime" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} />
                        <SortHeader title="ساعات اليوم" sortKey="workHours" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} align="center" />
                        <SortHeader title="المبلغ المستحق" sortKey="earnedCost" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} align="center" />
                        <SortHeader title="توثيق الحضور" sortKey="isVerified" sortConfig={recordSortConfig} onRequestSort={requestRecordSort} align="center" />
                        <th className="py-3.5 px-4 font-bold text-center no-print">تعديل الساعات</th>
                        <th className="py-3.5 px-4 font-bold text-center no-print">حذف السجل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                    {sortedFilteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 font-sans font-medium">
                          لا توجد سجلات حضور مسجلة.
                        </td>
                      </tr>
                    ) : (
                      sortedFilteredRecords.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 hidden print:table-cell font-mono text-[10px] text-slate-500 text-center">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 font-sans">{r.date}</td>
                          <td className="py-3.5 px-4 font-sans font-extrabold text-slate-900">
                            <div>{r.userName} <span className="text-[10px] text-slate-400 font-mono font-normal">({r.employeeCode})</span></div>
                            {r.isOutsideGps && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold mt-0.5 font-sans no-print">
                                <ShieldAlert className="w-3 h-3 text-amber-700" />
                                خارج نطاق GPS
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-600 font-bold">{formatTime12h(r.checkInTime)}</td>
                          <td className="py-3.5 px-4 text-rose-600 font-bold">{formatTime12h(r.checkOutTime)}</td>
                          <td className="py-3.5 px-4 text-center font-black font-sans">{formatHoursText(r.workHours)}</td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            <div className="font-black text-emerald-700">{r.earnedCost} د.ل</div>
                            {(() => {
                              const userObj = users.find(u => u.id === r.userId);
                              const hourly = userObj?.hourlyRate || 0;
                              const base = Number((r.workHours * hourly).toFixed(2));
                              const comm = Number((r as any).commissionAmount) || 0;
                              const bonus = Number((r.earnedCost - base - comm).toFixed(2));
                              return (
                                <div className="space-y-0.5">
                                  {bonus > 0.05 && (
                                    <div className="text-[10px] text-amber-850 font-sans font-bold mt-0.5 inline-flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 shadow-2xs" title={`أجر الساعات الأساسي: ${base} د.ل + علاوات الشفتات: ${bonus} د.ل`}>
                                      <span>أساسي: {base}</span>
                                      <span>+</span>
                                      <span className="text-orange-700">بدلات: {bonus}</span>
                                    </div>
                                  )}
                                  {comm > 0 && (
                                    <div className="text-[10px] text-emerald-850 font-sans font-bold mt-0.5 inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                                      <span>🛒 {(r as any).shiftAmountType === 'PURCHASES' ? 'مشتريات' : 'مبيعات'}: {(r as any).shiftAmount || 0}</span>
                                      <span>➔</span>
                                      <span className="text-emerald-700 font-black">+{comm} د.ل عمولة</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3.5 px-4 text-center font-sans">
                            {r.isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold print:border-none print:p-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 print:hidden" />
                                موثّق
                              </span>
                            ) : (
                              <button
                                onClick={() => handleVerifyRecord(r.id)}
                                className="px-3 h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1 mx-auto shadow-sm cursor-pointer no-print"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                توثيق الحضور
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center font-sans no-print">
                            <button
                              onClick={() => openEditModal(r)}
                              className="px-3 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto cursor-pointer"
                              title="تعديل وقت الحضور والانصراف"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                              تعديل
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center font-sans no-print">
                            <button
                              onClick={() => handleDeleteRecord(r.id)}
                              className="px-2.5 h-8 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto cursor-pointer"
                              title="حذف سجل الحضور هذا بالكامل"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              حذف
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </PrintReportLayout>
          </div>
        )}

        {/* TAB 2: ATTENDANCE HOURS CALENDAR & TIMELINE */}
        {activeTab === 'CALENDAR' && (
          <AttendanceCalendar users={users} records={records} />
        )}

        {/* TAB 3: EMPLOYEE MANAGEMENT SECTION */}
        {activeTab === 'EMPLOYEES' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  قسم إدارة وتحديث بيانات الموظفين
                </h2>
                <p className="text-slate-500 text-xs font-semibold">
                  إضافة موظف جديد، تعيين أجر ساعته المباشر وراتب الوظيفة الخاص، أو حذفه
                </p>
              </div>

              <button
                onClick={openAddUserModal}
                className="px-4 h-11 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <UserPlus className="w-4 h-4" />
                إضافة موظف جديد
              </button>
            </div>

            {/* Employees Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <SortHeader title="اسم الموظف" sortKey="name" sortConfig={userSortConfig} onRequestSort={requestUserSort} />
                    <SortHeader title="القسم والوظيفة" sortKey="departmentName" sortConfig={userSortConfig} onRequestSort={requestUserSort} />
                    <SortHeader title="رقم الموظف (ID)" sortKey="employeeCode" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <SortHeader title="الرقم السري (PIN)" sortKey="pinCode" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <SortHeader title="أجر الساعة المباشر" sortKey="hourlyRate" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <SortHeader title="راتب الوظيفة الخاص" sortKey="monthlySalary" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <th className="py-3.5 px-4 font-bold text-center text-emerald-700">إجمالي المرتب الشهري</th>
                    <SortHeader title="نوع الحساب" sortKey="role" sortConfig={userSortConfig} onRequestSort={requestUserSort} align="center" />
                    <th className="py-3.5 px-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 font-sans">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
                            {u.name.substring(0, 1)}
                          </div>
                          <div>
                            <div className="text-slate-900">{u.name}</div>
                            {u.phone ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md font-mono font-bold mt-0.5" dir="ltr">
                                <Phone className="w-2.5 h-2.5 text-emerald-600" />
                                {u.phone}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">⚠️ بدون رقم هاتف</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold">
                        <div className="text-slate-900">
                          {u.departmentNames && u.departmentNames.length > 0
                            ? u.departmentNames.join(', ')
                            : (u.departmentName || 'عام')}
                        </div>
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                          {u.jobRoleTitles && u.jobRoleTitles.length > 0
                            ? u.jobRoleTitles.join(' + ')
                            : (u.jobTitle || 'بدون وظيفة خاصة')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-blue-700">{u.employeeCode}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-600">{u.pinCode}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-blue-700">
                        {u.hourlyRate || 0} د.ل/س
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black">
                        {(u.jobRoleIds?.length || (u.jobRoleId ? 1 : 0)) > 0 && u.monthlySalary && u.monthlySalary > 0 ? (
                          <span className="text-emerald-700">
                            {u.monthlySalary} د.ل <span className="text-[10px] text-slate-400 font-normal font-sans">/ شهري</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans font-medium text-[11px]">بدون وظيفة خاصة</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-700 bg-emerald-50/40">
                        {u.targetMonthlyHours && u.targetMonthlyHours > 0 ? (
                          <>
                            {(((u.targetMonthlyHours) * (u.hourlyRate || 0)) + (u.monthlySalary || 0)).toFixed(2)} د.ل
                            <span className="block text-[9px] text-slate-400 font-sans font-normal font-mono">
                              ({u.targetMonthlyHours}س × {u.hourlyRate || 0} + {u.monthlySalary || 0})
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 font-sans text-[11px]">
                            {u.monthlySalary && u.monthlySalary > 0 ? `${u.monthlySalary} د.ل + الساعات` : 'حسب الساعات الفعلية'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        {u.role === 'ADMIN' ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-emerald-400 text-[10px] font-black">
                            مدير النظام
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                            موظف
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="px-2.5 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="تعديل بيانات الموظف"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            تعديل
                          </button>

                          {u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleDeleteEmployee(u.id, u.name)}
                              className="px-2.5 h-8 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="حذف الموظف"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DEPARTMENT & JOB ROLE MANAGEMENT */}
        {activeTab === 'DEPARTMENTS' && (
          <DepartmentManagement onDepartmentsChange={(deps) => setDepartments(deps)} />
        )}

        {/* TAB: TASKS & PROJECTS */}
        {activeTab === 'PROJECTS' && (
          <TaskManagement />
        )}

        {/* TAB: FIELD VISITS & MAINTENANCE */}
        {activeTab === 'FIELD_VISITS' && (
          <FieldVisitsManager />
        )}

        {/* TAB 5: GPS GEOFENCING & SYSTEM SETTINGS */}
        {activeTab === 'SETTINGS' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  إعدادات التحديد الجغرافي (GPS Geofencing)
                </h2>
                <p className="text-slate-500 text-xs font-semibold mt-1">
                  حدد موقع مقر الشركة وإحداثياته على الخريطة ونصف قطر النطاق الجغرافي المسموح به للموظفين.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveGpsSettings} className="space-y-6 max-w-2xl text-xs font-bold">
              {/* Toggle GPS Enabled */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">تفعيل نظام التحديد الجغرافي (GPS)</h4>
                  <p className="text-slate-500 text-[11px] font-semibold mt-0.5">
                    عند التفعيل، سيتم حساب مسافة الموظف عن النطاق وتنبيهه وتوثيق ما إذا كان الحضور من داخل أو خارج مقر العمل.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gpsEnabled}
                    onChange={(e) => setGpsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* GPS Location & Coordinates */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 font-extrabold text-sm">إحداثيات موقع مقر العمل (Latitude & Longitude)</label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-purple-200"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    استخدام موقعي الحالي
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
                  <div>
                    <label className="block text-slate-600 mb-1 font-sans">خط العرض (Latitude)</label>
                    <input
                      type="text"
                      required
                      value={gpsLatitude}
                      onChange={(e) => setGpsLatitude(e.target.value)}
                      placeholder="32.8872"
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-purple-500 text-left"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-sans">خط الطول (Longitude)</label>
                    <input
                      type="text"
                      required
                      value={gpsLongitude}
                      onChange={(e) => setGpsLongitude(e.target.value)}
                      placeholder="13.1913"
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-purple-500 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Radius in Meters */}
              <div>
                <label className="block text-slate-800 font-extrabold text-sm mb-1">
                  نصف قطر النطاق المسموح به (بالأمتار)
                </label>
                <p className="text-slate-500 text-[11px] font-semibold mb-2">
                  المسافة القصوى التي يُعتبر الموظف فيها متواجداً داخل مقر العمل (مثال: 200 متر).
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    required
                    min="10"
                    max="5000"
                    value={gpsRadiusMeters}
                    onChange={(e) => setGpsRadiusMeters(e.target.value)}
                    className="w-40 h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center text-base focus:outline-none focus:border-purple-500"
                    dir="ltr"
                  />
                  <span className="text-slate-600 font-bold">متر (م)</span>
                </div>
              </div>

              {settingsMsg && (
                <div className="p-3.5 rounded-2xl text-xs font-black text-center bg-purple-50 text-purple-900 border border-purple-200">
                  {settingsMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={settingsLoading}
                className="w-full sm:w-auto px-8 h-12 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {settingsLoading ? 'جاري الحفظ...' : 'حفظ إعدادات الموقع الجغرافي'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: WHATSAPP & N8N AUTOMATION (إشعارات واتساب و n8n) */}
        {activeTab === 'WHATSAPP' && (
          <div className="space-y-6">
            {/* Top Overview Banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 md:p-8 border border-emerald-800/40 shadow-xl space-y-3 font-sans">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      أتمتة إشعارات واتساب عبر n8n Webhook
                    </h2>
                    <p className="text-slate-300 text-xs font-semibold">
                      إرسال ملخصات الدوام اليومية للمدير وتنبيه الموظفين عند التأخر أو نسيان تسجيل الانصراف
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                    whatsappEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${whatsappEnabled ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
                    {whatsappEnabled ? 'الإشعارات مفعلة' : 'الإشعارات متوقفة'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notification & Status Alert */}
            {whatsappActionMsg && (
              <div className={`p-4 rounded-2xl text-xs font-black text-center flex items-center justify-center gap-2 border ${
                whatsappActionMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {whatsappActionMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                {whatsappActionMsg.text}
              </div>
            )}

            {/* Quick Actions Grid (إجراءات سريعة فورية) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Action 1: Send Daily Digest */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Send className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">إرسال ملخص دوام اليوم</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    إرسال تقرير فوري لواتساب المدير يضم قائمة الحاضرين وساعات عملهم وشفتاتهم المفتوحة.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={whatsappActionLoading}
                  onClick={() => handleTriggerWhatsAppAction('DAILY_DIGEST')}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {whatsappActionLoading ? 'جاري الإرسال...' : 'إرسال الملخص لواتساب الآن'}
                </button>
              </div>

              {/* Action 2: Check & Remind Open Shifts */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">تنبيه الشفتات المفتوحة</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    فحص الموظفين الذين مضى على حضورهم أكثر من 4 ساعات دون تسجيل انصراف وتنبيههم فوراً.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={whatsappActionLoading}
                  onClick={() => handleTriggerWhatsAppAction('REMIND_OPEN_SHIFTS')}
                  className="w-full h-11 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  {whatsappActionLoading ? 'جاري الفحص...' : 'فحص وتنبيه الموظفين'}
                </button>
              </div>

              {/* Action 3: Test Webhook */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">اختبار اتصال n8n</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    إرسال رسالة اختبار (Ping) للتأكد من وصول البيانات بنجاح إلى سيناريو n8n.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={whatsappActionLoading}
                  onClick={() => handleTriggerWhatsAppAction('TEST')}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {whatsappActionLoading ? 'جاري الفحص...' : 'إرسال اختبار الاتصال'}
                </button>
              </div>
            </div>

            {/* Monthly Payroll Reports WhatsApp Dispatch Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-700/30 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center font-black shrink-0 shadow-inner">
                    <FileText className="w-6 h-6 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      إرسال كشوفات الرواتب وساعات الدوام الشهرية على واتساب
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-extrabold border border-emerald-400/30">مؤتمت</span>
                    </h3>
                    <p className="text-xs text-indigo-200 mt-1 font-semibold">
                      إرسال تقرير تفصيلي لساعات الدوام الفعلي وأيام الحضور وصافي الراتب المستحق بـ (د.ل) لكل موظف مباشرة على رقمه في نهاية كل شهر
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-indigo-200 font-bold mb-1.5">
                    اختر الشهر المستحق
                  </label>
                  <input
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="w-full h-11 bg-slate-800/90 border border-indigo-600/40 rounded-xl px-3.5 text-white font-mono font-bold focus:outline-none focus:border-indigo-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-indigo-200 font-bold mb-1.5">
                    تحديد الموظفين المستلمين
                  </label>
                  <select
                    value={payrollEmpId}
                    onChange={(e) => setPayrollEmpId(e.target.value)}
                    className="w-full h-11 bg-slate-800/90 border border-indigo-600/40 rounded-xl px-3.5 text-white font-bold focus:outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    <option value="ALL">🌟 جميع الموظفين (إرسال جماعي لكافة الكادر)</option>
                    {users.filter(u => u.role !== 'ADMIN').map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.name} ({u.employeeCode}) {u.phone ? `• ${u.phone}` : '⚠️(بدون هاتف)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={whatsappActionLoading}
                    onClick={handleSendMonthlyPayroll}
                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {whatsappActionLoading ? 'جاري الإرسال...' : 'إرسال كشوفات الرواتب الآن 🚀'}
                  </button>
                </div>
              </div>
            </div>

            {/* Webhook & Manager Phone Settings Form */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-600" />
                  بيانات الربط والاتصال مع n8n
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  حدد عنوان الـ Webhook ورقم واتساب المدير المسؤول عن استلام التقارير اليومية
                </p>
              </div>

              <form onSubmit={handleSaveWhatsAppSettings} className="space-y-5 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-emerald-600" />
                    رابط n8n Webhook URL *
                  </label>
                  <input
                    type="url"
                    required
                    dir="ltr"
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    placeholder="https://n8n.ordermt.ly/webhook/attendance-alert"
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 text-left"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">الرابط المستلم لأحداث الحضور والانصراف والتقارير اليومية في سير عمل n8n</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-blue-600" />
                      رقم واتساب المدير المستلم للتقارير (مع الرمز الدولي)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="+218910000000"
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 text-left"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">مثال: +218912345678</p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      حالة التفعيل التلقائي
                    </label>
                    <label className="h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappEnabled}
                        onChange={(e) => setWhatsappEnabled(e.target.checked)}
                        className="w-5 h-5 text-emerald-600 rounded-md cursor-pointer accent-emerald-600"
                      />
                      <span className="font-extrabold text-slate-800 text-xs">
                        تفعيل إرسال إشعارات وتنبيهات واتساب التلقائية
                      </span>
                    </label>
                  </div>
                </div>

                {/* WhatsApp Shortage Group Configuration */}
                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>تخصيص مجموعة الواتساب المعتمدة للنواقص (حظر المجموعات الأخرى)</span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 font-normal mt-0.5">
                      حدد رابط دعوة المجموعة أو معرف الـ JID واسم المجموعة حتى لا يتم جلب نواقص أو صور من أي مجموعات واتساب أخرى.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-emerald-900 font-bold mb-1">
                        🔗 رابط دعوة مجموعة الواتساب أو معرف الـ JID:
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={whatsappGroupLink}
                        onChange={(e) => setWhatsappGroupLink(e.target.value)}
                        placeholder="https://chat.whatsapp.com/XXXXX أو 120363044711297774@g.us"
                        className="w-full h-11 bg-white border border-emerald-200 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-emerald-900 font-bold mb-1">
                        🏷️ اسم المجموعة المعتمدة:
                      </label>
                      <input
                        type="text"
                        value={whatsappGroupName}
                        onChange={(e) => setWhatsappGroupName(e.target.value)}
                        placeholder="مثال: صيدلية بيتك"
                        className="w-full h-11 bg-white border border-emerald-200 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={whatsappActionLoading}
                    className="w-full sm:w-auto px-8 h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {whatsappActionLoading ? 'جاري الحفظ...' : 'حفظ إعدادات واتساب و n8n'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: RATE RULES & CUSTOM SURCHARGES */}
        {activeTab === 'RATE_RULES' && (
          <RateRulesManagement departments={departments} users={users} />
        )}

        {/* TAB 7: TASKS & PROJECTS ATTENDANCE SYSTEM */}
        {activeTab === 'PROJECTS' && (
          <TaskManagement />
        )}
      </main>
      </div>

      {/* Add Employee Modal with Equal Height Inputs h-11 */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                إدخال وإضافة موظف جديد
              </h3>
              <button onClick={() => setIsAddUserOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  1. اسم الموظف *
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="مثال: علي الطرابلسي"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Multi-Job Roles Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-bold flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    الوظائف والمهام الخاصة (يمكنك تحديد أكثر من وظيفة):
                  </label>
                  {empJobRoleIds.length > 0 && (
                    <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      محدد: {empJobRoleIds.length} وظيفة (+{empMonthlySalary} د.ل)
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 max-h-44 overflow-y-auto space-y-1.5">
                  {allAvailableJobRoles.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-2">لا توجد وظائف خاصة مضافة بعد. يمكنك إضافتها من شاشة الأقسام.</p>
                  ) : (
                    allAvailableJobRoles.map((r) => {
                      const isChecked = empJobRoleIds.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          onClick={() => toggleJobRoleSelection(r.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isChecked
                              ? 'bg-blue-50/90 border-blue-300 shadow-2xs text-blue-950 font-bold'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                            />
                            <div>
                              <div className="text-xs font-black">{r.title}</div>
                              <div className="text-[10px] text-slate-500 font-medium">القسم: {r.departmentName}</div>
                            </div>
                          </div>
                          <div className="text-left font-mono text-[11px] flex items-center gap-1">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              +{r.monthlySalary} د.ل
                            </span>
                            {r.hasCommission && (
                              <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 font-sans font-bold">
                                عمولة {r.commissionRate}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-blue-600" />
                    2. رقم الموظف (ID) *
                  </label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    placeholder="104"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    3. الرقم السري (PIN) *
                  </label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empPin}
                    onChange={(e) => setEmpPin(e.target.value)}
                    placeholder="1234"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    أجر الساعة المباشر (د.ل/س) *
                  </label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empRate}
                    onChange={(e) => setEmpRate(e.target.value)}
                    placeholder="50"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                {empJobRoleId && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    راتب الوظيفة الخاص (د.ل)
                  </label>
                  <input
                    type="text"
                    lang="en-US"
                    dir="ltr"
                    value={empMonthlySalary}
                    onChange={(e) => setEmpMonthlySalary(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  رقم هاتف الواتساب (لإرسال تنبيهات الوصول وكشوفات الرواتب)
                </label>
                <input
                  type="tel"
                  lang="en-US"
                  dir="ltr"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="مثال: 0912345678 أو +218912345678"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-left focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">تصل للموظف عليه رسائل التذكير عند وصوله للصيدلية وتقارير الرواتب الشهرية</p>
              </div>

              {/* Total Monthly Salary Calculation Live Preview */}
              {Number(empTargetHours) > 0 && (
                <div className="p-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl border border-blue-800 space-y-1 font-sans">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">إجمالي المرتب الشهري التقديري:</span>
                    <span className="text-emerald-400 font-mono font-black text-sm">
                      {(((Number(empTargetHours) || 0) * (Number(empRate) || 0)) + (Number(empMonthlySalary) || 0)).toFixed(2)} د.ل
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ({Number(empTargetHours)}س × {Number(empRate) || 0} د.ل) + (راتب الوظيفة {Number(empMonthlySalary) || 0} د.ل)
                  </p>
                </div>
              )}

              {userMsg && <p className="text-rose-600 font-bold text-center">{userMsg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs flex items-center justify-center"
                >
                  {loading ? 'جاري الإضافة...' : 'إضافة الموظف الآن'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="w-full h-11 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs flex items-center justify-center"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal with Equal Height Inputs h-11 */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                تعديل بيانات الموظف ({editingUser.name})
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEmployee} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">1. اسم الموظف *</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Multi-Job Roles Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-bold flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    الوظائف والمهام الخاصة المسندة للموظف:
                  </label>
                  {empJobRoleIds.length > 0 && (
                    <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      محدد: {empJobRoleIds.length} وظيفة (+{empMonthlySalary} د.ل)
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 max-h-44 overflow-y-auto space-y-1.5">
                  {allAvailableJobRoles.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-2">لا توجد وظائف خاصة مضافة بعد. يمكنك إضافتها من شاشة الأقسام.</p>
                  ) : (
                    allAvailableJobRoles.map((r) => {
                      const isChecked = empJobRoleIds.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          onClick={() => toggleJobRoleSelection(r.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isChecked
                              ? 'bg-blue-50/90 border-blue-300 shadow-2xs text-blue-950 font-bold'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                            />
                            <div>
                              <div className="text-xs font-black">{r.title}</div>
                              <div className="text-[10px] text-slate-500 font-medium">القسم: {r.departmentName}</div>
                            </div>
                          </div>
                          <div className="text-left font-mono text-[11px] flex items-center gap-1">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              +{r.monthlySalary} د.ل
                            </span>
                            {r.hasCommission && (
                              <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 font-sans font-bold">
                                عمولة {r.commissionRate}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">2. رقم الموظف (ID) *</label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">3. الرقم السري (PIN) *</label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empPin}
                    onChange={(e) => setEmpPin(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">أجر الساعة المباشر (د.ل/س)</label>
                  <input
                    type="text"
                    required
                    lang="en-US"
                    dir="ltr"
                    value={empRate}
                    onChange={(e) => setEmpRate(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                {empJobRoleId && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">راتب الوظيفة الخاص (د.ل)</label>
                  <input
                    type="text"
                    lang="en-US"
                    dir="ltr"
                    value={empMonthlySalary}
                    onChange={(e) => setEmpMonthlySalary(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  رقم هاتف الواتساب (لإرسال تنبيهات الوصول وكشوفات الرواتب)
                </label>
                <input
                  type="tel"
                  lang="en-US"
                  dir="ltr"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="مثال: 0912345678 أو +218912345678"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-left focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">تصل للموظف عليه رسائل التذكير عند وصوله للصيدلية وتقارير الرواتب الشهرية</p>
              </div>

              {userMsg && <p className="text-rose-600 font-bold text-center">{userMsg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs flex items-center justify-center"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ البيانات الجديدة'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-full h-11 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs flex items-center justify-center"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Time Editing Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                تعديل وقت حضور وانصراف الموظف
              </h3>
              <button onClick={() => setEditingRecord(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-semibold">
              <div>الموظف: <span className="font-bold text-slate-900">{editingRecord.userName}</span></div>
              <div>التاريخ: <span className="font-bold font-mono">{editingRecord.date}</span></div>
            </div>

            <form onSubmit={handleSaveTimeEdit} className="space-y-4 text-xs font-bold">
              {/* Check-in Date & Time */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-extrabold">تاريخ ووقت الحضور المعدل</label>
                <input
                  type="date"
                  lang="en-US"
                  dir="ltr"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                />
                <div className="grid grid-cols-3 gap-2 font-sans">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الساعة</label>
                    <select value={editInHour} onChange={(e) => setEditInHour(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-mono font-black text-sm">
                      {hours12List.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الدقيقة</label>
                    <select value={editInMinute} onChange={(e) => setEditInMinute(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-mono font-black text-sm">
                      {minutesList.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الفترة</label>
                    <select value={editInPeriod} onChange={(e) => setEditInPeriod(e.target.value as 'AM' | 'PM')} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-black text-sm">
                      <option value="AM">صباحاً (AM)</option>
                      <option value="PM">مساءً (PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Check-out Date & Time */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-extrabold">تاريخ ووقت الانصراف المعدل</label>
                <input
                  type="date"
                  lang="en-US"
                  dir="ltr"
                  value={editCheckOutDate}
                  onChange={(e) => setEditCheckOutDate(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                />
                <div className="grid grid-cols-3 gap-2 font-sans">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الساعة</label>
                    <select value={editOutHour} onChange={(e) => setEditOutHour(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-mono font-black text-sm">
                      {hours12List.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الدقيقة</label>
                    <select value={editOutMinute} onChange={(e) => setEditOutMinute(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-mono font-black text-sm">
                      {minutesList.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 text-center">الفترة</label>
                    <select value={editOutPeriod} onChange={(e) => setEditOutPeriod(e.target.value as 'AM' | 'PM')} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center font-black text-sm">
                      <option value="AM">صباحاً (AM)</option>
                      <option value="PM">مساءً (PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shift Amount (Sales / Purchases) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-extrabold">قيمة مبيعات أو مشتريات الوردية (د.ل)</label>
                  {Boolean((editingRecord as any).commissionRate) && (
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-lg font-mono">
                      نسبة العمولة: {(editingRecord as any).commissionRate}%
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  lang="en-US"
                  dir="ltr"
                  value={editShiftAmount}
                  onChange={(e) => setEditShiftAmount(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-900 font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                />
              </div>

              {msg && <p className="text-rose-600 font-bold text-center">{msg}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all text-xs flex items-center justify-center"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ الوقت الجديد'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="w-full h-11 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs flex items-center justify-center"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Broadcast Center Modal */}
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        employees={users}
        departments={departments}
      />

      {/* Clinical Drug Capsule & Staff Training Modal */}
      <ClinicalCapsuleModal
        isOpen={isClinicalModalOpen}
        onClose={() => setIsClinicalModalOpen(false)}
        employees={users}
        departments={departments}
      />
    </div>
  );
}
