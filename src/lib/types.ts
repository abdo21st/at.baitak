export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface PharmacyBranch {
  id: string;
  name: string; // e.g. "صيدلية البيت - الفرع الرئيسي"
  branchCode?: string; // e.g. "PH-01"
  hourlyRate: number; // e.g. 50.0 LYD/hr
  budgetHours: number; // e.g. 160 hrs target
  color: string;
}

export interface User {
  id: string;
  employeeCode: string; // e.g. "PHARM-101"
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone: string;
  jobTitle: string; // e.g. "صيدلي أول", "فني مبيعات دوائية", "صيدلي مناوب"
  targetMonthlyHours: number;
  hourlyRate: number; // base hourly rate for duty
}

export interface Attachment {
  id: string;
  attendanceId: string;
  fileName: string;
  filePath: string;
  fileType: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeCode: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm:ss
  checkOutTime: string | null; // HH:mm:ss
  workHours: number;
  earnedCost: number; // workHours * hourlyRate
  projectId?: string;
  projectName?: string; // e.g. "مناوبة صيدلية الشفاء"
  taskNotes?: string; // e.g. "استلام شفت المناوبة وتدقيق الأدوية والوصفات"
  attachments?: Attachment[];
  method: 'QUICK' | 'PROJECT' | 'GPS';
  createdAt: string;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type LeaveType = 'ANNUAL' | 'SICK' | 'EMERGENCY' | 'EXCUSE';

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  logoUrl?: string;
  n8nWebhookUrl: string;
  defaultTargetMonthlyHours: number;
  autoCloseHours: number;
}
