import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!["admin", "bendahara"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") || "20")));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: transactions, error: transactionsError, count } = await supabase
    .from("payment_gateway_transactions")
    .select(`
      id,
      school_id,
      payment_id,
      provider,
      external_order_id,
      external_transaction_id,
      provider_status,
      payment_method_type,
      qr_code_url,
      expires_at,
      raw_payload,
      webhook_received_at,
      created_at,
      updated_at,
      payments (
        id,
        amount,
        status,
        students (
          id,
          nis,
          full_name
        ),
        student_bills (
          id,
          amount,
          status
        )
      )
    `, { count: "exact" })
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (transactionsError) {
    return NextResponse.json({ error: "Failed to load gateway transactions." }, { status: 500 });
  }

  const normalized = (transactions || []).map((t: unknown) => {
    const tx = t as Record<string, unknown>;
    const payment = tx.payments as Record<string, unknown> | undefined;
    const student = payment?.students as Record<string, unknown> | undefined;
    const bill = payment?.student_bills as Record<string, unknown> | undefined;

    return {
      id: tx.id as string,
      school_id: tx.school_id as string,
      payment_id: tx.payment_id as string | null,
      provider: tx.provider as string,
      external_order_id: tx.external_order_id as string,
      external_transaction_id: tx.external_transaction_id as string | null,
      provider_status: tx.provider_status as string,
      payment_method_type: tx.payment_method_type as string | null,
      qr_code_url: tx.qr_code_url as string | null,
      expires_at: tx.expires_at as string | null,
      raw_payload: (tx.raw_payload as Record<string, unknown>) || {},
      webhook_received_at: tx.webhook_received_at as string | null,
      created_at: tx.created_at as string,
      updated_at: tx.updated_at as string,
      payments: payment
        ? {
            id: payment.id as string,
            amount: payment.amount as number,
            status: payment.status as string,
            students: student
              ? {
                  id: student.id as string,
                  nis: student.nis as string,
                  full_name: student.full_name as string,
                }
              : null,
            student_bills: bill
              ? {
                  id: bill.id as string,
                  amount: bill.amount as number,
                  status: bill.status as string,
                }
              : null,
          }
        : null,
    };
  });

  return NextResponse.json({
    transactions: normalized,
    page,
    pageSize,
    totalRows: count || 0,
  });
}
