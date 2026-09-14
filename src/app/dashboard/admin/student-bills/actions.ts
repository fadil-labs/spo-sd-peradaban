"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordFinancialAuditEvent } from "@/lib/financial-audit/actions";
import { createNotification } from "@/lib/notifications/service";
import { sendNewBillNotification as sendNewBillEmail } from "@/lib/notifications/email";
import { sendNewBillNotification as sendNewBillWhatsApp } from "@/lib/notifications/whatsapp";

export async function getStudentBillsAction(
  searchQuery?: string,
  statusFilter?: string,
  categoryFilter?: string,
  page?: number,
  pageSize?: number
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

  if (!["admin", "bendahara"].includes(profile.role)) {
    redirect("/dashboard/admin");
  }

  const pageNum = page && page > 0 ? page : 1;
  const pageSizeNum = pageSize && pageSize > 0 ? Math.min(pageSize, 100) : 20;
  const from = (pageNum - 1) * pageSizeNum;
  const to = from + pageSizeNum - 1;

  let query = supabase
    .from("student_bills")
    .select(
      `
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
    `,
      { count: "exact" }
    )
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (searchQuery && searchQuery.trim()) {
    const term = `%${searchQuery.trim().replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    const { data: matchedStudents } = await supabase
      .from("students")
      .select("id")
      .eq("school_id", profile.school_id)
      .or(`nis.ilike.${term},full_name.ilike.${term}`);

    if (matchedStudents && matchedStudents.length > 0) {
      const studentIds = matchedStudents.map((s) => s.id);
      query = query.in("student_id", studentIds);
    } else {
      return { bills: [], page: pageNum, pageSize: pageSizeNum, totalRows: 0 };
    }
  }

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (categoryFilter && categoryFilter !== "all") {
    query = query.eq("payment_category_id", categoryFilter);
  }

  query = query.range(from, to);

  const { data: bills, error: billsError, count } = await query;

  if (billsError) {
    console.error("[getStudentBillsAction Error]:", billsError);
    return { error: `Gagal memuat data tagihan: ${billsError.message}` };
  }

  const normalized = (bills || []).map((b: any) => ({
    id: b.id,
    school_id: b.school_id,
    student_id: b.student_id,
    student_enrollment_id: b.student_enrollment_id,
    payment_category_id: b.payment_category_id,
    amount: b.amount,
    status: b.status,
    billing_period_start: b.billing_period_start,
    billing_period_end: b.billing_period_end,
    is_recurring: b.is_recurring,
    due_date: b.due_date,
    created_at: b.created_at,
    updated_at: b.updated_at,
    students: Array.isArray(b.students) ? b.students[0] : b.students,
    payment_categories: Array.isArray(b.payment_categories)
      ? b.payment_categories[0]
      : b.payment_categories,
  }));

  return { bills: normalized, page: pageNum, pageSize: pageSizeNum, totalRows: count || 0 };
}

export async function getBillDetailAction(id: string) {
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

  if (!["admin", "bendahara", "orang_tua"].includes(profile.role)) {
    redirect("/dashboard/admin");
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select(
      `
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
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (bill.school_id !== profile.school_id) {
    return { error: "Tagihan tidak berada di sekolah yang sama." };
  }

  if (profile.role === "orang_tua") {
    const { data: guardian } = await supabase
      .from("student_guardians")
      .select("id")
      .eq("guardian_profile_id", user.id)
      .eq("student_id", bill.student_id)
      .maybeSingle();

    if (!guardian) {
      return { error: "Anda tidak memiliki akses ke tagihan ini." };
    }
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select(
      `
      id,
      amount,
      payment_date,
      reference_number,
      status,
      payment_method_id,
      payment_methods (id, name, method_type)
    `
    )
    .eq("student_bill_id", id)
    .order("payment_date", { ascending: false });

  if (paymentsError) {
    return { error: "Gagal memuat riwayat pembayaran." };
  }

  const { data: paymentMethods } = await supabase
    .from("payment_methods")
    .select("id, name, method_type")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: schoolPaymentMethods } = await supabase
    .from("school_payment_methods")
    .select("id, payment_method_id, is_active, payment_methods (id, name, method_type)")
    .eq("school_id", profile.school_id)
    .eq("is_active", true);

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
    payment_categories: Array.isArray(bill.payment_categories)
      ? bill.payment_categories[0]
      : bill.payment_categories,
  };

  const normalizedPayments = (payments || []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    payment_date: p.payment_date,
    reference_number: p.reference_number,
    status: p.status,
    payment_method_id: p.payment_method_id,
    payment_methods: Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods,
  }));

  const normalizedPaymentMethods = (paymentMethods || []).map((pm: any) => ({
    id: pm.id,
    name: pm.name,
    method_type: pm.method_type,
  }));

  const normalizedSchoolPaymentMethods = (schoolPaymentMethods || []).map((spm: any) => ({
    id: spm.id,
    payment_method_id: spm.payment_method_id,
    is_active: spm.is_active,
    payment_methods: Array.isArray(spm.payment_methods)
      ? spm.payment_methods[0]
      : spm.payment_methods,
  }));

  return {
    bill: normalizedBill,
    payments: normalizedPayments,
    paymentMethods: normalizedPaymentMethods,
    schoolPaymentMethods: normalizedSchoolPaymentMethods,
  };
}

