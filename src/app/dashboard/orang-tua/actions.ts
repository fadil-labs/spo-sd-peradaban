"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateFileSignature } from "@/lib/file-security/validate-file-signature";
import { createParentPaymentIntent } from "@/lib/payment-gateway/service";
import { PaymentIntentRequest } from "@/lib/payment-gateway/types";
import { recordFinancialAuditEvent } from "@/lib/financial-audit/actions";
import { createNotification } from "@/lib/notifications/service";
import { getAvailableMethods, getActiveProviders } from "@/lib/payments";
import type { PaymentMethodType } from "@/lib/payments/types";


export async function getParentBillsAction(statusFilter?: string) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

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

  const { data: guardianRelations, error: guardianError } = await supabaseAdmin
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
      installment_plan,
      students (id, nis, full_name),
      payment_categories (id, name, allow_installments, minimum_installment_amount, require_installment_schedule)
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
      installment_plan: bill.installment_plan || null,
    };
  });

  return { bills: normalized };
}

export async function getParentBillDetailAction(id: string) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

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

  const { data: guardianRelations, error: guardianError } = await supabaseAdmin
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id);

  if (guardianError) {
    console.error("[getParentBillDetailAction] guardianError:", guardianError);
    return { error: "Gagal memuat data wali: " + guardianError.message };
  }


  if (!guardianRelations || guardianRelations.length === 0) {
    console.error("[getParentBillDetailAction] No guardian relations for user:", user.id);
    return { error: "Anda tidak memiliki relasi wali yang terdaftar." };
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
      installment_plan,
      students (id, nis, full_name),
      payment_categories (id, name, allow_installments, minimum_installment_amount, require_installment_schedule)
    `)
    .eq("id", id)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
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
    installment_plan: bill.installment_plan || null,
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
  const supabaseAdmin = await createAdminClient();

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

  const { data: guardianRelations, error: guardianError } = await supabaseAdmin
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
  const supabaseAdmin = await createAdminClient();

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

  const { data: guardianRelations, error: guardianError } = await supabaseAdmin
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id);

  if (guardianError) {
    console.error("[processParentPaymentAction] guardianError:", guardianError);
    return { error: "Gagal memverifikasi akses wali: " + guardianError.message };
  }

  const billStudentIds = (guardianRelations || []).map((g) => g.student_id);

  if (billStudentIds.length === 0) {
    console.error("[processParentPaymentAction] No guardian relation for user:", user.id);
    return { error: "Anda tidak memiliki relasi wali yang terdaftar." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("id, school_id, status, amount, payment_category_id, student_id")
    .eq("id", studentBillId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (!billStudentIds.includes(bill.student_id)) {
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
    .select("allow_installments, minimum_installment_amount, require_installment_schedule")
    .eq("id", bill.payment_category_id)
    .single();

  if (categoryError || !category) {
    return { error: "Kategori pembayaran tidak valid." };
  }

  const { data: billWithPlan, error: billPlanError } = await supabase
    .from("student_bills")
    .select("installment_plan")
    .eq("id", studentBillId)
    .single();

  if (billPlanError) {
    return { error: "Gagal memuat data cicilan tagihan." };
  }

  const installmentPlan = billWithPlan?.installment_plan as Record<string, unknown> | null;

  if (installmentPlan && category.require_installment_schedule) {
    const currentInstallment = (installmentPlan.current_installment as number) || 1;
    const totalInstallments = (installmentPlan.total_installments as number) || 0;
    const installmentAmount = Number(installmentPlan.installment_amount || 0);
    const paidInstallments = (installmentPlan.paid_installments as number[]) || [];

    if (currentInstallment > totalInstallments) {
      return { error: "Semua cicilan untuk tagihan ini sudah lunas." };
    }

    if (paidInstallments.includes(currentInstallment)) {
      return { error: `Cicilan ${currentInstallment} sudah dibayar.` };
    }

    if (installmentAmount > 0 && amount !== installmentAmount) {
      return {
        error: `Nominal cicilan ke-${currentInstallment} harus exactly Rp${installmentAmount.toLocaleString(
          "id-ID"
        )}.`,
      };
    }
  } else if (!installmentPlan && category.allow_installments && category.minimum_installment_amount && amount < category.minimum_installment_amount) {
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
    if (paymentError.message.includes("Installment amount must be exactly")) {
      return { error: paymentError.message };
    }
    if (paymentError.message.includes("All installments have been paid")) {
      return { error: "Semua cicilan untuk tagihan ini sudah lunas." };
    }
    if (paymentError.message.includes("already been paid")) {
      return { error: paymentError.message };
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

export async function createParentPaymentIntentAction(studentBillId: string, amount: number, paymentMethodId: string, schoolPaymentMethodId: string, paymentMethodType: string) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

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

  const { data: guardianRelations, error: guardianError } = await supabaseAdmin
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id);

  if (guardianError) {
    return { error: "Gagal memverifikasi akses wali." };
  }

  const billStudentIds = (guardianRelations || []).map((g) => g.student_id);

  if (billStudentIds.length === 0) {
    return { error: "Anda tidak memiliki relasi wali yang terdaftar." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("id, school_id, status, amount, student_id, payment_category_id, installment_plan")
    .eq("id", studentBillId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (!billStudentIds.includes(bill.student_id)) {
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

  // Ambil semua riwayat pembayaran dan buktinya secara dinamis
  const { data: paymentsData, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, status, payment_proofs(status)")
    .eq("student_bill_id", studentBillId);

  if (paymentsError) {
    return { error: "Gagal memuat data pembayaran." };
  }

  // Hitung total pembayaran yang sukses atau buktinya sudah di-approve
  const successfulPayments = (paymentsData || []).filter((p: any) => {
    const proof = Array.isArray(p.payment_proofs) ? p.payment_proofs[0] : p.payment_proofs;
    const isApprovedProof = proof && typeof proof === "object" && proof.status === "approved";
    return p.status === "completed" || p.status === "success" || isApprovedProof;
  });

  const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, bill.amount - totalPaid);

  if (amount > remainingBalance) {
    return { error: "Jumlah pembayaran melebihi sisa tagihan.", remainingBalance };
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

  try {
    const result = await createParentPaymentIntent({
      studentBillId,
      amount,
      paymentMethodId,
      schoolPaymentMethodId,
      provider: "midtrans",
      paymentMethodType: paymentMethodType as PaymentMethodType,
    });

    return { intent: result, remainingBalance };
  } catch (err: any) {
    console.error("Detail error payment intent:", err);
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    return { error: `Gagal: ${errorMessage}` };
  }
}

export async function getParentPaymentGatewayTransactionAction(gatewayTransactionId: string) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

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

  const { data: guardianRelations, error: guardianError } = await supabaseAdmin
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id);

  if (guardianError) {
    return { error: "Gagal memverifikasi akses wali." };
  }

  const billStudentIds = (guardianRelations || []).map((g) => g.student_id);

  if (billStudentIds.length === 0) {
    return { error: "Anda tidak memiliki relasi wali yang terdaftar." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("student_id")
    .eq("id", studentBillId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (!billStudentIds.includes(bill.student_id)) {
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
  const supabaseAdmin = await createAdminClient();

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

  const { data: gatewayTransaction, error: gatewayError } = await supabaseAdmin
    .from("payment_gateway_transactions")
    .select("id, school_id, payment_id, provider, external_order_id, external_transaction_id, provider_status, payment_method_type, raw_payload")
    .eq("id", gatewayTransactionId)
    .single();

  if (gatewayError || !gatewayTransaction) {
    return { error: "Transaksi gateway tidak ditemukan." };
  }

  if (gatewayTransaction.school_id !== profile.school_id) {
    return { error: "Transaksi tidak berada di sekolah yang sama." };
  }

  if (gatewayTransaction.provider_status !== "pending" && gatewayTransaction.provider_status !== "processing" && gatewayTransaction.provider_status !== "failed") {
    return { error: "Transaksi gateway tidak dapat disimulasikan lagi." };
  }

  const rawPayload = (gatewayTransaction.raw_payload as Record<string, unknown>) || {};
  const requestedAmount = Number(rawPayload.requested_amount || 0);

  if (!requestedAmount || requestedAmount <= 0) {
    return { error: "Jumlah pembayaran tidak valid pada transaksi gateway." };
  }

  const now = new Date().toISOString();

  const { data: updatedTransaction, error: updateError } = await supabaseAdmin
    .from("payment_gateway_transactions")
    .update({
      provider_status: "processing",
      updated_at: now,
    })
    .eq("id", gatewayTransaction.id)
    .in("provider_status", ["pending", "failed"])
    .select("id, provider_status, payment_id, school_id")
    .single();

  if (updateError || !updatedTransaction) {
    return { error: "Gagal memperbarui status transaksi gateway." };
  }

  try {
    console.log("[simulateParentWebhookAction] updatedTransaction:", updatedTransaction);
    if (updatedTransaction.payment_id) {
      console.log("[simulateParentWebhookAction] calling finalize_pending_payment with idempotency:", `gw-${gatewayTransaction.external_order_id}`);
      const { data: payment, error: paymentError } = await supabaseAdmin.rpc("finalize_pending_payment", {
        p_idempotency_key: `gw-${gatewayTransaction.external_order_id}`,
      });
      console.log("[simulateParentWebhookAction] finalize result:", { payment, paymentError });

      if (paymentError) {
        await supabaseAdmin
          .from("payment_gateway_transactions")
          .update({
            provider_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", updatedTransaction.id)
          .eq("provider_status", "processing");

        return { error: "Pembayaran gagal diselesaikan." };
      }

      const updatePayload: Record<string, unknown> = {
        provider_status: "success",
        updated_at: now,
        webhook_received_at: now,
        raw_payload: {
          ...rawPayload,
          webhook_payload: {
            external_order_id: gatewayTransaction.external_order_id,
            external_transaction_id: gatewayTransaction.external_transaction_id,
            status: "success",
            amount: requestedAmount,
            payment_method_type: gatewayTransaction.payment_method_type,
          },
        },
        payment_id: updatedTransaction.payment_id,
      };

      if (gatewayTransaction.external_transaction_id) {
        updatePayload.external_transaction_id = gatewayTransaction.external_transaction_id;
      }

      if (gatewayTransaction.payment_method_type) {
        updatePayload.payment_method_type = gatewayTransaction.payment_method_type;
      }

      const { error: successUpdateError } = await supabaseAdmin
        .from("payment_gateway_transactions")
        .update(updatePayload)
        .eq("id", updatedTransaction.id)
        .eq("provider_status", "processing");

      if (successUpdateError) {
        return { error: "Gagal menyelesaikan transaksi gateway." };
      }
    } else {
      await supabaseAdmin
        .from("payment_gateway_transactions")
        .update({
          provider_status: "success",
          updated_at: now,
          webhook_received_at: now,
          raw_payload: {
            ...rawPayload,
            webhook_payload: {
              external_order_id: gatewayTransaction.external_order_id,
              external_transaction_id: gatewayTransaction.external_transaction_id,
              status: "success",
              amount: requestedAmount,
              payment_method_type: gatewayTransaction.payment_method_type,
            },
          },
        })
        .eq("id", updatedTransaction.id)
        .eq("provider_status", "processing");
    }

    await recordFinancialAuditEvent({
      actionType: "gateway_transaction_succeeded",
      entityType: "payment_gateway_transaction",
      schoolId: profile.school_id,
      actorProfileId: user.id,
      actorRole: profile.role,
      entityId: gatewayTransaction.id,
      paymentId: updatedTransaction.payment_id || null,
      newStatus: "success",
      metadata: {
        provider: gatewayTransaction.provider,
        external_order_id: gatewayTransaction.external_order_id,
        external_transaction_id: gatewayTransaction.external_transaction_id,
      },
    });

    if (updatedTransaction.payment_id) {
      await createNotification({
        recipientProfileId: user.id,
        notificationType: "gateway_payment_success",
        title: "Pembayaran Berhasil",
        message: "Pembayaran Anda telah berhasil diproses.",
        schoolId: profile.school_id,
        entityType: "payment_gateway_transaction",
        entityId: gatewayTransaction.id,
        actionLabel: "Lihat Bukti",
        actionHref: `/dashboard/orang-tua/payments/receipt/${updatedTransaction.payment_id}`,
        metadata: {
          payment_id: updatedTransaction.payment_id,
          provider: gatewayTransaction.provider,
          external_transaction_id: gatewayTransaction.external_transaction_id,
        },
      });
    }

    return { success: true };
  } catch {
    await supabaseAdmin
      .from("payment_gateway_transactions")
      .update({
        provider_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedTransaction.id)
      .eq("provider_status", "processing");

    return { error: "Gagal memproses simulasi pembayaran." };
  }
}

export async function getParentPaymentReceiptAction(paymentId: string) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

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

  const { data: guardianRelations, error: guardianError } = await supabaseAdmin
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id);

  if (guardianError) {
    return { error: "Gagal memverifikasi akses wali." };
  }

  const billStudentIds = (guardianRelations || []).map((g) => g.student_id);

  if (billStudentIds.length === 0) {
    return { error: "Anda tidak memiliki relasi wali yang terdaftar." };
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

  const { data: paymentBill, error: paymentBillError } = await supabase
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

  if (paymentBillError || !paymentBill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (!billStudentIds.includes(paymentBill.student_id)) {
    return { error: "Anda tidak memiliki akses ke data ini." };
  }

  if (paymentBill.school_id !== profile.school_id) {
    return { error: "Data tidak berada di sekolah yang sama." };
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("name, address, phone, email")
    .eq("id", paymentBill.school_id)
    .single();

  if (schoolError || !school) {
    return { error: "Data sekolah tidak ditemukan." };
  }

  const { data: billPayments, error: billPaymentsError } = await supabase
    .from("payments")
    .select("amount, status")
    .eq("student_bill_id", paymentBill.id)
    .in("status", ["completed", "pending"]);

  if (billPaymentsError) {
    return { error: "Gagal memuat data pembayaran." };
  }

  const totalPaid = (billPayments || []).reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, paymentBill.amount - totalPaid);

  const paymentMethod = Array.isArray(payment.payment_methods)
    ? payment.payment_methods[0]
    : payment.payment_methods;

  const normalizedStudent = Array.isArray(paymentBill.students)
    ? paymentBill.students[0]
    : paymentBill.students;

  const normalizedCategory = Array.isArray(paymentBill.payment_categories)
    ? paymentBill.payment_categories[0]
    : paymentBill.payment_categories;

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
      id: paymentBill.id,
      amount: paymentBill.amount,
      status: paymentBill.status,
      billing_period_start: paymentBill.billing_period_start,
      billing_period_end: paymentBill.billing_period_end,
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
