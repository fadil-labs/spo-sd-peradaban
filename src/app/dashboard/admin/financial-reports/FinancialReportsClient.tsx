"use client";

import { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
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
          <p className="text-foreground">{item.studentName || "-"}</p>
          <p className="text-xs text-muted">{item.studentNis || "-"}</p>
        </div>
      ),
    },
    { key: "class", header: "Kelas", render: (item: TransactionRow) => item.className || "-", mobileHide: true },
    { key: "category", header: "Kategori", render: (item: TransactionRow) => item.paymentCategoryName || "-", mobileHide: true },
    {
      key: "amount",
      header: "Tagihan",
      className: "text-right",
      render: (item: TransactionRow) => <span className="text-foreground">{formatCurrency(item.billAmount)}</span>,
    },
    {
      key: "paid",
      header: "Dibayar",
      className: "text-right",
      render: (item: TransactionRow) => <span className="text-success">{formatCurrency(item.paidAmount)}</span>,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      className: "text-right",
      render: (item: TransactionRow) => <span className="text-primary">{formatCurrency(item.outstanding)}</span>,
    },
    {
      key: "billStatus",
      header: "Status",
      render: (item: TransactionRow) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          item.billStatus === "paid" ? "bg-success/10 text-success" :
          item.billStatus === "partial" ? "bg-primary/10 text-primary" :
          item.billStatus === "overdue" ? "bg-danger/10 text-danger" :
          item.billStatus === "cancelled" ? "bg-muted/20 text-muted" :
          "bg-muted/20 text-muted"
        }`}>
          {item.billStatus}
        </span>
      ),
    },
    { key: "method", header: "Metode", render: (item: TransactionRow) => item.paymentMethodName || "-", mobileHide: true },
    { key: "date", header: "Tanggal", render: (item: TransactionRow) => item.paymentDate ? formatDate(item.paymentDate) : "-", mobileHide: true },
  ];

  return (
    <div className="w-full max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Laporan Keuangan
          </h2>
          <p className="text-sm text-muted">
            Rekonsiliasi tagihan, pembayaran, dan bukti pembayaran
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isExporting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Mengekspor...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export CSV
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-muted mb-1">Total Tagihan</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(reportSummary.totalBillAmount)}</p>
          <p className="text-xs text-muted mt-1">{reportSummary.totalBills} tagihan</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">Total Terbayar</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(reportSummary.totalPaid)}</p>
          <p className="text-xs text-muted mt-1">Termasuk pending</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">Pembayaran Pending</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(reportSummary.pendingPaymentAmount)}</p>
          <p className="text-xs text-muted mt-1">{reportSummary.pendingPaymentCount} transaksi</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(reportSummary.totalOutstanding)}</p>
          <p className="text-xs text-muted mt-1">Sisa tagihan</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">Tagihan Lunas</p>
          <p className="text-2xl font-bold text-foreground">{reportSummary.paidBillsCount}</p>
          <p className="text-xs text-muted mt-1">{reportSummary.partialBillsCount} partial / {reportSummary.overdueBillsCount} overdue</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-foreground mb-4">Filter</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-xs text-muted mb-1">Tanggal Mulai</label>
            <input
              id="startDate"
              type="date"
              value={filtersState.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-xs text-muted mb-1">Tanggal Akhir</label>
            <input
              id="endDate"
              type="date"
              value={filtersState.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="academicYearId" className="block text-xs text-muted mb-1">Tahun Ajaran</label>
            <select
              id="academicYearId"
              value={filtersState.academicYearId}
              onChange={(e) => handleFilterChange("academicYearId", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Semua Tahun Ajaran</option>
              {filterOptions.academicYears.map((year) => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paymentCategoryId" className="block text-xs text-muted mb-1">Kategori Pembayaran</label>
            <select
              id="paymentCategoryId"
              value={filtersState.paymentCategoryId}
              onChange={(e) => handleFilterChange("paymentCategoryId", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Semua Kategori</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="classId" className="block text-xs text-muted mb-1">Kelas</label>
            <select
              id="classId"
              value={filtersState.classId}
              onChange={(e) => handleFilterChange("classId", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Semua Kelas</option>
              {filterOptions.classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="billStatus" className="block text-xs text-muted mb-1">Status Tagihan</label>
            <select
              id="billStatus"
              value={filtersState.billStatus}
              onChange={(e) => handleFilterChange("billStatus", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
            <label htmlFor="paymentMethodId" className="block text-xs text-muted mb-1">Metode Pembayaran</label>
            <select
              id="paymentMethodId"
              value={filtersState.paymentMethodId}
              onChange={(e) => handleFilterChange("paymentMethodId", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Semua Metode</option>
              {filterOptions.paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paymentProofStatus" className="block text-xs text-muted mb-1">Status Bukti Pembayaran</label>
            <select
              id="paymentProofStatus"
              value={filtersState.paymentProofStatus}
              onChange={(e) => handleFilterChange("paymentProofStatus", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="studentSearch" className="block text-xs text-muted mb-1">Cari Siswa (NIS/Nama)</label>
          <input
            id="studentSearch"
            type="text"
            value={filtersState.studentId}
            onChange={(e) => handleFilterChange("studentId", e.target.value)}
            placeholder="Cari..."
             className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={5} columns={8} />
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted">
              Menampilkan {reportTransactions.rows.length} dari {reportTransactions.totalRows} data
            </p>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {activeFilterCount} filter aktif
                  </span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold text-muted hover:text-foreground hover:bg-muted/10 transition-colors min-h-[44px]"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>
          <DataTable
            columns={columns}
            data={reportTransactions.rows}
            keyExtractor={(item) => item.billId}
            emptyTitle="Tidak ada transaksi"
            emptyDescription="Tidak ada transaksi untuk filter yang dipilih."
            emptyIcon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m-6 0h-.375c-.621 0-1.125-.504-1.125-1.125v-9.75c0-.621.504-1.125 1.125-1.125h.375m6 0h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m-6 0h-.375c-.621 0-1.125-.504-1.125-1.125v-9.75c0-.621.504-1.125 1.125-1.125h.375" />
              </svg>
            }
          />
        </>
      )}
    </div>
  );
}
