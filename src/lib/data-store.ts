import { User, Project, AttendanceRecord, LeaveRequest, CompanySettings } from './types';

export const initialProjects: Project[] = [
  { id: 'proj-1', name: 'تطوير منصة الويب المخصصة', clientName: 'شركة الأفق الرقمي', hourlyRate: 45.0, budgetHours: 120, color: '#0284c7' },
  { id: 'proj-2', name: 'صيانة وتأمين السيرفرات', clientName: 'مظلة بيتك at.baitak.mtapp.ly', hourlyRate: 60.0, budgetHours: 80, color: '#10b981' },
  { id: 'proj-3', name: 'تطبيق الهاتف الذكي iOS/Android', clientName: 'مؤسسة الابتكار', hourlyRate: 50.0, budgetHours: 150, color: '#8b5cf6' },
  { id: 'proj-4', name: 'إدارة قواعد البيانات PostgreSQL', clientName: 'مشروع داخلي', hourlyRate: 40.0, budgetHours: 100, color: '#f59e0b' },
];

export const initialUsers: User[] = [
  {
    id: 'usr-admin',
    employeeCode: 'ADM-001',
    name: 'م. خالد العتيبي',
    email: 'admin@baitak.mtapp.ly',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    phone: '+218912345678',
    jobTitle: 'مدير المشاريع والنظام',
    targetMonthlyHours: 160,
    hourlyRate: 75.0
  },
  {
    id: 'usr-101',
    employeeCode: 'EMP-101',
    name: 'أحمد علي',
    email: 'ahmed@baitak.mtapp.ly',
    role: 'EMPLOYEE',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    phone: '+218929876543',
    jobTitle: 'مطور برمجيات خبير',
    targetMonthlyHours: 160,
    hourlyRate: 50.0
  },
  {
    id: 'usr-102',
    employeeCode: 'EMP-102',
    name: 'سارة الشمري',
    email: 'sara@baitak.mtapp.ly',
    role: 'EMPLOYEE',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
    phone: '+218912223344',
    jobTitle: 'مهندسة واجهات وتجربة المستخدم',
    targetMonthlyHours: 140,
    hourlyRate: 45.0
  },
  {
    id: 'usr-103',
    employeeCode: 'EMP-103',
    name: 'محمد القحطاني',
    email: 'mohamed@baitak.mtapp.ly',
    role: 'EMPLOYEE',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    phone: '+218944445566',
    jobTitle: 'أخصائي قواعد بيانات وDevOps',
    targetMonthlyHours: 160,
    hourlyRate: 55.0
  }
];

export const initialCompanySettings: CompanySettings = {
  companyName: 'نظام إدارة ساعات العمل والمشاريع (Smart Hours Tracker)',
  logoUrl: '',
  n8nWebhookUrl: 'https://n8n.ordermt.ly/webhook/attendance-alert',
  defaultTargetMonthlyHours: 160,
  autoCloseHours: 12.0
};

const todayStr = new Date().toISOString().split('T')[0];

export const initialAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'att-101',
    userId: 'usr-101',
    userName: 'أحمد علي',
    employeeCode: 'EMP-101',
    date: todayStr,
    checkInTime: '08:30:00',
    checkOutTime: null,
    workHours: 4.2,
    earnedCost: 210.0,
    projectId: 'proj-1',
    projectName: 'تطوير منصة الويب المخصصة',
    taskNotes: 'العمل على تصميم الواجهة وتدشين API الحضور',
    attachments: [
      { id: 'attch-1', attendanceId: 'att-101', fileName: 'تقرير_الواجهات.pdf', filePath: '/uploads/demo.pdf', fileType: 'pdf' }
    ],
    method: 'PROJECT',
    createdAt: `${todayStr} 08:30:00`
  },
  {
    id: 'att-102',
    userId: 'usr-102',
    userName: 'سارة الشمري',
    employeeCode: 'EMP-102',
    date: todayStr,
    checkInTime: '09:00:00',
    checkOutTime: '13:30:00',
    workHours: 4.5,
    earnedCost: 202.5,
    projectId: 'proj-3',
    projectName: 'تطبيق الهاتف الذكي iOS/Android',
    taskNotes: 'إنجاز شاشات تسجيل الدخول والصفحة الرئيسية',
    attachments: [],
    method: 'PROJECT',
    createdAt: `${todayStr} 09:00:00`
  },
  {
    id: 'att-103',
    userId: 'usr-103',
    userName: 'محمد القحطاني',
    employeeCode: 'EMP-103',
    date: todayStr,
    checkInTime: '08:00:00',
    checkOutTime: null,
    workHours: 4.7,
    earnedCost: 258.5,
    projectId: 'proj-4',
    projectName: 'إدارة قواعد البيانات PostgreSQL',
    taskNotes: 'تهيئة Docker وسيرفر PostgreSQL والجداول',
    attachments: [],
    method: 'QUICK',
    createdAt: `${todayStr} 08:00:00`
  }
];

export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave-101',
    userId: 'usr-102',
    userName: 'سارة الشمري',
    type: 'ANNUAL',
    startDate: '2026-08-20',
    endDate: '2026-08-25',
    reason: 'إجازة اعتيادية عائلية',
    status: 'PENDING',
    createdAt: '2026-08-10 11:00'
  }
];
