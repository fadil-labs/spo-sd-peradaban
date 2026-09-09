"use client";

import React from "react";
import { History, CheckCircle, FilePlus, UserCheck, ShieldAlert } from "lucide-react";

interface AuditLogItem {
  id: string;
  user: string;
  action: string;
  time: string;
  type: "approve" | "create" | "verify" | "system";
}

const fallbackLogs: AuditLogItem[] = [
  {
    id: "1",
    user: "Bendahara Keuangan",
    action: "Menyetujui bukti bayar SPP Ahmad Fauzi (Kelas 1A)",
    time: "5 menit yang lalu",
    type: "approve",
  },
  {
    id: "2",
    user: "Administrator SD",
    action: "Menerbitkan tagihan Uang Kegiatan Semester 1 (50 siswa)",
    time: "25 menit yang lalu",
    type: "create",
  },
  {
    id: "3",
    user: "System Automated",
    action: "Memverifikasi otomatis pembayaran QRIS Siti Nurhaliza",
    time: "1 jam yang lalu",
    type: "system",
  },
  {
    id: "4",
    user: "Bendahara Keuangan",
    action: "Menolak bukti transfer buram dari Wali Siswa Budi",
    time: "2 jam yang lalu",
    type: "verify",
  },
];

const iconTypeMap = {
  approve: <CheckCircle className="h-4 w-4 text-[#0C3B2E]" />,
  create: <FilePlus className="h-4 w-4 text-blue-600" />,
  system: <UserCheck className="h-4 w-4 text-teal-600" />,
  verify: <ShieldAlert className="h-4 w-4 text-[#C28E38]" />,
};

export function AuditActivityFeedWidget() {
  return (
    <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EAE6DC]">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#0C3B2E]" />
          <h3 className="text-sm font-bold text-[#1A1A1A]">Log Aktivitas Terbaru</h3>
        </div>
        <span className="text-[11px] font-semibold text-[#8A8A8A]">Audit Feed</span>
      </div>

      <div className="space-y-3">
        {fallbackLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 text-xs">
            <div className="p-1.5 rounded-lg bg-[#F5F3EC] border border-[#E5E0D8] shrink-0 mt-0.5">
              {iconTypeMap[log.type]}
            </div>
            <div className="flex-1">
              <p className="text-[#1A1A1A] font-medium leading-snug">
                <strong className="font-bold text-[#0C3B2E]">{log.user}</strong>{" "}
                {log.action}
              </p>
              <p className="text-[10px] text-[#9A9A9A] mt-0.5">{log.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}