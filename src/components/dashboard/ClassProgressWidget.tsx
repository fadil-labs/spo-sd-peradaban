"use client";

import React from "react";
import { GraduationCap } from "lucide-react";

interface ClassProgressData {
  className: string;
  totalStudents: number;
  paidStudents: number;
  percentage: number;
}

const fallbackClassProgress: ClassProgressData[] = [
  { className: "Kelas 1A", totalStudents: 28, paidStudents: 25, percentage: 89 },
  { className: "Kelas 1B", totalStudents: 26, paidStudents: 21, percentage: 80 },
  { className: "Kelas 2A", totalStudents: 30, paidStudents: 28, percentage: 93 },
  { className: "Kelas 2B", totalStudents: 27, paidStudents: 17, percentage: 62 },
  { className: "Kelas 3A", totalStudents: 29, paidStudents: 26, percentage: 89 },
];

export function ClassProgressWidget() {
  return (
    <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0C3B2E]/10 text-[#0C3B2E]">
            <GraduationCap className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">
              Progress Pelunasan per Kelas
            </h3>
            <p className="text-xs text-[#8A8A8A]">SPP Bulan September 2026</p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-[#0C3B2E] bg-[#F5F3EC] px-2.5 py-1 rounded-lg border border-[#E5E0D8]">
          Rata-rata 82%
        </span>
      </div>

      <div className="space-y-3.5 pt-1">
        {fallbackClassProgress.map((item, idx) => {
          const isHigh = item.percentage >= 85;
          const isMedium = item.percentage >= 70 && item.percentage < 85;

          const barColor = isHigh
            ? "bg-[#0C3B2E]"
            : isMedium
            ? "bg-[#C28E38]"
            : "bg-[#A83A32]";

          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#1A1A1A]">{item.className}</span>
                <span className="text-[#666] font-medium">
                  {item.paidStudents}/{item.totalStudents} Siswa (
                  <strong className="text-[#1A1A1A]">{item.percentage}%</strong>)
                </span>
              </div>

              <div className="h-2.5 w-full bg-[#F5F3EC] rounded-full overflow-hidden border border-[#E5E0D8]/60 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}