export async function getBillTemplatesForModalAction() {
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

  if (!["admin", "bendahara"].includes(profile.role)) {
    return { error: "Forbidden" };
  }

  const { data, error } = await supabase
    .from("bill_templates")
    .select(
      `
      id,
      amount,
      payment_categories:payment_category_id (id, name),
      classes:class_id (id, name)
    `
    )
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getBillTemplatesForModalAction Error]:", error);
    return { error: `Gagal memuat templat: ${error.message}` };
  }

  const normalized = (data || []).map((t: any) => ({
    id: t.id,
    amount: t.amount,
    payment_categories: Array.isArray(t.payment_categories) ? t.payment_categories[0] : t.payment_categories,
    classes: Array.isArray(t.classes) ? t.classes[0] : t.classes,
  }));

  return { templates: normalized };
}

export async function createStudentBillAction(formData: FormData) {
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

  const studentId = String(formData.get("student_id") || "").trim();
  const studentEnrollmentId = String(formData.get("student_enrollment_id") || "").trim() || null;
  const paymentCategoryId = String(formData.get("payment_category_id") || "").trim();
  const amount = String(formData.get("amount") || "").trim();
  const isRecurring = formData.get("is_recurring") === "true";
  const billingPeriodStart = String(formData.get("billing_period_start") || "").trim() || null;
  const billingPeriodEnd = String(formData.get("billing_period_end") || "").trim() || null;
  const dueDate = String(formData.get("due_date") || "").trim() || null;

  if (!studentId || !paymentCategoryId || !amount) {
    return { error: "Siswa, kategori pembayaran, dan jumlah harus diisi." };
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return { error: "Jumlah tagihan harus lebih dari 0." };
  }

  const today = new Date().toISOString().split("T")[0];
  const dueDateValue = dueDate && dueDate.trim() ? dueDate.trim() : today;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("school_id")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return { error: "Siswa tidak ditemukan." };
  }

  if (student.school_id !== profile.school_id) {
    return { error: "Siswa tidak berada di sekolah yang sama." };
  }

  const { data: category, error: categoryError } = await supabase
    .from("payment_categories")
    .select("school_id, allow_installments, minimum_installment_amount, name")
    .eq("id", paymentCategoryId)
    .single();

  if (categoryError || !category) {
    return { error: "Kategori pembayaran tidak valid." };
  }

  if (category.school_id !== profile.school_id) {
    return { error: "Kategori pembayaran tidak berada di sekolah yang sama." };
  }

  if (isRecurring && (!billingPeriodStart || !billingPeriodEnd)) {
    return { error: "Periode tagihan harus diisi untuk tagihan berulang." };
  }

  if (studentEnrollmentId) {
    const { data: enrollment } = await supabase
      .from("student_enrollments")
      .select("school_id, student_id")
      .eq("id", studentEnrollmentId)
      .single();

    if (!enrollment || enrollment.school_id !== profile.school_id) {
      return { error: "Pendaftaran siswa tidak valid." };
    }

    if (enrollment.student_id !== studentId) {
      return { error: "Pendaftaran siswa tidak cocok dengan siswa yang dipilih." };
    }
  }

  const insertPayload = {
    school_id: profile.school_id,
    student_id: studentId,
    student_enrollment_id: studentEnrollmentId,
    payment_category_id: paymentCategoryId,
    amount: amountNum,
    status: "pending" as const,
    is_recurring: isRecurring,
    billing_period_start: billingPeriodStart,
    billing_period_end: billingPeriodEnd,
    due_date: dueDateValue,
  };

  const { error } = await supabase.from("student_bills").insert(insertPayload);

  if (error) {
    if (error.code === "23505") {
      return { error: "Tagihan untuk siswa dan kategori ini sudah ada." };
    }
    return { error: "Gagal membuat tagihan. Silakan coba lagi." };
  }

  await recordFinancialAuditEvent({
    actionType: "bill_created",
    entityType: "student_bill",
    schoolId: profile.school_id,
    actorProfileId: user.id,
    actorRole: profile.role,
    amount: amountNum,
    metadata: {
      student_id: studentId,
      payment_category_id: paymentCategoryId,
      is_recurring: isRecurring,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      due_date: dueDateValue,
    },
  });

  const { data: guardianRelations } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id")
    .eq("student_id", studentId);

  if (guardianRelations && guardianRelations.length > 0) {
    for (const relation of guardianRelations) {
      await createNotification({
        recipientProfileId: relation.guardian_profile_id,
        notificationType: "bill_created",
        title: "Tagihan Baru",
        message: `Tagihan baru sebesar Rp${amountNum.toLocaleString("id-ID")} telah dibuat.`,
        schoolId: profile.school_id,
        entityType: "student_bill",
        entityId: null,
        actionLabel: "Lihat Tagihan",
        actionHref: "/dashboard/orang-tua/bills",
        metadata: {
          student_id: studentId,
          amount: amountNum,
          payment_category_id: paymentCategoryId,
        },
      });
    }

    const billTitle = category?.name || "Tagihan";
    const dueDateFormatted = dueDateValue
      ? new Date(dueDateValue).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

    Promise.all([
      sendNewBillEmail(studentId, billTitle, amountNum, dueDateFormatted).catch((err) =>
        console.error("[Email] Error:", err)
      ),
      sendNewBillWhatsApp(studentId, billTitle, amountNum, dueDateFormatted).catch((err) =>
        console.error("[WhatsApp] Error:", err)
      ),
    ]);
  }

  return { success: true };
}

