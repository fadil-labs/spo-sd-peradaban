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
  const gradeLevel = String(formData.get("grade_level") || "").trim() || null;

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
    grade_level: gradeLevel,
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
  const gradeLevel = String(formData.get("grade_level") || "").trim() || null;

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
      grade_level: gradeLevel,
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

export async function exportClassesAction() {
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
    .select("name, academic_year_id, grade_level, academic_years (name)")
    .eq("school_id", profile.school_id)
    .order("academic_year_id", { ascending: true })
    .order("name", { ascending: true });

  if (classesError) {
    return { error: "Gagal memuat data kelas untuk export." };
  }

  const headers = ["Nama Kelas", "Tahun Ajaran", "Tingkatan"];
  const rows = (classes || []).map((cls: { name: string; academic_years?: { name: string }[] | { name?: string } | null; grade_level?: string | null }) => [
    cls.name,
    Array.isArray(cls.academic_years) ? cls.academic_years[0]?.name || "" : cls.academic_years?.name || "",
    cls.grade_level || "",
  ]);

  const { buildExcel } = await import("@/lib/import-export/excel");
  const blob = buildExcel(headers, rows);

  return { success: true, data: { blob, filename: "kelas.xlsx" } };
}

export async function importClassesAction(formData: FormData) {
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

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { error: "File tidak valid." };
  }

  const { parseImportFile } = await import("@/lib/import-export/excel");
  let parsed;
  try {
    parsed = await parseImportFile(file);
  } catch {
    return { error: "Gagal membaca file. Pastikan file berformat .xlsx atau .csv dan tidak rusak." };
  }

  const { headers, rows } = parsed;

  const expectedHeaders = ["Nama Kelas", "Tahun Ajaran", "Tingkatan"];
  if (headers.length !== expectedHeaders.length || headers.some((header, index) => header !== expectedHeaders[index])) {
    return { error: `Header tidak valid. Yang diharapkan: ${expectedHeaders.join(", ")}` };
  }

  const results: { row: number; name: string; academic_year: string; status: "inserted" | "updated" | "error"; message?: string }[] = [];
  const upserts: { school_id: string; academic_year_id: string; name: string; grade_level: string | null }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    if (row.length < 3) {
      results.push({ row: rowNumber, name: "-", academic_year: "-", status: "error", message: "Kolom tidak lengkap" });
      continue;
    }

    const [name, academicYearName, gradeLevel] = row;

    if (!name || !academicYearName) {
      results.push({ row: rowNumber, name: name || "-", academic_year: academicYearName || "-", status: "error", message: "Nama Kelas dan Tahun Ajaran harus diisi" });
      continue;
    }

    const { data: academicYear, error: academicYearError } = await supabase
      .from("academic_years")
      .select("id, school_id")
      .eq("name", academicYearName.trim())
      .eq("school_id", profile.school_id)
      .maybeSingle();

    if (academicYearError || !academicYear) {
      results.push({ row: rowNumber, name, academic_year: academicYearName, status: "error", message: "Tahun ajaran tidak ditemukan di sekolah ini" });
      continue;
    }

    upserts.push({
      school_id: profile.school_id,
      academic_year_id: academicYear.id,
      name: name.trim(),
      grade_level: gradeLevel || null,
    });
  }

  let insertedCount = 0;
  let updatedCount = 0;

  if (upserts.length > 0) {
    const { data: existingClasses, error: existingError } = await supabase
      .from("classes")
      .select("name, academic_year_id")
      .eq("school_id", profile.school_id)
      .in("academic_year_id", upserts.map((u) => u.academic_year_id));

    if (existingError) {
      return { error: `Gagal memeriksa data kelas yang sudah ada: ${existingError.message}` };
    }

    const existingKeys = new Set((existingClasses || []).map((c) => `${c.academic_year_id}:${c.name}`));

    const inserts = upserts.filter((cls) => !existingKeys.has(`${cls.academic_year_id}:${cls.name}`));
    const updates = upserts.filter((cls) => existingKeys.has(`${cls.academic_year_id}:${cls.name}`));

    for (const cls of inserts) {
      insertedCount += 1;
      results.push({ row: 0, name: cls.name, academic_year: "", status: "inserted", message: "Kelas baru ditambahkan" });
    }

    for (const cls of updates) {
      updatedCount += 1;
      results.push({ row: 0, name: cls.name, academic_year: "", status: "updated", message: "Kelas sudah ada, data diperbarui" });
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("classes").insert(
        inserts.map((cls) => ({
          ...cls,
          updated_at: new Date().toISOString(),
        }))
      );

      if (insertError) {
        return { error: `Gagal menambahkan data kelas: ${insertError.message}` };
      }
    }

    if (updates.length > 0) {
      for (const cls of updates) {
        const { error: updateError } = await supabase
          .from("classes")
          .update({
            grade_level: cls.grade_level,
            updated_at: new Date().toISOString(),
          })
          .eq("name", cls.name)
          .eq("academic_year_id", cls.academic_year_id)
          .eq("school_id", profile.school_id);

        if (updateError) {
          return { error: `Gagal memperbarui data kelas: ${updateError.message}` };
        }
      }
    }
  }

  const successCount = insertedCount + updatedCount;
  const errorCount = results.filter((result) => result.status === "error").length;

  return {
    success: true,
    data: {
      successCount,
      insertedCount,
      updatedCount,
      errorCount,
      results,
    },
  };
}

