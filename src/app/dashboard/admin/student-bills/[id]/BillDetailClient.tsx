"use client";

import { useState, useEffect } from "react";
import { Loader2, Receipt } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { processPaymentAction } from "../actions";

type Bill = {
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

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  reference_number: string | null;
  status: string;
  payment_methods: { id: string; name: string; method_type: string | null } | null;
};

type Props = {
  bill: Bill;
  payments: Payment[];
  paymentMethods: { id: string; name: string; method_type: string | null }[];
  schoolPaymentMethods: { id: string; payment_method_id: string; is_active: boolean; payment_methods: { id: string; name: string; method_type: string | null } | null }[];
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  partial: "Cicilan",
  paid: "Lunas",
  overdue: "Terlambat",
  cancelled: "Dibatalkan",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted/20 text-muted",
  partial: "bg-primary/10 text-primary",
  paid: "bg-success/10 text-success",
  overdue: "bg-danger/10 text-danger",
  cancelled: "bg-danger/10 text-danger",
};

export default function BillDetailClient({ bill, payments, paymentMethods, schoolPaymentMethods }: Props) {
  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [schoolPaymentMethodId, setSchoolPaymentMethodId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethodId) {
      setPaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethods, paymentMethodId]);

  useEffect(() => {
    if (paymentMethodId && schoolPaymentMethods.length > 0 && !schoolPaymentMethodId) {
      const defaultMethod = schoolPaymentMethods.find(spm => spm.payment_method_id === paymentMethodId && spm.is_active);
      if (defaultMethod) {
        setSchoolPaymentMethodId(defaultMethod.id);
      }
    }
  }, [paymentMethodId, schoolPaymentMethods, schoolPaymentMethodId]);

  const totalPaid = payments
    .filter((p) => p.status === "completed" || p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const remaining = Math.max(0, bill.amount - totalPaid);
  const canPay = bill.status !== "paid" && bill.status !== "cancelled" && remaining > 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = await processPaymentAction(
      bill.id,
      Number(amount),
      paymentMethodId,
      schoolPaymentMethodId,
      referenceNumber,
      idempotencyKey
    );

    if (result?.error) {
      setError(result.error);
      toast.addToast("error", result.error);
      setIsSubmitting(false);
    } else {
      setSuccess(true);
      toast.addToast("success", "Pembayaran berhasil diproses.");
      setAmount("");
      setReferenceNumber("");
      setIdempotencyKey(`pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (date: string) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="w-full max-w-3xl space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Detail Tagihan</h2>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[bill.status] || "bg-muted/20 text-muted"}`}>
            {STATUS_LABELS[bill.status] || bill.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted mb-1">Siswa</p>
            <p className="text-sm font-medium text-foreground">{bill.students?.full_name || "-"}</p>
            <p className="text-xs text-muted">{bill.students?.nis || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Kategori</p>
            <p className="text-sm font-medium text-foreground">{bill.payment_categories?.name || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Jumlah Tagihan</p>
            <p className="text-sm font-medium text-foreground">{formatCurrency(bill.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Jatuh Tempo</p>
            <p className="text-sm font-medium text-foreground">{bill.due_date ? formatDate(bill.due_date) : "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Total Terbayar</p>
            <p className="text-sm font-medium text-foreground">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Sisa</p>
            <p className="text-sm font-medium text-foreground">{formatCurrency(remaining)}</p>
          </div>
        </div>
      </Card>

      {canPay && (
        <Card>
          <h3 className="text-base font-semibold text-foreground mb-4">
            Tambah Pembayaran
          </h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-xs text-muted mb-1.5">
                  Jumlah Pembayaran
                </label>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="100000"
                  required
                  min="1"
                  max={remaining}
                  step="1000"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-muted">Sisa: {formatCurrency(remaining)}</p>
              </div>

              <div>
                <label htmlFor="reference_number" className="block text-xs text-muted mb-1.5">
                  Nomor Referensi
                </label>
                <input
                  id="reference_number"
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="INV-001"
                  disabled={isSubmitting}
                />
              </div>
            </div>

              <div>
                <label htmlFor="payment_method_id" className="block text-xs text-muted mb-1.5">
                  Metode Pembayaran
                </label>
                <select
                  id="payment_method_id"
                  value={paymentMethodId}
                  onChange={(e) => {
                    setPaymentMethodId(e.target.value);
                    setSchoolPaymentMethodId("");
                  }}
                  className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Pilih metode</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>

              {paymentMethodId && (
                <div>
                  <label htmlFor="school_payment_method_id" className="block text-xs text-muted mb-1.5">
                    Konfigurasi Sekolah
                  </label>
                  <select
                    id="school_payment_method_id"
                    value={schoolPaymentMethodId}
                    onChange={(e) => setSchoolPaymentMethodId(e.target.value)}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Pilih konfigurasi</option>
                    {schoolPaymentMethods
                      .filter(spm => spm.payment_method_id === paymentMethodId)
                      .map((spm) => (
                        <option key={spm.id} value={spm.id}>
                          {spm.payment_methods?.name || "Konfigurasi"} {spm.is_active ? "" : "(Nonaktif)"}
                        </option>
                      ))}
                  </select>
                </div>
              )}

            {error && (
              <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3">
                <p className="text-sm text-success">Pembayaran berhasil diproses.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !paymentMethodId || !schoolPaymentMethodId}
               className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Menyimpan..." : "Proses Pembayaran"}
            </button>
          </form>
        </Card>
      )}

      <Card>
        <h3 className="text-base font-semibold text-foreground mb-4">
          Riwayat Pembayaran
        </h3>
        {payments.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="Belum ada pembayaran."
            description="Pembayaran yang dilakukan untuk tagihan ini akan muncul di sini."
          />
        ) : (
          <div className="divide-y divide-border">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/dashboard/admin/payments/${payment.id}/receipt`} className="text-sm font-medium text-foreground hover:underline">
                    {formatCurrency(payment.amount)}
                  </Link>
                  <p className="text-xs text-muted">
                    {payment.payment_methods?.name || "-"} • {formatDate(payment.payment_date)}
                  </p>
                  {payment.reference_number && (
                    <p className="text-xs text-muted">Ref: {payment.reference_number}</p>
                  )}
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  payment.status === "completed" ? "bg-success/10 text-success" :
                  payment.status === "pending" ? "bg-primary/10 text-primary" :
                  "bg-danger/10 text-danger"
                }`}>
                  {payment.status === "completed" ? "Berhasil" : payment.status === "pending" ? "Menunggu" : "Gagal"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
