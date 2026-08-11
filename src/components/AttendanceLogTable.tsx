'use client';

import React from 'react';
import { AttendanceRecord } from '@/lib/types';

export default function AttendanceLogTable({ records }: { records: AttendanceRecord[] }) {
  return (
    <div className="overflow-x-auto text-xs">
      <table className="w-full text-right">
        <thead>
          <tr className="bg-slate-50 border-b">
            <th className="p-3">التاريخ</th>
            <th className="p-3">الموظف</th>
            <th className="p-3">الحضور</th>
            <th className="p-3">الانصراف</th>
            <th className="p-3">الساعات</th>
            <th className="p-3">المبلغ (د.ل)</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-3">{r.date}</td>
              <td className="p-3">{r.userName}</td>
              <td className="p-3">{r.checkInTime}</td>
              <td className="p-3">{r.checkOutTime || '--'}</td>
              <td className="p-3">{r.workHours}</td>
              <td className="p-3">{r.earnedCost} د.ل</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
