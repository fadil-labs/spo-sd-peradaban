"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminDashboardSummary = {
  totalStudents: number;
  totalBills: number;
  totalBillAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  pendingPaymentCount: number;
  pendingPaymentAmount: number;
  pendingProofCount: number;
  monthlyPayments: { label: string; value: number }[];
  paymentComposition: { label: string; value: number; color: string }[];
  recentPayments: {
    id: string;
    amount: number;
    payment_date: string;
    status: string;
    students: { full_name: string; nis: string } | null;
    payment_methods: { name: string } | null;
  }[];
  recentProofs: {
    id: string;
    file_name: string;
    status: string;
    created_at: string;
    payments: {
      amount: number;
      students: { full_name: string; nis: string } | null;
      student_bills: { amount: number } | null;
    } | null;
  }[];
};

export type AdminDashboardResult =
  | { error: string }
  | { summary: AdminDashboardSummary };

export async function getAdminDashboardSummaryAction(): Promise<AdminDashboardResult> {
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

  if (profile.role !== "admin") {
    redirect("/dashboard/admin");
  }

  const [
    studentsResult,
    billsResult,
    paymentsResult,
    proofsResult,
    recentPaymentsResult,
    recentProofsResult,
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id),
    supabase.from("student_bills").select("id, amount, status", { count: "exact" }).eq("school_id", profile.school_id),
    supabase
      .from("payments")
      .select("id, amount, status, student_bill_id, payment_date, payment_methods (name)", { count: "exact" })
      .not("student_bill_id", "is", null)
      .in("status", ["completed", "pending"]),
    supabase
      .from("payment_proofs")
      .select("id, status", { count: "exact" })
      .eq("school_id", profile.school_id)
      .eq("status", "pending"),
    supabase
      .from("payments")
      .select(`
        id,
        amount,
        payment_date,
        status,
        students (full_name, nis),
        payment_methods (name)
      `)
      .eq("school_id", profile.school_id)
      .order("payment_date", { ascending: false })
      .limit(5),
    supabase
      .from("payment_proofs")
      .select(`
        id,
        file_name,
        status,
        created_at,
        payments (
          amount,
          students (full_name, nis),
          student_bills (amount)
        )
      `)
      .eq("school_id", profile.school_id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (studentsResult.error || billsResult.error || paymentsResult.error || proofsResult.error || recentPaymentsResult.error || recentProofsResult.error) {
    return { error: "Gagal memuat ringkasan dashboard." };
  }

  const bills = billsResult.data || [];
  const payments = paymentsResult.data || [];

  const totalBillAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPaid = payments
    .filter((p) => p.status === "completed" || p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalOutstanding = Math.max(0, totalBillAmount - totalPaid);
  const pendingPaymentCount = payments.filter((p) => p.status === "pending").length;
  const pendingPaymentAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const normalizedRecentPayments = (recentPaymentsResult.data || []).map((p) => ({
    id: p.id,
    amount: p.amount,
    payment_date: p.payment_date,
    status: p.status,
    students: Array.isArray(p.students) ? p.students[0] : p.students,
    payment_methods: Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods,
  }));

  const normalizedRecentProofs = (recentProofsResult.data || []).map((p) => ({
    id: p.id,
    file_name: p.file_name,
    status: p.status,
    created_at: p.created_at,
    payments: Array.isArray(p.payments)
      ? {
          ...p.payments[0],
          students: Array.isArray(p.payments[0].students) ? p.payments[0].students[0] : p.payments[0].students,
          student_bills: Array.isArray(p.payments[0].student_bills) ? p.payments[0].student_bills[0] : p.payments[0].student_bills,
        }
      : p.payments,
  }));

  const monthlyMap = new Map<string, number>();
  const methodMap = new Map<string, { value: number; color: string }>();

  const methodColors: Record<string, string> = {
    Transfer: "#0f766e",
    Cash: "#d97706",
    QRIS: "#0284c7",
    EWallet: "#7c3aed",
  };

  for (const payment of payments) {
    const date = new Date(payment.payment_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + (payment.amount || 0));

    const paymentMethod = Array.isArray(payment.payment_methods) ? payment.payment_methods[0] : payment.payment_methods;
    const methodName = paymentMethod?.name || "Lainnya";
    if (!methodMap.has(methodName)) {
      methodMap.set(methodName, { value: 0, color: methodColors[methodName] || "#6b7280" });
    }
    methodMap.get(methodName)!.value += payment.amount || 0;
  }

  const monthlyPayments = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, value]) => ({
      label: key,
      value,
    }));

  const paymentComposition = Array.from(methodMap.entries()).map(([label, { value, color }]) => ({
    label,
    value,
    color,
  }));

  return {
    summary: {
      totalStudents: studentsResult.count || 0,
      totalBills: billsResult.count || 0,
      totalBillAmount,
      totalPaid,
      totalOutstanding,
      pendingPaymentCount,
      pendingPaymentAmount,
      pendingProofCount: proofsResult.count || 0,
      monthlyPayments,
      paymentComposition,
      recentPayments: normalizedRecentPayments,
      recentProofs: normalizedRecentProofs,
    },
  };
}
