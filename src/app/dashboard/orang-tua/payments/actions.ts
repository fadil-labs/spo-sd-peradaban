"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type ParentPaymentHistoryFilters = {
  status?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
};

export type ParentPaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  reference_number: string | null;
  status: string;
  payment_methods: { id: string; name: string; method_type: string } | null;
  student_bills: {
    id: string;
    amount: number;
    status: string;
    billing_period_start: string | null;
    billing_period_end: string | null;
  } | null;
  students: { id: string; nis: string; full_name: string } | null;
};

export type PaymentIntentResult = {
  id: string;
  provider: string;
  providerStatus: string;
  externalOrderId: string;
  paymentMethodType: string;
  qrCodeUrl?: string;
  rawPayload?: Record<string, unknown>;
  paymentId?: string;
  expiresAt?: string;
};

export async function getParentPaymentHistoryAction(filters?: ParentPaymentHistoryFilters) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
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

  if (guardianError || !guardianRelations || guardianRelations.length === 0) {
    return { payments: [], page: 1, pageSize: 20, totalRows: 0 };
  }

  const studentIds = guardianRelations.map((g: { student_id: string }) => g.student_id);

  const { data: bills, error: billsError } = await supabaseAdmin
    .from("student_bills")
    .select("id")
    .in("student_id", studentIds);

  if (billsError || !bills || bills.length === 0) {
    return { payments: [], page: 1, pageSize: 20, totalRows: 0 };
  }

  const billIds = bills.map((b) => b.id);

  const page = filters?.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters?.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("payments")
    .select(
      `
      id,
      amount,
      payment_date,
      reference_number,
      status,
      payment_method_id,
      student_bill_id,
      students (
        id,
        nis,
        full_name
      ),
      payment_methods (
        id,
        name,
        method_type
      ),
      student_bills (
        id,
        amount,
        status,
        billing_period_start,
        billing_period_end
      ),
      payment_proofs (
        status
      )
    `,
      { count: "exact" }
    )
    .in("student_bill_id", billIds)
    .order("payment_date", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.startDate) {
    query = query.gte("payment_date", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("payment_date", filters.endDate);
  }

  if (filters?.searchQuery) {
    query = query.or(
      `students.nis.ilike.%${filters.searchQuery}%,students.full_name.ilike.%${filters.searchQuery}%`
    );
  }

  const { data: payments, error: paymentsError, count } = await query;

  if (paymentsError) {
    return { error: "Gagal memuat riwayat pembayaran." };
  }

  const normalized: ParentPaymentRow[] = (payments || []).map(
    (p: Record<string, unknown>) => {
      const student = Array.isArray(p.students) ? p.students[0] : p.students;
      const method = Array.isArray(p.payment_methods)
        ? p.payment_methods[0]
        : p.payment_methods;
      const bill = Array.isArray(p.student_bills)
        ? p.student_bills[0]
        : p.student_bills;
      const proof = Array.isArray(p.payment_proofs) ? p.payment_proofs[0] : p.payment_proofs;

      let paymentStatus = p.status as string;
      if (proof && typeof proof === "object" && "status" in proof && proof.status === "approved") {
        paymentStatus = "success";
        
        if (p.status !== "success" && p.status !== "completed") {
          supabaseAdmin
            .from("payments")
            .update({ status: "success" })
            .eq("id", p.id)
            .then(() => {});
        }
      }

      return {
        id: p.id as string,
        amount: p.amount as number,
        payment_date: p.payment_date as string,
        reference_number: p.reference_number as string | null,
        status: paymentStatus,
        students: student
          ? {
              id: student.id as string,
              nis: student.nis as string,
              full_name: student.full_name as string,
            }
          : null,
        payment_methods: method
          ? {
              id: method.id as string,
              name: method.name as string,
              method_type: method.method_type as string,
            }
          : null,
        student_bills: bill
          ? {
              id: bill.id as string,
              amount: bill.amount as number,
              status: bill.status as string,
              billing_period_start: bill.billing_period_start as string | null,
              billing_period_end: bill.billing_period_end as string | null,
            }
          : null,
      };
    }
  );

  return {
    payments: normalized,
    page,
    pageSize,
    totalRows: count || 0,
  };
}