export async function generateBillsFromTemplateAction(formData: FormData) {
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

  const templateId = String(formData.get("template_id") || "").trim();
  const dueDate = String(formData.get("due_date") || "").trim() || new Date().toISOString().split("T")[0];

  if (!templateId) {
    return { error: "Silakan pilih templat tagihan terlebih dahulu." };
  }

  const { data: template, error: templateError } = await supabase
    .from("bill_templates")
    .select("*")
    .eq("id", templateId)
    .eq("school_id", profile.school_id)
    .single();

  if (templateError || !template) {
    return { error: "Templat tagihan tidak ditemukan." };
  }

  let targetStudentIds: string[] = [];

  if (template.student_id) {
    targetStudentIds = [template.student_id];
  } else if (template.class_id) {
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("class_id", template.class_id)
      .eq("school_id", profile.school_id);

    targetStudentIds = (enrollments || []).map((e) => e.student_id);
  } else {
    const { data: allStudents } = await supabase
      .from("students")
      .select("id")
      .eq("school_id", profile.school_id);

    targetStudentIds = (allStudents || []).map((s) => s.id);
  }

  if (targetStudentIds.length === 0) {
    return { error: "Tidak ada siswa yang ditemukan pada target templat ini." };
  }

  let createdCount = 0;
  for (const studentId of targetStudentIds) {
    const { error: insertError } = await supabase.from("student_bills").insert({
      school_id: profile.school_id,
      student_id: studentId,
      payment_category_id: template.payment_category_id,
      amount: template.amount,
      status: "pending",
      is_recurring: template.is_recurring,
      due_date: dueDate,
    });

    if (!insertError) {
      createdCount++;
    }
  }

  await recordFinancialAuditEvent({
    actionType: "bill_created",
    entityType: "financial_report",
    schoolId: profile.school_id,
    actorProfileId: user.id,
    actorRole: profile.role,
    amount: template.amount * createdCount,
    metadata: {
      template_id: templateId,
      generated_count: createdCount,
    },
  });

  return { success: true, count: createdCount };
}

