import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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
    .select("id, school_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  const { data: school } = await supabase
    .from("schools")
    .select("logo_url")
    .eq("id", profile.school_id)
    .single();

  return NextResponse.json({
    id: profile.id,
    school_id: profile.school_id,
    role: profile.role,
    full_name: profile.full_name,
    school_logo_url: school?.logo_url ?? null,
  });
}
