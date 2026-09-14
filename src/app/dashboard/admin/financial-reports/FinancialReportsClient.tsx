"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Filter, RotateCcw, Search } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { getFinancialSummaryAction, getFinancialTransactionsAction, FinancialReportFilters, FinancialSummary, TransactionRow } from "./actions";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";

type FilterOptions = {
  academicYears: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  paymentMethods: { id: string; name: string; method_type: string }[];
};

type FinancialReportsClientProps = {
  summary: FinancialSummary & { billAmountByStatus: Record<string, { count: number; amount: number }>; totalBillAmount: number; totalPaid: number; totalOutstanding: number };
  transactions: { rows: TransactionRow[]; page: number; pageSize: number; totalRows: number };
  filters: FilterOptions;
  initialFilters: FinancialReportFilters;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function FinancialReportsClient({ summary, transactions, filters: filterOptions, initialFilters }: FinancialReportsClientProps) {
  const [reportSummary, setReportSummary] = useState(summary);
  const [reportTransactions, setReportTransactions] = useState(transactions);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [filtersState, setFiltersState] = useState<FinancialReportFilters>({
    startDate: initialFilters.startDate || "",
    endDate: initialFilters.endDate || "",
    academicYearId: initialFilters.academicYearId || "all",
    paymentCategoryId: initialFilters.paymentCategoryId || "all",
    classId: initialFilters.classId || "all",
    studentId: initialFilters.studentId || "",
    billStatus: initialFilters.billStatus || "all",
    paymentMethodId: initialFilters.paymentMethodId || "all",
    paymentProofStatus: initialFilters.paymentProofStatus || "all",
    page: 1,
    pageSize: 20,
  });

  const toast = useToast();

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, transactionsRes] = await Promise.all([
        getFinancialSummaryAction(filtersState),
        getFinancialTransactionsAction(filtersState),
      ]);

      if ("error" in summaryRes && summaryRes.error) {
        setError(summaryRes.error);
      } else {
        const summaryData = summaryRes as { summary: FinancialSummary; billAmountByStatus: Record<string, { count: number; amount: number }>; totalBillAmount: number; totalPaid: number; totalOutstanding: number };
        setReportSummary({
          ...summaryData.summary,
          billAmountByStatus: summaryData.billAmountByStatus,
          totalBillAmount: summaryData.totalBillAmount,
          totalPaid: summaryData.totalPaid,
          totalOutstanding: summaryData.totalOutstanding,
        });
        const transactionsData = transactionsRes as { rows: TransactionRow[]; page: number; pageSize: number; totalRows: number };
        if ("rows" in transactionsData) {
          setReportTransactions(transactionsData);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal memuat laporan keuangan.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filtersState]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadReport();
  }, [loadReport]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFilterChange = (key: string, value: string | number) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: value,
      page: key === "pageSize" ? 1 : prev.page || 1,
    }));
  };

  const resetFilters = () => {
    setFiltersState({
      startDate: "",
      endDate: "",
      academicYearId: "all",
      paymentCategoryId: "all",
      classId: "all",
      studentId: "",
      billStatus: "all",
      paymentMethodId: "all",
      paymentProofStatus: "all",
      page: 1,
      pageSize: 20,
    });
  };

  const hasActiveFilters = Boolean(
    filtersState.startDate ||
      filtersState.endDate ||
      filtersState.academicYearId !== "all" ||
      filtersState.paymentCategoryId !== "all" ||
      filtersState.classId !== "all" ||
      filtersState.studentId ||
      filtersState.billStatus !== "all" ||
      filtersState.paymentMethodId !== "all" ||
      filtersState.paymentProofStatus !== "all"
  );

  const activeFilterCount = [
    filtersState.startDate,
    filtersState.endDate,
    filtersState.academicYearId !== "all",
    filtersState.paymentCategoryId !== "all",
    filtersState.classId !== "all",
    filtersState.studentId,
    filtersState.billStatus !== "all",
    filtersState.paymentMethodId !== "all",
    filtersState.paymentProofStatus !== "all",
  ].filter(Boolean).length;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));

      const headers = ["Siswa", "NIS", "Kelas", "Kategori", "Periode", "Tagihan", "Dibayar", "Outstanding", "Status Tagihan", "Metode", "Tanggal Bayar", "Referensi", "Status Pembayaran", "Status Bukti", "Alasan Penolakan"];
      const rows = reportTransactions.rows.map((r) => [
        r.studentName || "-",
        r.studentNis || "-",
        r.className || "-",
        r.paymentCategoryName || "-",
        r.billingPeriodStart && r.billingPeriodEnd ? `${formatDate(r.billingPeriodStart)} - ${formatDate(r.billingPeriodEnd)}` : "-",
        formatCurrency(r.billAmount),
        formatCurrency(r.paidAmount),
        formatCurrency(r.outstanding),
        r.billStatus,
        r.paymentMethodName || "-",
        r.paymentDate ? formatDate(r.paymentDate) : "-",
        r.paymentReference || "-",
        r.paymentStatus || "-",
        r.proofStatus || "-",
        r.proofRejectionReason || "-",
      ]);

      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-keuangan-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.addToast("success", "Laporan berhasil diekspor.");
    } catch {
      toast.addToast("error", "Gagal mengekspor laporan.");
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      key: "student",
      header: "Siswa",
      render: (item: TransactionRow) => (
        <div>
          <p className="font-bold text-[#1A1A1A] text-xs sm:text-sm">{item.studentName || "-"}</p>
          <p className="text-[11px] font-semibold text-[#7A7A7A]">NIS: {item.studentNis || "-"}</p>
        </div>
      ),
    },
    { key: "class", header: "Kelas", render: (item: TransactionRow) => <span className="text-xs text-[#7A7A7A]">{item.className || "-"}</span>, mobileHide: true },
    { key: "category", header: "Kategori", render: (item: TransactionRow) => <span className="text-xs font-semibold text-[#4A4A4A]">{item.paymentCategoryName || "-"}</span>, mobileHide: true },
    {
      key: "amount",
      header: "Tagihan",
      className: "text-right",
      render: (item: TransactionRow) => <span className="font-bold text-xs text-[#1A1A1A]">{formatCurrency(item.billAmount)}</span>,
    },
    {
      key: "paid",
      header: "Dibayar",
      className: "text-right",
      render: (item: TransactionRow) => <span className="font-extrabold text-xs text-[#0C3B2E]">{formatCurrency(item.paidAmount)}</span>,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      className: "text-right",
      render: (item: TransactionRow) => <span className="font-extrabold text-xs text-[#A83A32]">{formatCurrency(item.outstanding)}</span>,
    },
    {
      key: "billStatus",
      header: "Status",
      render: (item: TransactionRow) => (
        <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${
          item.billStatus === "paid" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
          item.billStatus === "partial" ? "bg-[#2563EB]/10 text-[#2563EB]" :
          item.billStatus === "overdue" ? "bg-[#A83A32]/10 text-[#A83A32]" :
          "bg-[#7A7A7A]/10 text-[#7A7A7A]"
        }`}>
          {item.billStatus}
        </span>
      ),
    },
    { key: "method", header: "Metode", render: (item: TransactionRow) => <span className="text-xs text-[#7A7A7A]">{item.paymentMethodName || "-"}</span>, mobileHide: true },
    { key: "date", header: "Tanggal", render: (item: TransactionRow) => <span className="text-xs text-[#7A7A7A]">{item.paymentDate ? formatDate(item.paymentDate) : "-"}</span>, mobileHide: true },
  ];

  return (
    <div className="w-full space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
            Laporan Keuangan
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
            Rekonsiliasi tagihan, pembayaran, dan bukti transfer sekolah.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2.5 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Mengekspor...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
          <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{error}</p>
        </div>
      )}

      {/* METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-sm">
          <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Total Tagihan</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] mt-1">
            {formatCurrency(reportSummary.totalBillAmount)}
          </p>
          <p className="text-[11px] text-[#7A7A7A] mt-0.5">{reportSummary.totalBills} total tagihan</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-sm">
          <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Total Terbayar</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#0C3B2E] mt-1">
            {formatCurrency(reportSummary.totalPaid)}
          </p>
          <p className="text-[11px] text-[#7A7A7A] mt-0.5">Termasuk transaksi sukses</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-sm">
          <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Pembayaran Pending</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#C28E38] mt-1">
            {formatCurrency(reportSummary.pendingPaymentAmount)}
          </p>
          <p className="text-[11px] text-[#7A7A7A] mt-0.5">{reportSummary.pendingPaymentCount} transaksi pending</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-sm">
          <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Outstanding</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#A83A32] mt-1">
            {formatCurrency(reportSummary.totalOutstanding)}
          </p>
          <p className="text-[11px] text-[#7A7A7A] mt-0.5">Sisa tunggakan</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-sm">
          <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Tagihan Lunas</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] mt-1">
            {reportSummary.paidBillsCount}
          </p>
          <p className="text-[11px] text-[#7A7A7A] mt-0.5">
            {reportSummary.partialBillsCount} cicilan / {reportSummary.overdueBillsCount} overdue
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAE6DC] pb-3">
          <h3 className="text-xs font-bold text-[#555] uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[#0C3B2E]" />
            Filter Laporan Keuangan
          </h3>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-[#A83A32] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filter ({activeFilterCount})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label htmlFor="startDate" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Tanggal Mulai
            </label>
            <input
              id="startDate"
              type="date"
              value={filtersState.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Tanggal Akhir
            </label>
            <input
              id="endDate"
              type="date"
              value={filtersState.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            />
          </div>

          <div>
            <label htmlFor="academicYearId" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Tahun Ajaran
            </label>
            <select
              id="academicYearId"
              value={filtersState.academicYearId}
              onChange={(e) => handleFilterChange("academicYearId", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            >
              <option value="all">Semua Tahun Ajaran</option>
              {filterOptions.academicYears.map((year) => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="paymentCategoryId" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Kategori Pembayaran
            </label>
            <select
              id="paymentCategoryId"
              value={filtersState.paymentCategoryId}
              onChange={(e) => handleFilterChange("paymentCategoryId", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            >
              <option value="all">Semua Kategori</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="classId" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Kelas
            </label>
            <select
              id="classId"
              value={filtersState.classId}
              onChange={(e) => handleFilterChange("classId", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            >
              <option value="all">Semua Kelas</option>
              {filterOptions.classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="billStatus" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Status Tagihan
            </label>
            <select
              id="billStatus"
              value={filtersState.billStatus}
              onChange={(e) => handleFilterChange("billStatus", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="partial">Cicilan</option>
              <option value="paid">Lunas</option>
              <option value="overdue">Terlambat</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          <div>
            <label htmlFor="paymentMethodId" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Metode Pembayaran
            </label>
            <select
              id="paymentMethodId"
              value={filtersState.paymentMethodId}
              onChange={(e) => handleFilterChange("paymentMethodId", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            >
              <option value="all">Semua Metode</option>
              {filterOptions.paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="paymentProofStatus" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Status Bukti Pembayaran
            </label>
            <select
              id="paymentProofStatus"
              value={filtersState.paymentProofStatus}
              onChange={(e) => handleFilterChange("paymentProofStatus", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="studentSearch" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
            Cari Siswa (NIS / Nama)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A8A8A]" />
            <input
              id="studentSearch"
              type="text"
              value={filtersState.studentId}
              onChange={(e) => handleFilterChange("studentId", e.target.value)}
              placeholder="Ketik nama atau NIS siswa..."
              className="w-full pl-9 pr-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            />
          </div>
        </div>
      </div>

      {/* DATA TABLE CONTAINER */}
      <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        {isLoading ? (
          <TableSkeleton rows={5} columns={8} />
        ) : (
          <DataTable
            columns={columns}
            data={reportTransactions.rows}
            keyExtractor={(item) => item.billId}
            emptyTitle="Tidak Ada Data Transaksi"
            emptyDescription="Tidak ada catatan transaksi atau laporan yang cocok dengan filter yang dipilih."
          />
        )}

        {!isLoading && reportTransactions.rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#EAE6DC] text-xs text-[#7A7A7A]">
            <span>
              Menampilkan {reportTransactions.rows.length} dari {reportTransactions.totalRows} data transaksi
            </span>
          </div>
        )}
      </div>
    </div>
  );
}