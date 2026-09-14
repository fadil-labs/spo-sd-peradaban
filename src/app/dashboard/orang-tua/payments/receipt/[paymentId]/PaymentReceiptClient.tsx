"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, QrCode, CheckCircle2, Printer, ArrowLeft } from "lucide-react";

type ReceiptData = {
  school: { name: string; address: string | null; phone: string | null; email: string | null; logo_url?: string | null };
  student: { full_name: string; nis: string } | null;
  bill: { 
    id: string; 
    amount: number; 
    status: string; 
    billing_period_start: string | null; 
    billing_period_end: string | null; 
    payment_category_name: string | null;
    installment_plan?: any;
  };
  payment: { id: string; amount: number; payment_date: string; reference_number: string | null; status: string; payment_method_name: string; payment_method_type: string | null };
  installmentInfo?: { isInstallment: boolean; current: number; total: number } | null;
  totalPaid: number;
  remainingBalance: number;
};

type Props = {
  receipt: ReceiptData;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

const formatDateShort = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const formatDateTime = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

const getPaymentStatusLabel = (status: string) => {
  switch (status) {
    case "completed": case "success": return "Berhasil";
    case "pending": return "Menunggu";
    case "failed": return "Gagal";
    case "cancelled": return "Dibatalkan";
    default: return status;
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case "completed": case "success": return "bg-[#0C3B2E]/10 text-[#0C3B2E] border-[#0C3B2E]/20";
    case "pending": return "bg-[#C28E38]/15 text-[#C28E38] border-[#C28E38]/30";
    default: return "bg-red-500/10 text-red-600 border-red-500/20";
  }
};

const getBillStatusLabel = (status: string) => {
  switch (status) {
    case "paid": return "Lunas";
    case "partial": return "Cicilan";
    case "pending": return "Menunggu";
    case "overdue": return "Terlambat";
    case "cancelled": return "Dibatalkan";
    default: return status;
  }
};

const getBillStatusColor = (status: string) => {
  switch (status) {
    case "paid": return "bg-[#0C3B2E]/10 text-[#0C3B2E] border-[#0C3B2E]/20";
    case "partial": return "bg-[#C28E38]/15 text-[#C28E38] border-[#C28E38]/30";
    default: return "bg-red-500/10 text-red-600 border-red-500/20";
  }
};

function LogoPlaceholder({ logoUrl, schoolName }: { logoUrl?: string | null; schoolName?: string }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center w-20 h-20 border border-[#E5E0D8] rounded-2xl bg-[#F5F3EC] shrink-0 shadow-xs overflow-hidden p-2">
      {logoUrl && !hasError ? (
        <img
          src={logoUrl}
          alt={schoolName || "Logo Sekolah"}
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <Building2 className="w-6 h-6 text-[#0C3B2E]" />
          <span className="text-[9px] text-[#7A7A7A] mt-0.5 font-extrabold uppercase tracking-wider">Logo</span>
        </div>
      )}
    </div>
  );
}

function QRPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center w-20 h-20 border border-[#E5E0D8] rounded-2xl bg-[#F5F3EC] shrink-0 shadow-xs">
      <QrCode className="w-8 h-8 text-[#0C3B2E]" />
      <span className="text-[10px] text-[#7A7A7A] mt-1 font-extrabold uppercase tracking-wider">QR Code</span>
    </div>
  );
}

