"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getClassesAction() {
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

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("*")
    .eq("school_id", profile.school_id)
    .order("academic_year_id", { ascending: true })
    .order("name", { ascending: true });

  if (classesError) {
    return { error: "Gagal memuat data kelas." };
  }

  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name")
    .eq("school_id", profile.school_id)
    .order("name", { ascending: false });

  return { classes: classes || [], academicYears: academicYears || [] };
}

export async function createClassAction(formData: FormData) {
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
  const academicYearId = String(formData.get("academic_year_id") || "").trim();

  if (!name) {
    return { error: "Nama kelas harus diisi." };
  }

  if (!academicYearId) {
    return { error: "Tahun ajaran harus dipilih." };
  }

  const { data: academicYear, error: academicYearError } = await supabase
    .from("academic_years")
    .select("school_id")
    .eq("id", academicYearId)
    .single();

  if (academicYearError || !academicYear) {
    return { error: "Tahun ajaran tidak valid." };
  }

  if (academicYear.school_id !== profile.school_id) {
    return { error: "Tahun ajaran tidak berada di sekolah yang sama." };
  }

  const { error } = await supabase.from("classes").insert({
    school_id: profile.school_id,
    academic_year_id: academicYearId,
    name,
  });

  if (error) {
    console.error("[CLASS_CREATION_FAILED]", {
      action: "create_class",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload: { school_id: profile.school_id, academic_year_id: academicYearId, name },
      school_id: profile.school_id,
      user_id: user.id,
    });
    if (error.code === "23505") {
      return { error: "Kelas dengan nama ini sudah ada di tahun ajaran yang dipilih." };
    }
    return { error: "Gagal membuat kelas. Silakan coba lagi." };
  }

  return { success: true };
}

export async function updateClassAction(formData: FormData) {
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
  const academicYearId = String(formData.get("academic_year_id") || "").trim();

  if (!id) {
    return { error: "ID kelas tidak valid." };
  }

  if (!name) {
    return { error: "Nama kelas harus diisi." };
  }

  if (!academicYearId) {
    return { error: "Tahun ajaran harus dipilih." };
  }

  const { data: academicYear, error: academicYearError } = await supabase
    .from("academic_years")
    .select("school_id")
    .eq("id", academicYearId)
    .single();

  if (academicYearError || !academicYear) {
    return { error: "Tahun ajaran tidak valid." };
  }

  if (academicYear.school_id !== profile.school_id) {
    return { error: "Tahun ajaran tidak berada di sekolah yang sama." };
  }

  const { error } = await supabase
    .from("classes")
    .update({
      name,
      academic_year_id: academicYearId,
    })
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    console.error("[CLASS_UPDATE_FAILED]", {
      action: "update_class",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload: { id, name, academic_year_id: academicYearId, school_id: profile.school_id },
      school_id: profile.school_id,
      user_id: user.id,
    });
    if (error.code === "23505") {
      return { error: "Kelas dengan nama ini sudah ada di tahun ajaran yang dipilih." };
    }
    return { error: "Gagal memperbarui kelas. Silakan coba lagi." };
  }

  return { success: true };
}

export async function toggleClassStatusAction(id: string) {
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
    .from("classes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    console.error("[CLASS_STATUS_TOGGLE_FAILED]", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      class_id: id,
      school_id: profile.school_id,
      user_id: user.id,
    });
    return { error: "Gagal memperbarui status kelas." };
  }

  return { success: true };
}
