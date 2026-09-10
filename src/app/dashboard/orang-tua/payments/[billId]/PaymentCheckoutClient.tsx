"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, CreditCard, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { uploadPaymentProofAction } from "../../actions";
import { PaymentIntentResult } from "@/lib/payment-gateway/types";
import { DataTable } from "@/components/operational/data-table";
import { useToast } from "@/components/ui/toast";
import { QRCodeCard, PaymentCountdown, PaymentStatusPanel } from "@/components/payments";
import { FadeIn } from "@/components/animations/FadeIn";

// Phase 2.9A — strategy layer import for future provider switching.
// Phase 2.9B — used for method grouping and capability-aware UI.
import { METHOD_GROUPS, METHOD_BADGES } from "@/lib/payments";
import type { PaymentMethodType } from "@/lib/payments/types";

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

type PaymentCheckoutClientProps = {
  bill: ParentBill;
  payments: Payment[];
  createPaymentIntentAction: (studentBillId: string, amount: number, paymentMethodId: string, schoolPaymentMethodId: string, paymentMethodType: string) => Promise<{ intent?: PaymentIntentResult; remainingBalance?: number; error?: string }>;
  getGatewayTransactionAction: (gatewayTransactionId: string) => Promise<{ transaction?: PaymentIntentResult; error?: string }>;
  simulateWebhookAction: (gatewayTransactionId: string) => Promise<{ success?: boolean; error?: string }>;
};

