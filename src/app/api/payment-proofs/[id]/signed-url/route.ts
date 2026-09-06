import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const proofId = resolvedParams.id;
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

  const { data: proof, error: proofError } = await supabase
    .from("payment_proofs")
    .select("id, school_id, payment_id, file_path")
    .eq("id", proofId)
    .single();

  if (proofError || !proof) {
    return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });
  }

  const isAdmin = ["admin", "bendahara"].includes(profile.role);
  const isOwnChild = await checkGuardianAccess(supabase, user.id, proof.payment_id);

  if (!isAdmin && !isOwnChild) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isAdmin && proof.school_id !== profile.school_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(proof.file_path, 3600);

  if (signedUrlError || !signedUrlData) {
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: signedUrlData.signedUrl });
}

async function checkGuardianAccess(
  supabaseClient: ReturnType<typeof createClient> extends Promise<infer U> ? U : ReturnType<typeof createClient>,
  guardianProfileId: string,
  paymentId: string
): Promise<boolean> {
  const { data: payment, error: paymentError } = await supabaseClient
    .from("payments")
    .select("student_id")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return false;
  }

  const { data: guardianRelation, error: guardianError } = await supabaseClient
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", guardianProfileId)
    .eq("student_id", (payment as { student_id: string }).student_id)
    .single();

  return !guardianError && !!guardianRelation;
}
