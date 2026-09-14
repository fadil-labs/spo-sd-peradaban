"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  Receipt,
  Clock,
  CheckCircle2,
  Search,
  Calendar,
} from "lucide-react";
import { ConfirmDialog } from "@/components/operational/ConfirmDialog";
import { DataTable } from "@/components/operational/data-table";
import { ImagePreviewModal } from "@/components/operational/ImagePreviewModal";
import { useToast } from "@/components/ui/toast";

type PaymentProof = {
  id: string;
  school_id: string;
  payment_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  uploaded_by: string;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  payments: {
    id: string;
    amount: number;
    payment_date: string;
    reference_number: string;
    status: string;
    payment_methods: { id: string; name: string; method_type: string } | null;
    students: { id: string; nis: string; full_name: string } | null;
    student_bills: { id: string; amount: number; due_date: string; status: string } | null;
  } | null;
};

type PaymentProofsClientProps = {
  proofs: PaymentProof[];
  reviewAction: (
    id: string,
    status: "approved" | "rejected",
    rejectionReason?: string
  ) => Promise<{ success?: boolean; error?: string }>;
};

export default function PaymentProofsClient({
  proofs: initialProofs,
  reviewAction,
}: PaymentProofsClientProps) {
  const [proofs, setProofs] = useState<PaymentProof[]>(initialProofs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewingProof, setPreviewingProof] = useState<PaymentProof | null>(null);
  const initialProofsRef = useRef(initialProofs);
  const toast = useToast();

  useEffect(() => {
    if (initialProofsRef.current !== initialProofs) {
      initialProofsRef.current = initialProofs;
      setProofs(initialProofs);
    }
  }, [initialProofs]);

  const loadProofs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payment-proofs?status=${statusFilter}`);
      if (!res.ok) {
        throw new Error("Gagal memuat data bukti pembayaran.");
      }
      const json = await res.json();
      const fetchedProofs = (json.proofs || []) as PaymentProof[];
      setProofs(fetchedProofs);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Gagal memuat data bukti pembayaran.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadProofs();
  }, [loadProofs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Hitung Summary Counter
  const pendingCount = proofs.filter((p) => p.status === "pending").length;
  const approvedCount = proofs.filter((p) => p.status === "approved").length;
  const rejectedCount = proofs.filter((p) => p.status === "rejected").length;

  // Filterberdasarkan Search Bar & Tab Status
  const filteredProofs = proofs.filter((p) => {
    const matchesStatus = statusFilter === "all" ? true : p.status === statusFilter;
    const studentName = p.payments?.students?.full_name?.toLowerCase() || "";
    const nis = p.payments?.students?.nis || "";
    const refNum = p.payments?.reference_number?.toLowerCase() || "";
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      query === "" || studentName.includes(query) || nis.includes(query) || refNum.includes(query);

    return matchesStatus && matchesSearch;
  });

  const handleApprove = useCallback(
    async (id: string) => {
      setReviewingId(id);
      setError(null);
      setSuccess(null);
      const result = await reviewAction(id, "approved");
      if (result.error) {
        setError(result.error);
        toast.addToast("error", result.error);
      } else {
        setSuccess("Bukti pembayaran telah disetujui.");
        toast.addToast("success", "Bukti pembayaran berhasil disetujui.");
        setProofs((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p))
        );
        window.dispatchEvent(new Event("notification:refresh"));
        loadProofs();
      }
      setReviewingId(null);
    },
    [reviewAction, toast, loadProofs]
  );

  const handleReject = useCallback(
    async (id: string) => {
      setError(null);
      setSuccess(null);
      const trimmedReason = rejectionReason.trim();
      if (!trimmedReason) {
        setError("Alasan penolakan harus diisi.");
        return;
      }
      setReviewingId(id);
      const result = await reviewAction(id, "rejected", trimmedReason);
      if (result.error) {
        setError(result.error);
        toast.addToast("error", result.error);
      } else {
        setSuccess("Bukti pembayaran telah ditolak.");
        toast.addToast("success", "Bukti pembayaran berhasil ditolak.");
        setProofs((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status: "rejected", rejection_reason: trimmedReason } : p
          )
        );
        setRejectingId(null);
        setRejectionReason("");
        window.dispatchEvent(new Event("notification:refresh"));
        loadProofs();
      }
      setReviewingId(null);
    },
    [reviewAction, rejectionReason, toast, loadProofs]
  );

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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns = [
    {
      key: "siswa",
      header: "Siswa & NIS",
      render: (proof: PaymentProof) => (
        <div>
          <p className="font-bold text-[#1A1A1A]">
            {proof.payments?.students?.full_name || "-"}
          </p>
          <p className="text-[11px] font-medium text-[#7A7A7A]">
            NIS: {proof.payments?.students?.nis || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "tagihan",
      header: "Nominal & Ref",
      render: (proof: PaymentProof) => (
        <div>
          <p className="font-extrabold text-[#1A1A1A]">
            {formatCurrency(proof.payments?.student_bills?.amount || proof.payments?.amount || 0)}
          </p>
          <p className="text-[11px] text-[#7A7A7A]">
            Ref: {proof.payments?.reference_number || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "file_name",
      header: "File",
      render: (proof: PaymentProof) => (
        <span className="text-[#4A4A4A] font-medium">{proof.file_name}</span>
      ),
      mobileHide: true,
    },
    {
      key: "file_size",
      header: "Ukuran",
      render: (proof: PaymentProof) => (
        <span className="text-[#7A7A7A]">{formatFileSize(proof.file_size)}</span>
      ),
      mobileHide: true,
    },
    {
      key: "status",
      header: "Status",
      render: (proof: PaymentProof) => (
        <div>
          {proof.status === "pending" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C28E38]/10 text-[#C28E38] font-bold text-[11px]">
              <Clock className="h-3 w-3" /> Pending
            </span>
          )}
          {proof.status === "approved" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0C3B2E]/10 text-[#0C3B2E] font-bold text-[11px]">
              <CheckCircle2 className="h-3 w-3" /> Disetujui
            </span>
          )}
          {proof.status === "rejected" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#A83A32]/10 text-[#A83A32] font-bold text-[11px]">
              <XCircle className="h-3 w-3" /> Ditolak
            </span>
          )}
          {proof.status === "rejected" && proof.rejection_reason && (
            <p className="text-[11px] text-[#A83A32] mt-1 italic">{proof.rejection_reason}</p>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Diupload",
      render: (proof: PaymentProof) => (
        <div className="flex items-center gap-1 text-[#7A7A7A]">
          <Calendar className="h-3.5 w-3.5 text-[#8A8A8A]" />
          <span>{formatDate(proof.created_at)}</span>
        </div>
      ),
      mobileHide: true,
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "text-right",
      render: (proof: PaymentProof) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setPreviewingProof(proof)}
            className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-semibold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1"
          >
            <Eye className="h-3.5 w-3.5 text-[#0C3B2E]" />
            Preview
          </button>
          {proof.status === "pending" && (
            <>
              <button
                onClick={() => handleApprove(proof.id)}
                disabled={reviewingId === proof.id}
                className="px-3 py-1.5 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-colors inline-flex items-center gap-1 disabled:opacity-50"
              >
                {reviewingId === proof.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                Setujui
              </button>
              <button
                onClick={() => setRejectingId(proof.id)}
                disabled={reviewingId === proof.id}
                className="px-3 py-1.5 bg-[#A83A32] text-white text-xs font-bold rounded-xl hover:bg-[#852C25] transition-colors inline-flex items-center gap-1 disabled:opacity-50"
              >
                {reviewingId === proof.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                Tolak
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* BADGES SUMMARY */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-[#E5E0D8] shadow-sm">
            <Clock className="h-4 w-4 text-[#C28E38]" />
            <div className="text-xs">
              <span className="text-[#8A8A8A]">Menunggu: </span>
              <span className="font-extrabold text-[#1A1A1A]">{pendingCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-[#E5E0D8] shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-[#0C3B2E]" />
            <div className="text-xs">
              <span className="text-[#8A8A8A]">Disetujui: </span>
              <span className="font-extrabold text-[#1A1A1A]">{approvedCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-[#E5E0D8] shadow-sm">
            <XCircle className="h-4 w-4 text-[#A83A32]" />
            <div className="text-xs">
              <span className="text-[#8A8A8A]">Ditolak: </span>
              <span className="font-extrabold text-[#1A1A1A]">{rejectedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa, NIS, atau nomor referensi..."
            className="w-full pl-10 pr-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#0C3B2E]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#F5F3EC] p-1 rounded-xl border border-[#E5E0D8] text-xs font-semibold overflow-x-auto">
          {[
            { id: "all", label: "Semua" },
            { id: "pending", label: "Pending" },
            { id: "approved", label: "Disetujui" },
            { id: "rejected", label: "Ditolak" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-[#0C3B2E] text-white shadow-sm"
                  : "text-[#666] hover:text-[#1A1A1A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR & SUCCESS ALERTS */}
      {error && (
        <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
          <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-[#0C3B2E]/30 bg-emerald-50 p-4">
          <p className="text-xs sm:text-sm font-semibold text-[#0C3B2E]">{success}</p>
        </div>
      )}

      {/* TABLE DATA */}
      <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <DataTable
          columns={columns}
          data={filteredProofs}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          emptyTitle="Belum ada bukti pembayaran."
          emptyDescription="Bukti pembayaran yang diunggah akan muncul di sini untuk diverifikasi."
          emptyIcon={<Receipt className="h-6 w-6 text-[#8A8A8A]" />}
        />
      </div>

      {/* MODAL REJECT CONFIRMATION */}
      <ConfirmDialog
        open={!!rejectingId}
        title="Tolak Bukti Pembayaran"
        description="Berikan alasan penolakan yang jelas untuk diinfokan kepada orang tua murid."
        confirmLabel="Tolak Pembayaran"
        cancelLabel="Batal"
        variant="danger"
        isConfirming={reviewingId === rejectingId}
        onConfirm={() => {
          if (rejectingId) handleReject(rejectingId);
        }}
        onCancel={() => {
          setRejectingId(null);
          setRejectionReason("");
        }}
      >
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Tuliskan alasan penolakan (contoh: Foto bukti transfer buram / nominal tidak sesuai)..."
          rows={4}
          className="w-full rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] p-3 text-xs text-[#1A1A1A] placeholder:text-[#8A8A8A] focus:outline-none focus:border-[#0C3B2E] mb-4"
        />
      </ConfirmDialog>

      {/* IMAGE PREVIEW MODAL */}
      <ImagePreviewModal
        open={!!previewingProof}
        proof={previewingProof}
        onClose={() => setPreviewingProof(null)}
      />
    </div>
  );
}