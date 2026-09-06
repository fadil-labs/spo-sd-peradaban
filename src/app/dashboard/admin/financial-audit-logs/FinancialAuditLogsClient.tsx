"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { getFinancialAuditLogsAction, type FinancialAuditFilters, type FinancialAuditLogEntry } from "@/lib/financial-audit/actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { DataTable } from "@/components/operational/data-table";
import { X } from "lucide-react";
type FinancialAuditLogsClientProps = {
  initialLogs: FinancialAuditLogEntry[];
  initialPage: number;
  initialPageSize: number;
  initialFilters: FinancialAuditFilters;
};

const ACTION_TYPE_OPTIONS = [
  { value: "all", label: "Semua Aksi" },
  { value: "payment_created", label: "Pembayaran Dibuat" },
  { value: "payment_completed", label: "Pembayaran Selesai" },
  { value: "payment_failed", label: "Pembayaran Gagal" },
  { value: "payment_cancelled", label: "Pembayaran Dibatalkan" },
  { value: "payment_refunded", label: "Pembayaran Dikembalikan" },
  { value: "payment_proof_submitted", label: "Bukti Dikirim" },
  { value: "payment_proof_approved", label: "Bukti Disetujui" },
  { value: "payment_proof_rejected", label: "Bukti Ditolak" },
  { value: "gateway_transaction_created", label: "Gateway Dibuat" },
  { value: "gateway_transaction_succeeded", label: "Gateway Berhasil" },
  { value: "gateway_transaction_failed", label: "Gateway Gagal" },
  { value: "bill_created", label: "Tagihan Dibuat" },
  { value: "bill_status_changed", label: "Status Tagihan Berubah" },
  { value: "payment_method_toggled", label: "Metode Pembayaran Diubah" },
  { value: "financial_config_changed", label: "Konfigurasi Keuangan Diubah" },
  { value: "other", label: "Lainnya" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "Semua Entitas" },
  { value: "payment", label: "Pembayaran" },
  { value: "student_bill", label: "Tagihan Siswa" },
  { value: "payment_proof", label: "Bukti Pembayaran" },
  { value: "payment_gateway_transaction", label: "Transaksi Gateway" },
  { value: "school_payment_method", label: "Metode Pembayaran Sekolah" },
  { value: "payment_category", label: "Kategori Pembayaran" },
  { value: "financial_report", label: "Laporan Keuangan" },
  { value: "other", label: "Lainnya" },
];

export default function FinancialAuditLogsClient({ initialLogs, initialPage, initialPageSize, initialFilters }: FinancialAuditLogsClientProps) {
  const [logs, setLogs] = useState<FinancialAuditLogEntry[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);

  const [filters, setFilters] = useState<FinancialAuditFilters>({
    actionType: initialFilters.actionType || "all",
    entityType: initialFilters.entityType || "all",
    startDate: initialFilters.startDate || "",
    endDate: initialFilters.endDate || "",
    searchQuery: initialFilters.searchQuery || "",
    pageSize: initialPageSize,
  });

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getFinancialAuditLogsAction({ ...filters, page });
    if ("error" in result) {
      setError(result.error ?? null);
    } else {
      setLogs(result.logs);
    }
    setIsLoading(false);
  }, [filters, page]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      actionType: "all",
      entityType: "all",
      startDate: "",
      endDate: "",
      searchQuery: "",
      pageSize: initialPageSize,
    });
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    filters.actionType !== "all" ||
      filters.entityType !== "all" ||
      filters.startDate ||
      filters.endDate ||
      filters.searchQuery
  );

  const formatCurrency = (value: number | null) =>
    value !== null ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value) : "-";

  const formatDate = (date: string) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getActionLabel = (actionType: string) => {
    const option = ACTION_TYPE_OPTIONS.find((opt) => opt.value === actionType);
    return option ? option.label : actionType;
  };

  const getEntityLabel = (entityType: string) => {
    const option = ENTITY_TYPE_OPTIONS.find((opt) => opt.value === entityType);
    return option ? option.label : entityType;
  };

  const columns = [
    {
      key: "created_at",
      header: "Waktu",
      sortable: true,
      render: (item: FinancialAuditLogEntry) => (
        <span className="text-muted whitespace-nowrap">{formatDate(item.created_at)}</span>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      render: (item: FinancialAuditLogEntry) => getActionLabel(item.action_type),
    },
    {
      key: "entity",
      header: "Entitas",
      render: (item: FinancialAuditLogEntry) => getEntityLabel(item.entity_type),
    },
    { key: "actor", header: "Aktor", render: (item: FinancialAuditLogEntry) => item.actor_role || "-", mobileHide: true },
    {
      key: "amount",
      header: "Jumlah",
      className: "text-right",
      render: (item: FinancialAuditLogEntry) => formatCurrency(item.amount),
    },
    {
      key: "status",
      header: "Status",
      render: (item: FinancialAuditLogEntry) => (
        <span className="text-muted">
          {item.old_status && <span>{item.old_status}</span>}
          {item.old_status && item.new_status && <span className="mx-1">→</span>}
          {item.new_status && <span>{item.new_status}</span>}
          {!item.old_status && !item.new_status && "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full max-w-7xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Log Keuangan</h2>
        <p className="text-sm text-muted">Audit trail transaksi keuangan</p>
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
            <label htmlFor="actionType" className="block text-xs text-muted mb-1">Jenis Aksi</label>
            <select
              id="actionType"
              value={filters.actionType}
              onChange={(e) => handleFilterChange("actionType", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {ACTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="entityType" className="block text-xs text-muted mb-1">Jenis Entitas</label>
            <select
              id="entityType"
              value={filters.entityType}
              onChange={(e) => handleFilterChange("entityType", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="block text-xs text-muted mb-1">Tanggal Mulai</label>
            <input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-xs text-muted mb-1">Tanggal Akhir</label>
            <input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted">
              Menampilkan {logs.length} dari {logs.length} data
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
          <DataTable
            columns={columns}
            data={logs}
            keyExtractor={(item) => item.id}
            emptyTitle="Tidak ada log keuangan"
            emptyDescription="Log keuangan akan muncul ketika ada transaksi atau perubahan konfigurasi."
            emptyIcon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
          />
        </>
      )}
    </div>
  );
}
