"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAcademicYearsAction() {
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

  const { data: academicYears, error: academicYearsError } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", profile.school_id)
    .order("start_date", { ascending: false });

  if (academicYearsError) {
    return { error: "Gagal memuat data tahun ajaran." };
  }

  return { academicYears: academicYears || [] };
}

export async function createAcademicYearAction(formData: FormData) {
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

  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("start_date") || "").trim();
  const endDate = String(formData.get("end_date") || "").trim();

  if (!name) {
    return { error: "Nama tahun ajaran harus diisi." };
  }

  if (!startDate || !endDate) {
    return { error: "Tanggal mulai dan selesai harus diisi." };
  }

  if (new Date(startDate) > new Date(endDate)) {
    return { error: "Tanggal mulai harus sebelum tanggal selesai." };
  }

  const { error } = await supabase.from("academic_years").insert({
    school_id: profile.school_id,
    name,
    start_date: startDate,
    end_date: endDate,
    is_active: false,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Tahun ajaran dengan nama ini sudah ada." };
    }
    return { error: "Gagal membuat tahun ajaran. Silakan coba lagi." };
  }

  return { success: true };
}

export async function updateAcademicYearAction(formData: FormData) {
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

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("start_date") || "").trim();
  const endDate = String(formData.get("end_date") || "").trim();

  if (!id) {
    return { error: "ID tahun ajaran tidak valid." };
  }

  if (!name) {
    return { error: "Nama tahun ajaran harus diisi." };
  }

  if (!startDate || !endDate) {
    return { error: "Tanggal mulai dan selesai harus diisi." };
  }

  if (new Date(startDate) > new Date(endDate)) {
    return { error: "Tanggal mulai harus sebelum tanggal selesai." };
  }

  const { error } = await supabase
    .from("academic_years")
    .update({
      name,
      start_date: startDate,
      end_date: endDate,
    })
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Tahun ajaran dengan nama ini sudah ada." };
    }
    return { error: "Gagal memperbarui tahun ajaran. Silakan coba lagi." };
  }

  return { success: true };
}

export async function activateAcademicYearAction(id: string) {
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

  const { error: deactivateError } = await supabase
    .from("academic_years")
    .update({ is_active: false })
    .eq("school_id", profile.school_id)
    .neq("id", id);

  if (deactivateError) {
    return { error: "Gagal menonaktifkan tahun ajaran lain." };
  }

  const { error: activateError } = await supabase
    .from("academic_years")
    .update({ is_active: true })
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (activateError) {
    return { error: "Gagal mengaktifkan tahun ajaran." };
  }

  return { success: true };
}

export async function deactivateAcademicYearAction(id: string) {
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

  const { error } = await supabase
    .from("academic_years")
    .update({ is_active: false })
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    return { error: "Gagal menonaktifkan tahun ajaran." };
  }

  return { success: true };
}
