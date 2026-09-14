"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { useToast } from "@/components/ui/toast";
import { processPaymentAction } from "../actions";
import { InstallmentPlanSetup } from "@/components/payments/InstallmentPlanSetup";
import {
  ArrowLeft,
  PlusCircle,
  X,
  Receipt,
} from "lucide-react";

type BillDetailProps = {
  bill: {
    id: string;
    school_id: string;
    student_id: string;
    amount: number;
    status: string;
    billing_period_start: string | null;
    billing_period_end: string | null;
    is_recurring: boolean;
    due_date: string | null;
    installment_plan: {
      total_installments: number;
      installment_amount: number;
      current_installment: number;
      paid_installments: number[];
      installments?: Array<{
        number: number;
        amount: number;
        due_date: string;
        status: string;
      }>;
    } | null;
    students?: { id: string; nis: string; full_name: string };
    payment_categories?: {
      id: string;
      name: string;
      allow_installments: boolean;
      minimum_installment_amount: number | null;
      require_installment_schedule?: boolean;
    };
  };
  payments: {
    id: string;
    amount: number;
    payment_date: string;
    reference_number: string;
    status: string;
    payment_methods?: { id: string; name: string; method_type: string };
  }[];
  paymentMethods: { id: string; name: string; method_type: string }[];
  schoolPaymentMethods: {
    id: string;
    payment_method_id: string;
    is_active: boolean;
    payment_methods?: { id: string; name: string; method_type: string };
  }[];
};

