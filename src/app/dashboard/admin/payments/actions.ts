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
        status
      ),
      payment_proofs (
        id,
        status,
        rejection_reason
      )
    `)
    .eq("school_id", profile.school_id)
    .order("payment_date", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

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
    query = query.lte("payment_date", filters.endDate);
  }

  if (filters?.searchQuery) {
    query = query.or(`students.nis.ilike.%${filters.searchQuery}%,students.full_name.ilike.%${filters.searchQuery}%`);
  }

  const { data: payments, error: paymentsError, count } = await query;

  if (paymentsError) {
    return { error: "Gagal memuat data pembayaran." };
  }

  const normalized = (payments || []).map((p: Record<string, unknown>) => {
    const student = Array.isArray(p.students) ? p.students[0] : p.students;
    const method = Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods;
    const bill = Array.isArray(p.student_bills) ? p.student_bills[0] : p.student_bills;
    const proofs = p.payment_proofs as unknown[] | undefined;
    const proof = proofs && proofs.length > 0 ? (proofs[0] as Record<string, unknown>) : null;
    const normalizedProof = proof ? {
      id: proof.id as string,
      status: proof.status as string,
      rejection_reason: proof.rejection_reason as string | null,
    } : null;

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
      } : null,
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
