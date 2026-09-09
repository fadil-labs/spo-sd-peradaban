"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function generateTemporaryPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (source: string) => source[Math.floor(Math.random() * source.length)];
  const segments = Array.from({ length: 4 }, () => pick(letters) + pick(digits) + pick(letters) + pick(digits));
  const prefix = "SPO-";
  return `${prefix}${segments.join("")}`.slice(0, 12);
}

export async function getUsersAction(page?: number, pageSize?: number, searchQuery?: string) {
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

  const pageNum = page && page > 0 ? page : 1;
  const pageSizeNum = pageSize && pageSize > 0 ? Math.min(pageSize, 100) : 20;
  const from = (pageNum - 1) * pageSizeNum;
  const to = from + pageSizeNum - 1;

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, username, role, phone, is_active, must_change_password, created_at, updated_at", { count: "exact" })
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchQuery && searchQuery.trim()) {
    const trimmed = searchQuery.trim();
    query = query.or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,username.ilike.%${trimmed}%`);
  }

  const { data: users, error: usersError, count } = await query;

  if (usersError) {
    return { error: "Gagal memuat data pengguna." };
  }

  return { users: users || [], page: pageNum, pageSize: pageSizeNum, totalRows: count || 0 };
}

export async function resetUserPasswordAction(userId: string) {
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

  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("school_id, email")
    .eq("id", userId)
    .single();

  if (targetError || !targetProfile) {
    return { error: "Pengguna tidak ditemukan." };
  }

  if (targetProfile.school_id !== profile.school_id) {
    return { error: "Pengguna tidak berada di sekolah yang sama." };
  }

  const adminSupabase = await createAdminClient();
  const temporaryPassword = generateTemporaryPassword();

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
  });

  if (updateError) {
    console.error("[USER_PASSWORD_RESET_FAILED]", {
      action: "reset_password",
      code: updateError.code,
      message: updateError.message,
      payload: { userId, email: targetProfile.email },
      school_id: profile.school_id,
      user_id: user.id,
    });
    return { error: "Gagal mereset password pengguna." };
  }

  const { error: profileUpdateError } = await adminSupabase
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);

  if (profileUpdateError) {
    console.error("[USER_PASSWORD_RESET_FAILED]", {
      action: "update_profile_must_change_password",
      code: profileUpdateError.code,
      message: profileUpdateError.message,
      payload: { userId },
      school_id: profile.school_id,
      user_id: user.id,
    });
  }

  return {
    success: true,
    credentials: {
      email: targetProfile.email,
      temporaryPassword,
    },
  };
}

export async function toggleUserStatusAction(userId: string, currentStatus: boolean) {
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

  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", userId)
    .single();

  if (targetError || !targetProfile) {
    return { error: "Pengguna tidak ditemukan." };
  }

  if (targetProfile.school_id !== profile.school_id) {
    return { error: "Pengguna tidak berada di sekolah yang sama." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !currentStatus })
    .eq("id", userId);

  if (error) {
    console.error("[USER_STATUS_TOGGLE_FAILED]", {
      action: "toggle_user_status",
      code: error.code,
      message: error.message,
      payload: { userId, currentStatus },
      school_id: profile.school_id,
      user_id: user.id,
    });
    return { error: "Gagal memperbarui status pengguna." };
  }

  return { success: true };
}
