'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import WorkTimerCard from '@/components/WorkTimerCard';
import AttendanceLogTable from '@/components/AttendanceLogTable';
import LeaveRequestModal from '@/components/LeaveRequestModal';
import EmployeeBadgeModal from '@/components/EmployeeBadgeModal';
import { User, Project, AttendanceRecord } from '@/lib/types';
import { initialUsers, initialProjects, initialAttendanceRecords } from '@/lib/data-store';
import { Clock, Calendar, FileText, QrCode, Award, Coins } from 'lucide-react';

export default function EmployeeDashboard() {
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[1]); // Default Ahmed Ali (Pharmacist)
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  // Fetch current data
  const userRecords = records.filter((r) => r.userId === currentUser.id);
  const activeRecord = userRecords.find((r) => !r.checkOutTime) || null;

  // Calculate monthly total hours
  const monthlyTotalHours = Number(
    userRecords.reduce((acc, r) => acc + (r.workHours || 0), 0).toFixed(1)
  );

  const monthlyEarnedCost = Number(
    userRecords.reduce((acc, r) => acc + (r.earnedCost || 0), 0).toFixed(2)
  );

  const handleAttendanceUpdated = (newRecord: AttendanceRecord) => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === newRecord.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newRecord;
        return copy;
      }
      return [newRecord, ...prev];
    });
  };

  const handleAttachmentUploaded = (recordId: string, fileData: { fileName: string; filePath: string; fileType: string }) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === recordId) {
          const newAtt = { id: `attch-${Date.now()}`, attendanceId: recordId, ...fileData };
          return { ...r, attachments: [...(r.attachments || []), newAtt] };
        }
        return r;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-cairo" dir="rtl">
      {/* Navbar */}
      <Navbar
        user={currentUser}
        onSwitchUser={setCurrentUser}
        allUsers={initialUsers}
        onOpenBadge={() => setIsBadgeModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Summary Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block">ساعات مناوبات الشهر</span>
              <span className="text-2xl font-black font-mono text-slate-900">{monthlyTotalHours} ساعة</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block">أجر المناوبات التراكمي</span>
              <span className="text-2xl font-black font-mono text-emerald-700">{monthlyEarnedCost} د.ل</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block">الهدف الشهري من الساعات</span>
              <span className="text-2xl font-black font-mono text-slate-900">{currentUser.targetMonthlyHours} ساعة</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-semibold block">تبديل مناوبة / عذر</span>
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                تقديم طلب رسمي
              </button>
            </div>
          </div>
        </div>

        {/* Live Work Timer Card */}
        <WorkTimerCard
          user={currentUser}
          projects={projects}
          activeRecord={activeRecord}
          monthlyTotalHours={monthlyTotalHours}
          onAttendanceUpdated={handleAttendanceUpdated}
        />

        {/* Attendance Log Table */}
        <AttendanceLogTable
          records={userRecords}
          title="سجل مناوبات وساعات الدوام الصيدلاني الخاصة بك"
          showEmployeeName={false}
          onAttachmentUploaded={handleAttachmentUploaded}
        />
      </main>

      {/* Modals */}
      <LeaveRequestModal
        user={currentUser}
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onRequestSubmitted={() => {}}
      />

      <EmployeeBadgeModal
        user={currentUser}
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
      />
    </div>
  );
}
