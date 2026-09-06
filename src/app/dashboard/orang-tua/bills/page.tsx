"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, Wallet } from "lucide-react";
import { DataTable } from "@/components/operational/data-table";
import { getParentBillsAction } from "../actions";
import { X } from "lucide-react";

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
  payment_categories: { id: string; name: string; allow_installments: boolean; minimum_installment_amount: number | null } | null;
};

export default function ParentBillsPage() {
  const [bills, setBills] = useState<ParentBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadBills();
  }, [loadBills]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
        <>
          <p className="text-foreground">{bill.students?.full_name || "-"}</p>
          <p className="text-xs text-muted">{bill.students?.nis || "-"}</p>
        </>
      ),
    },
    {
      key: "payment_categories.name",
      header: "Kategori",
      render: (bill: ParentBill) => <span className="text-muted">{bill.payment_categories?.name || "-"}</span>,
      mobileHide: true,
    },
    {
      key: "periode",
      header: "Periode",
      render: (bill: ParentBill) => (
        <span className="text-muted">
          {bill.billing_period_start && bill.billing_period_end
            ? `${formatDate(bill.billing_period_start)} - ${formatDate(bill.billing_period_end)}`
            : "-"}
        </span>
      ),
      mobileHide: true,
    },
    {
      key: "amount",
      header: "Jumlah",
      render: (bill: ParentBill) => <span className="text-foreground">{formatCurrency(bill.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (bill: ParentBill) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          bill.status === "paid" ? "bg-success/10 text-success" :
          bill.status === "partial" ? "bg-primary/10 text-primary" :
          bill.status === "overdue" ? "bg-danger/10 text-danger" :
          "bg-muted/20 text-muted"
        }`}>
          {getStatusLabel(bill.status)}
        </span>
      ),
    },
    {
      key: "due_date",
      header: "Jatuh Tempo",
      render: (bill: ParentBill) => <span className="text-muted">{bill.due_date ? formatDate(bill.due_date) : "-"}</span>,
      mobileHide: true,
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "text-right",
      render: (bill: ParentBill) => (
        <Link
          href={`/dashboard/orang-tua/bills/${bill.id}`}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-all active:scale-[0.98] min-h-[44px]"
        >
          Detail
        </Link>
      ),
    },
  ];

  const hasPendingBills = bills.some((b) => b.status === "pending" || b.status === "overdue");
  const pendingBill = bills.find((b) => b.status === "pending" || b.status === "overdue");

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Tagihan Anak
        </h2>
        <p className="text-sm text-muted">
          Lihat dan kelola tagihan anak Anda
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
           className="sm:h-10 h-11 w-40 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="partial">Cicilan</option>
          <option value="paid">Lunas</option>
          <option value="overdue">Terlambat</option>
        </select>
        {statusFilter !== "all" && (
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-surface text-xs font-medium text-muted hover:text-foreground hover:bg-muted/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      <p className="text-xs text-muted">
        Menampilkan {bills.length} dari {(bills as ParentBill[]).length} data
      </p>

      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={bills}
          keyExtractor={(b) => b.id}
          isLoading={isLoading}
          emptyTitle="Belum ada tagihan."
          emptyDescription="Tagihan baru akan muncul di sini saat dibuat oleh sekolah."
          emptyIcon={<FileText className="h-6 w-6" />}
        />
      </div>

      {hasPendingBills && pendingBill && (
        <Link
          href={`/dashboard/orang-tua/bills/${pendingBill.id}`}
          className="fixed bottom-20 right-4 z-40 lg:hidden inline-flex items-center justify-center gap-2 h-12 min-h-[44px] min-w-[44px] px-5 rounded-full bg-gold text-white shadow-lg hover:bg-gold/90 transition-colors active:scale-[0.98] mb-[env(safe-area-inset-bottom)]"
        >
          <Wallet className="h-5 w-5" />
          <span className="text-sm font-semibold">Bayar</span>
        </Link>
      )}
    </div>
  );
}
