"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Eye, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { reviewPaymentProofAction } from "./payment-proofs/actions";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/operational/confirm-dialog";

export type DashboardProof = {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  payments: {
    amount: number;
    students: { full_name: string; nis: string } | null;
    student_bills: { amount: number } | null;
  } | null;
};

interface RecentProofsTableProps {
  proofs: DashboardProof[];
}

export function RecentProofsTable({ proofs }: RecentProofsTableProps) {
  const toast = useToast();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewingProof, setPreviewingProof] = useState<DashboardProof | null>(null);

  const handleApprove = async (id: string) => {
    setReviewingId(id);
    const result = await reviewPaymentProofAction(id, "approved");
    if ("error" in result) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Bukti pembayaran berhasil disetujui.");
    }
    setReviewingId(null);
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) return;
    setReviewingId(rejectingId);
    const result = await reviewPaymentProofAction(rejectingId, "rejected", rejectionReason);
    if ("error" in result) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Bukti pembayaran berhasil ditolak.");
    }
    setReviewingId(null);
    setRejectingId(null);
    setRejectionReason("");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
    };
    const labels: Record<string, string> = {
      pending: "Menunggu",
      approved: "Disetujui",
      rejected: "Ditolak",
    };
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">Tabel Verifikasi Pembayaran Terbaru</h3>
      </div>
      {proofs.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted">
          Belum ada bukti pembayaran terbaru.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left py-2.5 px-4 font-semibold text-muted">Nama Siswa</th>
                <th className="text-left py-2.5 px-4 font-semibold text-muted">NIS</th>
                <th className="text-left py-2.5 px-4 font-semibold text-muted">Kategori</th>
                <th className="text-right py-2.5 px-4 font-semibold text-muted">Amount</th>
                <th className="text-center py-2.5 px-4 font-semibold text-muted">Proof</th>
                <th className="text-right py-2.5 px-4 font-semibold text-muted">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {proofs.map((proof) => (
                <tr key={proof.id} className="hover:bg-muted/5 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{proof.payments?.students?.full_name || "-"}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted">{proof.payments?.students?.nis || "-"}</td>
                  <td className="py-3 px-4 text-sm text-muted">{proof.payments?.student_bills?.amount ? "Tagihan" : "-"}</td>
                  <td className="py-3 px-4 text-sm text-foreground text-right font-medium">
                    {proof.payments?.amount ? formatCurrency(proof.payments.amount) : "-"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setPreviewingProof(proof)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface hover:bg-muted/10 transition-colors"
                    >
                      <Eye className="h-4 w-4 text-muted" />
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
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
                      {proof.status !== "pending" && getStatusBadge(proof.status)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!rejectingId}
        title="Tolak Bukti Pembayaran"
        description="Berikan alasan penolakan untuk bukti pembayaran ini."
        confirmLabel="Tolak"
        cancelLabel="Batal"
        variant="danger"
        isConfirming={reviewingId === rejectingId}
        onConfirm={handleReject}
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

      {previewingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreviewingProof(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">{previewingProof.file_name}</h3>
              <button onClick={() => setPreviewingProof(null)} className="text-muted hover:text-foreground">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-muted/5">
              <div className="text-center text-muted">
                <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Preview tidak tersedia</p>
                <p className="text-xs mt-1">File: {previewingProof.file_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