export default function BillDetailClient({
  bill,
  payments: initialPayments,
  schoolPaymentMethods,
}: BillDetailProps) {
  const router = useRouter();
  const toast = useToast();

  const [payments, setPayments] = useState(initialPayments);
  const [billStatus, setBillStatus] = useState(bill.status);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedSchoolPaymentMethodId, setSelectedSchoolPaymentMethodId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const uniqueSchoolPaymentMethods = useMemo(() => {
    const seen = new Set<string>();
    return schoolPaymentMethods.filter((spm) => {
      const key = spm.payment_method_id || spm.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [schoolPaymentMethods]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);

  const formatDate = (date: string | null) =>
    date
      ? new Date(date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, bill.amount - totalPaid);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount && !bill.installment_plan) {
      toast.addToast("error", "Isi jumlah dan pilih metode pembayaran.");
      return;
    }

    if (!selectedSchoolPaymentMethodId) {
      toast.addToast("error", "Pilih metode pembayaran.");
      return;
    }

    const schoolMethod = uniqueSchoolPaymentMethods.find((spm) => spm.id === selectedSchoolPaymentMethodId);
    if (!schoolMethod) {
      toast.addToast("error", "Metode pembayaran tidak valid.");
      return;
    }

    setIsSubmitting(true);
    const amountNum = bill.installment_plan ? Number(bill.installment_plan.installment_amount) : Number(paymentAmount);
    const idempotencyKey = `pay_${bill.id}_${Date.now()}`;

    const result = await processPaymentAction(
      bill.id,
      amountNum,
      schoolMethod.payment_method_id,
      schoolMethod.id,
      referenceNumber || `REF-${Date.now()}`,
      idempotencyKey
    );

    if (result.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Pembayaran berhasil dicatat.");
      setShowPaymentModal(false);
      setPaymentAmount("");
      setReferenceNumber("");

      const newPayment = {
        id: result.paymentId || String(Date.now()),
        amount: amountNum,
        payment_date: new Date().toISOString(),
        reference_number: referenceNumber || `REF-${Date.now()}`,
        status: "completed",
        payment_methods: schoolMethod.payment_methods,
      };

      setPayments([newPayment, ...payments]);
      const updatedTotalPaid = totalPaid + amountNum;
      if (updatedTotalPaid >= bill.amount) {
        setBillStatus("paid");
      } else {
        setBillStatus("partial");
      }
    }
    setIsSubmitting(false);
  };

  return (
    <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
      <div className="flex flex-col gap-5 sm:gap-6 max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push("/dashboard/admin/student-bills")}
              className="p-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl hover:bg-[#EAE6DC] transition-colors mt-0.5"
            >
              <ArrowLeft className="h-4 w-4 text-[#1A1A1A]" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
                  Tagihan {bill.payment_categories?.name || "Siswa"}
                </h1>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    billStatus === "paid"
                      ? "bg-[#0C3B2E]/10 text-[#0C3B2E]"
                      : billStatus === "partial"
                      ? "bg-[#2563EB]/10 text-[#2563EB]"
                      : "bg-[#C28E38]/10 text-[#C28E38]"
                  }`}
                >
                  {billStatus === "paid"
                    ? "Lunas"
                    : billStatus === "partial"
                    ? "Sebagian"
                    : "Belum Bayar"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
                Siswa: <span className="font-bold text-[#1A1A1A]">{bill.students?.full_name}</span>{" "}
                (NIS: {bill.students?.nis})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {remainingBalance > 0 && billStatus !== "cancelled" && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-all shadow-sm inline-flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Catat Pembayaran</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-[20px] border border-[#E5E0D8] shadow-sm">
            <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Total Tagihan</span>
            <p className="text-xl font-extrabold text-[#1A1A1A] mt-1">
              {formatCurrency(bill.amount)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-[20px] border border-[#E5E0D8] shadow-sm">
            <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Total Dibayar</span>
            <p className="text-xl font-extrabold text-[#0C3B2E] mt-1">
              {formatCurrency(totalPaid)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-[20px] border border-[#E5E0D8] shadow-sm">
            <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Sisa Tunggakan</span>
            <p className="text-xl font-extrabold text-[#A83A32] mt-1">
              {formatCurrency(remainingBalance)}
            </p>
          </div>
        </div>

        {/* INSTALLMENT INFO */}
        {bill.installment_plan && (
          <div className="bg-white p-5 rounded-[20px] border border-[#C28E38]/30 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
              <h3 className="text-base font-bold text-[#1A1A1A]">Informasi Cicilan</h3>
              <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold bg-[#C28E38]/15 text-[#C28E38]">
                Cicilan {bill.installment_plan.current_installment} / {bill.installment_plan.total_installments}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
                <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Nominal Cicilan</span>
                <p className="text-sm font-black text-[#1A1A1A]">
                  {formatCurrency(Number(bill.installment_plan.installment_amount || 0))}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
                <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Total Cicilan</span>
                <p className="text-sm font-black text-[#1A1A1A]">{bill.installment_plan.total_installments}x</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-1">
                <span className="text-[11px] font-bold text-[#7A7A7A] uppercase">Sisa Cicilan</span>
                <p className="text-sm font-black text-[#C28E38]">
                  {bill.installment_plan.total_installments - bill.installment_plan.current_installment + 1}x
                </p>
              </div>
            </div>
          </div>
        )}

        {/* INSTALLMENT PLAN SETUP */}
        {!bill.installment_plan && bill.payment_categories?.allow_installments && (
          <InstallmentPlanSetup
            billId={bill.id}
            billAmount={bill.amount}
            existingPlan={null}
            onSuccess={() => router.refresh()}
          />
        )}

        {/* MODAL CATAT PEMBAYARAN */}
        {showPaymentModal && (
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE6DC] pb-3">
              <h3 className="text-base font-bold text-[#1A1A1A]">
                Catat Pembayaran Offline / Tunai
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-[#8A8A8A] hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="payment_amount" className="block text-xs font-bold text-[#555] mb-1">
                    Jumlah Pembayaran (Rp)
                    {bill.installment_plan && (
                      <span className="ml-2 text-[#C28E38]">
                        (Cicilan {bill.installment_plan.current_installment}/{bill.installment_plan.total_installments})
                      </span>
                    )}
                  </label>
                  <input
                    id="payment_amount"
                    type="number"
                    value={bill.installment_plan ? bill.installment_plan.installment_amount : paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Maksimal ${remainingBalance}`}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    max={remainingBalance}
                    required
                    disabled={isSubmitting || !!bill.installment_plan}
                    readOnly={!!bill.installment_plan}
                  />
                  {bill.installment_plan && (
                    <p className="text-[11px] text-[#7A7A7A] mt-1">
                      Nominal cicilan ditetapkan dan tidak dapat diubah.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="school_method" className="block text-xs font-bold text-[#555] mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    id="school_method"
                    value={selectedSchoolPaymentMethodId}
                    onChange={(e) => setSelectedSchoolPaymentMethodId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">-- Pilih Metode --</option>
                     {uniqueSchoolPaymentMethods.map((spm) => (
                      <option key={spm.id} value={spm.id}>
                        {spm.payment_methods?.name || "Metode Sekolah"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="ref_number" className="block text-xs font-bold text-[#555] mb-1">
                  Nomor Referensi / Kwitansi Manual
                </label>
                <input
                  id="ref_number"
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Contoh: KWT-2026-001"
                  className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {isSubmitting ? "Memproses..." : "Konfirmasi Pembayaran"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* RIWAYAT PEMBAYARAN */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
          <h3 className="text-base font-bold text-[#1A1A1A]">Riwayat Transaksi & Kwitansi</h3>

          {payments.length === 0 ? (
            <p className="text-xs text-[#7A7A7A]">Belum ada riwayat pembayaran untuk tagihan ini.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-[#F5F3EC] rounded-2xl border border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#0C3B2E]">
                        {formatCurrency(p.amount)}
                      </p>
                      <span className="px-2 py-0.5 rounded bg-[#0C3B2E]/10 text-[#0C3B2E] text-[10px] font-bold">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#666] mt-1">
                      Metode: {p.payment_methods?.name || "-"} | Tgl: {formatDate(p.payment_date)}
                    </p>
                    <p className="text-[11px] text-[#8A8A8A]">
                      Ref: {p.reference_number || "-"}
                    </p>
                  </div>

                  <a
                    href={`/dashboard/admin/payments/receipt/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white border border-[#E5E0D8] text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1.5 self-start sm:self-center"
                  >
                    <Receipt className="h-3.5 w-3.5 text-[#0C3B2E]" />
                    Kwitansi
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}