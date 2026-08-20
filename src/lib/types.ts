export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface Department {
  id: string;
  name: string;
  code?: string | null;
  jobRoles?: JobRole[];
  userCount?: number;
}

export interface JobRole {
  id: string;
  title: string;
  monthlySalary: number;      // الراتب الشهري المحدد للوظيفة (مثال: 500 د.ل)
  targetMonthlyHours: number; // ساعات الوظيفة المطلوبة في الشهر (مثال: 160 ساعة)
  isHourly: boolean;          // true: مرتبطة بساعات | false: راتب شهري ثابت
  hasCommission?: boolean;    // تفعيل عمولة المبيعات / المشتريات
  commissionType?: string;    // 'SALES' | 'PURCHASES'
  commissionRate?: number;    // نسبة العمولة %
  departmentId: string;
  departmentName?: string;
}

export interface User {
  id: string;
  employeeCode: string;       // رقم الموظف (مثل 101, 102, 100)
  pinCode: string;            // الرقم السري (مثل 1234)
  name: string;
  role: UserRole;
  phone?: string | null;
  hourlyRate: number;         // قيمة أجر الساعة الاستدلالي بالدينار الليبي
  jobTitle?: string;
  departmentId?: string;
  departmentName?: string;
  departments?: Department[];
  departmentNames?: string[];
  jobRoleId?: string;
  jobRoleTitle?: string;
  jobRoles?: JobRole[];
  jobRoleIds?: string[];
  jobRoleTitles?: string[];
  monthlySalary?: number;     // قيمة الوظيفة الشهرية (مثال: 500 د.ل)
  targetMonthlyHours?: number;// ساعات الوظيفة بالشهر (مثال: 160 ساعة)
  isHourly?: boolean;         // نوع حساب أجر الوظيفة
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeCode: string;
  jobRoleId?: string;
  jobRoleTitle?: string;
  date: string;                // YYYY-MM-DD
  checkInTime: string;         // HH:mm:ss (وقت الحضور)
  checkOutTime: string | null; // HH:mm:ss (وقت الانصراف)
  workHours: number;           // إجمالي ساعات اليوم
  earnedCost: number;          // قيمة الساعات لليوم بالدينار الليبي
  shiftAmount?: number;        // قيمة مبيعات أو مشتريات الوردية (د.ل)
  shiftAmountType?: string | null; // 'SALES' | 'PURCHASES'
  commissionRate?: number;     // نسبة العمولة %
  commissionAmount?: number;   // قيمة العمولة المحتسبة للوردية (د.ل)
  isVerified: boolean;         // توثيق الاعتماد من المدير (true / false)
  verifiedAt?: string;         // تاريخ ووقت التوثيق
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  isOutsideGps?: boolean;      // هل تم التسجيل خارج نطاق GPS
  projectId?: string | null;   // معرف المهمة أو المشروع
  projectName?: string | null; // اسم المهمة
  projectColor?: string | null;// لون المهمة
  taskNotes?: string | null;   // ملاحظات وإنجاز المهمة
  createdAt: string;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  logoUrl?: string | null;
  managerPhone?: string | null;
  n8nWebhookUrl: string;
  whatsappNotificationsEnabled?: boolean;
  whatsappGroupLink?: string | null;
  whatsappGroupJid?: string | null;
  whatsappGroupName?: string | null;
  defaultTargetMonthlyHours: number;
  autoCloseHours: number;
  gpsEnabled: boolean;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  gpsRadiusMeters: number;
}

export type RuleType = 'RECURRING' | 'ONE_TIME';
export type RateIncreaseType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface RateRule {
  id: string;
  name: string;
  ruleType: RuleType;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  specificDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  increaseType: RateIncreaseType;
  value: number; // e.g. 50 (%) or 3.5 (LYD)
  appliesTo: 'ALL' | 'DEPARTMENT' | 'EMPLOYEE';
  targetId?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  tenantId?: string;
  name: string;
  description?: string | null;
  clientName?: string | null;
  hourlyRate: number;
  budgetHours: number;
  color: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string | null;
  totalHours?: number;
  totalCost?: number;
  attendanceCount?: number;
  activeEmployeesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type FieldVisitType = 'MAINTENANCE' | 'INSTALLATION' | 'INSPECTION' | 'EMERGENCY';
export type FieldVisitStatus = 'IN_PROGRESS' | 'COMPLETED_OTP' | 'COMPLETED_DISPUTED' | 'INSPECTION_ONLY' | 'CANCELLED';

export interface FieldVisit {
  id: string;
  tenantId?: string;
  technicianId: string;
  technicianName?: string;
  technicianCode?: string;
  projectId?: string | null;
  projectName?: string | null;
  clientName: string;
  clientPhone: string;
  clientAddress?: string | null;
  visitType: FieldVisitType;
  diagnosisNotes?: string | null;
  solutionNotes?: string | null;
  partsUsed?: string | null;
  serviceFee: number;
  partsFee: number;
  totalAmount: number;
  status: FieldVisitStatus;
  otpCode?: string | null;
  otpVerifiedAt?: string | null;
  customerSignature?: string | null;
  customerRefusalReason?: string | null;
  photoBefore?: string | null;
  photoAfter?: string | null;
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  startedAt: string;
  completedAt?: string | null;
  workMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}



