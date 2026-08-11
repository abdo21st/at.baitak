export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface CustomLabels {
  appName: string;
  companyName: string;
  dashboardTitle: string;
  timerTitle: string;
  projectsTitle: string;
  employeesTitle: string;
  currencySymbol: string;
  monthlyTargetTitle: string;
  checkInBtnText: string;
  checkOutBtnText: string;
}

export interface PharmacyBranch {
  id: string;
  name: string;
  clientName?: string;
  hourlyRate: number;
  budgetHours: number;
  color: string;
}

export type Project = PharmacyBranch;

export interface User {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone: string;
  jobTitle: string;
  targetMonthlyHours: number;
  hourlyRate: number;
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
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  workHours: number;
  earnedCost: number;
  projectId?: string;
  projectName?: string;
  taskNotes?: string;
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
  customLabels: CustomLabels;
}