export async function processPaymentAction(
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

  if (!["admin", "bendahara"].includes(profile.role)) {
    redirect("/dashboard/admin");
  }

  if (
    !studentBillId ||
    !amount ||
    amount <= 0 ||
    !paymentMethodId ||
    !schoolPaymentMethodId ||
    !idempotencyKey
  ) {
    return { error: "Parameter pembayaran tidak valid." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("id, school_id, status, amount, payment_category_id, student_id")
    .eq("id", studentBillId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
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
    return {
      error: `Jumlah pembayaran minimal untuk kategori ini adalah Rp${category.minimum_installment_amount.toLocaleString(
        "id-ID"
      )}.`,
    };
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

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

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

  if (bill?.student_id) {
    const { data: guardianRelations } = await supabase
      .from("student_guardians")
      .select("guardian_profile_id")
      .eq("student_id", bill.student_id);

    if (guardianRelations && guardianRelations.length > 0) {
      for (const relation of guardianRelations) {
        await createNotification({
          recipientProfileId: relation.guardian_profile_id,
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
      }
    }
  }

  return { success: true, paymentId: payment };
}

export async function getAdminPaymentReceiptAction(paymentId: string) {
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

  console.log("[DEBUG] User School ID from Profile:", profile.school_id);

  if (!["admin", "bendahara"].includes(profile.role)) {
    return { error: "Forbidden" };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select(
      `
      id,
      student_bill_id,
      amount,
      payment_date,
      reference_number,
      status,
      payment_method_id,
      payment_methods (id, name, method_type)
    `
    )
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
    .select(
      `
      id,
      school_id,
      student_id,
      amount,
      status,
      billing_period_start,
      billing_period_end,
      payment_category_id,
      installment_plan,
      students (id, nis, full_name),
      payment_categories (id, name, allow_installments, minimum_installment_amount, require_installment_schedule)
    `
    )
    .eq("id", payment.student_bill_id)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (bill.school_id !== profile.school_id) {
    return { error: "Tagihan tidak berada di sekolah yang sama." };
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("*")
    .eq("id", profile.school_id)
    .maybeSingle();

  console.log("[DEBUG] School Query Result:", school);
  console.log("[DEBUG] School Logo URL:", school?.logo_url);
  if (schoolError) console.log("[DEBUG] School Query Error:", schoolError);

  const { data: billPayments } = await supabase
    .from("payments")
    .select("amount, status")
    .eq("student_bill_id", bill.id)
    .in("status", ["completed", "pending"]);

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

  const schoolLogo = school 
    ? (school.logo_url || school.logo || school.image || school.logo_path || null) 
    : null;

  return {
    school: {
      name: school?.name || "-",
      address: school?.address || "-",
      phone: school?.phone || "-",
      email: school?.email || "-",
      logo_url: schoolLogo,
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

export async function setupInstallmentPlanAction(
  billId: string,
  plan: {
    total_installments: number;
    installment_amount: number;
    due_dates: string[];
    paid_installments?: number[];
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Anda harus login." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profil tidak ditemukan." };
  }

  if (!["admin", "bendahara"].includes(profile.role)) {
    return { error: "Akses ditolak." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("id, school_id, amount, status, payment_category_id")
    .eq("id", billId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (bill.school_id !== profile.school_id) {
    return { error: "Tagihan tidak berada di sekolah yang sama." };
  }

  if (bill.status === "paid" || bill.status === "cancelled") {
    return { error: "Tidak dapat mengatur cicilan untuk tagihan yang sudah lunas atau dibatalkan." };
  }

  const { data: category, error: categoryError } = await supabase
    .from("payment_categories")
    .select("allow_installments, require_installment_schedule")
    .eq("id", bill.payment_category_id)
    .single();

  if (categoryError || !category) {
    return { error: "Kategori pembayaran tidak valid." };
  }

  if (!category.allow_installments) {
    return { error: "Kategori pembayaran ini tidak mengizinkan pembayaran cicilan." };
  }

  if (plan.total_installments < 2 || plan.total_installments > 12) {
    return { error: "Total cicilan harus antara 2 hingga 12." };
  }

  if (plan.installment_amount <= 0) {
    return { error: "Nominal cicilan harus lebih dari 0." };
  }

  if (!plan.due_dates || plan.due_dates.length !== plan.total_installments) {
    return { error: "Jumlah tanggal jatuh tempo harus sesuai dengan total cicilan." };
  }

  const totalInstallmentAmount = plan.installment_amount * plan.total_installments;
  if (totalInstallmentAmount < bill.amount) {
    return { error: `Total cicilan (Rp${totalInstallmentAmount.toLocaleString("id-ID")}) kurang dari jumlah tagihan (Rp${bill.amount.toLocaleString("id-ID")}).` };
  }

  const installments = plan.due_dates.map((dueDate, index) => ({
    number: index + 1,
    amount: plan.installment_amount,
    due_date: dueDate,
    status: plan.paid_installments?.includes(index + 1) ? "paid" : "pending",
  }));

  const installmentPlan = {
    total_installments: plan.total_installments,
    installment_amount: plan.installment_amount,
    current_installment: (plan.paid_installments?.length || 0) + 1,
    paid_installments: plan.paid_installments || [],
    installments,
  };

  const { error: updateError } = await supabase
    .from("student_bills")
    .update({ installment_plan: installmentPlan })
    .eq("id", billId);

  if (updateError) {
    return { error: "Gagal menyimpan rencana cicilan." };
  }

  await recordFinancialAuditEvent({
    actionType: "installment_plan_created",
    entityType: "student_bill",
    schoolId: profile.school_id,
    actorProfileId: user.id,
    actorRole: profile.role,
    studentBillId: billId,
    metadata: { installment_plan: installmentPlan },
  });

  return { success: true, installment_plan: installmentPlan };
}

export async function removeInstallmentPlanAction(billId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Anda harus login." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profil tidak ditemukan." };
  }

  if (!["admin", "bendahara"].includes(profile.role)) {
    return { error: "Akses ditolak." };
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("id, school_id")
    .eq("id", billId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (bill.school_id !== profile.school_id) {
    return { error: "Tagihan tidak berada di sekolah yang sama." };
  }

  const { error: updateError } = await supabase
    .from("student_bills")
    .update({ installment_plan: null })
    .eq("id", billId);

  if (updateError) {
    return { error: "Gagal menghapus rencana cicilan." };
  }

  await recordFinancialAuditEvent({
    actionType: "installment_plan_removed",
    entityType: "student_bill",
    schoolId: profile.school_id,
    actorProfileId: user.id,
    actorRole: profile.role,
    studentBillId: billId,
    metadata: null,
  });

  return { success: true };
}
