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
  const scope = url.searchParams.get("scope");

  let methods;
  if (scope === "global") {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("id, name, method_type, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load payment methods." }, { status: 500 });
    }
    methods = (data || []).map((m: unknown) => {
      const method = m as Record<string, unknown>;
      return {
        id: method.id as string,
        school_payment_method_id: method.id as string,
        name: method.name as string,
        method_type: method.method_type as string | undefined,
        is_active: method.is_active as boolean,
      };
    });
  } else {
    const { data, error } = await supabase
      .from("school_payment_methods")
      .select(`
        id,
        is_active,
        payment_methods (
          id,
          name,
          method_type,
          is_active
        )
      `)
      .eq("school_id", profile.school_id)
      .eq("is_active", true)
      .order("payment_methods(name)", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load payment methods." }, { status: 500 });
    }

    methods = (data || []).map((m: unknown) => {
      const schoolMethod = m as Record<string, unknown>;
      const pm = Array.isArray(schoolMethod.payment_methods) ? schoolMethod.payment_methods[0] : schoolMethod.payment_methods;
      const paymentMethod = pm as Record<string, unknown> | undefined;
      return {
        id: (paymentMethod?.id || schoolMethod.id) as string,
        school_payment_method_id: schoolMethod.id as string,
        name: (paymentMethod?.name || "Unknown") as string,
        method_type: paymentMethod?.method_type as string | undefined,
        is_active: schoolMethod.is_active as boolean,
      };
    });
  }

  return NextResponse.json({ methods });
}
