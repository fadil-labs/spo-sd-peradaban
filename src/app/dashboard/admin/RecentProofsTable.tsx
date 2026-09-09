"use client";

import React from "react";
import { Search } from "lucide-react";

export interface ProofItem {
  id: string;
  studentName: string;
  nis: string;
  category: string;
  amount: number;
  date?: string;
  proofUrl?: string;
}

interface RecentProofsTableProps {
  proofs?: ProofItem[];
}

const fallbackProofs: ProofItem[] = [
  {
    id: "1",
    studentName: "Admin Keuangan",
    nis: "2017-03534",
    category: "SPP",
    amount: 200000,
    date: "13 Jan 2024",
  },
  {
    id: "2",
    studentName: "Admin Kubang",
    nis: "2013-08425",
    category: "Jemputan",
    amount: 50000,
    date: "13 Jan 2024",
  },
];

export function RecentProofsTable({ proofs }: RecentProofsTableProps) {
  const data = proofs && proofs.length > 0 ? proofs : fallbackProofs;

  return (
    <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <h3 className="text-base font-bold text-[#1A1A1A] mb-4">
        Tabel Verifikasi Pembayaran Terbaru
      </h3>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#EAE6DC] text-[#8A8A8A] font-semibold">
              <th className="pb-3 px-2">Nama Siswa</th>
              <th className="pb-3 px-2">NIS</th>
              <th className="pb-3 px-2">Kategori Bill</th>
              <th className="pb-3 px-2">Amount</th>
              <th className="pb-3 px-2 text-center">Proof</th>
              <th className="pb-3 px-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EFE9]">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-[#FDFCF9]">
                <td className="py-3 px-2 font-bold text-[#1A1A1A]">
                  {item.studentName}
                </td>
                <td className="py-3 px-2 text-[#666]">{item.nis}</td>
                <td className="py-3 px-2 text-[#666]">{item.category}</td>
                <td className="py-3 px-2 font-bold text-[#1A1A1A]">
                  Rp {item.amount.toLocaleString("id-ID")}
                </td>
                <td className="py-3 px-2 text-center">
                  <button
                    onClick={() => alert(`Preview bukti bayar: ${item.studentName}`)}
                    className="p-2 bg-[#4A4A4A] text-white rounded-lg hover:bg-[#1A1A1A] transition-colors inline-flex items-center justify-center"
                    title="Lihat Bukti Bayar"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => alert(`Setujui: ${item.studentName}`)}
                      className="px-3.5 py-1.5 bg-[#0C3B2E] text-white text-xs font-semibold rounded-xl hover:bg-[#10523E] transition-colors shadow-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => alert(`Tolak: ${item.studentName}`)}
                      className="px-3.5 py-1.5 bg-[#A83A32] text-white text-xs font-semibold rounded-xl hover:bg-[#852C25] transition-colors shadow-sm"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Stack View */}
      <div className="block md:hidden space-y-3">
        {data.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-[#E5E0D8] bg-[#FDFCF9] flex flex-col gap-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm text-[#1A1A1A]">{item.studentName}</p>
                <p className="text-xs text-[#777]">NIS: {item.nis}</p>
              </div>
              <p className="font-extrabold text-sm text-[#0C3B2E]">
                Rp {item.amount.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="flex justify-between items-center text-xs text-[#666] pt-1">
              <span>
                {item.category} {item.date ? `• ${item.date}` : ""}
              </span>
              <button
                onClick={() => alert(`Preview bukti bayar: ${item.studentName}`)}
                className="p-1.5 bg-[#4A4A4A] text-white rounded-lg hover:bg-black inline-flex items-center"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE6DC] mt-1">
              <button
                onClick={() => alert(`Setujui: ${item.studentName}`)}
                className="w-full py-1.5 bg-[#0C3B2E] text-white text-xs font-bold rounded-lg text-center"
              >
                Setujui
              </button>
              <button
                onClick={() => alert(`Tolak: ${item.studentName}`)}
                className="w-full py-1.5 bg-[#C28E38] text-white text-xs font-bold rounded-lg text-center"
              >
                Tolak
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}