export default function PaymentCheckoutClient({ bill: initialBill, payments: initialPayments, createPaymentIntentAction, getGatewayTransactionAction, simulateWebhookAction }: PaymentCheckoutClientProps) {
  const router = useRouter();
  const [bill] = useState<ParentBill>(initialBill);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const initialPaymentsRef = useRef(initialPayments);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [selectedSchoolPaymentMethodId, setSelectedSchoolPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; school_payment_method_id: string; name: string; method_type: string | null; is_active: boolean }[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [gatewayTransaction, setGatewayTransaction] = useState<PaymentIntentResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [serverRemainingBalance, setServerRemainingBalance] = useState<number | null>(null);
  const didMountRef = useRef(false);
  const toast = useToast();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [countdownExpired, setCountdownExpired] = useState(false);
  const [simulationSuccess, setSimulationSuccess] = useState(false);

  useEffect(() => {
    if (initialPaymentsRef.current !== initialPayments) {
      initialPaymentsRef.current = initialPayments;
      setPayments(initialPayments);
    }
  }, [initialPayments]);

  const paidAmount = (payments || []).reduce((sum, p) => sum + (p.status === "success" || p.status === "completed" ? p.amount : 0), 0);
  const remaining = serverRemainingBalance !== null ? serverRemainingBalance : bill.amount - paidAmount;
  const showPaymentForm = (bill.status === "pending" || bill.status === "partial") && remaining > 0 && !gatewayTransaction;

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
        const typedMethods = methods as { id: string; school_payment_method_id: string; name: string; method_type: string | null; is_active: boolean }[];
        setPaymentMethods(typedMethods);

        if (typedMethods.length > 0) {
          const firstMethod = typedMethods[0];
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

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
    }
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

  const getGatewayStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Menunggu Pembayaran";
      case "processing": return "Memproses";
      case "success": return "Berhasil";
      case "failed": return "Gagal";
      case "cancelled": return "Dibatalkan";
      case "expired": return "Kedaluwarsa";
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
      mobileHide: true,
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
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          payment.status === "success" || payment.status === "completed" ? "bg-success/10 text-success" :
          payment.status === "failed" ? "bg-danger/10 text-danger" :
          "bg-muted/20 text-muted"
        }`}>
          {payment.status === "success" || payment.status === "completed" ? "Berhasil" : payment.status === "failed" ? "Gagal" : payment.status}
        </span>
      ),
    },
  ];

  const handleCreateIntent = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setGatewayTransaction(null);

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setError("Masukkan jumlah pembayaran yang valid.");
      return;
    }

    if (!selectedPaymentMethodId || !selectedSchoolPaymentMethodId) {
      setError("Pilih metode pembayaran.");
      return;
    }

    if (bill.status === "paid" || bill.status === "cancelled") {
      setError("Tagihan ini tidak dapat menerima pembayaran.");
      return;
    }

    if (amount > remaining) {
      setError(`Jumlah pembayaran melebihi sisa tagihan (${formatCurrency(remaining)}).`);
      return;
    }

    setIsProcessing(true);
    const result = await createPaymentIntentAction(bill.id, amount, selectedPaymentMethodId, selectedSchoolPaymentMethodId, paymentMethods.find(m => m.id === selectedPaymentMethodId)?.name || "Mock");
    setIsProcessing(false);

    if (result.error) {
      if (result.remainingBalance !== undefined) {
        setServerRemainingBalance(result.remainingBalance);
      }
      setError(result.error);
      toast.addToast("error", result.error);
    } else if (result.intent) {
      if (result.remainingBalance !== undefined) {
        setServerRemainingBalance(result.remainingBalance);
      }
      setGatewayTransaction(result.intent);
      setSuccess("Transaksi pembayaran berhasil dibuat.");
      toast.addToast("success", "Transaksi pembayaran berhasil dibuat.");
      window.dispatchEvent(new Event("notification:refresh"));
      router.refresh();
    }
  }, [bill, remaining, paymentAmount, selectedPaymentMethodId, selectedSchoolPaymentMethodId, paymentMethods, createPaymentIntentAction, toast, router]);

  const handleSimulateSuccess = useCallback(async () => {
    if (!gatewayTransaction?.id) {
      return;
    }

    setIsSimulating(true);
    setError(null);
    setSimulationSuccess(false);
    const result = await simulateWebhookAction(gatewayTransaction.id);
    setIsSimulating(false);

    if (result.error) {
      setError(result.error);
      toast.addToast("error", result.error);
    } else {
      setSuccess("Pembayaran berhasil disimulasikan.");
      toast.addToast("success", "Pembayaran berhasil disimulasikan.");
      const updated = await getGatewayTransactionAction(gatewayTransaction.id);
      if (updated.transaction) {
        setGatewayTransaction(updated.transaction);
      }

      if (gatewayTransaction.paymentMethodType === "QRIS") {
        setSimulationSuccess(true);
        const paymentId = gatewayTransaction.paymentId;
        setTimeout(() => {
          if (paymentId) {
            router.push(`/dashboard/orang-tua/payments/receipt/${paymentId}`);
          }
        }, 2000);
      }

      window.dispatchEvent(new Event("notification:refresh"));
      router.refresh();
    }
  }, [gatewayTransaction, getGatewayTransactionAction, simulateWebhookAction, toast, router]);

  const handleCheckStatus = useCallback(async () => {
    if (!gatewayTransaction?.id) return;
    setIsCheckingStatus(true);
    try {
      const result = await getGatewayTransactionAction(gatewayTransaction.id);
      if (result.transaction) {
        setGatewayTransaction(result.transaction);
      }
    } finally {
      setIsCheckingStatus(false);
    }
  }, [gatewayTransaction, getGatewayTransactionAction]);

  const handleCountdownExpire = useCallback(() => {
    setCountdownExpired(true);
  }, []);

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

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-warning/10 text-warning",
      processing: "bg-primary/10 text-primary",
      success: "bg-success/10 text-success",
      failed: "bg-danger/10 text-danger",
      cancelled: "bg-muted/20 text-muted",
      expired: "bg-muted/20 text-muted",
    };
    return map[status] || "bg-muted/20 text-muted";
  };

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId);
  const selectedBadge = selectedMethod ? (METHOD_BADGES[selectedMethod.name as keyof typeof METHOD_BADGES] || null) : null;

  const onlineMethods = paymentMethods.filter(m => m.name !== "Manual");
  const hasOnlineMethods = onlineMethods.length > 0;

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pembayaran Tagihan</h2>
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

      {(bill.status === "pending" || bill.status === "partial") && remaining > 0 && !gatewayTransaction && (
      <Card>
        <h3 className="text-sm font-semibold text-foreground">Pembayaran Baru</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
             <label htmlFor="paymentAmount" className="block text-xs text-muted mb-1.5">Jumlah Pembayaran</label>
             <input
               id="paymentAmount"
               type="number"
               value={paymentAmount}
               onChange={(e) => setPaymentAmount(e.target.value)}
               placeholder={`Maks ${formatCurrency(remaining)}`}
               className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
               min="1"
               max={remaining}
               step="1000"
             />
          </div>
          <div>
             <label htmlFor="paymentMethod" className="block text-xs text-muted mb-1.5">Metode Pembayaran</label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">
                Terverifikasi
              </span>
            </div>
             {isLoadingMethods ? (
               <div className="flex items-center gap-2 text-xs text-muted">
                 <Loader2 className="h-4 w-4 animate-spin" />
                 Memuat metode pembayaran...
               </div>
             ) : paymentMethods.length === 0 ? (
               <EmptyState
                 icon={<CreditCard className="h-6 w-6" />}
                 title="Belum ada metode pembayaran yang tersedia."
                 description="Sekolah belum mengaktifkan metode pembayaran apapun."
               />
             ) : (
               <>
                  <select
                    id="paymentMethod"
                    value={selectedPaymentMethodId}
                    onChange={(e) => {
                      const method = paymentMethods.find(m => m.id === e.target.value);
                      if (method) {
                        setSelectedPaymentMethodId(method.id);
                        setSelectedSchoolPaymentMethodId(method.school_payment_method_id);
                      }
                    }}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                     {paymentMethods.map((method) => (
                       <option key={method.id} value={method.id}>{method.name}</option>
                     ))}
                  </select>
                 {selectedBadge && (
                   <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium mt-1.5 ${
                     selectedBadge.variant === 'success' ? 'border-success/20 bg-success/10 text-success' :
                     selectedBadge.variant === 'info' ? 'border-primary/20 bg-primary/10 text-primary' :
                     selectedBadge.variant === 'warning' ? 'border-warning/20 bg-warning/10 text-warning' :
                     'border-muted/20 bg-muted/10 text-muted'
                   }`}>
                     {selectedBadge.label}
                   </span>
                 )}
               </>
             )}
           </div>
         </div>
         {!hasOnlineMethods && paymentMethods.length > 0 && (
           <div className="rounded-md border border-warning/20 bg-warning/10 px-4 py-3">
             <p className="text-sm text-warning">
               Metode pembayaran online sedang tidak tersedia. Silakan gunakan Manual Transfer dan upload bukti pembayaran setelah melakukan transfer.
             </p>
           </div>
         )}
           <button
             onClick={handleCreateIntent}
             disabled={isProcessing || isLoadingMethods || paymentMethods.length === 0}
             className="hidden lg:inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-gold text-white text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98] min-h-[44px]"
           >
             {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
             {isProcessing ? "Memproses..." : "Bayar Sekarang"}
           </button>
         </Card>
       )}

      {showPaymentForm && (
         <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm border-t border-border shadow-lg lg:hidden pb-[env(safe-area-inset-bottom)]">
           <div className="px-4 py-2">
            <button
              onClick={handleCreateIntent}
              disabled={isProcessing || isLoadingMethods || paymentMethods.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-md bg-gold text-white text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98] min-h-[44px]"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isProcessing ? "Memproses..." : "Bayar Sekarang"}
            </button>
          </div>
        </div>
      )}

      {gatewayTransaction && (
        <Card>
          {gatewayTransaction.paymentMethodType === "QRIS" && gatewayTransaction.qrCodeUrl ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Pembayaran QRIS</h3>
                <PaymentStatusPanel status={gatewayTransaction.providerStatus} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">Nomor Referensi</p>
                  <p className="text-sm font-medium text-foreground">{gatewayTransaction.externalOrderId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Nominal</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(Number((gatewayTransaction.rawPayload as Record<string, unknown>)?.requested_amount || 0))}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <QRCodeCard value={gatewayTransaction.qrCodeUrl} size={200} />
                <PaymentCountdown
                  expiresAt={gatewayTransaction.expiresAt}
                  onExpire={handleCountdownExpire}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus || countdownExpired}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
                >
                  {isCheckingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCheckingStatus ? "Memeriksa..." : "Cek Status"}
                </button>

                {(gatewayTransaction.providerStatus === "pending" || gatewayTransaction.providerStatus === "processing" || gatewayTransaction.providerStatus === "failed") && (
                  <button
                    onClick={handleSimulateSuccess}
                    disabled={isSimulating}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-success text-white text-sm font-semibold hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
                  >
                    {isSimulating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSimulating ? "Memproses..." : "Simulasi Pembayaran Berhasil"}
                  </button>
                )}
              </div>

              {simulationSuccess && (
                <FadeIn>
                  <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3">
                    <p className="text-sm text-success">Pembayaran berhasil disimulasikan. Mengalihkan ke struk...</p>
                  </div>
                </FadeIn>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Status Pembayaran</h3>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(gatewayTransaction.providerStatus)}`}>
                  {getGatewayStatusLabel(gatewayTransaction.providerStatus)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">Provider</p>
                  <p className="text-sm font-medium text-foreground">{gatewayTransaction.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Order ID</p>
                  <p className="text-sm font-medium text-foreground">{gatewayTransaction.externalOrderId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Nominal</p>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(Number((gatewayTransaction.rawPayload as Record<string, unknown>)?.requested_amount || 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Metode</p>
                  <p className="text-sm font-medium text-foreground">{gatewayTransaction.paymentMethodType || "-"}</p>
                </div>
                {gatewayTransaction.qrCodeUrl && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted mb-1">QR Code</p>
                    <p className="text-sm font-medium text-foreground break-all">{gatewayTransaction.qrCodeUrl}</p>
                  </div>
                )}
                {gatewayTransaction.expiresAt && (
                  <div>
                    <p className="text-xs text-muted mb-1">Kedaluwarsa</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(gatewayTransaction.expiresAt)}</p>
                  </div>
                )}
              </div>

              {(gatewayTransaction.providerStatus === "pending" || gatewayTransaction.providerStatus === "processing" || gatewayTransaction.providerStatus === "failed") && (
                <button
                  onClick={handleSimulateSuccess}
                  disabled={isSimulating}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-success text-white text-sm font-semibold hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
                >
                  {isSimulating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSimulating ? "Memproses..." : "Simulasi Pembayaran Berhasil"}
                </button>
              )}
            </div>
          )}
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
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
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-foreground">Upload Bukti Pembayaran</h3>
        <p className="text-xs text-muted">
          Unggah bukti pembayaran untuk pembayaran yang telah dilakukan secara manual.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
             <label htmlFor="selectedPaymentId" className="block text-xs text-muted mb-1.5">Pilih Pembayaran</label>
            <select
              id="selectedPaymentId"
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
             <label htmlFor="proofFile" className="block text-xs text-muted mb-1.5">File Bukti</label>
            <input
              id="proofFile"
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
