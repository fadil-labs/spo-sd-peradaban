"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateFileSignature } from "@/lib/file-security/validate-file-signature";
import { createParentPaymentIntent } from "@/lib/payment-gateway/service";
import { PaymentIntentRequest } from "@/lib/payment-gateway/types";
import { recordFinancialAuditEvent } from "@/lib/financial-audit/actions";
import { createNotification } from "@/lib/notifications/service";
import { getAvailableMethods, getActiveProviders } from "@/lib/payments";
import type { PaymentMethodType } from "@/lib/payments/types";

export async function getParentBillsAction(statusFilter?: string) {
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

  if (profile.role !== "orang_tua") {
    redirect("/dashboard/orang-tua");
  }

  const { data: guardianRelations, error: guardianError } = await supabase
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id);

  if (guardianError) {
    console.error("getParentBillsAction guardianError:", guardianError);
    return {
      error: `Gagal memuat data anak: ${guardianError.message}`,
      detail: guardianError.code || guardianError.details || null,
    };
  }

  const studentIds = (guardianRelations || []).map((g) => g.student_id);

  if (studentIds.length === 0) {
    return { bills: [] };
  }

  let query = supabase
    .from("student_bills")
    .select(`
      id,
      school_id,
      student_id,
      student_enrollment_id,
      payment_category_id,
      amount,
      status,
      billing_period_start,
      billing_period_end,
      is_recurring,
      due_date,
      created_at,
      updated_at,
      students (id, nis, full_name),
      payment_categories (id, name, allow_installments, minimum_installment_amount)
    `)
    .in("student_id", studentIds)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: bills, error: billsError } = await query;

  if (billsError) {
    console.error("getParentBillsAction billsError:", billsError);
    return {
      error: `Gagal memuat data tagihan: ${billsError.message}`,
      detail: billsError.code || billsError.details || billsError.hint || null,
    };
  }

  const normalized = (bills || []).map((b: unknown) => {
    const bill = b as Record<string, unknown>;
    return {
      id: bill.id as string,
      school_id: bill.school_id as string,
      student_id: bill.student_id as string,
      student_enrollment_id: bill.student_enrollment_id as string,
      payment_category_id: bill.payment_category_id as string,
      amount: bill.amount as number,
      status: bill.status as string,
      billing_period_start: bill.billing_period_start as string | null,
      billing_period_end: bill.billing_period_end as string | null,
      is_recurring: bill.is_recurring as boolean,
      due_date: bill.due_date as string | null,
      created_at: bill.created_at as string,
      updated_at: bill.updated_at as string,
      students: Array.isArray(bill.students) ? bill.students[0] : bill.students,
      payment_categories: Array.isArray(bill.payment_categories) ? bill.payment_categories[0] : bill.payment_categories,
    };
  });

  return { bills: normalized };
}

