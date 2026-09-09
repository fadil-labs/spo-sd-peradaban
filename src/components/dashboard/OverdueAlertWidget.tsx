"use client";

import React from "react";
import { AlertTriangle, Send, ChevronRight, Clock } from "lucide-react";

interface OverdueAlertWidgetProps {
  overdueCount?: number;
  totalOverdueAmount?: number;
  dueDateLabel?: string;
}

export function OverdueAlertWidget({
  overdueCount = 12,
  totalOverdueAmount = 4200000,
  dueDateLabel = "10 September 2026",
}: OverdueAlertWidgetProps) {
  const handleSendReminder = () => {
    alert(`[Simulasi UI] Mengirim pengingat WhatsApp ke ${overdueCount} orang tua murid.`);
  };

  return (
    <div className="rounded-[20px] border border-[#E5E0D8] bg-gradient-to-br from-white via-white to-[#FFFDF9] p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden">
      <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-[#C28E38]/10 rounded-full blur-xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-[#C28E38]/15 text-[#C28E38] shrink-0 mt-0.5">
            <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C28E38]/10 text-[#C28E38] font-bold text-[11px]">
                <Clock className="h-3 w-3" /> Jatuh Tempo {dueDateLabel}
              </span>
            </div>

            <h3 className="text-base font-extrabold text-[#1A1A1A] mt-1.5">
              {overdueCount} Siswa Belum Melunasi Tagihan
            </h3>

            <p className="text-xs text-[#7A7A7A] mt-0.5">
              Total potensi tunggakan:{" "}
              <span className="font-extrabold text-[#A83A32]">
                Rp {totalOverdueAmount.toLocaleString("id-ID")}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EAE6DC]">
          <button
            onClick={handleSendReminder}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-all shadow-sm flex items-center justify-center gap-2 group"
          >
            <Send className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            <span>Kirim Pengingat WA</span>
          </button>

          <button
            onClick={() => alert("[Simulasi UI] Membuka daftar siswa menunggak.")}
            className="p-2.5 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] rounded-xl hover:bg-[#EAE6DC] transition-colors"
            title="Lihat Detail Siswa"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}