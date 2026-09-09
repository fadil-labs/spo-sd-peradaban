"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function getAcademicSetupWizardData() {
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

  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name, is_active")
    .eq("school_id", profile.school_id)
    .order("name", { ascending: false });

  return {
    schoolId: profile.school_id,
    academicYears: academicYears || [],
  };
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

  const { error } = await supabase.from("academic_years").insert({
    school_id: profile.school_id,
    name,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Tahun ajaran dengan nama ini sudah ada." };
    }
    return { error: "Gagal membuat tahun ajaran. Silakan coba lagi." };
  }

  return { success: true };
}

export async function createWizardClassesAction(formData: FormData) {
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

  const academicYearId = String(formData.get("academic_year_id") || "").trim();
  const classesJson = String(formData.get("classes") || "[]").trim();

  if (!academicYearId) {
    return { error: "Tahun ajaran harus dipilih." };
  }

  const classes = JSON.parse(classesJson) as Array<{ name: string; grade_level?: string }>;

  if (!Array.isArray(classes) || classes.length === 0) {
    return { error: "Minimal satu kelas harus ditambahkan." };
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

  const inserts = classes.map((cls) => ({
    school_id: profile.school_id,
    academic_year_id: academicYearId,
    name: cls.name.trim(),
    grade_level: cls.grade_level || null,
  }));

  const { error } = await supabase.from("classes").insert(inserts);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ada kelas yang duplikat di tahun ajaran yang dipilih." };
    }
    return { error: "Gagal menyimpan data kelas. Silakan coba lagi." };
  }

  return { success: true, count: inserts.length };
}

export async function createWizardStudentsAction(formData: FormData) {
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

  const studentsJson = String(formData.get("students") || "[]").trim();
  const students = JSON.parse(studentsJson) as Array<{
    nis: string;
    full_name: string;
    birth_date?: string;
    address?: string;
    status?: string;
  }>;

  if (!Array.isArray(students) || students.length === 0) {
    return { error: "Minimal satu siswa harus ditambahkan." };
  }

  const inserts = students.map((student) => ({
    school_id: profile.school_id,
    nis: student.nis.trim(),
    full_name: student.full_name.trim(),
    birth_date: student.birth_date || null,
    address: student.address || null,
    status: student.status || "active",
  }));

  const { error } = await supabase.from("students").insert(inserts);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ada NIS yang duplikat atau sudah terdaftar di sekolah ini." };
    }
    return { error: "Gagal menyimpan data siswa. Silakan coba lagi." };
  }

  return { success: true, count: inserts.length };
}

export async function createWizardGuardiansAction(formData: FormData) {
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

  const guardiansJson = String(formData.get("guardians") || "[]").trim();
  const guardians = JSON.parse(guardiansJson) as Array<{
    full_name: string;
    email: string;
    phone?: string;
    relationship: string;
    student_nis: string;
  }>;

  if (!Array.isArray(guardians) || guardians.length === 0) {
    return { error: "Minimal satu wali harus ditambahkan." };
  }

  const adminSupabase = await createAdminClient();

  const results: Array<{
    row: number;
    email: string;
    nis: string;
    status: "success" | "error";
    message?: string;
  }> = [];

  for (let i = 0; i < guardians.length; i++) {
    const guardian = guardians[i];
    const rowNumber = i + 1;

    const { data: student } = await adminSupabase
      .from("students")
      .select("id, school_id")
      .eq("nis", guardian.student_nis.trim())
      .eq("school_id", profile.school_id)
      .maybeSingle();

    if (!student) {
      results.push({
        row: rowNumber,
        email: guardian.email,
        nis: guardian.student_nis,
        status: "error",
        message: "Siswa dengan NIS tersebut tidak ditemukan",
      });
      continue;
    }

    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("email", guardian.email.trim())
      .maybeSingle();

    if (existingProfile?.id) {
      const { data: existingRelation } = await adminSupabase
        .from("student_guardians")
        .select("id")
        .eq("guardian_profile_id", existingProfile.id)
        .eq("student_id", student.id)
        .maybeSingle();

      if (existingRelation?.id) {
        results.push({
          row: rowNumber,
          email: guardian.email,
          nis: guardian.student_nis,
          status: "error",
          message: "Wali sudah terhubung dengan siswa ini",
        });
        continue;
      }

      const { error: relationError } = await adminSupabase.from("student_guardians").insert({
        guardian_profile_id: existingProfile.id,
        student_id: student.id,
        relationship: guardian.relationship || "wali",
      });

      if (relationError) {
        results.push({
          row: rowNumber,
          email: guardian.email,
          nis: guardian.student_nis,
          status: "error",
          message: "Gagal menghubungkan wali ke siswa",
        });
        continue;
      }
    } else {
      const temporaryPassword = generateTemporaryPassword();
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: guardian.email.trim(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: guardian.full_name.trim() },
      });

      if (authError || !authData.user) {
        results.push({
          row: rowNumber,
          email: guardian.email,
          nis: guardian.student_nis,
          status: "error",
          message: "Gagal membuat akun wali",
        });
        continue;
      }

      const { error: profileUpsertError } = await adminSupabase.from("profiles").upsert({
        id: authData.user.id,
        school_id: profile.school_id,
        role: "orang_tua",
        full_name: guardian.full_name.trim(),
        phone: guardian.phone || null,
        email: guardian.email.trim(),
        must_change_password: true,
      });

      if (profileUpsertError) {
        results.push({
          row: rowNumber,
          email: guardian.email,
          nis: guardian.student_nis,
          status: "error",
          message: "Gagal menyimpan profil wali",
        });
        continue;
      }

      const { error: relationError } = await adminSupabase.from("student_guardians").insert({
        guardian_profile_id: authData.user.id,
        student_id: student.id,
        relationship: guardian.relationship || "wali",
      });

      if (relationError) {
        results.push({
          row: rowNumber,
          email: guardian.email,
          nis: guardian.student_nis,
          status: "error",
          message: "Gagal menghubungkan wali ke siswa",
        });
        continue;
      }
    }

    results.push({
      row: rowNumber,
      email: guardian.email,
      nis: guardian.student_nis,
      status: "success",
    });
  }

  return {
    success: true,
    data: {
      successCount: results.filter((r) => r.status === "success").length,
      errorCount: results.filter((r) => r.status === "error").length,
      results,
    },
  };
}

function generateTemporaryPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const chars = letters + digits;
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
