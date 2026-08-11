'use client';

import React, { useState } from 'react';
import { Calendar, Clock, DollarSign, FileSpreadsheet, Paperclip, Upload, Download, Eye, FileText } from 'lucide-react';
import { AttendanceRecord } from '@/lib/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AttendanceLogTableProps {
  records: AttendanceRecord[];
  title?: string;
  showEmployeeName?: boolean;
  onAttachmentUploaded?: (recordId: string, fileData: { fileName: string; filePath: string; fileType: string }) => void;
}

export default function AttendanceLogTable({
  records,
  title = 'كشف ساعات العمل وتدوين الإنجازات التفصيلي',
  showEmployeeName = false,
  onAttachmentUploaded
}: AttendanceLogTableProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleFileUpload = async (recordId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(recordId);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success && onAttachmentUploaded) {
        onAttachmentUploaded(recordId, data.file);
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploadingId(null);
    }
  };

  const exportToExcel = () => {
    const dataToExport = records.map((r) => ({
      'كود الموظف': r.employeeCode,
      'اسم الموظف': r.userName,
      'التاريخ': r.date,
      'المشروع / المهمة': r.projectName || 'دوام حر',
      'وقت الدخول': r.checkInTime || '-',
      'وقت الخروج': r.checkOutTime || '-',
      'إجمالي ساعات العمل': `${r.workHours} ساعة`,
      'الأجر المستحق ($ / د.ل)': `${r.earnedCost} `,
      'ملاحظات الإنجاز': r.taskNotes || 'لا يوجد',
      'طريقة التسجيل': r.method
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف_الساعات');
    XLSX.writeFile(workbook, `كشف_ساعات_العمل_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPdf = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    doc.setFontSize(16);
    doc.text('ordermt.ly - Official Attendance & Work Hours Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-US')}`, 14, 28);

    const tableRows = records.map((r) => [
      r.date,
      r.userName,
      r.projectName || 'General Work',
      r.checkInTime || '-',
      r.checkOutTime || '-',
      `${r.workHours} hrs`,
      `$ ${r.earnedCost}`
    ]);

    (doc as any).autoTable({
      head: [['Date', 'Employee', 'Project', 'Check In', 'Check Out', 'Hours', 'Cost']],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    doc.save(`Work_Hours_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mt-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-600" />
            {title}
          </h3>
          <p className="text-slate-500 text-xs mt-1">كشف تفصيلي بدقائق وساعات العمل المسجلة مع تكاليف وإثباتات الجلسات</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            تصدير Excel
          </button>

          <button
            onClick={exportToPdf}
            className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-sky-600" />
            تصدير PDF
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <th className="py-3.5 px-4 font-bold">التاريخ</th>
              {showEmployeeName && <th className="py-3.5 px-4 font-bold">الموظف</th>}
              <th className="py-3.5 px-4 font-bold">المشروع / المهمة</th>
              <th className="py-3.5 px-4 font-bold">وقت البدء</th>
              <th className="py-3.5 px-4 font-bold">وقت الإنهاء</th>
              <th className="py-3.5 px-4 font-bold text-center">ساعات العمل</th>
              <th className="py-3.5 px-4 font-bold text-center">الأجر المستحق</th>
              <th className="py-3.5 px-4 font-bold">ملاحظات الإنجاز</th>
              <th className="py-3.5 px-4 font-bold text-center">المرفقات وإثبات العمل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={showEmployeeName ? 9 : 8} className="py-8 text-center text-slate-400 font-medium">
                  لا توجد سجلات دوام أو جلسات مسجلة حتى الآن.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.date}</span>
                    </div>
                  </td>

                  {showEmployeeName && (
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sky-700">{r.userName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.employeeCode}</div>
                    </td>
                  )}

                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {r.projectName ? (
                      <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-full text-[11px]">
                        {r.projectName}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">دوام حر</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-emerald-600 font-mono font-bold">
                    {r.checkInTime || '--:--'}
                  </td>

                  <td className="py-3.5 px-4 text-rose-600 font-mono font-bold">
                    {r.checkOutTime || '--:--'}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-slate-100 text-slate-900 border border-slate-200 px-3 py-1 rounded-full font-extrabold font-mono text-xs">
                      {r.workHours} ساعة
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold font-mono text-emerald-700">
                    {r.earnedCost > 0 ? `$ ${r.earnedCost}` : '--'}
                  </td>

                  <td className="py-3.5 px-4 max-w-xs text-slate-600 truncate">
                    {r.taskNotes || <span className="text-slate-300">بدون ملاحظات</span>}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Attachments List */}
                      {r.attachments && r.attachments.length > 0 ? (
                        r.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.filePath}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-sky-100"
                            title={att.fileName}
                          >
                            <Paperclip className="w-3.5 h-3.5 text-sky-600" />
                            مرفق
                          </a>
                        ))
                      ) : null}

                      {/* Upload File Button */}
                      <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        {uploadingId === r.id ? 'رفع...' : 'إرفاق'}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileUpload(r.id, e)}
                        />
                      </label>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