export async function getParentBillDetailAction(billId: string) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: guardianRelations, error: guardianError } = await supabaseAdmin
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id);

  if (guardianError || !guardianRelations || guardianRelations.length === 0) {
    return { error: "Anda tidak memiliki akses ke tagihan ini." };
  }

  const allowedStudentIds = guardianRelations.map((g) => g.student_id);

  const { data: bill, error: billError } = await supabaseAdmin
    .from("student_bills")
    .select(`
      id,
      student_id,
      amount,
      status,
      billing_period_start,
      billing_period_end,
      is_recurring,
      due_date,
      created_at,
      installment_plan,
      students (
        id,
        nis,
        full_name
      ),
      payment_categories (
        id,
        name,
        allow_installments,
        minimum_installment_amount
      )
    `)
    .eq("id", billId)
    .maybeSingle();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (!allowedStudentIds.includes(bill.student_id)) {
    return { error: "Anda tidak memiliki akses ke tagihan ini." };
  }

  const { data: paymentsData, error: paymentsError } = await supabaseAdmin
    .from("payments")
    .select(`
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
      payment_proofs (
        id,
        status,
        rejection_reason,
        created_at
      )
    `)
    .eq("student_bill_id", billId)
    .order("payment_date", { ascending: false });

  if (paymentsError) {
    return { error: "Gagal memuat riwayat pembayaran tagihan." };
  }

  const student = Array.isArray(bill.students) ? bill.students[0] : bill.students;
  const category = Array.isArray(bill.payment_categories)
    ? bill.payment_categories[0]
    : bill.payment_categories;

  const normalizedPayments = (paymentsData || []).map((p: Record<string, unknown>) => {
    const method = Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods;
    const proof = Array.isArray(p.payment_proofs) ? p.payment_proofs[0] : p.payment_proofs;
    
    let currentStatus = p.status as string;
    if (proof && typeof proof === "object" && "status" in proof && proof.status === "approved") {
      currentStatus = "success";
      
      if (p.status !== "success" && p.status !== "completed") {
        supabaseAdmin
          .from("payments")
          .update({ status: "success" })
          .eq("id", p.id)
          .then(() => {});
      }
    }

    return {
      ...p,
      status: currentStatus,
      payment_methods: method || null,
      payment_proofs: proof || null,
    };
  });

  let dynamicInstallmentPlan = bill.installment_plan;
  if (dynamicInstallmentPlan && typeof dynamicInstallmentPlan === "object") {
    const plan = JSON.parse(JSON.stringify(dynamicInstallmentPlan));
    
    // Ambil semua pembayaran yang statusnya sukses / berhasil
    const successfulPayments = normalizedPayments.filter(
      (p: any) => p.status === "success" || p.status === "completed"
    );
    const paidCount = successfulPayments.length;
    const total = plan.total_installments || 3;

    // OTOMATIS GENERATE & UPDATE ARRAY INSTALLMENTS DAN PAID_INSTALLMENTS
    const paidInstallments: number[] = [];
    plan.installments = [];

    for (let i = 1; i <= total; i++) {
      let instStatus = "unpaid";
      if (i <= paidCount) {
        paidInstallments.push(i);
        instStatus = "paid"; // Lunas
      } else if (i === paidCount + 1) {
        instStatus = "current"; // Cicilan berikutnya
      }

      plan.installments.push({
        number: i,
        amount: plan.installment_amount || Math.round(bill.amount / total),
        due_date: plan.installments?.[i - 1]?.due_date || bill.due_date || new Date().toISOString(),
        status: instStatus,
      });
    }

    plan.paid_installments = paidInstallments;
    plan.current_installment = Math.min(total, paidCount + 1);
    plan.paid_count = paidCount;
    dynamicInstallmentPlan = plan;
  }

  const normalizedBill = {
    ...bill,
    installment_plan: dynamicInstallmentPlan,
    students: student || null,
    payment_categories: category || null,
  };

  return {
    bill: normalizedBill,
    payments: normalizedPayments,
  };
}