export default function PaymentReceiptClient({ receipt }: Props) {
  const { school, student, bill, payment, installmentInfo, totalPaid, remainingBalance } = receipt;

  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight">Bukti Pembayaran</h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">Receipt pembayaran resmi dan sah yang digenerate sistem.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/orang-tua/bills/${bill.id}`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-xs font-bold text-[#1A1A1A] hover:bg-[#EAE6DC] transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Tagihan</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[#0C3B2E] text-white text-xs font-extrabold hover:bg-[#10523E] transition-all shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Kuitansi</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-[#E5E0D8] p-8 sm:p-12 shadow-sm space-y-8 print:shadow-none print:border-none print:p-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-[#E5E0D8]">
          <LogoPlaceholder logoUrl={school.logo_url} schoolName={school.name} />
          <div className="text-center flex-1 space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-[#1A1A1A] tracking-tight">{school.name}</h2>
            {school.address && <p className="text-xs sm:text-sm text-[#7A7A7A]">{school.address}</p>}
            {(school.phone || school.email) && (
              <p className="text-xs text-[#7A7A7A]">
                {school.phone && `Telp: ${school.phone}`}
                {school.phone && school.email && " | "}
                {school.email && school.email}
              </p>
            )}
          </div>
          <QRPlaceholder />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
            <p className="text-[11px] font-bold text-[#7A7A7A] uppercase tracking-wider">Siswa</p>
            <p className="text-base font-extrabold text-[#1A1A1A]">{student?.full_name || "-"}</p>
            {student?.nis && <p className="text-xs text-[#7A7A7A]">NIS: <span className="font-bold text-[#1A1A1A]">{student.nis}</span></p>}
          </div>

          <div className="p-5 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
            <p className="text-[11px] font-bold text-[#7A7A7A] uppercase tracking-wider">No. Pembayaran</p>
            <p className="text-sm font-mono font-extrabold text-[#1A1A1A]">{payment.reference_number || payment.id.slice(0, 8).toUpperCase()}</p>
            
            {installmentInfo && installmentInfo.isInstallment && (
              <p className="text-xs font-bold text-[#C28E38] pt-0.5">
                Keterangan: Cicilan ke-{installmentInfo.current} dari {installmentInfo.total}
              </p>
            )}

            <p className="text-xs text-[#7A7A7A] pt-1">Tanggal: <span className="font-bold text-[#1A1A1A]">{formatDateTime(payment.payment_date)}</span></p>
            <p className="text-xs text-[#7A7A7A]">Metode: <span className="font-bold text-[#1A1A1A]">{payment.payment_method_name}</span></p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-2">
          <h3 className="text-xs font-extrabold text-[#7A7A7A] uppercase tracking-wider">Detail Tagihan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-[#7A7A7A] font-semibold uppercase">Kategori</p>
              <p className="text-sm font-extrabold text-[#1A1A1A] mt-0.5">{bill.payment_category_name || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#7A7A7A] font-semibold uppercase">Periode</p>
              <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">
                {bill.billing_period_start && bill.billing_period_end
                  ? `${formatDateShort(bill.billing_period_start)} - ${formatDateShort(bill.billing_period_end)}`
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between py-3 border-b border-[#E5E0D8]">
            <span className="text-xs sm:text-sm font-semibold text-[#7A7A7A]">Nominal Tagihan</span>
            <span className="text-sm font-black text-[#1A1A1A]">{formatCurrency(bill.amount)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#E5E0D8]">
            <span className="text-xs sm:text-sm font-semibold text-[#7A7A7A]">Pembayaran Ini</span>
            <span className="text-sm font-black text-[#0C3B2E]">{formatCurrency(payment.amount)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#E5E0D8]">
            <span className="text-xs sm:text-sm font-semibold text-[#7A7A7A]">Total Telah Dibayar</span>
            <span className="text-sm font-black text-[#1A1A1A]">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#E5E0D8]">
            <span className="text-xs sm:text-sm font-semibold text-[#7A7A7A]">Sisa Tagihan</span>
            <span className="text-sm font-black text-[#C28E38]">{formatCurrency(remainingBalance)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8]">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-[#7A7A7A] uppercase tracking-wider">Status Pembayaran</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold border ${getPaymentStatusColor(payment.status)}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {getPaymentStatusLabel(payment.status)}
            </span>
          </div>
          <div className="flex flex-col sm:items-end gap-1">
            <span className="text-[11px] font-bold text-[#7A7A7A] uppercase tracking-wider">Status Tagihan</span>
            <span className={`inline-flex rounded-full px-3.5 py-1 text-xs font-extrabold border ${getBillStatusColor(bill.status)}`}>
              Tagihan: {getBillStatusLabel(bill.status)}
            </span>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E5E0D8]">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-10">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider mb-14">Tanda Tangan Pihak Sekolah</p>
              <div className="border-b border-[#1A1A1A]/30 w-48 mx-auto sm:mx-0 mb-2" />
              <p className="text-xs font-extrabold text-[#1A1A1A]">( Kepala Sekolah / Bendahara )</p>
            </div>
            <div className="flex-1 flex flex-col items-center sm:items-end text-center sm:text-right">
              <p className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider mb-14">Tanda Tangan Orang Tua / Wali</p>
              <div className="border-b border-[#1A1A1A]/30 w-48 mb-2" />
              <p className="text-xs font-extrabold text-[#1A1A1A]">( Orang Tua / Wali Siswa )</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#7A7A7A] text-center print:text-black">
        Bukti pembayaran ini digenerate secara otomatis oleh sistem. Mohon simpan untuk keperluan pencatatan.
      </p>
    </div>
  );
}