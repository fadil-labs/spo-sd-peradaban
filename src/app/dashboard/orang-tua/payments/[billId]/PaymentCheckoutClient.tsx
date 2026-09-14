"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Receipt, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadPaymentProofAction } from "@/app/dashboard/orang-tua/payments/actions";
import { PaymentIntentResult } from "@/lib/payment-gateway/types";
import { DataTable } from "@/components/operational/data-table";
import { useToast } from "@/components/ui/toast";
import { QRCodeCard, PaymentCountdown, PaymentStatusPanel } from "@/components/payments";
import { FadeIn } from "@/components/animations/FadeIn";
import { METHOD_BADGES, toPaymentMethodType } from "@/lib/payments";

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
  installment_plan: {
    total_installments: number;
    installment_amount: number;
    current_installment: number;
    paid_count?: number;
    paid_installments: number[];
    installments?: Array<{
      number: number;
      amount: number;
      due_date: string;
      status: string;
    }>;
  } | null;
};

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  reference_number: string | null;
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
  const [paymentAmount, setPaymentAmount] = useState<string>(initialBill.installment_plan ? String(initialBill.installment_plan.installment_amount || "") : "");
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
        const uniqueMap = new Map<string, { id: string; school_payment_method_id: string; name: string; method_type: string | null; is_active: boolean }>();
        typedMethods.forEach((method) => {
          const key = method.name;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, method);
          }
        });
        const uniqueMethods = Array.from(uniqueMap.values());
        setPaymentMethods(uniqueMethods);

        if (uniqueMethods.length > 0) {
          const firstMethod = uniqueMethods[0];
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
      render: (payment: Payment) => <span className="text-xs font-semibold text-[#7A7A7A]">{formatDate(payment.payment_date)}</span>,
    },
    {
      key: "payment_methods.name",
      header: "Metode",
      render: (payment: Payment) => <span className="font-bold text-[#1A1A1A]">{payment.payment_methods?.name || "-"}</span>,
    },
    {
      key: "reference_number",
      header: "Referensi",
      render: (payment: Payment) => <span className="text-xs text-[#7A7A7A]">{payment.reference_number || "-"}</span>,
      mobileHide: true,
    },
    {
      key: "amount",
      header: "Jumlah",
      render: (payment: Payment) => (
        <span className="font-black text-[#0C3B2E]">
          {formatCurrency(payment.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (payment: Payment) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
          payment.status === "success" || payment.status === "completed" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
          payment.status === "failed" ? "bg-red-500/10 text-red-600" :
          "bg-[#C28E38]/15 text-[#C28E38]"
        }`}>
          {payment.status === "success" || payment.status === "completed" ? "Berhasil" : payment.status === "failed" ? "Gagal" : payment.status}
        </span>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      render: (payment: Payment) => (
        (payment.status === "success" || payment.status === "completed") ? (
          <Link
            href={`/dashboard/orang-tua/payments/receipt/${payment.id}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0C3B2E] text-white text-[11px] font-extrabold hover:bg-[#10523E] transition-all shadow-xs"
          >
            <span>Kuitansi</span>
          </Link>
        ) : (
          <span className="text-xs text-[#7A7A7A]">-</span>
        )
      ),
    },
  ];

  const handleCreateIntent = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setGatewayTransaction(null);

    const amount = bill.installment_plan ? Number(bill.installment_plan.installment_amount) : Number(paymentAmount);
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
    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId);
    const selectedMethodType = selectedMethod ? toPaymentMethodType(selectedMethod.method_type, selectedMethod.name) : 'MANUAL';
    const result = await createPaymentIntentAction(bill.id, amount, selectedPaymentMethodId, selectedSchoolPaymentMethodId, selectedMethodType);
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
      pending: "bg-[#C28E38]/15 text-[#C28E38]",
      processing: "bg-[#0C3B2E]/10 text-[#0C3B2E]",
      success: "bg-[#0C3B2E]/10 text-[#0C3B2E]",
      failed: "bg-red-500/10 text-red-600",
      cancelled: "bg-[#7A7A7A]/10 text-[#7A7A7A]",
      expired: "bg-[#7A7A7A]/10 text-[#7A7A7A]",
    };
    return map[status] || "bg-[#7A7A7A]/10 text-[#7A7A7A]";
  };

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId);
  const selectedMethodType = selectedMethod ? toPaymentMethodType(selectedMethod.method_type, selectedMethod.name) : 'MANUAL';
  const selectedBadge = selectedMethod ? (METHOD_BADGES[selectedMethodType] || null) : null;

  const onlineMethods = paymentMethods.filter(m => m.name !== "Manual");
  const hasOnlineMethods = onlineMethods.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8">
      {/* HEADER HALAMAN */}
      <div className="bg-white rounded-[24px] p-7 sm:p-8 border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-block px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
            Keuangan & Administrasi
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
            Detail Tagihan Siswa
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] max-w-2xl leading-relaxed">
            {bill.students?.full_name} (NIS: {bill.students?.nis || "-"}) • Rincian kewajiban pembayaran dan opsi transaksi.
          </p>
        </div>

        <Link
          href="/dashboard/orang-tua/bills"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-xs font-bold text-[#1A1A1A] hover:bg-[#EAE6DC] transition-all shadow-sm active:scale-[0.98] shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 px-5 py-4">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-[20px] border border-[#0C3B2E]/20 bg-[#0C3B2E]/10 px-5 py-4">
          <p className="text-sm text-[#0C3B2E] font-medium">{success}</p>
        </div>
      )}

      {/* INFORMASI UTAMA TAGIHAN */}
      <div className="bg-white p-7 sm:p-8 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
          <h3 className="text-base font-extrabold text-[#1A1A1A]">Ringkasan Tagihan</h3>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
            bill.status === "paid" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
            bill.status === "partial" ? "bg-[#C28E38]/15 text-[#C28E38]" :
            bill.status === "overdue" ? "bg-red-500/10 text-red-600" :
            "bg-[#7A7A7A]/10 text-[#7A7A7A]"
          }`}>
            {getStatusLabel(bill.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
            <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Kategori Pembayaran</p>
            <p className="text-sm font-extrabold text-[#1A1A1A]">{bill.payment_categories?.name || "-"}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
            <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Total Tagihan</p>
            <p className="text-sm font-black text-[#1A1A1A]">{formatCurrency(bill.amount)}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
            <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Sisa Kewajiban</p>
            <p className="text-sm font-black text-[#C28E38]">{formatCurrency(remaining)}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
            <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Periode</p>
            <p className="text-sm font-bold text-[#1A1A1A]">
              {bill.billing_period_start && bill.billing_period_end
                ? `${formatDate(bill.billing_period_start)} - ${formatDate(bill.billing_period_end)}`
                : "Semester Berjalan"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
            <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Jatuh Tempo</p>
            <p className="text-sm font-bold text-[#1A1A1A]">{bill.due_date ? formatDate(bill.due_date) : "-"}</p>
          </div>
        </div>
      </div>

      {/* INSTALLMENT INFO */}
      {bill.installment_plan && (
        <div className="bg-white p-7 sm:p-8 rounded-[24px] border border-[#C28E38]/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-4">
            <h3 className="text-base font-extrabold text-[#1A1A1A]">Informasi Cicilan</h3>
            <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold bg-[#C28E38]/15 text-[#C28E38]">
              Cicilan {bill.installment_plan.current_installment} / {bill.installment_plan.total_installments}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
              <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Nominal Cicilan</p>
              <p className="text-sm font-black text-[#1A1A1A]">
                {formatCurrency(Number(bill.installment_plan.installment_amount || 0))}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
              <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Total Cicilan</p>
              <p className="text-sm font-black text-[#1A1A1A]">{bill.installment_plan.total_installments}x</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
              <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Sisa Cicilan</p>
              <p className="text-sm font-black text-[#C28E38]">
                {Math.max(0, (bill.installment_plan.total_installments || 0) - (bill.installment_plan.paid_count || 0))}x
              </p>
            </div>
          </div>
          {bill.installment_plan.installments && bill.installment_plan.installments.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-[#555]">Jadwal Cicilan:</p>
              {bill.installment_plan.installments.map((inst) => (
                <div key={inst.number} className="flex items-center justify-between p-3 rounded-xl bg-[#F5F3EC] border border-[#E5E0D8]">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      inst.status === "paid" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
                      inst.status === "pending_verification" ? "bg-[#C28E38]/15 text-[#C28E38]" :
                      inst.number === bill.installment_plan?.current_installment ? "bg-[#C28E38]/15 text-[#C28E38]" :
                      "bg-[#7A7A7A]/10 text-[#7A7A7A]"
                    }`}>
                      {inst.number}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">
                        Cicilan {inst.number} - {formatCurrency(inst.amount)}
                      </p>
                      <p className="text-[11px] text-[#7A7A7A]">Jatuh tempo: {formatDate(inst.due_date)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inst.status === "paid" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
                    inst.status === "pending_verification" ? "bg-[#C28E38]/15 text-[#C28E38]" :
                    inst.number === bill.installment_plan?.current_installment ? "bg-[#C28E38]/15 text-[#C28E38]" :
                    "bg-[#7A7A7A]/10 text-[#7A7A7A]"
                  }`}>
                    {inst.status === "paid" ? "Lunas" : inst.status === "pending_verification" ? "Menunggu Verifikasi" : inst.number === bill.installment_plan?.current_installment ? "Berikutnya" : "Menunggu"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORM PEMBAYARAN BARU */}
      {(() => {
        const currentInstNumber = bill.installment_plan?.current_installment || 1;
        const hasPendingCurrentInstallment = payments.some((p, index) => {
          const isCurrentOrNext = index === (currentInstNumber - 1);
          return isCurrentOrNext && p.status === "pending";
        });

        return (
          (bill.status === "pending" || bill.status === "partial") && remaining > 0 && !gatewayTransaction && (
            <div className="bg-white p-7 sm:p-8 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#1A1A1A]">Buat Pembayaran Baru</h3>
                <p className="text-xs sm:text-sm text-[#7A7A7A]">Masukkan nominal pembayaran dan pilih metode transaksi yang diinginkan.</p>
              </div>

              {hasPendingCurrentInstallment && (
                <div className="p-4 rounded-2xl bg-[#C28E38]/10 border border-[#C28E38]/30 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-[#C28E38] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#1A1A1A] font-medium leading-relaxed">
                    Cicilan saat ini sedang dalam proses verifikasi (menunggu pembayaran/konfirmasi bendahara). Anda tidak dapat membuat transaksi baru sebelum transaksi sebelumnya selesai atau dibatalkan.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="paymentAmount" className="block text-xs font-bold text-[#7A7A7A] mb-2">
                    Jumlah Pembayaran (Rp)
                    {bill.installment_plan && (
                      <span className="ml-2 text-[#C28E38]">(Cicilan {bill.installment_plan.current_installment}/{bill.installment_plan.total_installments})</span>
                    )}
                  </label>
                  <input
                    id="paymentAmount"
                    type="number"
                    value={bill.installment_plan ? bill.installment_plan.installment_amount : paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Maks ${formatCurrency(remaining)}`}
                    className="h-12 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] px-4 text-sm font-bold text-[#1A1A1A] placeholder:text-[#7A7A7A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
                    min="1"
                    max={remaining}
                    step="1000"
                    readOnly={!!bill.installment_plan}
                  />
                  {bill.installment_plan && (
                    <p className="text-[11px] text-[#7A7A7A] mt-1">
                      Nominal cicilan ditetapkan dan tidak dapat diubah.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="paymentMethod" className="block text-xs font-bold text-[#7A7A7A] mb-2">Metode Pembayaran</label>
                  {isLoadingMethods ? (
                    <div className="flex items-center gap-2 h-12 px-4 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-xs font-semibold text-[#7A7A7A]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#0C3B2E]" />
                      Memuat metode pembayaran...
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-medium">
                      Belum ada metode pembayaran yang diaktifkan oleh sekolah.
                    </div>
                  ) : (
                    <div className="space-y-2">
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
                        className="h-12 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
                      >
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.id}>{method.name}</option>
                        ))}
                      </select>

                      {selectedBadge && (
                        <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold ${
                          selectedBadge.variant === 'success' ? 'border-[#0C3B2E]/20 bg-[#0C3B2E]/10 text-[#0C3B2E]' :
                          selectedBadge.variant === 'info' ? 'border-[#0C3B2E]/20 bg-[#0C3B2E]/10 text-[#0C3B2E]' :
                          selectedBadge.variant === 'warning' ? 'border-[#C28E38]/20 bg-[#C28E38]/10 text-[#C28E38]' :
                          'border-[#7A7A7A]/20 bg-[#7A7A7A]/10 text-[#7A7A7A]'
                        }`}>
                          {selectedBadge.label}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!hasOnlineMethods && paymentMethods.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#C28E38]/10 border border-[#C28E38]/30 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-[#C28E38] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#1A1A1A] font-medium leading-relaxed">
                    Metode pembayaran online sedang tidak tersedia. Silakan gunakan Manual Transfer dan unggah bukti pembayaran pada formulir di bawah setelah melakukan transfer.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCreateIntent}
                  disabled={isProcessing || isLoadingMethods || paymentMethods.length === 0 || hasPendingCurrentInstallment}
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#0C3B2E] text-white text-sm font-extrabold hover:bg-[#10523E] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.98]"
                >
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isProcessing ? "Memproses Transaksi..." : "Lanjutkan Pembayaran"}
                </button>
              </div>
            </div>
          )
        );
      })()}

      {/* GATEWAY TRANSACTION / QRIS PANEL */}
      {gatewayTransaction && (
        <div className="bg-white p-7 sm:p-8 rounded-[24px] border border-[#0C3B2E]/30 shadow-lg space-y-6">
          {gatewayTransaction.paymentMethodType === "QRIS" && gatewayTransaction.qrCodeUrl ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
                <h3 className="text-base font-extrabold text-[#1A1A1A]">Pembayaran QRIS</h3>
                <PaymentStatusPanel status={gatewayTransaction.providerStatus} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8]">
                  <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Nomor Referensi</p>
                  <p className="text-sm font-bold text-[#1A1A1A] mt-1">{gatewayTransaction.externalOrderId}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8]">
                  <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Nominal Tagihan</p>
                  <p className="text-sm font-black text-[#0C3B2E] mt-1">
                    {formatCurrency(Number((gatewayTransaction.rawPayload as Record<string, unknown>)?.requested_amount || 0))}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 p-6 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8]">
                <QRCodeCard value={gatewayTransaction.qrCodeUrl} size={220} />
                <PaymentCountdown expiresAt={gatewayTransaction.expiresAt} onExpire={handleCountdownExpire} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus || countdownExpired}
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-[#E5E0D8] bg-white text-sm font-bold text-[#1A1A1A] hover:bg-[#F5F3EC] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {isCheckingStatus && <Loader2 className="h-4 w-4 animate-spin text-[#0C3B2E]" />}
                  {isCheckingStatus ? "Memeriksa..." : "Cek Status Pembayaran"}
                </button>

                {(gatewayTransaction.providerStatus === "pending" || gatewayTransaction.providerStatus === "processing" || gatewayTransaction.providerStatus === "failed") && (
                  <button
                    onClick={handleSimulateSuccess}
                    disabled={isSimulating}
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#0C3B2E] text-white text-sm font-extrabold hover:bg-[#10523E] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    {isSimulating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSimulating ? "Memproses..." : "Simulasi Pembayaran Berhasil"}
                  </button>
                )}
              </div>

              {simulationSuccess && (
                <FadeIn>
                  <div className="p-4 rounded-2xl bg-[#0C3B2E]/10 border border-[#0C3B2E]/20 text-sm text-[#0C3B2E] font-medium">
                    Pembayaran berhasil disimulasikan. Mengalihkan ke struk kuitansi...
                  </div>
                </FadeIn>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
                <h3 className="text-base font-extrabold text-[#1A1A1A]">Status Transaksi Gateway</h3>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(gatewayTransaction.providerStatus)}`}>
                  {getGatewayStatusLabel(gatewayTransaction.providerStatus)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8]">
                  <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Provider</p>
                  <p className="text-sm font-bold text-[#1A1A1A] mt-1">{gatewayTransaction.provider}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8]">
                  <p className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">Order ID</p>
                  <p className="text-sm font-bold text-[#1A1A1A] mt-1">{gatewayTransaction.externalOrderId}</p>
                </div>
              </div>

              {(gatewayTransaction.providerStatus === "pending" || gatewayTransaction.providerStatus === "processing" || gatewayTransaction.providerStatus === "failed") && (
                <button
                  onClick={handleSimulateSuccess}
                  disabled={isSimulating}
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#0C3B2E] text-white text-sm font-extrabold hover:bg-[#10523E] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {isSimulating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSimulating ? "Memproses..." : "Simulasi Pembayaran Berhasil"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* RIWAYAT PEMBAYARAN TAGIHAN INI */}
      <div className="bg-white rounded-[24px] border border-[#E5E0D8] shadow-sm overflow-hidden p-2 sm:p-4 space-y-4">
        <div className="px-4 py-3 border-b border-[#E5E0D8]">
          <h3 className="text-base font-extrabold text-[#1A1A1A]">Riwayat Pembayaran Tagihan Ini</h3>
        </div>
        <DataTable
          columns={columns}
          data={payments}
          keyExtractor={(p) => p.id}
          isLoading={false}
          emptyTitle="Belum ada riwayat pembayaran."
          emptyDescription="Catatan transaksi untuk tagihan ini akan muncul di sini."
          emptyIcon={<Receipt className="h-6 w-6 text-[#0C3B2E]" />}
        />
      </div>

      {/* UPLOAD BUKTI PEMBAYARAN MANUAL */}
      <div className="bg-white p-7 sm:p-8 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-6">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-[#1A1A1A]">Upload Bukti Pembayaran Manual</h3>
          <p className="text-xs sm:text-sm text-[#7A7A7A]">Unggah bukti transfer atau kuitansi pembayaran untuk divalidasi oleh bendahara sekolah.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="selectedPaymentId" className="block text-xs font-bold text-[#7A7A7A] mb-2">Pilih Transaksi Pembayaran</label>
            <select
              id="selectedPaymentId"
              value={selectedPaymentId}
              onChange={(e) => setSelectedPaymentId(e.target.value)}
              className="h-12 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
            >
              <option value="">Pilih transaksi pembayaran...</option>
              {payments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {formatCurrency(payment.amount)} - {payment.payment_date ? formatDate(payment.payment_date) : "-"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="proofFile" className="block text-xs font-bold text-[#7A7A7A] mb-2">File Bukti (Gambar / PDF)</label>
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
              className="h-12 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] px-4 py-2.5 text-sm font-bold text-[#1A1A1A] file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#0C3B2E] file:text-white hover:file:bg-[#10523E] transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleProofUpload}
            disabled={isUploading || !proofFile || !selectedPaymentId}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#0C3B2E] text-white text-sm font-extrabold hover:bg-[#10523E] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.98]"
          >
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isUploading ? "Mengunggah Bukti..." : "Upload Bukti Pembayaran"}
          </button>
        </div>
      </div>
    </div>
  );
}