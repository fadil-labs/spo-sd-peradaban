"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PaymentMonitorFilters = {
  status?: string;
  paymentMethodId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
};

export type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  reference_number: string | null;
  status: string;
  students: { id: string; nis: string; full_name: string } | null;
  payment_methods: { id: string; name: string; method_type: string } | null;
  student_bills: { id: string; amount: number; status: string } | null;
  payment_proofs: { id: string; status: string; rejection_reason: string | null } | null;
};

export async function getAdminPaymentsAction(filters?: PaymentMonitorFilters) {
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

  const page = filters?.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters?.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
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
        status
      ),
      payment_proofs (
        id,
        status,
        rejection_reason
      )
    `,
      { count: "exact" }
    )
    .eq("school_id", profile.school_id)
    .order("payment_date", { ascending: false })
    .order("id", { ascending: false });

  if (filters?.searchQuery && filters.searchQuery.trim()) {
    const term = `%${filters.searchQuery.trim().replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    const { data: matchedStudents } = await supabase
      .from("students")
      .select("id")
      .eq("school_id", profile.school_id)
      .or(`nis.ilike.${term},full_name.ilike.${term}`);

    if (matchedStudents && matchedStudents.length > 0) {
      const studentIds = matchedStudents.map((s) => s.id);
      query = query.in("student_id", studentIds);
    } else {
      return { payments: [], page, pageSize, totalRows: 0 };
    }
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.paymentMethodId && filters.paymentMethodId !== "all") {
    query = query.eq("payment_method_id", filters.paymentMethodId);
  }

  if (filters?.startDate) {
    query = query.gte("payment_date", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("payment_date", `${filters.endDate}T23:59:59`);
  }

  query = query.range(from, to);

  const { data: payments, error: paymentsError, count } = await query;

  if (paymentsError) {
    console.error("[getAdminPaymentsAction Error]", paymentsError);
    return { error: "Gagal memuat data pembayaran." };
  }

  const normalized = (payments || []).map((p: Record<string, unknown>) => {
    const student = Array.isArray(p.students) ? p.students[0] : p.students;
    const method = Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods;
    const bill = Array.isArray(p.student_bills) ? p.student_bills[0] : p.student_bills;
    const proofs = p.payment_proofs as unknown[] | undefined;
    const proof = proofs && proofs.length > 0 ? (proofs[0] as Record<string, unknown>) : null;
    const normalizedProof = proof
      ? {
          id: proof.id as string,
          status: proof.status as string,
          rejection_reason: proof.rejection_reason as string | null,
        }
      : null;

    return {
      id: p.id as string,
      amount: p.amount as number,
      payment_date: p.payment_date as string,
      reference_number: p.reference_number as string | null,
      status: p.status as string,
      students: student
        ? {
            id: (student as Record<string, unknown>).id as string,
            nis: (student as Record<string, unknown>).nis as string,
            full_name: (student as Record<string, unknown>).full_name as string,
          }
        : null,
      payment_methods: method
        ? {
            id: (method as Record<string, unknown>).id as string,
            name: (method as Record<string, unknown>).name as string,
            method_type: (method as Record<string, unknown>).method_type as string,
          }
        : null,
      student_bills: bill
        ? {
            id: (bill as Record<string, unknown>).id as string,
            amount: (bill as Record<string, unknown>).amount as number,
            status: (bill as Record<string, unknown>).status as string,
          }
        : null,
      payment_proofs: normalizedProof,
    };
  });

  return {
    payments: normalized,
    page,
    pageSize,
    totalRows: count || 0,
  };
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

  if (payment.status !== "completed" && payment.status !== "success") {
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
    .eq("id", bill.school_id)
    .maybeSingle();

  if (schoolError) {
    console.error("[Receipt Action Error] Gagal membaca tabel schools:", schoolError.message);
  }

  const { data: billPayments } = await supabase
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
  
  const successfulPayments = rawBillPayments.filter((p: any) => p.status === "completed" || p.status === "success");
  
  successfulPayments.sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

  const index = successfulPayments.findIndex((p: any) => p.id === paymentId);
  const current = index !== -1 ? index + 1 : 1;

  let total = 3;
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