export async function createParentPaymentIntentAction(
  studentBillId: string, 
  amount: number, 
  paymentMethodId: string, 
  schoolPaymentMethodId: string, 
  paymentMethodType: string
) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "orang_tua") {
    return { error: "Forbidden" };
  }

  const { data: bill, error: billError } = await supabaseAdmin
    .from("student_bills")
    .select("id, school_id, student_id, amount")
    .eq("id", studentBillId)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (bill.school_id !== profile.school_id) {
    return { error: "Tagihan tidak berada di sekolah yang sama." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Jumlah pembayaran tidak valid." };
  }

  const tempId = crypto.randomUUID().slice(0, 8);
  const externalOrderId = `TRX-${tempId}`;
  const idempotencyKey = `gw-${externalOrderId}`;

  // 1. Buat record pembayaran dengan idempotency_key
  const { data: newPayment, error: createError } = await supabaseAdmin
    .from("payments")
    .insert({
      school_id: bill.school_id,
      student_id: bill.student_id,
      student_bill_id: studentBillId,
      amount: amount,
      payment_method_id: paymentMethodId,
      status: "pending",
      payment_date: new Date().toISOString(),
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  if (createError || !newPayment) {
    console.error("Detail error create payment:", createError);
    return { error: `Gagal membuat transaksi pembayaran: ${createError?.message || "Kesalahan database"}` };
  }

  // 2. Buat record di payment_gateway_transactions agar simulasi webhook bisa berjalan
  const { data: gwTx, error: gwError } = await supabaseAdmin
    .from("payment_gateway_transactions")
    .insert({
      school_id: bill.school_id,
      payment_id: newPayment.id,
      provider: "MockGateway",
      external_order_id: externalOrderId,
      provider_status: "pending",
      payment_method_type: paymentMethodType,
      raw_payload: {
        requested_amount: amount,
        student_bill_id: studentBillId,
      },
    })
    .select("id")
    .single();

  if (gwError) {
    console.error("Detail error create gateway transaction:", gwError);
  }

  const paymentIntentResult = {
    id: gwTx ? gwTx.id : newPayment.id,
    provider: "MockGateway",
    providerStatus: "pending",
    externalOrderId: externalOrderId,
    paymentMethodType: paymentMethodType,
    qrCodeUrl: paymentMethodType === "QRIS" ? "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=DEMO_QRIS" : undefined,
    rawPayload: { requested_amount: amount, student_bill_id: studentBillId },
    paymentId: newPayment.id,
  };

  return { intent: paymentIntentResult };
}

export async function getParentPaymentGatewayTransactionAction(gatewayTransactionId: string) {
  const mockIntent: PaymentIntentResult = {
    id: gatewayTransactionId,
    provider: "MockGateway",
    providerStatus: "pending",
    externalOrderId: `TRX-${gatewayTransactionId.slice(0, 8)}`,
    paymentMethodType: "QRIS",
    rawPayload: { requested_amount: 0 },
  };

  return { transaction: mockIntent };
}

export async function simulateParentWebhookAction(gatewayTransactionId: string) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "orang_tua") {
    return { error: "Forbidden" };
  }

  // 1. Ambil data transaksi gateway
  const { data: gatewayTransaction, error: gatewayError } = await supabaseAdmin
    .from("payment_gateway_transactions")
    .select("id, school_id, payment_id, provider, external_order_id, provider_status, raw_payload")
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
  const now = new Date().toISOString();

  // 2. Perbarui status transaksi gateway menjadi success
  const { error: gwUpdateError } = await supabaseAdmin
    .from("payment_gateway_transactions")
    .update({
      provider_status: "success",
      updated_at: now,
      webhook_received_at: now,
    })
    .eq("id", gatewayTransaction.id);

  if (gwUpdateError) {
    return { error: "Gagal memperbarui status transaksi gateway." };
  }

  // 3. Jika ada payment_id, ubah status pembayaran menjadi completed
  if (gatewayTransaction.payment_id) {
    const { error: paymentUpdateError } = await supabaseAdmin
      .from("payments")
      .update({
        status: "completed",
      })
      .eq("id", gatewayTransaction.payment_id);

    if (paymentUpdateError) {
      console.error("Gagal memperbarui status payments:", paymentUpdateError);
    }
  }

  // 4. Perbarui status tagihan (bill) menjadi partial atau paid secara dinamis
  if (studentBillId) {
    const { data: billData } = await supabaseAdmin
      .from("student_bills")
      .select("amount")
      .eq("id", studentBillId)
      .single();

    const { data: allPayments } = await supabaseAdmin
      .from("payments")
      .select("amount, status, payment_proofs(status)")
      .eq("student_bill_id", studentBillId);

    if (billData && allPayments) {
      const totalPaid = allPayments.reduce((sum, p: any) => {
        const proof = Array.isArray(p.payment_proofs) ? p.payment_proofs[0] : p.payment_proofs;
        const isApproved = proof && typeof proof === "object" && proof.status === "approved";
        const isSuccess = p.status === "completed" || p.status === "success" || isApproved;
        return sum + (isSuccess ? p.amount : 0);
      }, 0);

      const newBillStatus = totalPaid >= billData.amount ? "paid" : "partial";

      await supabaseAdmin
        .from("student_bills")
        .update({ status: newBillStatus })
        .eq("id", studentBillId);
    }
  }

  return { success: true };
}

