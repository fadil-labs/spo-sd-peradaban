"use client";

import { useState, useCallback } from "react";
import { Loader2, Receipt, ArrowLeft, Upload, FileText, Wallet, Calendar, AlertCircle, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/operational/data-table";
import { useToast } from "@/components/ui/toast";
import { uploadPaymentProofAction } from "@/app/dashboard/orang-tua/payments/actions";

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

type ParentBillDetailClientProps = {
  bill: ParentBill;
  payments: Payment[];
};

export default function ParentBillDetailClient({ bill, payments: initialPayments }: ParentBillDetailClientProps) {
  const router = useRouter();
  const [payments] = useState<Payment[]>(initialPayments);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const toast = useToast();

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
      render: (payment: Payment) => <span className="text-xs font-semibold text-[#7A7A7A]">{formatDate(payment.payment_date)}</span>,
    },
    {
      key: "payment_methods.name",
      header: "Metode",
      render: (payment: Payment) => <span className="font-bold text-[#1A1A1A]">{payment.payment_methods?.name || "-"}</span>,
    },
    {
      key: "amount",
      header: "Jumlah",
      render: (payment: Payment) => (
        <span className="font-black text-[#0C3B2E]">{formatCurrency(payment.amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (payment: Payment) => (
        <div className="flex flex-col gap-1.5 items-start">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
            payment.status === "success" || payment.status === "completed" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
            payment.status === "failed" ? "bg-red-500/10 text-red-600" :
            "bg-[#C28E38]/15 text-[#C28E38]"
          }`}>
            {payment.status === "success" || payment.status === "completed" ? "Berhasil" : payment.status === "failed" ? "Gagal" : "Menunggu"}
          </span>
          {payment.payment_proofs && (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
              payment.payment_proofs.status === "approved" ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
              payment.payment_proofs.status === "rejected" ? "bg-red-500/10 text-red-600" :
              "bg-[#C28E38]/10 text-[#C28E38]"
            }`}>
              Bukti: {payment.payment_proofs.status === "pending" ? "Verifikasi" : payment.payment_proofs.status === "approved" ? "Diterima" : "Ditolak"}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "Kuitansi",
      render: (payment: Payment) => (
        (payment.status === "success" || payment.status === "completed") ? (
          <Link
            href={`/dashboard/orang-tua/payments/receipt/${payment.id}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0C3B2E] text-white text-[11px] font-extrabold hover:bg-[#10523E] transition-all shadow-xs"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Lihat</span>
          </Link>
        ) : (
          <span className="text-xs text-[#7A7A7A]">-</span>
        )
      ),
    },
  ];

  const paidAmount = (payments || []).reduce((sum, p) => sum + (p.status === "success" || p.status === "completed" ? p.amount : 0), 0);
  const remaining = bill.amount - paidAmount;

  const handleProofUpload = useCallback(async () => {
    setError(null);
    setSuccess(null);
    if (!selectedPaymentId || !proofFile) return;

    setIsUploading(true);
    const result = await uploadPaymentProofAction(selectedPaymentId, proofFile);
    setIsUploading(false);

    if (result && typeof result === "object" && "error" in result && result.error) {
      const errorMessage = String(result.error);
      setError(errorMessage);
      toast.addToast("error", errorMessage);
    } else {
      setSuccess("Bukti pembayaran berhasil diunggah.");
      toast.addToast("success", "Bukti pembayaran berhasil diunggah.");
      setProofFile(null);
      setSelectedPaymentId("");
      router.refresh();
    }
  }, [selectedPaymentId, proofFile, toast, router]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8">
      {/* HEADER */}
      <div className="bg-white rounded-[24px] p-7 sm:p-8 border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-block px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
            Administrasi Siswa
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
            Detail Tagihan
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] max-w-2xl">
            {bill.students?.full_name} ({bill.students?.nis || "-"}) • Kelola pembayaran dan bukti transfer.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* TOMBOL KUITANSI UTAMA JIKA TAGIHAN LUNAS */}
          {(bill.status === "paid" || remaining <= 0) && payments.length > 0 && (
            <Link
              href={`/dashboard/orang-tua/payments/receipt/${payments[0].id}`}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0C3B2E] text-white text-xs font-extrabold hover:bg-[#10523E] transition-all shadow-sm"
            >
              <Receipt className="h-4 w-4" />
              <span>Cetak Kuitansi</span>
            </Link>
          )}

          <Link
            href="/dashboard/orang-tua/bills"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-xs font-bold text-[#1A1A1A] hover:bg-[#EAE6DC] transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        </div>
      </div>

      {/* INFO CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Kategori", value: bill.payment_categories?.name || "-", icon: FileText },
          { label: "Status", value: getStatusLabel(bill.status), icon: Wallet },
          { label: "Total Tagihan", value: formatCurrency(bill.amount), icon: Receipt },
          { label: "Sisa Tagihan", value: formatCurrency(remaining), icon: AlertCircle },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[#7A7A7A] uppercase tracking-wider">{item.label}</p>
                <item.icon className="h-4 w-4 text-[#C28E38]" />
             </div>
             <p className="text-sm font-black text-[#1A1A1A]">{item.value}</p>
          </div>
        ))}
      </div>

     {/* INSTALLMENT INFO & JADWAL CICILAN */}
      {bill.installment_plan && (
        <div className="bg-white p-7 rounded-[24px] border border-[#C28E38]/30 shadow-sm space-y-6">
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
                {Math.max(0, bill.installment_plan.total_installments - (bill.installment_plan.paid_installments?.length || 0))}x
              </p>
            </div>
          </div>

          {/* DAFTAR JADWAL CICILAN OTOMATIS */}
          {bill.installment_plan.installments && bill.installment_plan.installments.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Jadwal Cicilan:</p>
              <div className="space-y-2.5">
                {bill.installment_plan.installments.map((inst) => {
                  const isPaid = inst.status === "paid";
                  const isCurrent = inst.status === "current";
                  
                  return (
                    <div 
                      key={inst.number} 
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isPaid ? "bg-[#0C3B2E]/5 border-[#0C3B2E]/20" : 
                        isCurrent ? "bg-[#C28E38]/10 border-[#C28E38]/40" : 
                        "bg-[#F5F3EC] border-[#E5E0D8]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs ${
                          isPaid ? "bg-[#0C3B2E] text-white" : "bg-[#E5E0D8] text-[#1A1A1A]"
                        }`}>
                          {inst.number}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-[#1A1A1A]">
                            Cicilan {inst.number} - {formatCurrency(inst.amount)}
                          </p>
                          <p className="text-[11px] text-[#7A7A7A]">
                            Jatuh tempo: {formatDate(inst.due_date)}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${
                          isPaid ? "bg-[#0C3B2E]/10 text-[#0C3B2E]" :
                          isCurrent ? "bg-[#C28E38]/20 text-[#C28E38]" :
                          "bg-[#7A7A7A]/10 text-[#7A7A7A]"
                        }`}>
                          {isPaid ? "Lunas" : isCurrent ? "Berikutnya" : "Menunggu"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTION PANEL */}
      {(bill.status === "pending" || bill.status === "partial") && remaining > 0 && (
        <div className="bg-[#0C3B2E] p-7 rounded-[24px] shadow-lg flex items-center justify-between">
           <div className="text-white space-y-1">
             <h3 className="font-extrabold">Selesaikan Pembayaran</h3>
             <p className="text-xs text-white/70">Lanjutkan ke halaman pembayaran untuk melunasi tagihan ini.</p>
           </div>
           <Link
            href={`/dashboard/orang-tua/payments/${bill.id}`}
            className="h-11 px-6 rounded-xl bg-[#C28E38] text-white text-xs font-extrabold hover:bg-[#A97A2E] flex items-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            Bayar Sekarang
          </Link>
        </div>
      )}

      {/* RIWAYAT & UPLOAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[24px] border border-[#E5E0D8] shadow-sm overflow-hidden p-2 sm:p-4">
            <h3 className="px-4 py-4 text-sm font-extrabold text-[#1A1A1A]">Riwayat Pembayaran</h3>
            <DataTable
              columns={columns}
              data={payments}
              keyExtractor={(p) => p.id}
              emptyTitle="Belum ada riwayat."
              emptyDescription="Transaksi akan muncul di sini."
              emptyIcon={<Receipt className="h-6 w-6 text-[#7A7A7A]" />}
            />
        </div>

        <div className="bg-white rounded-[24px] border border-[#E5E0D8] shadow-sm p-7 space-y-5">
            <h3 className="text-sm font-extrabold text-[#1A1A1A]">Upload Bukti Manual</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#7A7A7A] mb-1.5">Pilih Transaksi</label>
                <select 
                  value={selectedPaymentId} 
                  onChange={(e) => setSelectedPaymentId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] px-4 text-sm font-bold focus:ring-2 focus:ring-[#0C3B2E]"
                >
                  <option value="">Pilih transaksi...</option>
                  {payments.map(p => <option key={p.id} value={p.id}>{formatCurrency(p.amount)} - {formatDate(p.payment_date)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A7A7A] mb-1.5">Pilih File</label>
                <input 
                  type="file" 
                  onChange={(e) => e.target.files && setProofFile(e.target.files[0])}
                  className="h-11 w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] px-4 py-2.5 text-xs font-bold file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#0C3B2E] file:text-white"
                />
              </div>

              <button
                onClick={handleProofUpload}
                disabled={isUploading || !proofFile || !selectedPaymentId}
                className="w-full h-11 rounded-xl bg-[#0C3B2E] text-white text-xs font-extrabold hover:bg-[#10523E] flex items-center justify-center gap-2"
              >
                {isUploading ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4" />}
                {isUploading ? "Mengunggah..." : "Upload Bukti"}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}