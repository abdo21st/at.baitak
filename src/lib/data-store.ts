import { User, AttendanceRecord } from './types';

export const initialUsers: User[] = [
  {
    id: 'usr-admin',
    employeeCode: '100',
    pinCode: '1234',
    name: 'م. خالد العتيبي (المدير)',
    role: 'ADMIN',
    hourlyRate: 75.0,
    jobTitle: 'مدير النظام'
  },
  {
    id: 'usr-101',
    employeeCode: '101',
    pinCode: '1234',
    name: 'أحمد علي',
    role: 'EMPLOYEE',
    hourlyRate: 50.0,
    jobTitle: 'صيدلي / موظف'
  },
  {
    id: 'usr-102',
    employeeCode: '102',
    pinCode: '1234',
    name: 'سارة الشمري',
    role: 'EMPLOYEE',
    hourlyRate: 45.0,
    jobTitle: 'صيدلانية / موظفة'
  },
  {
    id: 'usr-103',
    employeeCode: '103',
    pinCode: '1234',
    name: 'محمد القحطاني',
    role: 'EMPLOYEE',
    hourlyRate: 40.0,
    jobTitle: 'فني / موظف'
  }
];

const todayStr = new Date().toISOString().split('T')[0];

export const initialAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'att-101',
    userId: 'usr-101',
    userName: 'أحمد علي',
    employeeCode: '101',
    date: todayStr,
    checkInTime: '08:00:00',
    checkOutTime: '16:00:00',
    workHours: 8.0,
    earnedCost: 400.0,
    isVerified: true,
    verifiedAt: `${todayStr} 16:05:00`,
    createdAt: `${todayStr} 08:00:00`
  },
  {
    id: 'att-102',
    userId: 'usr-102',
    userName: 'سارة الشمري',
    employeeCode: '102',
    date: todayStr,
    checkInTime: '09:00:00',
    checkOutTime: null,
    workHours: 4.5,
    earnedCost: 202.5,
    isVerified: false,
    createdAt: `${todayStr} 09:00:00`
  },
  {
    id: 'att-103',
    userId: 'usr-103',
    userName: 'محمد القحطاني',
    employeeCode: '103',
    date: todayStr,
    checkInTime: '08:30:00',
    checkOutTime: '15:30:00',
    workHours: 7.0,
    earnedCost: 280.0,
    isVerified: true,
    verifiedAt: `${todayStr} 15:35:00`,
    createdAt: `${todayStr} 08:30:00`
  }
];
