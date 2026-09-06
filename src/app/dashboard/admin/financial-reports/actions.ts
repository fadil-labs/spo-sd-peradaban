"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FinancialReportFilters = {
  startDate?: string;
  endDate?: string;
  academicYearId?: string;
  paymentCategoryId?: string;
  classId?: string;
  studentId?: string;
  billStatus?: string;
  paymentMethodId?: string;
  paymentProofStatus?: string;
  page?: number;
  pageSize?: number;
};

export type FinancialSummary = {
  totalBills: number;
  totalBillAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  paidBillsCount: number;
  partialBillsCount: number;
  overdueBillsCount: number;
  pendingBillsCount: number;
  cancelledBillsCount: number;
  proofPendingCount: number;
  proofApprovedCount: number;
  proofRejectedCount: number;
  pendingPaymentCount: number;
  pendingPaymentAmount: number;
};

export type PaymentMethodSummary = {
  methodId: string;
  methodName: string;
  methodType: string;
  totalAmount: number;
  transactionCount: number;
};

export type PaymentProofSummary = {
  status: string;
  count: number;
  totalAmount: number;
};

export type TransactionRow = {
  billId: string;
  billStatus: string;
  billAmount: number;
  paidAmount: number;
  outstanding: number;
  studentId: string;
  studentName: string | null | undefined;
  studentNis: string | null | undefined;
  className: string | null | undefined;
  paymentCategoryName: string | null | undefined;
  billingPeriodStart: string | null | undefined;
  billingPeriodEnd: string | null | undefined;
  paymentId: string | null | undefined;
  paymentAmount: number | null | undefined;
  paymentDate: string | null | undefined;
  paymentReference: string | null | undefined;
  paymentStatus: string | null | undefined;
  paymentMethodName: string | null | undefined;
  paymentMethodId: string | null | undefined;
  proofStatus: string | null | undefined;
  proofRejectionReason: string | null | undefined;
};

