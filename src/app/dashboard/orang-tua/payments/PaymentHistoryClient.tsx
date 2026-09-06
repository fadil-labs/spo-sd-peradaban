"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Receipt, QrCode } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getParentPaymentHistoryAction, type ParentPaymentHistoryFilters, type ParentPaymentRow } from "./actions";

type PaymentHistoryClientProps = {
  payments: ParentPaymentRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  initialFilters: ParentPaymentHistoryFilters;
};

export default function PaymentHistoryClient({ payments: initialPayments, page: initialPage, pageSize: initialPageSize, totalRows: initialTotalRows, initialFilters }: PaymentHistoryClientProps) {
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
    if ("error" in result) {
      setError(result.error ?? null);
    } else {
      setPayments(result.payments);
      setTotalRows(result.totalRows);
    }
    setIsLoading(false);
  }, [filters, page, pageSize]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadPayments();
  }, [loadPayments]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (date: string) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Berhasil";
      case "pending": return "Menunggu";
      case "failed": return "Gagal";
      case "cancelled": return "Dibatalkan";
      case "refunded": return "Dikembalikan";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success";
      case "pending": return "bg-primary/10 text-primary";
      case "failed": return "bg-danger/10 text-danger";
      case "cancelled": return "bg-muted/20 text-muted";
      case "refunded": return "bg-warning/10 text-warning";
      default: return "bg-muted/20 text-muted";
    }
  };

  const totalPages = Math.ceil(totalRows / pageSize);

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Riwayat Pembayaran</h2>
        <p className="text-sm text-muted">Semua pembayaran anak Anda</p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <Card>
        <h3 className="text-base font-semibold text-foreground mb-4">Filter</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="historySearch" className="block text-xs text-muted mb-1">Cari Anak (NIS/Nama)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
               <input
                 id="historySearch"
                 type="text"
                 value={filters.searchQuery}
                 onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
                 placeholder="Cari..."
                 className="sm:h-10 h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
               />
            </div>
          </div>
          <div>
            <label htmlFor="historyStatus" className="block text-xs text-muted mb-1">Status Pembayaran</label>
            <select
              id="historyStatus"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
            <label htmlFor="historyStartDate" className="block text-xs text-muted mb-1">Tanggal Mulai</label>
            <input
              id="historyStartDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="historyEndDate" className="block text-xs text-muted mb-1">Tanggal Akhir</label>
            <input
              id="historyEndDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="Belum ada pembayaran."
            description="Pembayaran yang dilakukan akan muncul di sini."
          />
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2 px-6 py-3">
              <p className="text-xs text-muted">
                Menampilkan {payments.length} dari {totalRows} pembayaran
              </p>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      Filter aktif
                    </span>
                     <button
                       type="button"
                       onClick={resetFilters}
                       className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold text-muted hover:text-foreground hover:bg-muted/10 transition-colors min-h-[44px]"
                     >
                       <X className="h-3.5 w-3.5" />
                       Reset
                     </button>
                  </>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted">Anak</th>
                    <th className="text-left py-3 px-4 font-medium text-muted">Tagihan</th>
                    <th className="text-right py-3 px-4 font-medium text-muted">Jumlah</th>
                    <th className="text-left py-3 px-4 font-medium text-muted">Metode</th>
                    <th className="text-left py-3 px-4 font-medium text-muted">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-3 px-4">
                        <p className="text-foreground">{payment.students?.full_name || "-"}</p>
                        <p className="text-xs text-muted">{payment.students?.nis || "-"}</p>
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {payment.student_bills ? formatCurrency(payment.student_bills.amount) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">{formatCurrency(payment.amount)}</td>
                       <td className="py-3 px-4">
                         <div className="flex flex-col gap-1">
                           <span className="text-foreground">{payment.payment_methods?.name || "-"}</span>
                           {payment.payment_methods?.name === "QRIS" && (
                             <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary w-fit">
                               <QrCode className="h-3 w-3" />
                               QRIS
                             </span>
                           )}
                         </div>
                       </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {getStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">{formatDate(payment.payment_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted">
                Menampilkan {payments.length} dari {totalRows} pembayaran
              </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98] min-h-[44px]"
              >
                Sebelumnya
              </button>
              <span className="text-xs text-muted">
                Halaman {page} dari {totalPages || 1}
              </span>
              <button
                onClick={() => handlePageChange(Math.min(totalPages || 1, page + 1))}
                disabled={page >= (totalPages || 1)}
                className="h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98] min-h-[44px]"
              >
                Selanjutnya
              </button>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getStatusLabel(status: string) {
  switch (status) {
    case "completed": return "Berhasil";
    case "pending": return "Menunggu";
    case "failed": return "Gagal";
    case "cancelled": return "Dibatalkan";
    case "refunded": return "Dikembalikan";
    default: return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "bg-success/10 text-success";
    case "pending": return "bg-primary/10 text-primary";
    case "failed": return "bg-danger/10 text-danger";
    case "cancelled": return "bg-muted/20 text-muted";
    case "refunded": return "bg-warning/10 text-warning";
    default: return "bg-muted/20 text-muted";
  }
}
