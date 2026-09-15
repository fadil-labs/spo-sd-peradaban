"use client";

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TransactionRow } from "../actions";

type PrintClientViewProps = {
  school: { name: string; address?: string; phone?: string; email?: string } | null;
  profileName: string;
  summary: {
    totalBills: number;
    totalBillAmount: number;
    totalPaid: number;
    totalOutstanding: number;
    pendingPaymentAmount: number;
    pendingPaymentCount: number;
  };
  rows: TransactionRow[];
  filters: {
    startDate?: string;
    endDate?: string;
    billStatus?: string;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function PrintClientView({ school, profileName, summary, rows, filters }: PrintClientViewProps) {
  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#F5F3EC] py-8 px-4 print:bg-white print:py-0 print:px-0 text-[#1A1A1A]">
      {/* TOMBOL AKSI (Disembunyikan saat dicetak) */}
      <div className="max-w-[900px] mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/dashboard/admin/financial-reports"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1A1A] hover:bg-gray-50 shadow-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Laporan</span>
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] shadow-sm transition-all"
        >
          <Printer className="h-4 w-4" />
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>

      {/* LEMBAR KERTAS A4 */}
      <div className="max-w-[900px] mx-auto bg-white p-8 sm:p-12 rounded-[20px] shadow-sm print:shadow-none print:rounded-none print:w-full print:max-w-none print:p-6 space-y-6">
        
        {/* KOP SURAT RESMI */}
        <div className="border-b-4 border-double border-[#0C3B2E] pb-5 text-center space-y-1">
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-[#0C3B2E]">
            {school?.name || "LINTAS ADMINISTRASI SEKOLAH"}
          </h2>
          <p className="text-xs text-[#555] font-medium">
            {school?.address || "Cilegon, Banten, Indonesia"} {school?.phone ? `• Telp: ${school.phone}` : ""}
          </p>
          <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-[#1A1A1A] pt-2">
            REKONSILIASI LAPORAN KEUANGAN & PEMBAYARAN SISWA
          </h1>
        </div>

        {/* METADATA LAPORAN */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-[#555] bg-[#F5F3EC]/50 p-3.5 rounded-xl border border-[#E5E0D8]">
          <div className="space-y-1">
            <p><span className="font-bold text-[#1A1A1A]">Tanggal Cetak:</span> {currentDate}</p>
            <p><span className="font-bold text-[#1A1A1A]">Dicetak Oleh:</span> {profileName} (Administrator)</p>
          </div>
          <div className="space-y-1 mt-2 sm:mt-0 sm:text-right">
            <p><span className="font-bold text-[#1A1A1A]">Periode Filter:</span> {filters.startDate && filters.endDate ? `${filters.startDate} s/d ${filters.endDate}` : "Semua Periode"}</p>
            <p><span className="font-bold text-[#1A1A1A]">Status Tagihan:</span> {filters.billStatus ? filters.billStatus.toUpperCase() : "SEMUA"}</p>
          </div>
        </div>

        {/* RINGKASAN EKSEKUTIF (SUMMARY CARDS) */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-[#E5E0D8] bg-gray-50/50">
            <span className="text-[10px] font-bold text-[#7A7A7A] uppercase tracking-wider">Total Tagihan</span>
            <p className="text-sm sm:text-base font-black text-[#1A1A1A] mt-1">{formatCurrency(summary.totalBillAmount)}</p>
            <p className="text-[10px] text-[#7A7A7A] mt-0.5">{summary.totalBills} dokumen tagihan</p>
          </div>
          <div className="p-4 rounded-xl border border-[#E5E0D8] bg-[#0C3B2E]/5">
            <span className="text-[10px] font-bold text-[#0C3B2E] uppercase tracking-wider">Total Terbayar (Lunas)</span>
            <p className="text-sm sm:text-base font-black text-[#0C3B2E] mt-1">{formatCurrency(summary.totalPaid)}</p>
            <p className="text-[10px] text-[#0C3B2E]/80 mt-0.5">Pendapatan sukses</p>
          </div>
          <div className="p-4 rounded-xl border border-[#E5E0D8] bg-[#A83A32]/5">
            <span className="text-[10px] font-bold text-[#A83A32] uppercase tracking-wider">Sisa Outstanding</span>
            <p className="text-sm sm:text-base font-black text-[#A83A32] mt-1">{formatCurrency(summary.totalOutstanding)}</p>
            <p className="text-[10px] text-[#A83A32]/80 mt-0.5">Belum terbayar</p>
          </div>
        </div>

        {/* TABEL RINCIAN TRANSAKSI */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Rincian Data Transaksi</h3>
          <table className="w-full border-collapse border border-[#D1CBD3] text-left text-xs">
            <thead>
              <tr className="bg-[#F5F3EC] text-[#1A1A1A] font-bold">
                <th className="border border-[#D1CBD3] p-2.5 w-10 text-center">No</th>
                <th className="border border-[#D1CBD3] p-2.5">Siswa & NIS</th>
                <th className="border border-[#D1CBD3] p-2.5">Kelas</th>
                <th className="border border-[#D1CBD3] p-2.5">Kategori</th>
                <th className="border border-[#D1CBD3] p-2.5 text-right">Tagihan</th>
                <th className="border border-[#D1CBD3] p-2.5 text-right">Dibayar</th>
                <th className="border border-[#D1CBD3] p-2.5 text-right">Outstanding</th>
                <th className="border border-[#D1CBD3] p-2.5 text-center">Status</th>
                <th className="border border-[#D1CBD3] p-2.5">Metode / Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border border-[#D1CBD3] p-6 text-center text-[#7A7A7A]">
                    Tidak ada data transaksi yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                rows.map((r, index) => (
                  <tr key={r.billId + index} className="hover:bg-gray-50/50">
                    <td className="border border-[#D1CBD3] p-2 text-center text-[#7A7A7A]">{index + 1}</td>
                    <td className="border border-[#D1CBD3] p-2">
                      <p className="font-bold text-[#1A1A1A]">{r.studentName || "-"}</p>
                      <p className="text-[10px] text-[#7A7A7A]">NIS: {r.studentNis || "-"}</p>
                    </td>
                    <td className="border border-[#D1CBD3] p-2 text-[#555]">{r.className || "-"}</td>
                    <td className="border border-[#D1CBD3] p-2 text-[#555]">{r.paymentCategoryName || "-"}</td>
                    <td className="border border-[#D1CBD3] p-2 text-right font-semibold text-[#1A1A1A]">{formatCurrency(r.billAmount)}</td>
                    <td className="border border-[#D1CBD3] p-2 text-right font-bold text-[#0C3B2E]">{formatCurrency(r.paidAmount)}</td>
                    <td className="border border-[#D1CBD3] p-2 text-right font-bold text-[#A83A32]">{formatCurrency(r.outstanding)}</td>
                    <td className="border border-[#D1CBD3] p-2 text-center">
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-[#333]">
                        {r.billStatus}
                      </span>
                    </td>
                    <td className="border border-[#D1CBD3] p-2 text-[11px] text-[#555]">
                      <p className="font-medium">{r.paymentMethodName || "-"}</p>
                      <p className="text-[10px] text-[#7A7A7A]">{r.paymentDate ? formatDate(r.paymentDate) : "-"}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* TANDA TANGAN & PENGESAHAN */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-[#1A1A1A] break-inside-avoid">
          <div className="space-y-16 text-center">
            <p>Mengetahui,<br /><b>Kepala Sekolah</b></p>
            <div className="pt-2">
              <p className="font-bold underline">___________________________</p>
              <p className="text-[10px] text-[#7A7A7A] mt-0.5">NIP. ....................................</p>
            </div>
          </div>
          <div className="space-y-16 text-center">
            <p>Cilegon, {currentDate}<br /><b>Bendahara Sekolah</b></p>
            <div className="pt-2">
              <p className="font-bold underline">{profileName}</p>
              <p className="text-[10px] text-[#7A7A7A] mt-0.5">NIP. ....................................</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}