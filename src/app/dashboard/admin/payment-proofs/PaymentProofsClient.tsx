"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Eye, CheckCircle, XCircle, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/operational/StatusBadge";
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
  reviewAction: (id: string, status: "approved" | "rejected", rejectionReason?: string) => Promise<{ success?: boolean; error?: string }>;
};

export default function PaymentProofsClient({ proofs: initialProofs, reviewAction }: PaymentProofsClientProps) {
  const [proofs, setProofs] = useState<PaymentProof[]>(initialProofs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
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
      const errorMessage = err instanceof Error ? err.message : "Gagal memuat data bukti pembayaran.";
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

  const handleApprove = useCallback(async (id: string) => {
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
      setProofs((prev) => prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p)));
      window.dispatchEvent(new Event("notification:refresh"));
      loadProofs();
    }
    setReviewingId(null);
  }, [reviewAction, toast, loadProofs]);

  const handleReject = useCallback(async (id: string) => {
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
      setProofs((prev) => prev.map((p) => (p.id === id ? { ...p, status: "rejected", rejection_reason: trimmedReason } : p)));
      setRejectingId(null);
      setRejectionReason("");
      window.dispatchEvent(new Event("notification:refresh"));
      loadProofs();
    }
    setReviewingId(null);
  }, [reviewAction, rejectionReason, toast, loadProofs]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (date: string) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns = [
    {
      key: "siswa",
      header: "Siswa",
      render: (proof: PaymentProof) => (
        <>
          <p className="text-foreground">{proof.payments?.students?.full_name || "-"}</p>
          <p className="text-xs text-muted">{proof.payments?.students?.nis || "-"}</p>
        </>
      ),
    },
    {
      key: "tagihan",
      header: "Tagihan",
      render: (proof: PaymentProof) => (
        <>
          <p className="text-foreground">{formatCurrency(proof.payments?.student_bills?.amount || 0)}</p>
          <p className="text-xs text-muted">{proof.payments?.reference_number || "-"}</p>
        </>
      ),
    },
    {
      key: "file_name",
      header: "File",
      render: (proof: PaymentProof) => <span className="text-muted">{proof.file_name}</span>,
      mobileHide: true,
    },
    {
      key: "file_size",
      header: "Ukuran",
      render: (proof: PaymentProof) => <span className="text-muted">{formatFileSize(proof.file_size)}</span>,
      mobileHide: true,
    },
    {
      key: "status",
      header: "Status",
      render: (proof: PaymentProof) => (
        <>
          <StatusBadge status={proof.status} />
          {proof.status === "rejected" && proof.rejection_reason && (
            <p className="text-xs text-danger mt-1">{proof.rejection_reason}</p>
          )}
        </>
      ),
    },
    {
      key: "created_at",
      header: "Diupload",
      render: (proof: PaymentProof) => <span className="text-muted">{formatDate(proof.created_at)}</span>,
      mobileHide: true,
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "text-right",
      render: (proof: PaymentProof) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPreviewingProof(proof)}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-all active:scale-[0.98] min-h-[44px]"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
          {proof.status === "pending" && (
            <>
              <button
                onClick={() => handleApprove(proof.id)}
                disabled={reviewingId === proof.id}
                className="inline-flex items-center gap-1 h-9 px-4 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {reviewingId === proof.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Setujui
              </button>
              <button
                onClick={() => setRejectingId(proof.id)}
                disabled={reviewingId === proof.id}
                className="inline-flex items-center gap-1 h-9 px-4 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {reviewingId === proof.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Tolak
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {proofs.length} bukti pembayaran
        </p>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); }}
          className="sm:h-10 h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={proofs}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          emptyTitle="Belum ada bukti pembayaran."
          emptyDescription="Bukti pembayaran yang diupload akan muncul di sini untuk diverifikasi."
          emptyIcon={<Receipt className="h-6 w-6" />}
        />
      </Card>

      <ConfirmDialog
        open={!!rejectingId}
        title="Tolak Bukti Pembayaran"
        description="Berikan alasan penolakan untuk bukti pembayaran ini."
        confirmLabel="Tolak"
        cancelLabel="Batal"
        variant="danger"
        isConfirming={reviewingId === rejectingId}
        onConfirm={() => { if (rejectingId) handleReject(rejectingId); }}
        onCancel={() => { setRejectingId(null); setRejectionReason(""); }}
      >
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Alasan penolakan..."
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
        />
      </ConfirmDialog>

      <ImagePreviewModal
        open={!!previewingProof}
        proof={previewingProof}
        onClose={() => setPreviewingProof(null)}
      />
    </div>
  );
}
