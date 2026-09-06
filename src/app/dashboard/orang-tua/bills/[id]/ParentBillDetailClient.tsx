"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, CreditCard, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { DataTable } from "@/components/operational/data-table";
import { useToast } from "@/components/ui/toast";
import { uploadPaymentProofAction } from "../../actions";

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

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  reference_number: string;
  status: string;
  payment_methods: { id: string; name: string; method_type: string } | null;
  payment_proofs: { id: string; status: string; rejection_reason: string | null; created_at: string } | null;
};

type ParentBillDetailClientProps = {
  bill: ParentBill;
  payments: Payment[];
  processPaymentAction: (studentBillId: string, amount: number, paymentMethodId: string, schoolPaymentMethodId: string, referenceNumber: string, idempotencyKey: string) => Promise<{ success?: boolean; error?: string }>;
};

function generateIdempotencyKey() {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function ParentBillDetailClient({ bill: initialBill, payments: initialPayments, processPaymentAction }: ParentBillDetailClientProps) {
  const router = useRouter();
  const [bill] = useState<ParentBill>(initialBill);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const initialPaymentsRef = useRef(initialPayments);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [selectedSchoolPaymentMethodId, setSelectedSchoolPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; school_payment_method_id: string; name: string; is_active: boolean }[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const idempotencyRef = useRef<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (initialPaymentsRef.current !== initialPayments) {
      initialPaymentsRef.current = initialPayments;
      setPayments(initialPayments);
    }
  }, [initialPayments]);

  useEffect(() => {
    async function loadPaymentMethods() {
      setIsLoadingMethods(true);
      try {
        const res = await fetch("/api/payment-methods?scope=school");
        if (!res.ok) {
          throw new Error("Gagal memuat metode pembayaran.");
        }
        const data = await res.json();
        const methods = (data.methods || []).filter((m: unknown) => {
          const method = m as Record<string, unknown>;
          return method.is_active === true;
        });
        setPaymentMethods(methods as { id: string; school_payment_method_id: string; name: string; is_active: boolean }[]);
        if (methods.length > 0) {
          const firstMethod = methods[0] as { id: string; school_payment_method_id: string; name: string; is_active: boolean };
          setSelectedPaymentMethodId(firstMethod.id);
          setSelectedSchoolPaymentMethodId(firstMethod.school_payment_method_id || firstMethod.id);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Gagal memuat metode pembayaran.";
        setError(errorMessage);
      } finally {
        setIsLoadingMethods(false);
      }
    }
    loadPaymentMethods();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (date: string) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

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

  const columns = [
    {
      key: "payment_date",
      header: "Tanggal",
      render: (payment: Payment) => <span className="text-muted">{formatDate(payment.payment_date)}</span>,
    },
    {
      key: "payment_methods.name",
      header: "Metode",
      render: (payment: Payment) => <span className="text-foreground">{payment.payment_methods?.name || "-"}</span>,
    },
    {
      key: "reference_number",
      header: "Referensi",
      render: (payment: Payment) => <span className="text-muted">{payment.reference_number || "-"}</span>,
    },
    {
      key: "amount",
      header: "Jumlah",
      render: (payment: Payment) => (
        <Link href={`/dashboard/orang-tua/payments/receipt/${payment.id}`} className="text-foreground hover:underline">
          {formatCurrency(payment.amount)}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (payment: Payment) => (
        <>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            payment.status === "success" || payment.status === "completed" ? "bg-success/10 text-success" :
            payment.status === "failed" ? "bg-danger/10 text-danger" :
            "bg-muted/20 text-muted"
          }`}>
            {payment.status === "success" || payment.status === "completed" ? "Berhasil" : payment.status === "failed" ? "Gagal" : payment.status}
          </span>
          {payment.payment_proofs && (
            <div className="mt-1">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                payment.payment_proofs.status === "pending" ? "bg-primary/10 text-primary" :
                payment.payment_proofs.status === "approved" ? "bg-success/10 text-success" :
                payment.payment_proofs.status === "rejected" ? "bg-danger/10 text-danger" :
                "bg-muted/20 text-muted"
              }`}>
                Bukti: {payment.payment_proofs.status === "pending" ? "Menunggu" : payment.payment_proofs.status === "approved" ? "Disetujui" : "Ditolak"}
              </span>
              {payment.payment_proofs.status === "rejected" && payment.payment_proofs.rejection_reason && (
                <p className="text-xs text-danger mt-1">{payment.payment_proofs.rejection_reason}</p>
              )}
            </div>
          )}
        </>
      ),
    },
  ];

  const handlePayment = useCallback(async () => {
    setError(null);
    setSuccess(null);

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setError("Masukkan jumlah pembayaran yang valid.");
      return;
    }

    if (!selectedPaymentMethodId || !selectedSchoolPaymentMethodId) {
      setError("Pilih metode pembayaran.");
      return;
    }

    if (!referenceNumber.trim()) {
      setError("Masukkan nomor referensi pembayaran.");
      return;
    }

    if (bill.status === "paid" || bill.status === "cancelled") {
      setError("Tagihan ini tidak dapat menerima pembayaran.");
      return;
    }

    const remaining = bill.amount - (payments || []).reduce((sum, p) => sum + (p.status === "success" || p.status === "completed" ? p.amount : 0), 0);
    if (amount > remaining) {
      setError(`Jumlah pembayaran melebihi sisa tagihan (${formatCurrency(remaining)}).`);
      return;
    }

    const idempotencyKey = idempotencyRef.current || generateIdempotencyKey();
    idempotencyRef.current = idempotencyKey;

    setIsProcessing(true);
    const result = await processPaymentAction(bill.id, amount, selectedPaymentMethodId, selectedSchoolPaymentMethodId, referenceNumber.trim(), idempotencyKey);
    setIsProcessing(false);

    if (result.error) {
      setError(result.error);
      toast.addToast("error", result.error);
      if (result.error.includes("sudah diproses")) {
        idempotencyRef.current = null;
      }
    } else {
      setSuccess("Pembayaran berhasil diproses.");
      toast.addToast("success", "Pembayaran berhasil diproses.");
      setPaymentAmount("");
      setReferenceNumber("");
      idempotencyRef.current = null;
      window.dispatchEvent(new Event("notification:refresh"));
      router.refresh();
    }
  }, [bill, payments, paymentAmount, referenceNumber, selectedPaymentMethodId, selectedSchoolPaymentMethodId, processPaymentAction, toast, router]);

  const paidAmount = (payments || []).reduce((sum, p) => sum + (p.status === "success" || p.status === "completed" ? p.amount : 0), 0);
  const remaining = bill.amount - paidAmount;
  const showPaymentForm = (bill.status === "pending" || bill.status === "partial") && remaining > 0;

  const handleProofUpload = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!selectedPaymentId) {
      setError("Pilih pembayaran yang akan diunggah buktinya.");
      return;
    }

    if (!proofFile) {
      setError("Pilih file bukti pembayaran.");
      return;
    }

    setIsUploading(true);
    const result = await uploadPaymentProofAction(selectedPaymentId, proofFile);
    setIsUploading(false);

    if (result.error) {
      setError(result.error);
      toast.addToast("error", result.error);
    } else {
      setSuccess("Bukti pembayaran berhasil diunggah dan menunggu verifikasi.");
      toast.addToast("success", "Bukti pembayaran berhasil diunggah.");
      setProofFile(null);
      setSelectedPaymentId("");
      window.dispatchEvent(new Event("notification:refresh"));
      router.refresh();
    }
  }, [selectedPaymentId, proofFile, toast, router]);

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Detail Tagihan</h2>
          <p className="text-sm text-muted mt-1">
            {bill.students?.full_name} ({bill.students?.nis || "-"})
          </p>
        </div>
        <Link
          href="/dashboard/orang-tua/bills"
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors active:scale-[0.98]"
        >
          Kembali
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3">
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted mb-1">Kategori</p>
            <p className="text-sm font-medium text-foreground">{bill.payment_categories?.name || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Status</p>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              bill.status === "paid" ? "bg-success/10 text-success" :
              bill.status === "partial" ? "bg-primary/10 text-primary" :
              bill.status === "overdue" ? "bg-danger/10 text-danger" :
              "bg-muted/20 text-muted"
            }`}>
              {getStatusLabel(bill.status)}
            </span>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Total Tagihan</p>
            <p className="text-sm font-medium text-foreground">{formatCurrency(bill.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Sisa Tagihan</p>
            <p className="text-sm font-medium text-foreground">{formatCurrency(remaining)}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Periode</p>
            <p className="text-sm text-muted">
              {bill.billing_period_start && bill.billing_period_end
                ? `${formatDate(bill.billing_period_start)} - ${formatDate(bill.billing_period_end)}`
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Jatuh Tempo</p>
            <p className="text-sm text-muted">{bill.due_date ? formatDate(bill.due_date) : "-"}</p>
          </div>
        </div>
      </Card>

      {(bill.status === "pending" || bill.status === "partial") && remaining > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-foreground">Proses Pembayaran</h3>
          <p className="text-xs text-muted mb-4">
            Pilih metode pembayaran dan selesaikan transaksi di halaman checkout.
          </p>
          <Link
            href={`/dashboard/orang-tua/payments/${bill.id}`}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-gold text-white text-sm font-semibold hover:bg-gold/90 active:scale-[0.98] transition-colors min-h-[44px]"
          >
            Bayar Sekarang
          </Link>
        </Card>
      )}

       {showPaymentForm && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm border-t border-border shadow-lg lg:hidden pb-[env(safe-area-inset-bottom)]">
            <div className="px-4 py-2">
             <button
               onClick={handlePayment}
               disabled={isProcessing || isLoadingMethods || paymentMethods.length === 0}
               className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-md bg-gold text-white text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98] min-h-[44px]"
             >
               {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
               {isProcessing ? "Memproses..." : "Bayar Sekarang"}
             </button>
           </div>
         </div>
       )}

      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Riwayat Pembayaran</h3>
        </div>
        <DataTable
          columns={columns}
          data={payments}
          keyExtractor={(p) => p.id}
          emptyTitle="Belum ada riwayat pembayaran."
          emptyDescription="Pembayaran yang berhasil akan muncul di sini."
          emptyIcon={<Receipt className="h-6 w-6" />}
        />
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-foreground">Upload Bukti Pembayaran</h3>
        <p className="text-xs text-muted">
          Unggah bukti pembayaran untuk pembayaran yang telah dilakukan secara manual.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
             <label htmlFor="uploadPaymentId" className="block text-xs text-muted mb-1.5">Pilih Pembayaran</label>
            <select
              id="uploadPaymentId"
              value={selectedPaymentId}
              onChange={(e) => setSelectedPaymentId(e.target.value)}
                className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Pilih pembayaran</option>
              {payments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {formatCurrency(payment.amount)} - {payment.reference_number || payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("id-ID") : "-"}
                </option>
              ))}
            </select>
          </div>
          <div>
             <label htmlFor="uploadProofFile" className="block text-xs text-muted mb-1.5">File Bukti</label>
            <input
              id="uploadProofFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setProofFile(file);
                }
              }}
                className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        <button
          onClick={handleProofUpload}
          disabled={isUploading || !proofFile || !selectedPaymentId}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-gold text-white text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
        >
          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isUploading ? "Mengunggah..." : "Upload Bukti"}
        </button>
      </Card>
    </div>
  );
}
