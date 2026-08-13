'use client';

import React from 'react';
import { AttendanceRecord } from '@/lib/types';
import { useSortableData } from '@/hooks/useSortableData';
import SortHeader from '@/components/SortHeader';

export default function AttendanceLogTable({ records }: { records: AttendanceRecord[] }) {
  const { items: sortedRecords, requestSort, sortConfig } = useSortableData(records, {
    key: 'date',
    direction: 'desc'
  });

  return (
    <div className="overflow-x-auto text-xs">
      <table className="w-full text-right">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <SortHeader title="التاريخ" sortKey="date" sortConfig={sortConfig} onRequestSort={requestSort} />
            <SortHeader title="الموظف" sortKey="userName" sortConfig={sortConfig} onRequestSort={requestSort} />
            <SortHeader title="الحضور" sortKey="checkInTime" sortConfig={sortConfig} onRequestSort={requestSort} />
            <SortHeader title="الانصراف" sortKey="checkOutTime" sortConfig={sortConfig} onRequestSort={requestSort} />
            <SortHeader title="الساعات" sortKey="workHours" sortConfig={sortConfig} onRequestSort={requestSort} />
            <SortHeader title="المبلغ (د.ل)" sortKey="earnedCost" sortConfig={sortConfig} onRequestSort={requestSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedRecords.map((r) => (
            <tr key={r.id} className="border-b hover:bg-slate-50/80 transition-colors">
              <td className="p-3 font-sans font-bold">{r.date}</td>
              <td className="p-3 font-sans font-bold">{r.userName}</td>
              <td className="p-3 text-blue-600 font-mono font-bold">{r.checkInTime}</td>
              <td className="p-3 text-red-600 font-mono font-bold">{r.checkOutTime || '--'}</td>
              <td className="p-3 font-mono font-black">{r.workHours}</td>
              <td className="p-3 font-mono font-black text-teal-700">{r.earnedCost} د.ل</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

