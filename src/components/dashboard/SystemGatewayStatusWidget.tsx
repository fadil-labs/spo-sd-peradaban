"use client";

import React from "react";
import { Activity, ShieldCheck, Zap, ArrowUpRight } from "lucide-react";

export function SystemGatewayStatusWidget() {
  return (
    <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE6DC]">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#0C3B2E]" />
          <h3 className="text-sm font-bold text-[#1A1A1A]">Status Sistem & Gateway</h3>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-bold border border-emerald-500/20">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Gateway Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-3 rounded-xl bg-[#F5F3EC] border border-[#E5E0D8]">
          <div className="flex items-center gap-1.5 text-xs text-[#666] font-medium mb-1">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
            <span>Otomatis (QRIS/VA)</span>
          </div>
          <p className="text-base font-extrabold text-[#1A1A1A]">18 Transaksi</p>
          <p className="text-[11px] text-[#0C3B2E] font-semibold mt-0.5">
            Rp 4.250.000
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#F5F3EC] border border-[#E5E0D8]">
          <div className="flex items-center gap-1.5 text-xs text-[#666] font-medium mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#C28E38]" />
            <span>Transfer Manual</span>
          </div>
          <p className="text-base font-extrabold text-[#1A1A1A]">5 Transaksi</p>
          <p className="text-[11px] text-[#C28E38] font-semibold mt-0.5">
            Rp 1.150.000
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#8A8A8A] mt-3 pt-2 border-t border-[#F2EFE9]">
        <span>Penyedia: Midtrans Engine v2</span>
        <span className="flex items-center gap-0.5 text-[#0C3B2E] font-semibold cursor-pointer hover:underline">
          Lihat Log <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}