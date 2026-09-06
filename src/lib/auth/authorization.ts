import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  school_id: string;
  role: string;
  full_name: string;
  phone: string | null;
  username: string | null;
};

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: "/dashboard/admin",
  bendahara: "/dashboard/bendahara",
  orang_tua: "/dashboard/orang-tua",
};

export async function requireAuthenticatedUser(): Promise<Profile> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, school_id, role, full_name, phone, username")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  return profile as Profile;
}

export function requireRole(profile: Profile, allowedRoles: string[]): void {
  if (!allowedRoles.includes(profile.role)) {
    const fallback = ROLE_DASHBOARDS[profile.role] || "/login";
    redirect(fallback);
  }
}

export function getRoleDashboard(role: string): string {
  return ROLE_DASHBOARDS[role] || "/login";
}
