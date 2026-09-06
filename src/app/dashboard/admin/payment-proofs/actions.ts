"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordFinancialAuditEvent } from "@/lib/financial-audit/actions";
import { createNotification } from "@/lib/notifications/service";

export async function getPaymentProofsAction(statusFilter?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  if (!["admin", "bendahara"].includes(profile.role)) {
    redirect("/dashboard/admin");
  }

  let query = supabase
    .from("payment_proofs")
    .select(`
      id,
      school_id,
      payment_id,
      file_path,
      file_name,
      mime_type,
      file_size,
      status,
      created_at,
      updated_at,
      uploaded_by,
      payments (
        id,
        amount,
        payment_date,
        reference_number,
        status,
        payment_methods (
          id,
          name,
          method_type
        ),
        students (
          id,
          nis,
          full_name
        ),
        student_bills (
          id,
          amount,
          due_date,
          status
        )
      )
    `)
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: proofs, error: proofsError } = await query;

  if (proofsError) {
    return { error: "Gagal memuat data bukti pembayaran." };
  }

  const normalized = (proofs || []).map((p: unknown) => {
    const proof = p as Record<string, unknown>;
    const payment = proof.payments as Record<string, unknown> | undefined;
    const student = payment?.students as Record<string, unknown> | undefined;
    const bill = payment?.student_bills as Record<string, unknown> | undefined;
    const method = payment?.payment_methods as Record<string, unknown> | undefined;
    return {
      id: proof.id as string,
      school_id: proof.school_id as string,
      payment_id: proof.payment_id as string,
      file_path: proof.file_path as string,
      file_name: proof.file_name as string,
      mime_type: proof.mime_type as string | null,
      file_size: proof.file_size as number | null,
      status: proof.status as string,
      created_at: proof.created_at as string,
      updated_at: proof.updated_at as string,
      uploaded_by: proof.uploaded_by as string,
      rejection_reason: proof.rejection_reason as string | null,
      verified_by: proof.verified_by as string | null,
      verified_at: proof.verified_at as string | null,
      payments: payment ? {
        id: payment.id as string,
        amount: payment.amount as number,
        payment_date: payment.payment_date as string,
        reference_number: payment.reference_number as string,
        status: payment.status as string,
        payment_methods: method ? {
          id: method.id as string,
          name: method.name as string,
          method_type: method.method_type as string,
        } : null,
        students: student ? {
          id: student.id as string,
          nis: student.nis as string,
          full_name: student.full_name as string,
        } : null,
        student_bills: bill ? {
          id: bill.id as string,
          amount: bill.amount as number,
          due_date: bill.due_date as string,
          status: bill.status as string,
        } : null,
      } : null,
    };
  });

  return { proofs: normalized };
}

export async function reviewPaymentProofAction(id: string, status: "approved" | "rejected", rejectionReason?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  if (!["admin", "bendahara"].includes(profile.role)) {
    redirect("/dashboard/admin");
  }

  const { data: proof, error: proofError } = await supabase
    .from("payment_proofs")
    .select("id, school_id, status, payment_id, uploaded_by")
    .eq("id", id)
    .eq("school_id", profile.school_id)
    .single();

  if (proofError || !proof) {
    return { error: "Bukti pembayaran tidak ditemukan." };
  }

  if (proof.status !== "pending") {
    return { error: "Bukti pembayaran ini sudah diverifikasi." };
  }

  const updatePayload: Record<string, unknown> = {
    status,
    verified_by: user.id,
    verified_at: new Date().toISOString(),
  };

  if (status === "rejected") {
    const trimmedReason = String(rejectionReason || "").trim();
    if (!trimmedReason) {
      return { error: "Alasan penolakan harus diisi." };
    }
    updatePayload.rejection_reason = trimmedReason;
  }

  const { data: updatedProof, error: updateError } = await supabase
    .from("payment_proofs")
    .update(updatePayload)
    .eq("id", id)
    .eq("school_id", profile.school_id)
    .eq("status", "pending")
    .select("id, status")
    .single();

  if (updateError || !updatedProof) {
    return { error: "Gagal memperbarui status bukti pembayaran." };
  }

  await recordFinancialAuditEvent({
    actionType: status === "approved" ? "payment_proof_approved" : "payment_proof_rejected",
    entityType: "payment_proof",
    schoolId: profile.school_id,
    actorProfileId: user.id,
    actorRole: profile.role,
    entityId: id,
    paymentId: proof?.payment_id ?? null,
    oldStatus: "pending",
    newStatus: status,
    metadata: status === "rejected" ? { rejection_reason: rejectionReason } : null,
  });

  if (proof?.uploaded_by) {
    await createNotification({
      recipientProfileId: proof.uploaded_by,
      notificationType: status === "approved" ? "payment_proof_approved" : "payment_proof_rejected",
      title: status === "approved" ? "Bukti Pembayaran Disetujui" : "Bukti Pembayaran Ditolak",
      message: status === "approved"
        ? "Bukti pembayaran Anda telah disetujui."
        : `Bukti pembayaran Anda ditolak.${rejectionReason ? ` Alasan: ${rejectionReason}` : ""}`,
      schoolId: profile.school_id,
      entityType: "payment_proof",
      entityId: id,
      actionLabel: status === "approved" ? "Lihat Bukti" : "Unggah Bukti Baru",
      actionHref: status === "approved" ? `/dashboard/orang-tua/payments/receipt/${proof.payment_id}` : "/dashboard/orang-tua/payments",
      metadata: status === "rejected" ? { rejection_reason: rejectionReason } : null,
    });
  }

  return { success: true };
}
