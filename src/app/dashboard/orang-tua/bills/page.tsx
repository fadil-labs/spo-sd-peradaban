"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { FileText, Wallet, CheckCircle2, Clock, X, Filter, User, ArrowRight, AlertTriangle } from "lucide-react";
import { DataTable } from "@/components/operational/data-table";
import { getParentBillsAction } from "../actions";

type ParentBill = {
  id: string;
  amount: number;
  status: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  is_recurring: boolean;
  due_date: string | null;
  created_at: string;
  students: { id: string; nis: string; full_name: string } | null;
  payment_categories: { id: string; name: string; allow_installments: boolean; minimum_installment_amount: number | null; require_installment_schedule?: boolean } | null;
  installment_plan: {
    total_installments: number;
    installment_amount: number;
    current_installment: number;
    paid_installments: number[];
    installments?: Array<{
      number: number;
      amount: number;
      due_date: string;
      status: string;
    }>;
  } | null;
};

export default function ParentBillsPage() {
  const [bills, setBills] = useState<ParentBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [studentFilter, setStudentFilter] = useState<string>("all");

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getParentBillsAction(statusFilter);
    if ("error" in result && result.error) {
      setError(result.error + (result.detail ? `\nDetail: ${result.detail}` : ""));
    } else {
      setBills((result as { bills: ParentBill[] }).bills);
    }
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  // Daftar unik anak dari data tagihan untuk filter
  const uniqueStudents = useMemo(() => {
    const map = new Map();
    bills.forEach((b) => {
      if (b.students) {
        map.set(b.students.id, b.students);
      }
    });
    return Array.from(map.values());
  }, [bills]);

  // Filter tambahan berdasarkan anak di sisi klien
  const filteredBills = useMemo(() => {
    if (studentFilter === "all") return bills;
    return bills.filter((b) => b.students?.id === studentFilter);
  }, [bills, studentFilter]);

  // Hitung statistik keuangan dari data yang tampil
  const totalBillAmount = filteredBills.reduce((sum, b) => sum + b.amount, 0);
  const paidBillsAmount = filteredBills
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + b.amount, 0);
  const outstandingAmount = filteredBills
    .filter((b) => b.status === "pending" || b.status === "partial" || b.status === "overdue")
    .reduce((sum, b) => sum + b.amount, 0);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Menunggu";
      case "partial": return "Cicilan";
      case "paid": return "Lunas";
      case "overdue": return "Terlambat";
      case "cancelled": return "Dibatalkan";
      default: return status;
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (date: string) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const columns = [
    {
      key: "siswa",
      header: "Anak",
      render: (bill: ParentBill) => (
        <div className="space-y-0.5">
          <p className="font-bold text-[#1A1A1A]">{bill.students?.full_name || "-"}</p>
          <p className="text-xs text-[#7A7A7A]">NIS: {bill.students?.nis || "-"}</p>
        </div>
      ),
    },
    {
      key: "payment_categories.name",
      header: "Kategori",
      render: (bill: ParentBill) => <span className="font-medium text-[#1A1A1A]">{bill.payment_categories?.name || "-"}</span>,
      mobileHide: true,
    },
    {
      key: "periode",
      header: "Periode",
      render: (bill: ParentBill) => (
        <span className="text-xs text-[#7A7A7A]">
          {bill.billing_period_start && bill.billing_period_end
            ? `${formatDate(bill.billing_period_start)} - ${formatDate(bill.billing_period_end)}`
            : "Semester Berjalan"}
        </span>
      ),
      mobileHide: true,
    },
    {
      key: "amount",
      header: "Jumlah",
      render: (bill: ParentBill) => <span className="font-extrabold text-[#1A1A1A]">{formatCurrency(bill.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (bill: ParentBill) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
          bill.status === "paid" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
          bill.status === "partial" ? "bg-[#C28E38]/15 text-[#C28E38]" :
          bill.status === "overdue" ? "bg-red-500/10 text-red-600" :
          "bg-[#7A7A7A]/10 text-[#7A7A7A]"
        }`}>
          {getStatusLabel(bill.status)}
        </span>
      ),
    },
    {
      key: "due_date",
      header: "Jatuh Tempo",
      render: (bill: ParentBill) => <span className="text-xs text-[#7A7A7A]">{bill.due_date ? formatDate(bill.due_date) : "-"}</span>,
      mobileHide: true,
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "text-right",
      render: (bill: ParentBill) => (
        <Link
          href={`/dashboard/orang-tua/bills/${bill.id}`}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-[#0C3B2E] text-white text-xs font-bold hover:bg-[#10523E] transition-all shadow-sm active:scale-[0.98]"
        >
          <span>Detail</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  const hasPendingBills = filteredBills.some((b) => b.status === "pending" || b.status === "overdue" || b.status === "partial");
  const pendingBill = filteredBills.find((b) => b.status === "pending" || b.status === "overdue" || b.status === "partial");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8">
      {/* HEADER HALAMAN */}
      <div className="bg-white rounded-[24px] p-7 sm:p-8 border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-block px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
            Keuangan & Administrasi
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
            Tagihan Anak
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] max-w-2xl leading-relaxed">
            Daftar lengkap seluruh tagihan biaya pendidikan putra/putri Anda. Lakukan pembayaran dan pantau status pelunasan dengan mudah.
          </p>
        </div>

        {/* Ringkasan Kilat di Header */}
        <div className="flex items-center gap-3 bg-[#F5F3EC] p-4 rounded-2xl border border-[#E5E0D8] shrink-0">
          <div className="h-11 w-11 rounded-xl bg-[#C28E38] text-white flex items-center justify-center font-bold shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#7A7A7A] font-semibold uppercase tracking-wider">Sisa Kewajiban</p>
            <p className="text-base font-black text-[#1A1A1A] mt-0.5">
              {formatCurrency(outstandingAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* KARTU STATISTIK KEUANGAN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Total Tagihan (Filter)</span>
            <div className="p-2.5 rounded-xl bg-[#0C3B2E]/10 text-[#0C3B2E]">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#1A1A1A] tracking-tight">
              {formatCurrency(totalBillAmount)}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-1">{filteredBills.length} tagihan tercatat</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Sudah Terbayar</span>
            <div className="p-2.5 rounded-xl bg-[#0C3B2E]/10 text-[#0C3B2E]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#0C3B2E] tracking-tight">
              {formatCurrency(paidBillsAmount)}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-1">Lunas terverifikasi</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Belum Lunas</span>
            <div className="p-2.5 rounded-xl bg-[#C28E38]/10 text-[#C28E38]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#C28E38] tracking-tight">
              {formatCurrency(outstandingAmount)}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-1">Menunggu pembayaran</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 px-5 py-4">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-5 rounded-[24px] border border-[#E5E0D8] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter Status Tagihan"
            className="h-11 px-4 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="partial">Cicilan</option>
            <option value="paid">Lunas</option>
            <option value="overdue">Terlambat</option>
          </select>

          {/* Filter Anak */}
          {uniqueStudents.length > 1 && (
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              aria-label="Filter Berdasarkan Anak"
              className="h-11 px-4 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
            >
              <option value="all">Semua Anak ({uniqueStudents.length})</option>
              {uniqueStudents.map((s: any) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          )}

          {(statusFilter !== "all" || studentFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setStatusFilter("all"); setStudentFilter("all"); }}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-[#E5E0D8] bg-white text-xs font-bold text-[#7A7A7A] hover:text-[#1A1A1A] hover:bg-[#F5F3EC] transition-all"
            >
              <X className="h-4 w-4" />
              Reset Filter
            </button>
          )}
        </div>

        <p className="text-xs font-semibold text-[#7A7A7A] text-right sm:text-left self-center">
          Menampilkan {filteredBills.length} data tagihan
        </p>
      </div>

      {/* TABEL DATA UTAMA */}
      <div className="bg-white rounded-[24px] border border-[#E5E0D8] shadow-sm overflow-hidden p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={filteredBills}
          keyExtractor={(b) => b.id}
          isLoading={isLoading}
          emptyTitle="Belum ada tagihan."
          emptyDescription="Tagihan baru akan muncul di sini saat diterbitkan oleh bagian administrasi sekolah."
          emptyIcon={<FileText className="h-6 w-6 text-[#0C3B2E]" />}
        />
      </div>

      {/* FLOATING ACTION BUTTON MOBILE */}
      {hasPendingBills && pendingBill && (
        <Link
          href={`/dashboard/orang-tua/bills/${pendingBill.id}`}
          className="fixed bottom-24 right-6 z-40 lg:hidden inline-flex items-center justify-center gap-2.5 h-14 px-6 rounded-full bg-[#C28E38] text-white shadow-xl hover:bg-[#A97A2E] transition-all active:scale-[0.98]"
        >
          <Wallet className="h-5 w-5" />
          <span className="text-sm font-extrabold">Bayar Tagihan Aktif</span>
        </Link>
      )}
    </div>
  );
}