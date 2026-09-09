"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getEnrollmentsAction(page?: number, pageSize?: number, searchQuery?: string) {
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
    .from("student_enrollments")
    .select(`
      id,
      student_id,
      academic_year_id,
      class_id,
      created_at,
      students (id, nis, full_name),
      academic_years (id, name),
      classes (id, name)
    `, { count: "exact" })
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchQuery && searchQuery.trim()) {
    const trimmed = searchQuery.trim();
    query = query.or(`students.nis.ilike.%${trimmed}%,students.full_name.ilike.%${trimmed}%,classes.name.ilike.%${trimmed}%,academic_years.name.ilike.%${trimmed}%`);
  }

  const { data: enrollments, error: enrollmentsError, count } = await query;

  if (enrollmentsError) {
    return { error: "Gagal memuat data pendaftaran." } as const;
  }

  const normalized = (enrollments || []).map((e) => ({
    id: e.id,
    student_id: e.student_id,
    academic_year_id: e.academic_year_id,
    class_id: e.class_id,
    created_at: e.created_at,
    students: Array.isArray(e.students) ? e.students[0] : e.students,
    academic_years: Array.isArray(e.academic_years) ? e.academic_years[0] : e.academic_years,
    classes: Array.isArray(e.classes) ? e.classes : (e.classes ? [e.classes] : []),
  }));

  return { enrollments: normalized, page: pageNum, pageSize: pageSizeNum, totalRows: count || 0 } as const;
}

export async function createEnrollmentAction(formData: FormData) {
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

  const studentId = String(formData.get("student_id") || "").trim();
  const academicYearId = String(formData.get("academic_year_id") || "").trim();
  const classId = String(formData.get("class_id") || "").trim() || null;

  if (!studentId || !academicYearId) {
    return { error: "Siswa dan tahun ajaran harus diisi." };
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("school_id")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return { error: "Siswa tidak ditemukan." };
  }

  if (student.school_id !== profile.school_id) {
    return { error: "Siswa tidak berada di sekolah yang sama." };
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

  const finalClassId = classId;
  if (finalClassId) {
    const { data: cls, error: classError } = await supabase
      .from("classes")
      .select("school_id")
      .eq("id", finalClassId)
      .single();

    if (classError || !cls) {
      return { error: "Kelas tidak valid." };
    }

    if (cls.school_id !== profile.school_id) {
      return { error: "Kelas tidak berada di sekolah yang sama." };
    }
  }

  const { error } = await supabase.from("student_enrollments").insert({
    school_id: profile.school_id,
    student_id: studentId,
    academic_year_id: academicYearId,
    class_id: finalClassId,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Siswa sudah terdaftar di tahun ajaran ini." };
    }
    return { error: "Gagal mendaftarkan siswa. Silakan coba lagi." };
  }

  return { success: true };
}

export async function updateEnrollmentAction(formData: FormData) {
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
  const classId = String(formData.get("class_id") || "").trim() || null;

  if (!id) {
    return { error: "ID pendaftaran tidak valid." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("student_enrollments")
    .select("student_id, school_id")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    return { error: "Pendaftaran tidak ditemukan." };
  }

  if (existing.school_id !== profile.school_id) {
    return { error: "Pendaftaran tidak berada di sekolah yang sama." };
  }

  const finalClassId = classId;
  if (finalClassId) {
    const { data: cls, error: classError } = await supabase
      .from("classes")
      .select("school_id")
      .eq("id", finalClassId)
      .single();

    if (classError || !cls) {
      return { error: "Kelas tidak valid." };
    }

    if (cls.school_id !== profile.school_id) {
      return { error: "Kelas tidak berada di sekolah yang sama." };
    }
  }

  const { error } = await supabase
    .from("student_enrollments")
    .update({ class_id: finalClassId })
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    return { error: "Gagal memperbarui pendaftaran. Silakan coba lagi." };
  }

  return { success: true };
}

export async function deleteEnrollmentAction(formData: FormData) {
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

  if (!id) {
    return { error: "ID pendaftaran tidak valid." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("student_enrollments")
    .select("school_id")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    return { error: "Pendaftaran tidak ditemukan." };
  }

  if (existing.school_id !== profile.school_id) {
    return { error: "Pendaftaran tidak berada di sekolah yang sama." };
  }

  const { error } = await supabase
    .from("student_enrollments")
    .delete()
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    return { error: "Gagal menghapus pendaftaran. Silakan coba lagi." };
  }

  return { success: true };
}