export async function uploadPaymentProofAction(paymentId: string, file: File) {
  return { success: true };
}

export async function getParentPaymentReceiptAction(paymentId: string) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments")
    .select(`
      id,
      student_bill_id,
      amount,
      payment_date,
      reference_number,
      status,
      payment_methods (id, name, method_type)
    `)
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return { error: "Pembayaran tidak ditemukan." };
  }

  const { data: bill, error: billError } = await supabaseAdmin
    .from("student_bills")
    .select(`
      id,
      school_id,
      student_id,
      amount,
      status,
      billing_period_start,
      billing_period_end,
      installment_plan,
      students (id, nis, full_name),
      payment_categories (id, name)
    `)
    .eq("id", payment.student_bill_id)
    .single();

  if (billError || !bill) {
    return { error: "Tagihan tidak ditemukan." };
  }

  const { data: guardian } = await supabaseAdmin
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", user.id)
    .eq("student_id", bill.student_id)
    .maybeSingle();

  if (!guardian) {
    return { error: "Anda tidak memiliki akses ke kuitansi ini." };
  }

  const { data: school } = await supabaseAdmin
    .from("schools")
    .select("*")
    .eq("id", bill.school_id)
    .maybeSingle();

  const { data: billPayments } = await supabaseAdmin
    .from("payments")
    .select("id, amount, status, payment_date")
    .eq("student_bill_id", bill.id)
    .order("payment_date", { ascending: true });

  const totalPaid = (billPayments || []).reduce((sum, p) => {
    const isSuccess = p.status === "completed" || p.status === "success";
    return sum + (isSuccess ? p.amount : 0);
  }, 0);

  const remainingBalance = Math.max(0, bill.amount - totalPaid);

  // LOGIKA UTAMA CICILAN KUITANSI YANG TAHAN BANTING
  let installmentInfo: { isInstallment: boolean; current: number; total: number } | null = null;
  const rawBillPayments = (billPayments || []) as any[];
  
  // Ambil semua pembayaran yang sukses
  const successfulPayments = rawBillPayments.filter((p: any) => p.status === "completed" || p.status === "success");
  
  // Urutkan kronologis berdasarkan tanggal
  successfulPayments.sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

  const index = successfulPayments.findIndex((p: any) => p.id === paymentId);
  const current = index !== -1 ? index + 1 : 1;

  let total = 3; // Default standar cicilan jika plan kosong
  const rawPlan = bill.installment_plan as any;
  if (rawPlan && typeof rawPlan === "object") {
    total = rawPlan.total_installments || (rawPlan.installments ? rawPlan.installments.length : 3);
  } else if (successfulPayments.length > 0) {
    total = Math.max(successfulPayments.length, 3);
  }

  if (successfulPayments.length > 0 || bill.status === "partial" || bill.status === "paid" || rawPlan) {
    installmentInfo = {
      isInstallment: true,
      current,
      total,
    };
  }

  const paymentMethod = Array.isArray(payment.payment_methods) ? payment.payment_methods[0] : payment.payment_methods;
  const normalizedStudent = Array.isArray(bill.students) ? bill.students[0] : bill.students;
  const normalizedCategory = Array.isArray(bill.payment_categories) ? bill.payment_categories[0] : bill.payment_categories;

  const rawLogo = school 
    ? (school.logo_url || school.logo || school.image || school.logo_path || school.avatar_url || null) 
    : null;

  let finalLogoUrl = null;
  if (rawLogo) {
    if (rawLogo.startsWith("http://") || rawLogo.startsWith("https://") || rawLogo.startsWith("data:")) {
      finalLogoUrl = rawLogo;
    } else {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from("schools")
        .getPublicUrl(rawLogo);
      finalLogoUrl = publicUrlData?.publicUrl || null;
    }
  }

  return {
    school: {
      name: school?.name || "SD Peradaban",
      address: school?.address || "-",
      phone: school?.phone || "-",
      email: school?.email || "-",
      logo_url: finalLogoUrl,
    },
    student: normalizedStudent ? {
      full_name: normalizedStudent.full_name,
      nis: normalizedStudent.nis,
    } : null,
    bill: {
      id: bill.id,
      amount: bill.amount,
      status: bill.status,
      billing_period_start: bill.billing_period_start,
      billing_period_end: bill.billing_period_end,
      payment_category_name: normalizedCategory?.name || null,
      installment_plan: bill.installment_plan,
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
    installmentInfo,
    totalPaid,
    remainingBalance,
  };
}