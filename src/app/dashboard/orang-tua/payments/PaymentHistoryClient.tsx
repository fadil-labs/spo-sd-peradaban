"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, X, Receipt, Wallet, CheckCircle2, Clock, Calendar } from "lucide-react";
import { DataTable } from "@/components/operational/data-table";
import { getParentPaymentHistoryAction, type ParentPaymentHistoryFilters, type ParentPaymentRow } from "./actions";

type PaymentHistoryClientProps = {
  payments: ParentPaymentRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  initialFilters: ParentPaymentHistoryFilters;
};

export default function PaymentHistoryClient({ 
  payments: initialPayments, 
  page: initialPage, 
  pageSize: initialPageSize, 
  totalRows: initialTotalRows, 
  initialFilters 
}: PaymentHistoryClientProps) {
  const [payments, setPayments] = useState<ParentPaymentRow[]>(initialPayments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);
  const [totalRows, setTotalRows] = useState(initialTotalRows);

  const [filters, setFilters] = useState<ParentPaymentHistoryFilters>({
    status: initialFilters.status || "all",
    startDate: initialFilters.startDate || "",
    endDate: initialFilters.endDate || "",
    searchQuery: initialFilters.searchQuery || "",
  });

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getParentPaymentHistoryAction({ ...filters, page, pageSize });
    if ("error" in result && result.error) {
      setError(result.error);
    } else if ("payments" in result) {
      setPayments(result.payments ?? []);
      setTotalRows(result.totalRows ?? 0);
    }
    setIsLoading(false);
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      status: "all",
      startDate: "",
      endDate: "",
      searchQuery: "",
    });
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    filters.status !== "all" ||
      filters.startDate ||
      filters.endDate ||
      filters.searchQuery
  );

  // Hitung ringkasan statistik keuangan dari daftar pembayaran yang tampil
  const totalPaidAmount = useMemo(() => {
    return payments
      .filter((p) => p.status === "completed" || p.status === "success")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const totalPendingAmount = useMemo(() => {
    return payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (date: string) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": case "success": return "Berhasil";
      case "pending": return "Menunggu";
      case "failed": return "Gagal";
      case "cancelled": return "Dibatalkan";
      case "refunded": return "Dikembalikan";
      default: return status;
    }
  };

  const columns = [
    {
      key: "siswa",
      header: "Anak",
      render: (payment: ParentPaymentRow) => (
        <div className="space-y-0.5">
          <p className="font-bold text-[#1A1A1A]">{payment.students?.full_name || "-"}</p>
          <p className="text-xs text-[#7A7A7A]">NIS: {payment.students?.nis || "-"}</p>
        </div>
      ),
    },
    {
      key: "tagihan",
      header: "Tagihan",
      render: (payment: ParentPaymentRow) => (
        <span className="font-medium text-[#1A1A1A]">
          {payment.student_bills ? formatCurrency(payment.student_bills.amount) : "-"}
        </span>
      ),
      mobileHide: true,
    },
    {
      key: "amount",
      header: "Jumlah Bayar",
      render: (payment: ParentPaymentRow) => (
        <span className="font-extrabold text-[#0C3B2E]">{formatCurrency(payment.amount)}</span>
      ),
    },
    {
      key: "method",
      header: "Metode",
      render: (payment: ParentPaymentRow) => (
        <div className="space-y-1">
          <span className="font-medium text-[#1A1A1A]">{payment.payment_methods?.name || "-"}</span>
          {payment.payment_methods?.name === "QRIS" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#0C3B2E]/20 bg-[#0C3B2E]/10 px-2 py-0.5 text-[10px] font-bold text-[#0C3B2E] w-fit">
              QRIS
            </span>
          )}
        </div>
      ),
      mobileHide: true,
    },
    {
      key: "status",
      header: "Status",
      render: (payment: ParentPaymentRow) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
          payment.status === "completed" || payment.status === "success" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
          payment.status === "pending" ? "bg-[#C28E38]/15 text-[#C28E38]" :
          payment.status === "failed" ? "bg-red-500/10 text-red-600" :
          "bg-[#7A7A7A]/10 text-[#7A7A7A]"
        }`}>
          {getStatusLabel(payment.status)}
        </span>
      ),
    },
    {
      key: "date",
      header: "Tanggal",
      render: (payment: ParentPaymentRow) => (
        <span className="text-xs text-[#7A7A7A]">{formatDate(payment.payment_date)}</span>
      ),
    },
  ];

  const totalPages = Math.ceil(totalRows / pageSize);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8">
      {/* HEADER HALAMAN */}
      <div className="bg-white rounded-[24px] p-7 sm:p-8 border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-block px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
            Keuangan & Administrasi
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
            Riwayat Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] max-w-2xl leading-relaxed">
            Pantau seluruh catatan riwayat transaksi dan status verifikasi pembayaran biaya pendidikan putra/putri Anda.
          </p>
        </div>

        {/* Ringkasan Kilat di Header */}
        <div className="flex items-center gap-3 bg-[#F5F3EC] p-4 rounded-2xl border border-[#E5E0D8] shrink-0">
          <div className="h-11 w-11 rounded-xl bg-[#0C3B2E] text-white flex items-center justify-center font-bold shadow-sm">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#7A7A7A] font-semibold uppercase tracking-wider">Total Transaksi</p>
            <p className="text-base font-black text-[#1A1A1A] mt-0.5">
              {totalRows} Catatan
            </p>
          </div>
        </div>
      </div>

      {/* KARTU STATISTIK KEUANGAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Total Pembayaran Berhasil</span>
            <div className="p-2.5 rounded-xl bg-[#0C3B2E]/10 text-[#0C3B2E]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#0C3B2E] tracking-tight">
              {formatCurrency(totalPaidAmount)}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-1">Terverifikasi oleh sistem</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Menunggu Verifikasi</span>
            <div className="p-2.5 rounded-xl bg-[#C28E38]/10 text-[#C28E38]">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#C28E38] tracking-tight">
              {formatCurrency(totalPendingAmount)}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-1">Dalam proses pengecekan bendahara</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 px-5 py-4">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* KARTU FILTER PENCARIAN */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#1A1A1A]">Filter Riwayat Pembayaran</h3>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-xs font-bold text-[#7A7A7A] hover:text-[#1A1A1A] transition-all"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="historySearch" className="block text-xs font-bold text-[#7A7A7A] mb-1.5">Cari Anak (NIS/Nama)</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A7A7A]" />
              <input
                id="historySearch"
                type="text"
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
                placeholder="Cari nama atau NIS..."
                className="h-11 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] pl-10 pr-4 text-sm font-bold text-[#1A1A1A] placeholder:text-[#7A7A7A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="historyStatus" className="block text-xs font-bold text-[#7A7A7A] mb-1.5">Status Pembayaran</label>
            <select
              id="historyStatus"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="h-11 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="completed">Berhasil</option>
              <option value="failed">Gagal</option>
              <option value="cancelled">Dibatalkan</option>
              <option value="refunded">Dikembalikan</option>
            </select>
          </div>

          <div>
            <label htmlFor="historyStartDate" className="block text-xs font-bold text-[#7A7A7A] mb-1.5">Tanggal Mulai</label>
            <div className="relative">
              <input
                id="historyStartDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="historyEndDate" className="block text-xs font-bold text-[#7A7A7A] mb-1.5">Tanggal Akhir</label>
            <div className="relative">
              <input
                id="historyEndDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABEL DATA UTAMA */}
      <div className="bg-white rounded-[24px] border border-[#E5E0D8] shadow-sm overflow-hidden p-2 sm:p-4 space-y-4">
        <DataTable
          columns={columns}
          data={payments}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          emptyTitle="Belum ada pembayaran."
          emptyDescription="Riwayat transaksi pembayaran yang Anda lakukan akan muncul di sini."
          emptyIcon={<Receipt className="h-6 w-6 text-[#0C3B2E]" />}
        />

        {/* PAGINATION */}
        {totalRows > 0 && !isLoading && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#E5E0D8] pt-4 px-4 gap-4">
            <p className="text-xs font-semibold text-[#7A7A7A]">
              Menampilkan {payments.length} dari {totalRows} data pembayaran
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-10 px-4 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-xs font-bold text-[#1A1A1A] hover:bg-[#EAE6DC] transition-all disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="text-xs font-bold text-[#7A7A7A] px-2">
                Halaman {page} dari {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
                disabled={page >= (totalPages || 1)}
                className="h-10 px-4 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-xs font-bold text-[#1A1A1A] hover:bg-[#EAE6DC] transition-all disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}