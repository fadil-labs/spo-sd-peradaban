"use server";

import { createClient } from "@/lib/supabase/server";

export async function getPublicSchoolLogoAction() {
  const supabase = await createClient();

  const { data: school } = await supabase
    .from("schools")
    .select("logo_url")
    .limit(1)
    .maybeSingle();

  return { logo_url: school?.logo_url ?? null };
}
