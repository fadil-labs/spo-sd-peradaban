"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { CreditCard, Search, QrCode } from "lucide-react";
import { DataTable } from "@/components/operational/data-table";
import { PaymentRow, PaymentMonitorFilters, getAdminPaymentsAction } from "./actions";
import { useToast } from "@/components/ui/toast";

type PaymentsClientProps = {
  payments: PaymentRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  initialFilters: PaymentMonitorFilters;
};

export default function PaymentsClient({ payments: initialPayments, page: initialPage, pageSize: initialPageSize, totalRows: initialTotalRows, initialFilters }: PaymentsClientProps) {
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);
  const [totalRows, setTotalRows] = useState(initialTotalRows);
  const toast = useToast();

  const [filters, setFilters] = useState<PaymentMonitorFilters>({
    status: initialFilters.status || "all",
    paymentMethodId: initialFilters.paymentMethodId || "all",
    startDate: initialFilters.startDate || "",
    endDate: initialFilters.endDate || "",
    searchQuery: initialFilters.searchQuery || "",
  });

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getAdminPaymentsAction({ ...filters, page, pageSize });
    if ("error" in result) {
      setError(result.error ?? null);
      toast.addToast("error", result.error ?? "Gagal memuat data pembayaran.");
    } else {
      setPayments(result.payments);
      setTotalRows(result.totalRows);
    }
    setIsLoading(false);
  }, [filters, page, pageSize, toast]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadPayments();
  }, [loadPayments]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

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

  const columns = [
    {
      key: "siswa",
      header: "Siswa",
      render: (payment: PaymentRow) => (
        <>
          <p className="text-foreground">{payment.students?.full_name || "-"}</p>
          <p className="text-xs text-muted">{payment.students?.nis || "-"}</p>
        </>
      ),
    },
    {
      key: "tagihan",
      header: "Tagihan",
      render: (payment: PaymentRow) => (
        <>
          {payment.student_bills ? formatCurrency(payment.student_bills.amount) : "-"}
          <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${payment.student_bills?.status === "paid" ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
            {payment.student_bills?.status || "-"}
          </span>
        </>
      ),
    },
    {
      key: "amount",
      header: "Jumlah",
      className: "text-right",
      render: (payment: PaymentRow) => <span className="text-foreground">{formatCurrency(payment.amount)}</span>,
    },
    {
      key: "payment_methods.name",
      header: "Metode",
      render: (payment: PaymentRow) => {
        const isQRIS = payment.payment_methods?.name === "QRIS";
        return (
          <div className="flex flex-col gap-1">
            <span className="text-foreground">{payment.payment_methods?.name || "-"}</span>
            {isQRIS && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary w-fit">
                <QrCode className="h-3 w-3" />
                QRIS
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (payment: PaymentRow) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(payment.status)}`}>
          {getStatusLabel(payment.status)}
        </span>
      ),
    },
    {
      key: "bukti",
      header: "Bukti",
      render: (payment: PaymentRow) => {
        if (payment.payment_proofs) {
          const proofColor = payment.payment_proofs.status === "approved" ? "bg-success/10 text-success" : payment.payment_proofs.status === "rejected" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary";
          return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${proofColor}`}>{payment.payment_proofs.status}</span>;
        }
        return <span className="text-xs text-muted">-</span>;
      },
    },
    {
      key: "payment_date",
      header: "Tanggal",
      render: (payment: PaymentRow) => <span className="text-muted">{formatDate(payment.payment_date)}</span>,
    },
  ];

  const totalPages = Math.ceil(totalRows / pageSize);

  return (
    <div className="w-full max-w-7xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Monitoring Pembayaran</h2>
        <p className="text-sm text-muted">Pantau semua transaksi pembayaran</p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <Card>
        <h3 className="text-base font-semibold text-foreground mb-4">Filter</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="paymentSearch" className="block text-xs text-muted mb-1">Cari Siswa (NIS/Nama)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                id="paymentSearch"
                type="text"
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
                placeholder="Contoh: NIS123 atau nama siswa"
                className="sm:h-10 h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label htmlFor="paymentStatus" className="block text-xs text-muted mb-1">Status Pembayaran</label>
            <select
              id="paymentStatus"
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
            <label htmlFor="paymentStartDate" className="block text-xs text-muted mb-1">Tanggal Mulai</label>
            <input
              id="paymentStartDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="paymentEndDate" className="block text-xs text-muted mb-1">Tanggal Akhir</label>
            <input
              id="paymentEndDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={payments}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          emptyTitle="Tidak ada pembayaran"
          emptyDescription="Belum ada transaksi pembayaran yang tercatat."
          emptyIcon={<CreditCard className="h-6 w-6" />}
        />
        {!isLoading && payments.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
