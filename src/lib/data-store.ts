import { User, Project, AttendanceRecord, LeaveRequest, CompanySettings, CustomLabels } from './types';

export const defaultCustomLabels: CustomLabels = {
  appName: 'صيدليات بيتك HodoorK',
  companyName: 'مجموعة صيدليات بيتك الطبية',
  dashboardTitle: 'لوحة إدارة وتتبع دوام ومناوبات صيدليات بيتك',
  timerTitle: 'ساعة المناوبة الحية للصيدلية',
  projectsTitle: 'فروع الصيدليات وشفتات الدوام',
  employeesTitle: 'الكادر الصيدلاني والأطقم الطبية',
  currencySymbol: 'د.ل',
  monthlyTargetTitle: 'هدف مناوبات الشهر',
  checkInBtnText: 'استلام المناوبة / بدء الشفت',
  checkOutBtnText: 'تسليم المناوبة / إنهاء الشفت'
};

export const initialProjects: Project[] = [
  { id: 'proj-1', name: 'صيدلية بيتك المركزية - الشفت الصباحي', clientName: 'فرع المركز الرئيسي', hourlyRate: 45.0, budgetHours: 160, color: '#0284c7' },
  { id: 'proj-2', name: 'صيدلية بيتك - مناوبة العصر والمساء', clientName: 'فرع العيادات والمبيعات', hourlyRate: 50.0, budgetHours: 140, color: '#10b981' },
  { id: 'proj-3', name: 'قسم المستودع والمستحضرات الدوائية', clientName: 'إدارة الإمداد الدوائي', hourlyRate: 40.0, budgetHours: 120, color: '#8b5cf6' },
  { id: 'proj-4', name: 'شفت الطوارئ والمناوبة الليلية (24/7)', clientName: 'شفت الطوارئ والمبيت', hourlyRate: 65.0, budgetHours: 100, color: '#f59e0b' },
];

export const initialUsers: User[] = [
  {
    id: 'usr-admin',
    employeeCode: 'PH-ADM-01',
    name: 'د. خالد العتيبي',
    email: 'admin@baitak.mtapp.ly',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=250',
    phone: '+218912345678',
    jobTitle: 'مدير الصيدليات والإمداد الدوائي',
    targetMonthlyHours: 160,
    hourlyRate: 75.0
  },
  {
    id: 'usr-101',
    employeeCode: 'PHARM-101',
    name: 'د. أحمد علي',
    email: 'ahmed@baitak.mtapp.ly',
    role: 'EMPLOYEE',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250',
    phone: '+218929876543',
    jobTitle: 'صيدلي أول مسؤول الشفت',
    targetMonthlyHours: 160,
    hourlyRate: 55.0
  },
  {
    id: 'usr-102',
    employeeCode: 'PHARM-102',
    name: 'د. سارة الشمري',
    email: 'sara@baitak.mtapp.ly',
    role: 'EMPLOYEE',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250',
    phone: '+218912223344',
    jobTitle: 'صيدلانية مناوبة ومستحضرات',
    targetMonthlyHours: 140,
    hourlyRate: 48.0
  },
  {
    id: 'usr-103',
    employeeCode: 'PHARM-103',
    name: 'أ. محمد القحطاني',
    email: 'mohamed@baitak.mtapp.ly',
    role: 'EMPLOYEE',
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=250',
    phone: '+218944445566',
    jobTitle: 'فني مستودع وأمصلة دوائية',
    targetMonthlyHours: 160,
    hourlyRate: 42.0
  }
];

export const initialCompanySettings: CompanySettings = {
  companyName: 'مجموعة صيدليات بيتك الطبية',
  logoUrl: '',
  n8nWebhookUrl: 'https://n8n.ordermt.ly/webhook/attendance-alert',
  defaultTargetMonthlyHours: 160,
  autoCloseHours: 12.0,
  customLabels: { ...defaultCustomLabels }
};

const todayStr = new Date().toISOString().split('T')[0];

export const initialAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'att-101',
    userId: 'usr-101',
    userName: 'د. أحمد علي',
    employeeCode: 'PHARM-101',
    date: todayStr,
    checkInTime: '08:00:00',
    checkOutTime: null,
    workHours: 4.5,
    earnedCost: 247.5,
    projectId: 'proj-1',
    projectName: 'صيدلية بيتك المركزية - الشفت الصباحي',
    taskNotes: 'استلام دوام الشفت الصباحي وجرد الوصفات الطبية',
    attachments: [
      { id: 'attch-1', attendanceId: 'att-101', fileName: 'محضر_استلام_الوصفات.pdf', filePath: '/uploads/demo.pdf', fileType: 'pdf' }
    ],
    method: 'PROJECT',
    createdAt: `${todayStr} 08:00:00`
  },
  {
    id: 'att-102',
    userId: 'usr-102',
    userName: 'د. سارة الشمري',
    employeeCode: 'PHARM-102',
    date: todayStr,
    checkInTime: '09:00:00',
    checkOutTime: '14:00:00',
    workHours: 5.0,
    earnedCost: 240.0,
    projectId: 'proj-2',
    projectName: 'صيدلية بيتك - مناوبة العصر والمساء',
    taskNotes: 'صرف الأدوية المزمنة ومراجعة صلاحية الأدوية',
    attachments: [],
    method: 'PROJECT',
    createdAt: `${todayStr} 09:00:00`
  },
  {
    id: 'att-103',
    userId: 'usr-103',
    userName: 'أ. محمد القحطاني',
    employeeCode: 'PHARM-103',
    date: todayStr,
    checkInTime: '08:30:00',
    checkOutTime: null,
    workHours: 4.0,
    earnedCost: 168.0,
    projectId: 'proj-3',
    projectName: 'قسم المستودع والمستحضرات الدوائية',
    taskNotes: 'استلام شحنة المحاليل والفيتامينات وتخزينها',
    attachments: [],
    method: 'QUICK',
    createdAt: `${todayStr} 08:30:00`
  }
];

export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave-101',
    userId: 'usr-102',
    userName: 'د. سارة الشمري',
    type: 'EXCUSE',
    startDate: '2026-08-15',
    endDate: '2026-08-15',
    reason: 'تبديل مناوبة مع د. أحمد لميعاد دورة دوائية',
    status: 'APPROVED',
    createdAt: '2026-08-10 10:00'
  }
];
