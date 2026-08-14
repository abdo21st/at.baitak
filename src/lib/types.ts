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
  earnedCost: number;          // قيمة الساعات لليوم بالدينار الليبي ((ساعات الدوام * الراتب الشهري) / 160)
  isVerified: boolean;         // توثيق الاعتماد من المدير (true / false)
  verifiedAt?: string;         // تاريخ ووقت التوثيق
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  isOutsideGps?: boolean;      // هل تم التسجيل خارج نطاق GPS
  createdAt: string;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  logoUrl?: string | null;
  managerPhone?: string | null;
  n8nWebhookUrl: string;
  whatsappNotificationsEnabled?: boolean;
  defaultTargetMonthlyHours: number;
  autoCloseHours: number;
  gpsEnabled: boolean;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  gpsRadiusMeters: number;
}