export async function getParentBillDetailAction(id: string) {
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

  if (profile.role !== "orang_tua") {
    redirect("/dashboard/orang-tua");
  }

  const { data: guardianRelations, error: guardianError } = await supabase
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id);

  if (guardianError || !guardianRelations || guardianRelations.length === 0) {
    return { error: "Anda tidak memiliki akses ke tagihan ini." };
  }

  const studentIds = guardianRelations.map((g) => g.student_id);

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select(`
      id,
      school_id,
      student_id,
      student_enrollment_id,
      payment_category_id,
      amount,
      status,
      billing_period_start,
      billing_period_end,
      is_recurring,
      due_date,
      created_at,
      updated_at,
      students (id, nis, full_name),
      payment_categories (id, name, allow_installments, minimum_installment_amount)
    `)
    .eq("id", id)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (!studentIds.includes(bill.student_id)) {
    return { error: "Anda tidak memiliki akses ke tagihan ini." };
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      payment_date,
      reference_number,
      status,
      payment_method_id,
      payment_methods (id, name, method_type),
      payment_proofs (
        id,
        status,
        rejection_reason,
        created_at
      )
    `)
    .eq("student_bill_id", id)
    .order("payment_date", { ascending: false });

  if (paymentsError) {
    return { error: "Gagal memuat riwayat pembayaran." };
  }

  const normalizedBill = {
    id: bill.id,
    school_id: bill.school_id,
    student_id: bill.student_id,
    student_enrollment_id: bill.student_enrollment_id,
    payment_category_id: bill.payment_category_id,
    amount: bill.amount,
    status: bill.status,
    billing_period_start: bill.billing_period_start,
    billing_period_end: bill.billing_period_end,
    is_recurring: bill.is_recurring,
    due_date: bill.due_date,
    created_at: bill.created_at,
    updated_at: bill.updated_at,
    students: Array.isArray(bill.students) ? bill.students[0] : bill.students,
    payment_categories: Array.isArray(bill.payment_categories) ? bill.payment_categories[0] : bill.payment_categories,
  };

  const normalizedPayments = (payments || []).map((p: unknown) => {
    const payment = p as Record<string, unknown>;
    const proofs = payment.payment_proofs as unknown[] | undefined;
    const latestProof = proofs && proofs.length > 0 ? proofs[0] as Record<string, unknown> : null;
    return {
      id: payment.id as string,
      amount: payment.amount as number,
      payment_date: payment.payment_date as string,
      reference_number: payment.reference_number as string,
      status: payment.status as string,
      payment_method_id: payment.payment_method_id as string,
      payment_methods: Array.isArray(payment.payment_methods) ? payment.payment_methods[0] : payment.payment_methods,
      payment_proofs: latestProof ? {
        id: latestProof.id as string,
        status: latestProof.status as string,
        rejection_reason: latestProof.rejection_reason as string | null,
        created_at: latestProof.created_at as string,
      } : null,
    };
  });

  return { bill: normalizedBill, payments: normalizedPayments };
}

export async function getParentChildrenAction() {
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

  if (profile.role !== "orang_tua") {
    redirect("/dashboard/orang-tua");
  }

  const { data: guardianRelations, error: guardianError } = await supabase
    .from("student_guardians")
    .select(`
      student_id,
      students (
        id,
        nis,
        full_name,
        school_id,
        student_enrollments (
          id,
          academic_year_id,
          classes (id, name)
        )
      )
    `)
    .eq("guardian_profile_id", user.id);

  if (guardianError) {
    return { error: "Gagal memuat data anak." };
  }

  const children = (guardianRelations || [])
    .filter((g: unknown) => {
      const relation = g as Record<string, unknown>;
      return !!relation.students;
    })
    .map((g: unknown) => {
      const relation = g as Record<string, unknown>;
      const student = relation.students as Record<string, unknown>;
      const enrollments = student.student_enrollments as unknown[] | undefined;
      const activeEnrollment = enrollments?.find((en: unknown) => {
        const enrollment = en as Record<string, unknown>;
        return !!enrollment.classes;
      });
      const classes = activeEnrollment ? (activeEnrollment as Record<string, unknown>).classes as Record<string, unknown> | undefined : undefined;
      return {
        id: student.id as string,
        nis: student.nis as string,
        name: student.full_name as string,
        school_id: student.school_id as string,
        class_name: classes?.full_name as string || "-",
      };
    });

  return { children };
}

export async function processParentPaymentAction(
  studentBillId: string,
  amount: number,
  paymentMethodId: string,
  schoolPaymentMethodId: string,
  referenceNumber: string,
  idempotencyKey: string
) {
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

  if (profile.role !== "orang_tua") {
    redirect("/dashboard/orang-tua");
  }

  if (!studentBillId || !amount || amount <= 0 || !paymentMethodId || !schoolPaymentMethodId || !idempotencyKey) {
    return { error: "Parameter pembayaran tidak valid." };
  }

  const { data: guardianRelation, error: guardianError } = await supabase
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id)
    .single();

  if (guardianError || !guardianRelation) {
    return { error: "Anda tidak memiliki akses ke tagihan ini." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("id, school_id, status, amount, payment_category_id, student_id")
    .eq("id", studentBillId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (bill.student_id !== guardianRelation.student_id) {
    return { error: "Anda tidak memiliki akses ke tagihan ini." };
  }

  if (bill.school_id !== profile.school_id) {
    return { error: "Tagihan tidak berada di sekolah yang sama." };
  }

  if (bill.status === "paid" || bill.status === "cancelled") {
    return { error: "Tagihan tidak dapat menerima pembayaran." };
  }

  const { data: category, error: categoryError } = await supabase
    .from("payment_categories")
    .select("allow_installments, minimum_installment_amount")
    .eq("id", bill.payment_category_id)
    .single();

  if (categoryError || !category) {
    return { error: "Kategori pembayaran tidak valid." };
  }

  if (category.allow_installments && category.minimum_installment_amount && amount < category.minimum_installment_amount) {
    return { error: `Jumlah pembayaran minimal untuk kategori ini adalah Rp${category.minimum_installment_amount.toLocaleString("id-ID")}.` };
  }

  const { data: schoolMethod, error: schoolMethodError } = await supabase
    .from("school_payment_methods")
    .select("id, is_active")
    .eq("id", schoolPaymentMethodId)
    .eq("school_id", profile.school_id)
    .single();

  if (schoolMethodError || !schoolMethod) {
    return { error: "Metode pembayaran sekolah tidak valid." };
  }

  if (!schoolMethod.is_active) {
    return { error: "Metode pembayaran tidak aktif untuk sekolah ini." };
  }

  const { data: existingPayment, error: existingError } = await supabase
    .from("payments")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError) {
    return { error: "Gagal memeriksa idempotency key." };
  }

  if (existingPayment) {
    return { error: "Pembayaran dengan referensi ini sudah diproses." };
  }

  const { data: payment, error: paymentError } = await supabase.rpc("process_payment", {
    p_student_bill_id: studentBillId,
    p_amount: amount,
    p_payment_method_id: paymentMethodId,
    p_school_payment_method_id: schoolPaymentMethodId,
    p_reference_number: referenceNumber,
    p_idempotency_key: idempotencyKey,
  });

  if (paymentError) {
    if (paymentError.message.includes("Overpayment")) {
      return { error: "Jumlah pembayaran melebihi sisa tagihan." };
    }
    if (paymentError.message.includes("Bill is not payable")) {
      return { error: "Tagihan ini tidak dapat menerima pembayaran." };
    }
    if (paymentError.message.includes("Cross-school payment")) {
      return { error: "Pembayaran lintas sekolah tidak diizinkan." };
    }
    return { error: "Gagal memproses pembayaran. Silakan coba lagi." };
  }

  await recordFinancialAuditEvent({
    actionType: "payment_created",
    entityType: "payment",
    schoolId: profile.school_id,
    actorProfileId: user.id,
    actorRole: profile.role,
    paymentId: payment as string,
    studentBillId: studentBillId,
    amount: amount,
    newStatus: "completed",
    metadata: {
      payment_method_id: paymentMethodId,
      school_payment_method_id: schoolPaymentMethodId,
      reference_number: referenceNumber,
      idempotency_key: idempotencyKey,
    },
  });

  await createNotification({
    recipientProfileId: user.id,
    notificationType: "payment_completed",
    title: "Pembayaran Berhasil",
    message: `Pembayaran sebesar Rp${amount.toLocaleString("id-ID")} telah berhasil diproses.`,
    schoolId: profile.school_id,
    entityType: "payment",
    entityId: payment as string,
    actionLabel: "Lihat Bukti",
    actionHref: `/dashboard/orang-tua/payments/receipt/${payment}`,
    metadata: {
      payment_id: payment,
      student_bill_id: studentBillId,
      amount: amount,
    },
  });

  return { success: true, paymentId: payment };
}

export async function uploadPaymentProofAction(paymentId: string, file: File) {
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

  if (profile.role !== "orang_tua") {
    redirect("/dashboard/orang-tua");
  }

  const signatureResult = await validateFileSignature(file);
  if (!signatureResult.valid || !signatureResult.extension) {
    return { error: signatureResult.error || "Format file tidak didukung." };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, school_id, student_id, student_bill_id, amount")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return { error: "Pembayaran tidak ditemukan." };
  }

  const { data: guardianRelation, error: guardianError } = await supabase
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id)
    .eq("student_id", payment.student_id)
    .single();

  if (guardianError || !guardianRelation) {
    return { error: "Anda tidak memiliki akses ke pembayaran ini." };
  }

  if (payment.school_id !== profile.school_id) {
    return { error: "Pembayaran tidak berada di sekolah yang sama." };
  }

  const storagePath = `${profile.school_id}/${paymentId}/${crypto.randomUUID()}.${signatureResult.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: "Gagal mengunggah bukti pembayaran. Silakan coba lagi." };
  }

  const { error: insertError } = await supabase.from("payment_proofs").insert({
    school_id: profile.school_id,
    payment_id: paymentId,
    file_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    file_size: file.size,
    uploaded_by: user.id,
    status: "pending",
  });

  if (insertError) {
    await supabase.storage.from("payment-proofs").remove([storagePath]);
    return { error: "Gagal menyimpan data bukti pembayaran. Silakan coba lagi." };
  }

  await recordFinancialAuditEvent({
    actionType: "payment_proof_submitted",
    entityType: "payment_proof",
    schoolId: profile.school_id,
    actorProfileId: user.id,
    actorRole: profile.role,
    entityId: paymentId,
    paymentId: paymentId,
    metadata: {
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
    },
  });

  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("school_id", profile.school_id)
    .in("role", ["admin", "bendahara"]);

   if (adminProfiles && adminProfiles.length > 0) {
     for (const admin of adminProfiles) {
       await createNotification({
         recipientProfileId: admin.id,
         notificationType: "payment_proof_submitted",
         title: "Bukti Pembayaran Baru",
          message: `Ada bukti pembayaran baru untuk tagihan Rp${payment.amount.toLocaleString("id-ID")} yang menunggu verifikasi.`,
         schoolId: profile.school_id,
         entityType: "payment_proof",
         entityId: paymentId,
         actionLabel: "Verifikasi Bukti",
         actionHref: "/dashboard/admin/payment-proofs",
         metadata: {
           payment_id: paymentId,
           uploaded_by: user.id,
         },
       });
     }
   }

   if (typeof window !== "undefined") {
     window.dispatchEvent(new Event("notification:refresh"));
   }

   return { success: true };
}

