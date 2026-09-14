"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { PaymentRow, PaymentMonitorFilters, getAdminPaymentsAction } from "./actions";
import {
  CreditCard,
  Search,
  QrCode,
  Receipt,
  RotateCcw,
  Calendar,
  Filter,
} from "lucide-react";

type PaymentsClientProps = {
  payments: PaymentRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  initialFilters: PaymentMonitorFilters;
};

export default function PaymentsClient({
  payments: initialPayments,
  page: initialPage,
  pageSize: initialPageSize,
  totalRows: initialTotalRows,
  initialFilters,
}: PaymentsClientProps) {
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

  const resetFilters = () => {
    setFilters({
      status: "all",
      paymentMethodId: "all",
      startDate: "",
      endDate: "",
      searchQuery: "",
    });
    setPage(1);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusConf = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "Berhasil", bg: "bg-[#0C3B2E]/10", text: "text-[#0C3B2E]" };
      case "pending":
        return { label: "Menunggu", bg: "bg-[#C28E38]/10", text: "text-[#C28E38]" };
      case "failed":
        return { label: "Gagal", bg: "bg-[#A83A32]/10", text: "text-[#A83A32]" };
      case "cancelled":
        return { label: "Dibatalkan", bg: "bg-[#7A7A7A]/10", text: "text-[#7A7A7A]" };
      case "refunded":
        return { label: "Dikembalikan", bg: "bg-[#2563EB]/10", text: "text-[#2563EB]" };
      default:
        return { label: status, bg: "bg-gray-100", text: "text-gray-700" };
    }
  };

  const columns = [
    {
      key: "siswa",
      header: "Siswa",
      render: (payment: PaymentRow) => (
        <div>
          <p className="font-bold text-[#1A1A1A] text-xs sm:text-sm">
            {payment.students?.full_name || "-"}
          </p>
          <p className="text-[11px] font-semibold text-[#7A7A7A]">
            NIS: {payment.students?.nis || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Nominal Bayar",
      render: (payment: PaymentRow) => (
        <span className="font-extrabold text-xs sm:text-sm text-[#0C3B2E]">
          {formatCurrency(payment.amount)}
        </span>
      ),
    },
    {
      key: "payment_methods.name",
      header: "Metode",
      render: (payment: PaymentRow) => {
        const isQRIS = payment.payment_methods?.name?.toUpperCase() === "QRIS";
        return (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-xs text-[#1A1A1A]">
              {payment.payment_methods?.name || "-"}
            </span>
            {isQRIS && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C28E38]/10 text-[#C28E38] w-fit">
                <QrCode className="h-3 w-3" />
                QRIS
              </span>
            )}
          </div>
        );
      },
      mobileHide: true,
    },
    {
      key: "status",
      header: "Status",
      render: (payment: PaymentRow) => {
        const conf = getStatusConf(payment.status);
        return (
          <span
            className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${conf.bg} ${conf.text}`}
          >
            {conf.label}
          </span>
        );
      },
    },
    {
      key: "payment_date",
      header: "Waktu Transaksi",
      render: (payment: PaymentRow) => (
        <span className="text-xs text-[#7A7A7A]">{formatDate(payment.payment_date)}</span>
      ),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (payment: PaymentRow) => (
        <a
          href={`/dashboard/admin/payments/receipt/${payment.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-semibold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1.5"
        >
          <Receipt className="h-3.5 w-3.5 text-[#0C3B2E]" />
          Kwitansi
        </a>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
      <div className="flex flex-col gap-5 sm:gap-6 max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
            Monitoring & Riwayat Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
            Pantau seluruh realisasi transaksi masuk, status verifikasi, dan pencetakan kwitansi.
          </p>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{error}</p>
          </div>
        )}

        {/* FILTER BAR */}
        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#555] uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#0C3B2E]" />
              Filter Transaksi
            </h3>
            {(filters.searchQuery ||
              filters.status !== "all" ||
              filters.startDate ||
              filters.endDate) && (
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
            {/* SEARCH */}
            <div>
              <label htmlFor="paymentSearch" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
                Cari Nama / NIS Siswa
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A8A8A]" />
                <input
                  id="paymentSearch"
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
                  placeholder="Ketik NIS atau nama..."
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                />
              </div>
            </div>

            {/* STATUS */}
            <div>
              <label htmlFor="paymentStatus" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
                Status Pembayaran
              </label>
              <select
                id="paymentStatus"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
              >
                <option value="all">Semua Status</option>
                <option value="completed">Berhasil</option>
                <option value="pending">Menunggu</option>
                <option value="failed">Gagal</option>
                <option value="cancelled">Dibatalkan</option>
                <option value="refunded">Dikembalikan</option>
              </select>
            </div>

            {/* TANGGAL MULAI */}
            <div>
              <label htmlFor="paymentStartDate" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
                Tanggal Mulai
              </label>
              <input
                id="paymentStartDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
              />
            </div>

            {/* TANGGAL AKHIR */}
            <div>
              <label htmlFor="paymentEndDate" className="block text-[11px] font-bold text-[#7A7A7A] mb-1">
                Tanggal Akhir
              </label>
              <input
                id="paymentEndDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
              />
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : (
            <DataTable
              columns={columns}
              data={payments}
              keyExtractor={(p) => p.id}
              emptyTitle="Belum Ada Transaksi Pembayaran"
              emptyDescription="Tidak ada catatan pembayaran yang cocok dengan kriteria filter."
            />
          )}

          {!isLoading && totalRows > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#EAE6DC] text-xs text-[#7A7A7A]">
              <span>
                Menampilkan {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, totalRows)} dari {totalRows} pembayaran
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1A1A] disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="font-bold text-[#1A1A1A]">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1A1A] disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}