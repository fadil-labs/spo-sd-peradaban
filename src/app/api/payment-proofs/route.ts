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

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  let query = supabase
    .from("payment_proofs")
    .select(`
      id,
      school_id,
      payment_id,
      file_path,
      file_name,
      mime_type,
      file_size,
      status,
      created_at,
      updated_at,
      uploaded_by,
      payments (
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
        students (
          id,
          nis,
          full_name
        ),
        student_bills (
          id,
          amount,
          due_date,
          status
        )
      )
    `)
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: proofs, error: proofsError } = await query;

  if (proofsError) {
    return NextResponse.json({ error: "Failed to load payment proofs." }, { status: 500 });
  }

  const normalized = (proofs || []).map((p: unknown) => {
    const proof = p as Record<string, unknown>;
    const payment = proof.payments as Record<string, unknown> | undefined;
    const student = payment?.students as Record<string, unknown> | undefined;
    const bill = payment?.student_bills as Record<string, unknown> | undefined;
    const method = payment?.payment_methods as Record<string, unknown> | undefined;
    return {
      id: proof.id as string,
      school_id: proof.school_id as string,
      payment_id: proof.payment_id as string,
      file_path: proof.file_path as string,
      file_name: proof.file_name as string,
      mime_type: proof.mime_type as string | null,
      file_size: proof.file_size as number | null,
      status: proof.status as string,
      created_at: proof.created_at as string,
      updated_at: proof.updated_at as string,
      uploaded_by: proof.uploaded_by as string,
      payments: payment ? {
        id: payment.id as string,
        amount: payment.amount as number,
        payment_date: payment.payment_date as string,
        reference_number: payment.reference_number as string,
        status: payment.status as string,
        payment_methods: method ? {
          id: method.id as string,
          name: method.name as string,
          method_type: method.method_type as string,
        } : null,
        students: student ? {
          id: student.id as string,
          nis: student.nis as string,
          full_name: student.full_name as string,
        } : null,
        student_bills: bill ? {
          id: bill.id as string,
          amount: bill.amount as number,
          due_date: bill.due_date as string,
          status: bill.status as string,
        } : null,
      } : null,
    };
  });

  return NextResponse.json({ proofs: normalized });
}