export async function createParentPaymentIntentAction(studentBillId: string, amount: number, paymentMethodId: string, schoolPaymentMethodId: string, paymentMethodType: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  if (profile.role !== "orang_tua") {
    return { error: "Forbidden" };
  }

  const { data: guardianRelation, error: guardianError } = await supabase
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id)
    .single();

  if (guardianError || !guardianRelation) {
    return { error: "Anda tidak memiliki akses ke tagihan ini." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("id, school_id, status, amount, student_id, payment_category_id")
    .eq("id", studentBillId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (bill.student_id !== guardianRelation.student_id) {
    return { error: "Anda tidak memiliki akses ke tagihan ini." };
  }

  if (bill.school_id !== profile.school_id) {
    return { error: "Tagihan tidak berada di sekolah yang sama." };
  }

  if (bill.status === "paid" || bill.status === "cancelled") {
    return { error: "Tagihan ini tidak dapat menerima pembayaran." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Jumlah pembayaran tidak valid." };
  }

  if (amount > bill.amount) {
    return { error: "Jumlah pembayaran melebihi sisa tagihan." };
  }

  const { data: paymentsData, error: paymentsError } = await supabase
    .from("payments")
    .select("amount")
    .eq("student_bill_id", studentBillId)
    .in("status", ["completed", "pending"]);

  if (paymentsError) {
    return { error: "Gagal memuat data pembayaran." };
  }

  const totalPaid = (paymentsData || []).reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, bill.amount - totalPaid);

  if (amount > remainingBalance) {
    return { error: "Jumlah pembayaran melebihi sisa tagihan.", remainingBalance };
  }

  const { data: category, error: categoryError } = await supabase
    .from("payment_categories")
    .select("allow_installments, minimum_installment_amount")
    .eq("id", bill.payment_category_id)
    .single();

  if (categoryError || !category) {
    return { error: "Kategori pembayaran tidak valid." };
  }

  if (category.allow_installments && category.minimum_installment_amount && amount < category.minimum_installment_amount) {
    return { error: `Jumlah pembayaran minimal untuk kategori ini adalah Rp${category.minimum_installment_amount.toLocaleString("id-ID")}.` };
  }

  const { data: schoolMethod, error: schoolMethodError } = await supabase
    .from("school_payment_methods")
    .select("id, is_active, payment_methods (id, name, method_type, is_active)")
    .eq("id", schoolPaymentMethodId)
    .eq("school_id", profile.school_id)
    .single();

  if (schoolMethodError || !schoolMethod) {
    return { error: "Metode pembayaran sekolah tidak valid." };
  }

  if (!schoolMethod.is_active) {
    return { error: "Metode pembayaran tidak aktif untuk sekolah ini." };
  }

  const paymentMethod = Array.isArray(schoolMethod.payment_methods)
    ? schoolMethod.payment_methods[0]
    : schoolMethod.payment_methods;

  if (!paymentMethod || !paymentMethod.is_active) {
    return { error: "Metode pembayaran tidak aktif." };
  }

  const activeProvider = getActiveProviders()[0] || "mock";
  const availableMethods = getAvailableMethods(activeProvider);
  const methodType = paymentMethodType as PaymentMethodType;
  if (!availableMethods.includes(methodType)) {
    return { error: `Metode pembayaran ${paymentMethodType} tidak didukung oleh provider ${activeProvider}.` };
  }

  try {
    const result = await createParentPaymentIntent({
      studentBillId,
      amount,
      paymentMethodId,
      schoolPaymentMethodId,
      provider: "mock",
      paymentMethodType,
    });

    return { intent: result, remainingBalance };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat transaksi pembayaran.";
    return { error: message };
  }
}

export async function getParentPaymentGatewayTransactionAction(gatewayTransactionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  if (profile.role !== "orang_tua") {
    return { error: "Forbidden" };
  }

  const { data: gatewayTransaction, error: gatewayError } = await supabase
    .from("payment_gateway_transactions")
    .select("id, school_id, payment_id, provider, external_order_id, external_transaction_id, provider_status, payment_method_type, qr_code_url, expires_at, raw_payload, webhook_received_at, created_at, updated_at")
    .eq("id", gatewayTransactionId)
    .single();

  if (gatewayError || !gatewayTransaction) {
    return { error: "Transaksi gateway tidak ditemukan." };
  }

  if (gatewayTransaction.school_id !== profile.school_id) {
    return { error: "Transaksi tidak berada di sekolah yang sama." };
  }

  const rawPayload = (gatewayTransaction.raw_payload as Record<string, unknown>) || {};
  const studentBillId = rawPayload.student_bill_id as string | undefined;

  if (!studentBillId) {
    return { error: "Transaksi gateway tidak valid." };
  }

  const { data: guardianRelation, error: guardianError } = await supabase
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id)
    .single();

  if (guardianError || !guardianRelation) {
    return { error: "Anda tidak memiliki akses ke transaksi ini." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("student_id")
    .eq("id", studentBillId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (bill.student_id !== guardianRelation.student_id) {
    return { error: "Anda tidak memiliki akses ke transaksi ini." };
  }

  return {
    transaction: {
      id: gatewayTransaction.id,
      schoolId: gatewayTransaction.school_id,
      paymentId: gatewayTransaction.payment_id || "",
      provider: gatewayTransaction.provider,
      externalOrderId: gatewayTransaction.external_order_id,
      externalTransactionId: gatewayTransaction.external_transaction_id,
      providerStatus: gatewayTransaction.provider_status,
      paymentMethodType: gatewayTransaction.payment_method_type,
      qrCodeUrl: gatewayTransaction.qr_code_url,
      expiresAt: gatewayTransaction.expires_at,
      rawPayload: (gatewayTransaction.raw_payload as Record<string, unknown>) || {},
      webhookReceivedAt: gatewayTransaction.webhook_received_at,
      createdAt: gatewayTransaction.created_at,
      updatedAt: gatewayTransaction.updated_at,
    }
  };
}

export async function simulateParentWebhookAction(gatewayTransactionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  if (profile.role !== "orang_tua") {
    return { error: "Forbidden" };
  }

  const transactionResult = await getParentPaymentGatewayTransactionAction(gatewayTransactionId);

  if ("error" in transactionResult) {
    return transactionResult;
  }

  const gatewayTransaction = transactionResult.transaction as Record<string, unknown>;

  if (gatewayTransaction.provider_status !== "pending" && gatewayTransaction.provider_status !== "processing" && gatewayTransaction.provider_status !== "failed") {
    return { error: "Transaksi gateway tidak dapat disimulasikan lagi." };
  }

  const rawPayload = (gatewayTransaction.raw_payload as Record<string, unknown>) || {};
  const requestedAmount = Number(rawPayload.requested_amount || 0);

  if (!requestedAmount || requestedAmount <= 0) {
    return { error: "Jumlah pembayaran tidak valid pada transaksi gateway." };
  }

  const mockSecret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET || "replace_me";

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(mockSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const webhookPayload = {
    external_order_id: gatewayTransaction.external_order_id,
    external_transaction_id: gatewayTransaction.external_transaction_id,
    status: "success" as const,
    amount: requestedAmount,
    payment_method_type: gatewayTransaction.payment_method_type,
  };
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify(webhookPayload)));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signature = "sha256=" + signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/payment/mock`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mock-signature": signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      return { error: errorData.error || `Webhook simulation failed: ${response.status}` };
    }

    await recordFinancialAuditEvent({
      actionType: "gateway_transaction_succeeded",
      entityType: "payment_gateway_transaction",
      schoolId: profile.school_id,
      actorProfileId: user.id,
      actorRole: profile.role,
      entityId: gatewayTransaction.id as string | null,
      paymentId: (gatewayTransaction.payment_id as string | null) ?? null,
      newStatus: "success",
      metadata: {
        provider: gatewayTransaction.provider as string,
        external_order_id: gatewayTransaction.external_order_id as string,
        external_transaction_id: gatewayTransaction.external_transaction_id as string,
    },
  });

  if (gatewayTransaction.payment_id) {
    await createNotification({
      recipientProfileId: user.id,
      notificationType: "gateway_payment_success",
      title: "Pembayaran Berhasil",
      message: "Pembayaran Anda telah berhasil diproses.",
      schoolId: profile.school_id,
      entityType: "payment_gateway_transaction",
      entityId: gatewayTransaction.id as string | null,
      actionLabel: "Lihat Bukti",
      actionHref: `/dashboard/orang-tua/payments/receipt/${gatewayTransaction.payment_id}`,
      metadata: {
        payment_id: gatewayTransaction.payment_id,
        provider: gatewayTransaction.provider as string,
        external_transaction_id: gatewayTransaction.external_transaction_id as string,
      },
    });
  }

  return { success: true };
  } catch {
    return { error: "Gagal memanggil webhook simulasi." };
  }
}

export async function getParentPaymentReceiptAction(paymentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  if (profile.role !== "orang_tua") {
    return { error: "Forbidden" };
  }

  const { data: guardianRelation, error: guardianError } = await supabase
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id)
    .single();

  if (guardianError || !guardianRelation) {
    return { error: "Anda tidak memiliki akses ke data ini." };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select(`
      id,
      student_bill_id,
      amount,
      payment_date,
      reference_number,
      status,
      payment_method_id,
      payment_methods (id, name, method_type)
    `)
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return { error: "Pembayaran tidak ditemukan." };
  }

  if (payment.status !== "completed") {
    return { error: "Receipt hanya tersedia untuk pembayaran yang sudah berhasil." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select(`
      id,
      school_id,
      student_id,
      amount,
      status,
      billing_period_start,
      billing_period_end,
      payment_category_id,
      students (id, nis, full_name),
      payment_categories (id, name)
    `)
    .eq("id", payment.student_bill_id)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (bill.student_id !== guardianRelation.student_id) {
    return { error: "Anda tidak memiliki akses ke data ini." };
  }

  if (bill.school_id !== profile.school_id) {
    return { error: "Data tidak berada di sekolah yang sama." };
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("name, address, phone, email")
    .eq("id", bill.school_id)
    .single();

  if (schoolError || !school) {
    return { error: "Data sekolah tidak ditemukan." };
  }

  const { data: billPayments, error: billPaymentsError } = await supabase
    .from("payments")
    .select("amount, status")
    .eq("student_bill_id", bill.id)
    .in("status", ["completed", "pending"]);

  if (billPaymentsError) {
    return { error: "Gagal memuat data pembayaran." };
  }

  const totalPaid = (billPayments || []).reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, bill.amount - totalPaid);

  const paymentMethod = Array.isArray(payment.payment_methods)
    ? payment.payment_methods[0]
    : payment.payment_methods;

  const normalizedStudent = Array.isArray(bill.students)
    ? bill.students[0]
    : bill.students;

  const normalizedCategory = Array.isArray(bill.payment_categories)
    ? bill.payment_categories[0]
    : bill.payment_categories;

  return {
    school: {
      name: school.name,
      address: school.address,
      phone: school.phone,
      email: school.email,
    },
    student: normalizedStudent
      ? {
          full_name: normalizedStudent.full_name,
          nis: normalizedStudent.nis,
        }
      : null,
    bill: {
      id: bill.id,
      amount: bill.amount,
      status: bill.status,
      billing_period_start: bill.billing_period_start,
      billing_period_end: bill.billing_period_end,
      payment_category_name: normalizedCategory?.name || null,
    },
    payment: {
      id: payment.id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      reference_number: payment.reference_number,
      status: payment.status,
      payment_method_name: paymentMethod?.name || "-",
      payment_method_type: paymentMethod?.method_type || null,
    },
    totalPaid,
    remainingBalance,
  };
}

