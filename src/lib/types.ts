export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface User {
  id: string;
  employeeCode: string; // رقم الموظف (مثل 101, 102, 100)
  pinCode: string;      // الرقم السري (مثل 1234)
  name: string;
  role: UserRole;
  hourlyRate: number;   // قيمة أجر الساعة بالدينار الليبي (د.ل)
  jobTitle?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeCode: string;
  date: string;          // YYYY-MM-DD
  checkInTime: string;   // HH:mm:ss (وقت الحضور)
  checkOutTime: string | null; // HH:mm:ss (وقت الانصراف)
  workHours: number;     // إجمالي ساعات اليوم
  earnedCost: number;    // قيمة الساعات لليوم بالدينار الليبي
  isVerified: boolean;   // توثيق الاعتماد من المدير (true / false)
  verifiedAt?: string;   // تاريخ ووقت التوثيق
  createdAt: string;
}
