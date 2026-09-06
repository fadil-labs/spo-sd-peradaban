"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  student_bills: { id: string; amount: number; status: string; billing_period_start: string | null; billing_period_end: string | null } | null;
  students: { id: string; nis: string; full_name: string } | null;
};

export async function getParentPaymentHistoryAction(filters?: ParentPaymentHistoryFilters) {
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
    return { payments: [], page: 1, pageSize: 20, totalRows: 0 };
  }

  const studentIds = guardianRelations.map((g) => g.student_id);

  const { data: bills, error: billsError } = await supabase
    .from("student_bills")
    .select("id")
    .in("student_id", studentIds);

  if (billsError || !bills || bills.length === 0) {
    return { payments: [], page: 1, pageSize: 20, totalRows: 0 };
  }

  const billIds = bills.map((b) => b.id);

  const page = filters?.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters?.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("payments")
    .select(`
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
      )
    `, { count: "exact" })
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
    query = query.or(`students.nis.ilike.%${filters.searchQuery}%,students.full_name.ilike.%${filters.searchQuery}%`);
  }

  const { data: payments, error: paymentsError, count } = await query;

  if (paymentsError) {
    return { error: "Gagal memuat riwayat pembayaran." };
  }

  const normalized = (payments || []).map((p: Record<string, unknown>) => {
    const student = Array.isArray(p.students) ? p.students[0] : p.students;
    const method = Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods;
    const bill = Array.isArray(p.student_bills) ? p.student_bills[0] : p.student_bills;

    return {
      id: p.id as string,
      amount: p.amount as number,
      payment_date: p.payment_date as string,
      reference_number: p.reference_number as string | null,
      status: p.status as string,
      students: student ? {
        id: student.id as string,
        nis: student.nis as string,
        full_name: student.full_name as string,
      } : null,
      payment_methods: method ? {
        id: method.id as string,
        name: method.name as string,
        method_type: method.method_type as string,
      } : null,
      student_bills: bill ? {
        id: bill.id as string,
        amount: bill.amount as number,
        status: bill.status as string,
        billing_period_start: bill.billing_period_start as string | null,
        billing_period_end: bill.billing_period_end as string | null,
      } : null,
    };
  });

  return {
    payments: normalized,
    page,
    pageSize,
    totalRows: count || 0,
  };
}
