"use client";

import { useState, useEffect, useCallback } from "react";
import { getFinancialAuditLogsAction, type FinancialAuditFilters, type FinancialAuditLogEntry } from "@/lib/financial-audit/actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { DataTable } from "@/components/operational/data-table";
import { Filter, RotateCcw, ScrollText } from "lucide-react";

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
        <span className="text-xs text-[#7A7A7A] whitespace-nowrap">{formatDate(item.created_at)}</span>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      render: (item: FinancialAuditLogEntry) => (
        <span className="font-bold text-xs text-[#1A1A1A]">{getActionLabel(item.action_type)}</span>
      ),
    },
    {
      key: "entity",
      header: "Entitas",
      render: (item: FinancialAuditLogEntry) => (
        <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#F5F3EC] border border-[#E5E0D8] text-[#4A4A4A]">
          {getEntityLabel(item.entity_type)}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Aktor",
      render: (item: FinancialAuditLogEntry) => (
        <span className="text-xs font-semibold text-[#7A7A7A] uppercase">{item.actor_role || "-"}</span>
      ),
      mobileHide: true,
    },
    {
      key: "amount",
      header: "Jumlah",
      className: "text-right",
      render: (item: FinancialAuditLogEntry) => (
        <span className="font-bold text-xs text-[#0C3B2E]">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status Perubahan",
      render: (item: FinancialAuditLogEntry) => (
        <span className="text-xs text-[#555] font-medium">
          {item.old_status && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{item.old_status}</span>}
          {item.old_status && item.new_status && <span className="mx-1 text-[#0C3B2E] font-bold">→</span>}
          {item.new_status && <span className="px-1.5 py-0.5 bg-[#0C3B2E]/10 text-[#0C3B2E] rounded font-bold">{item.new_status}</span>}
          {!item.old_status && !item.new_status && "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
          Log Keuangan & Audit
        </h1>
        <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
          Audit trail riwayat aktivitas transaksi keuangan dan perubahan konfigurasi sistem.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
          <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{error}</p>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAE6DC] pb-3">
          <h3 className="text-xs font-bold text-[#555] uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[#0C3B2E]" />
            Filter Audit Log
          </h3>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-[#A83A32] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label htmlFor="actionType" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Jenis Aksi
            </label>
            <select
              id="actionType"
              value={filters.actionType}
              onChange={(e) => handleFilterChange("actionType", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            >
              {ACTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="entityType" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Jenis Entitas
            </label>
            <select
              id="entityType"
              value={filters.entityType}
              onChange={(e) => handleFilterChange("entityType", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="startDate" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
              Tanggal Mulai
            </label>
            <input
              id="startDate"
              type="date"
              value={filters.startDate}
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
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
            />
          </div>
        </div>
      </div>

      {/* DATA TABLE CONTAINER */}
      <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={logs}
            keyExtractor={(item) => item.id}
            emptyTitle="Tidak Ada Log Keuangan"
            emptyDescription="Log keuangan akan muncul ketika ada transaksi atau perubahan konfigurasi."
            emptyIcon={<ScrollText className="h-6 w-6 text-[#7A7A7A]" />}
          />
        )}

        {!isLoading && logs.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-[#EAE6DC] text-xs text-[#7A7A7A]">
            <span>Menampilkan {logs.length} data audit log</span>
          </div>
        )}
      </div>
    </div>
  );
}