export async function getFinancialSummaryAction(filters?: FinancialReportFilters) {
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

  let billQuery = supabase
    .from("student_bills")
    .select(`
      id,
      amount,
      status,
      student_id,
      payment_category_id,
      billing_period_start,
      billing_period_end,
      students (
        id,
        nis,
        full_name
      ),
      payment_categories (
        id,
        name
      ),
      student_enrollments!student_bills_student_enrollment_id_fkey (
        classes (
          id,
          name
        )
      )
    `)
    .eq("school_id", profile.school_id);

  if (filters?.startDate) {
    billQuery = billQuery.gte("created_at", filters.startDate);
  }
  if (filters?.endDate) {
    billQuery = billQuery.lte("created_at", filters.endDate);
  }
  if (filters?.academicYearId && filters.academicYearId !== "all") {
    billQuery = billQuery.eq("student_enrollments.academic_year_id", filters.academicYearId);
  }
  if (filters?.paymentCategoryId && filters.paymentCategoryId !== "all") {
    billQuery = billQuery.eq("payment_category_id", filters.paymentCategoryId);
  }
  if (filters?.classId && filters.classId !== "all") {
    billQuery = billQuery.eq("student_enrollments.class_id", filters.classId);
  }
  if (filters?.studentId && filters.studentId !== "all") {
    billQuery = billQuery.eq("student_id", filters.studentId);
  }
  if (filters?.billStatus && filters.billStatus !== "all") {
    billQuery = billQuery.eq("status", filters.billStatus);
  }

  const { data: bills, error: billsError } = await billQuery;

  if (billsError) {
    console.error("[FINANCIAL_SUMMARY_FAILED]", {
      action: "getFinancialSummaryAction",
      code: billsError.code,
      message: billsError.message,
      details: billsError.details,
      hint: billsError.hint,
      filters,
      school_id: profile.school_id,
      user_id: user.id,
    });
    return { error: "Gagal memuat data tagihan." };
  }

  const billList = (bills || []).map((b: unknown) => {
    const bill = b as Record<string, unknown>;
    const student = bill.students as Record<string, unknown> | undefined;
    const category = bill.payment_categories as Record<string, unknown> | undefined;
    const enrollment = bill.student_enrollments as Record<string, unknown> | undefined;
    const classes = enrollment?.classes as Record<string, unknown> | undefined;
    return {
      id: bill.id as string,
      amount: bill.amount as number,
      status: bill.status as string,
      student_id: bill.student_id as string,
      student_name: student?.full_name as string | undefined,
      student_nis: student?.nis as string | undefined,
      class_name: classes?.name as string | undefined,
      category_name: category?.name as string | undefined,
    };
  });

  const billIds = billList.map((b) => b.id);

  const paymentsMap: Record<string, { id: string; amount: number; status: string; payment_method_id?: string | null; payment_date?: string; reference_number?: string; payment_methods?: { name: string } | null }[]> = {};

  if (billIds.length > 0) {
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        status,
        student_bill_id,
        payment_method_id,
        payment_methods (
          id,
          name
        )
      `)
      .in("student_bill_id", billIds)
      .in("status", ["completed", "pending"]);

    if (!paymentsError && payments) {
      for (const payment of payments as unknown[]) {
        const p = payment as Record<string, unknown>;
        const billId = p.student_bill_id as string;
        if (!paymentsMap[billId]) {
          paymentsMap[billId] = [];
        }
        paymentsMap[billId].push({
          id: p.id as string,
          amount: p.amount as number,
          status: p.status as string,
          payment_method_id: p.payment_method_id as string | undefined,
          payment_date: p.payment_date as string | undefined,
          reference_number: p.reference_number as string | undefined,
          payment_methods: Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods,
        });
      }
    }
  }

  const proofsMap: Record<string, { status: string; rejection_reason: string | null }[]> = {};

  if (billIds.length > 0) {
    const { data: proofs, error: proofsError } = await supabase
      .from("payment_proofs")
      .select(`
        id,
        status,
        rejection_reason,
        student_bill_id
      `)
      .in("student_bill_id", billIds);

    if (!proofsError && proofs) {
      for (const proof of proofs as unknown[]) {
        const p = proof as Record<string, unknown>;
        const billId = p.student_bill_id as string;
        if (!proofsMap[billId]) {
          proofsMap[billId] = [];
        }
        proofsMap[billId].push({
          status: p.status as string,
          rejection_reason: p.rejection_reason as string | null,
        });
      }
    }
  }

  const summary: FinancialSummary = {
    totalBills: 0,
    totalBillAmount: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    paidBillsCount: 0,
    partialBillsCount: 0,
    overdueBillsCount: 0,
    pendingBillsCount: 0,
    cancelledBillsCount: 0,
    proofPendingCount: 0,
    proofApprovedCount: 0,
    proofRejectedCount: 0,
    pendingPaymentCount: 0,
    pendingPaymentAmount: 0,
  };

  const billAmountByStatus: Record<string, { count: number; amount: number }> = {};

  for (const bill of billList) {
    summary.totalBills += 1;
    summary.totalBillAmount += bill.amount;

    const billPayments = paymentsMap[bill.id] || [];
    const validPayments = billPayments.filter((p) => p.status === "completed" || p.status === "pending");
    const paidAmount = validPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = bill.amount - paidAmount;

    const pendingPayments = billPayments.filter((p) => p.status === "pending");
    summary.pendingPaymentCount += pendingPayments.length;
    summary.pendingPaymentAmount += pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    summary.totalPaid += paidAmount;
    summary.totalOutstanding += outstanding;

    if (!billAmountByStatus[bill.status]) {
      billAmountByStatus[bill.status] = { count: 0, amount: 0 };
    }
    billAmountByStatus[bill.status].count += 1;
    billAmountByStatus[bill.status].amount += bill.amount;

    if (bill.status === "paid") summary.paidBillsCount += 1;
    else if (bill.status === "partial") summary.partialBillsCount += 1;
    else if (bill.status === "overdue") summary.overdueBillsCount += 1;
    else if (bill.status === "pending") summary.pendingBillsCount += 1;
    else if (bill.status === "cancelled") summary.cancelledBillsCount += 1;

    const proofs = proofsMap[bill.id] || [];
    for (const proof of proofs) {
      if (proof.status === "pending") summary.proofPendingCount += 1;
      else if (proof.status === "approved") summary.proofApprovedCount += 1;
      else if (proof.status === "rejected") summary.proofRejectedCount += 1;
    }
  }

  return {
    summary,
    billAmountByStatus,
    totalBillAmount: summary.totalBillAmount,
    totalPaid: summary.totalPaid,
    totalOutstanding: summary.totalOutstanding,
  };
}

export async function getFinancialTransactionsAction(filters?: FinancialReportFilters) {
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
    .from("student_bills")
    .select(`
      id,
      amount,
      status,
      billing_period_start,
      billing_period_end,
      created_at,
      student_id,
      payment_category_id,
      students (
        id,
        nis,
        full_name
      ),
      payment_categories (
        id,
        name
      ),
      student_enrollments!student_bills_student_enrollment_id_fkey (
        classes (
          id,
          name
        )
      )
    `)
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }
  if (filters?.academicYearId && filters.academicYearId !== "all") {
    query = query.eq("student_enrollments.academic_year_id", filters.academicYearId);
  }
  if (filters?.paymentCategoryId && filters.paymentCategoryId !== "all") {
    query = query.eq("payment_category_id", filters.paymentCategoryId);
  }
  if (filters?.classId && filters.classId !== "all") {
    query = query.eq("student_enrollments.class_id", filters.classId);
  }
  if (filters?.studentId && filters.studentId !== "all") {
    query = query.eq("student_id", filters.studentId);
  }
  if (filters?.billStatus && filters.billStatus !== "all") {
    query = query.eq("status", filters.billStatus);
  }

  const { data: bills, error: billsError } = await query;

  if (billsError) {
    console.error("[FINANCIAL_TRANSACTIONS_FAILED]", {
      action: "getFinancialTransactionsAction",
      code: billsError.code,
      message: billsError.message,
      details: billsError.details,
      hint: billsError.hint,
      filters,
      school_id: profile.school_id,
      user_id: user.id,
      page,
      pageSize,
      from,
      to,
    });
    return { error: "Gagal memuat data transaksi." };
  }

  const billList = (bills || []) as unknown[];
  const billIds = billList.map((b) => (b as Record<string, unknown>).id as string);

  const paymentsMap: Record<string, { id: string; amount: number; status: string; payment_method_id?: string | null; payment_date?: string; reference_number?: string; payment_methods?: { name: string } | null }[]> = {};
  const proofsMap: Record<string, { status: string; rejection_reason: string | null }[]> = {};

  if (billIds.length > 0) {
    const [{ data: payments }, { data: proofs }] = await Promise.all([
      supabase
        .from("payments")
        .select(`
          id,
          amount,
          status,
          student_bill_id,
          payment_method_id,
          payment_methods (
            id,
            name
          )
        `)
        .in("student_bill_id", billIds)
        .in("status", ["completed", "pending"]),
      supabase
        .from("payment_proofs")
        .select(`
          id,
          status,
          rejection_reason,
          student_bill_id
        `)
        .in("student_bill_id", billIds),
    ]);

    if (payments) {
      for (const payment of payments as unknown[]) {
        const p = payment as Record<string, unknown>;
        const billId = p.student_bill_id as string;
        if (!paymentsMap[billId]) {
          paymentsMap[billId] = [];
        }
        paymentsMap[billId].push({
          id: p.id as string,
          amount: p.amount as number,
          status: p.status as string,
          payment_method_id: p.payment_method_id as string | undefined,
          payment_date: p.payment_date as string | undefined,
          reference_number: p.reference_number as string | undefined,
          payment_methods: Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods,
        });
      }
    }

    if (proofs) {
      for (const proof of proofs as unknown[]) {
        const p = proof as Record<string, unknown>;
        const billId = p.student_bill_id as string;
        if (!proofsMap[billId]) {
          proofsMap[billId] = [];
        }
        proofsMap[billId].push({
          status: p.status as string,
          rejection_reason: p.rejection_reason as string | null,
        });
      }
    }
  }

  const rows: TransactionRow[] = billList
    .map((b) => {
      const bill = b as Record<string, unknown>;
      const student = bill.students as Record<string, unknown> | undefined;
      const category = bill.payment_categories as Record<string, unknown> | undefined;
      const enrollment = bill.student_enrollments as Record<string, unknown> | undefined;
      const classes = enrollment?.classes as Record<string, unknown> | undefined;
      const payments = paymentsMap[bill.id as string] || [];
      const payment = payments[0] || null;
      const method = payment?.payment_methods as Record<string, unknown> | undefined;
      const proofs = proofsMap[bill.id as string] || [];
      const proof = proofs[0] || null;

      const validPayments = payments
        .filter((p) => p.status === "completed" || p.status === "pending")
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        billId: bill.id as string,
        billStatus: bill.status as string,
        billAmount: bill.amount as number,
        paidAmount: validPayments,
        outstanding: (bill.amount as number) - validPayments,
        studentId: bill.student_id as string,
        studentName: student?.full_name as string | undefined,
        studentNis: student?.nis as string | undefined,
        className: classes?.name as string | undefined,
        paymentCategoryName: category?.name as string | undefined,
        billingPeriodStart: bill.billing_period_start as string | undefined,
        billingPeriodEnd: bill.billing_period_end as string | undefined,
        paymentId: payment?.id as string | undefined,
        paymentAmount: payment?.amount as number | undefined,
        paymentDate: payment?.payment_date as string | undefined,
        paymentReference: payment?.reference_number as string | undefined,
        paymentStatus: payment?.status as string | undefined,
        paymentMethodName: method?.name as string | undefined,
        paymentMethodId: payment?.payment_method_id as string | undefined,
        proofStatus: proof?.status as string | undefined,
        proofRejectionReason: proof?.rejection_reason as string | undefined,
      };
    })
    .filter((row) => {
      if (filters?.paymentMethodId && filters.paymentMethodId !== "all") {
        return row.paymentMethodId === filters.paymentMethodId;
      }
      if (filters?.paymentProofStatus && filters.paymentProofStatus !== "all") {
        return row.proofStatus === filters.paymentProofStatus;
      }
      return true;
    });

  return {
    rows,
    page,
    pageSize,
    totalRows: rows.length,
  };
}

export async function getFinancialReportFiltersAction() {
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

  const [academicYearsResult, categoriesResult, classesResult, methodsResult] = await Promise.all([
    supabase.from("academic_years").select("id, name").eq("school_id", profile.school_id).order("name", { ascending: true }),
    supabase.from("payment_categories").select("id, name").eq("school_id", profile.school_id).order("name", { ascending: true }),
    supabase.from("classes").select("id, name").eq("school_id", profile.school_id).order("name", { ascending: true }),
    supabase.from("school_payment_methods").select("id, name, method_type, is_active").eq("school_id", profile.school_id).eq("is_active", true).order("name", { ascending: true }),
  ]);

  const academicYears = academicYearsResult.data || [];
  const categories = categoriesResult.data || [];
  const classes = classesResult.data || [];
  const paymentMethods = (methodsResult.data || []).map((m: unknown) => {
    const method = m as Record<string, unknown>;
    return {
      id: method.id as string,
      name: method.name as string,
      method_type: method.method_type as string,
    };
  });

  return {
    academicYears,
    categories,
    classes,
    paymentMethods,
  };
}
