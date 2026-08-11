export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface Department {
  id: string;
  name: string;
  code?: string;
  jobRoles?: JobRole[];
  userCount?: number;
}

export interface JobRole {
  id: string;
  title: string;
  monthlySalary: number;      // الراتب الشهري المحدد للوظيفة (مثال: 500 د.ل)
  targetMonthlyHours: number; // ساعات الوظيفة المطلوبة في الشهر (مثال: 160 ساعة)
  departmentId: string;
  departmentName?: string;
}

export interface User {
  id: string;
  employeeCode: string;       // رقم الموظف (مثل 101, 102, 100)
  pinCode: string;            // الرقم السري (مثل 1234)
  name: string;
  role: UserRole;
  hourlyRate: number;         // قيمة أجر الساعة الاستدلالي بالدينار الليبي
  jobTitle?: string;
  departmentId?: string;
  departmentName?: string;
  jobRoleId?: string;
  jobRoleTitle?: string;
  monthlySalary?: number;     // قيمة الوظيفة الشهرية (مثال: 500 د.ل)
  targetMonthlyHours?: number;// ساعات الوظيفة بالشهر (مثال: 160 ساعة)
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeCode: string;
  date: string;                // YYYY-MM-DD
  checkInTime: string;         // HH:mm:ss (وقت الحضور)
  checkOutTime: string | null; // HH:mm:ss (وقت الانصراف)
  workHours: number;           // إجمالي ساعات اليوم
  earnedCost: number;          // قيمة الساعات لليوم بالدينار الليبي ((ساعات الدوام * الراتب الشهري) / 160)
  isVerified: boolean;         // توثيق الاعتماد من المدير (true / false)
  verifiedAt?: string;         // تاريخ ووقت التوثيق
  createdAt: string;
}
