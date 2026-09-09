"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { recordFinancialAuditEvent } from "@/lib/financial-audit/actions";
import { createNotification } from "@/lib/notifications/service";

function generateTemporaryPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (source: string) => source[Math.floor(Math.random() * source.length)];
  const segments = Array.from({ length: 4 }, () => pick(letters) + pick(digits) + pick(letters) + pick(digits));
  const prefix = "SPO-";
  return `${prefix}${segments.join("")}`.slice(0, 12);
}

export async function getGuardiansAction(
  page?: number,
  pageSize?: number,
  searchQuery?: string,
  classId?: string,
  academicYearId?: string
) {
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
    .from("student_guardians")
    .select(
      `
      guardian_profile_id,
      student_id,
      created_at,
      profiles!inner (id, full_name, role),
      students!inner (id, nis, full_name, school_id)
    `,
      { count: "exact" }
    )
    .eq("students.school_id", profile.school_id)
    .order("created_at", { ascending: false });

  // 1. FILTER PENCARIAN GLOBAL AMAN (Fixing SQL/PostgREST Join Error)
  if (searchQuery && searchQuery.trim()) {
    const trimmed = searchQuery.trim();
    const escaped = `%${trimmed.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

    const [matchedProfilesRes, matchedStudentsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id")
        .eq("school_id", profile.school_id)
        .ilike("full_name", escaped),
      supabase
        .from("students")
        .select("id")
        .eq("school_id", profile.school_id)
        .or(`nis.ilike.${escaped},full_name.ilike.${escaped}`),
    ]);

    const profileIds = (matchedProfilesRes.data || []).map((p) => p.id);
    const studentIds = (matchedStudentsRes.data || []).map((s) => s.id);

    if (profileIds.length > 0 && studentIds.length > 0) {
      const profileOr = profileIds.map((id) => `guardian_profile_id.eq.${id}`).join(",");
      const studentOr = studentIds.map((id) => `student_id.eq.${id}`).join(",");
      query = query.or(`${profileOr},${studentOr}`);
    } else if (profileIds.length > 0) {
      query = query.in("guardian_profile_id", profileIds);
    } else if (studentIds.length > 0) {
      query = query.in("student_id", studentIds);
    } else {
      query = query.eq("student_id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // 2. FILTER KELAS (Fixing .maybeSingle() bug)
  if (classId) {
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("class_id", classId)
      .eq("school_id", profile.school_id);

    const studentIds = (enrollments || []).map((e) => e.student_id);
    if (studentIds.length > 0) {
      query = query.in("student_id", studentIds);
    } else {
      query = query.eq("student_id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // 3. FILTER TAHUN AJARAN (Fixing .maybeSingle() bug)
  if (academicYearId) {
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("academic_year_id", academicYearId)
      .eq("school_id", profile.school_id);

    const studentIds = (enrollments || []).map((e) => e.student_id);
    if (studentIds.length > 0) {
      query = query.in("student_id", studentIds);
    } else {
      query = query.eq("student_id", "00000000-0000-0000-0000-000000000000");
    }
  }

  const { data: guardians, error: guardiansError, count } = await query.range(from, to);

  if (guardiansError) {
    console.error("[getGuardiansAction Error]", guardiansError);
    return { error: "Gagal memuat data wali." } as const;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalized = (guardians || []).map((g: any) => ({
    guardian_profile_id: g.guardian_profile_id,
    student_id: g.student_id,
    created_at: g.created_at,
    profiles: Array.isArray(g.profiles) ? g.profiles[0] : g.profiles,
    students: Array.isArray(g.students) ? g.students[0] : g.students,
  }));

  return { guardians: normalized, page: pageNum, pageSize: pageSizeNum, totalRows: count || 0 } as const;
}

export async function getGuardianAction(guardianProfileId: string | undefined): Promise<
  | { error: string }
  | {
      guardian: { id: string; full_name: string; email: string; phone: string; role: string };
      students: { id: string; relationship: string; student_id: string; student_nis: string; student_name: string; student_status: string }[];
      payments: { id: string; amount: number; status: string; created_at: string; bill_id: string }[];
      bills: { id: string; title: string; amount: number; status: string; due_date: string }[];
    }
> {
  if (!guardianProfileId) {
    return { error: "ID wali tidak valid." };
  }
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

  const { data: guardianProfile, error: guardianError } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, school_id")
    .eq("id", guardianProfileId)
    .maybeSingle();

  if (guardianError || !guardianProfile) {
    return { error: "Wali tidak ditemukan." };
  }

  if (guardianProfile.school_id !== profile.school_id) {
    return { error: "Wali tidak berada di sekolah yang sama." };
  }

  const { data: guardianLinks, error: linksError } = await supabase
    .from("student_guardians")
    .select(`
      id,
      relationship,
      student_id,
      students!inner (
        id,
        nis,
        full_name,
        status,
        school_id
      )
    `)
    .eq("guardian_profile_id", guardianProfileId)
    .eq("students.school_id", profile.school_id);

  if (linksError) {
    return { error: "Gagal memuat data relasi wali." };
  }

  const studentIds = (guardianLinks || []).map((link) => link.student_id);

  let payments: { id: string; amount: number; status: string; created_at: string; bill_id: string }[] = [];
  let bills: { id: string; title: string; amount: number; status: string; due_date: string }[] = [];
  if (studentIds.length > 0) {
    const [{ data: paymentsData }, { data: billsData }] = await Promise.all([
      supabase.from("payments").select("id, amount, status, created_at, bill_id").in("student_id", studentIds).order("created_at", { ascending: false }),
      supabase.from("student_bills").select("id, title, amount, status, due_date").in("student_id", studentIds).order("created_at", { ascending: false }),
    ]);

    payments = paymentsData || [];
    bills = billsData || [];
  }

  const students = (guardianLinks || []).map((link) => {
    const student = Array.isArray(link.students) ? link.students[0] : link.students;
    return {
      id: link.id,
      relationship: link.relationship,
      student_id: link.student_id,
      student_nis: student?.nis || "-",
      student_name: student?.full_name || "-",
      student_status: student?.status || "-",
    };
  });

  return {
    guardian: {
      id: guardianProfile.id,
      full_name: guardianProfile.full_name,
      email: guardianProfile.email,
      phone: guardianProfile.phone,
      role: guardianProfile.role,
    },
    students,
    payments,
    bills,
  };
}

export async function createGuardianAction(formData: FormData) {
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

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const relationship = String(formData.get("relationship") || "").trim();
  const studentIds = formData.getAll("student_ids").map((id) => String(id).trim()).filter(Boolean);

  if (!fullName || !email || !relationship) {
    return { error: "Nama, email, dan hubungan harus diisi." };
  }

  if (studentIds.length === 0) {
    return { error: "Pilih minimal satu siswa." };
  }

  const adminSupabase = await createAdminClient();

  let guardianProfileId: string | null = null;
  const temporaryPassword = generateTemporaryPassword();
  let isNewUser = true;
  let primaryStudentNis: string | null = null;

  const { data: existingProfile, error: existingProfileError } = await adminSupabase
    .from("profiles")
    .select("id, school_id, role")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) {
    return { error: "Gagal memeriksa data wali." };
  }

  if (existingProfile?.id) {
    if (existingProfile.school_id !== profile.school_id) {
      return { error: "Email wali sudah terdaftar di sekolah lain." };
    }
    guardianProfileId = existingProfile.id;
    isNewUser = false;
  } else {
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError || !authData.user) {
      if (authError?.code === "email_exists") {
        const { data: usersData } = await adminSupabase.auth.admin.listUsers({
          page: 1,
          perPage: 100,
        });

        const existingAuthUser = (usersData?.users || []).find((u) => u.email === email);
        if (!existingAuthUser) {
          return { error: "Email sudah terdaftar, tetapi akunnya tidak dapat ditemukan." };
        }

        guardianProfileId = existingAuthUser.id;
        isNewUser = false;
      } else {
        return { error: "Gagal membuat akun wali." };
      }
    } else {
      guardianProfileId = authData.user.id;
    }
  }

  const { data: primaryStudent } = await adminSupabase
    .from("students")
    .select("nis")
    .in("id", studentIds)
    .limit(1)
    .maybeSingle();

  if (primaryStudent?.nis) {
    primaryStudentNis = primaryStudent.nis;
  }

  const { error: profileUpsertError } = await adminSupabase.from("profiles").upsert({
    id: guardianProfileId,
    school_id: profile.school_id,
    role: "orang_tua",
    full_name: fullName,
    phone: phone || null,
    email,
    username: isNewUser ? `nis_${primaryStudentNis}` : undefined,
    must_change_password: isNewUser,
  });

  if (profileUpsertError) {
    if (profileUpsertError.code === "23505") {
      return { error: "Profil wali dengan email ini sudah ada." };
    }
    return { error: "Gagal menyimpan profil wali." };
  }

  const relationsToInsert = studentIds.map((studentId) => ({
    guardian_profile_id: guardianProfileId,
    student_id: studentId,
    relationship,
  }));

  const { error: relationError } = await adminSupabase.from("student_guardians").insert(relationsToInsert);

  if (relationError) {
    if (relationError.code === "23505") {
      return { error: "Wali sudah terhubung dengan salah satu siswa ini." };
    }
    return { error: "Gagal menghubungkan wali. Silakan coba lagi." };
  }

  await recordFinancialAuditEvent({
    actionType: "other",
    entityType: "other",
    schoolId: profile.school_id,
    actorProfileId: user.id,
    actorRole: profile.role,
    metadata: {
      action: "guardian_created",
      guardian_profile_id: guardianProfileId,
      full_name: fullName,
      email,
      relationship,
      student_ids: studentIds,
      is_new_user: isNewUser,
    },
  });

  if (!guardianProfileId) {
    return { error: "Gagal membuat akun wali." };
  }

  await createNotification({
    recipientProfileId: guardianProfileId,
    notificationType: "guardian_welcome",
    title: "Selamat datang di SPO SD Peradaban",
    message: `Akun wali untuk ${fullName} telah dibuat. Gunakan email ${email} untuk login.`,
    schoolId: profile.school_id,
    entityType: "guardian",
    entityId: guardianProfileId,
    actionLabel: "Login",
    actionHref: "/login",
    metadata: {
      email,
      is_new_user: isNewUser,
    },
  });

  return {
    success: true,
    credentials: isNewUser
      ? {
          email,
          temporaryPassword,
          fullName,
          linkedStudents: studentIds.length,
          username: primaryStudentNis ? `nis_${primaryStudentNis}` : null,
        }
      : null,
  };
}

export async function deleteGuardianAction(guardianProfileId: string, studentId: string) {
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

  const { error } = await supabase
    .from("student_guardians")
    .delete()
    .eq("guardian_profile_id", guardianProfileId)
    .eq("student_id", studentId);

  if (error) {
    return { error: "Gagal menghapus hubungan wali." };
  }

  return { success: true };
}

export async function bulkDeleteGuardiansAction(payload: { guardian_profile_id: string; student_id: string }[]) {
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

  const items = Array.isArray(payload) ? payload.filter((item) => item?.guardian_profile_id && item?.student_id) : [];
  if (items.length === 0) {
    return { error: "Tidak ada data yang dipilih." };
  }

  const studentIds = [...new Set(items.map((item) => item.student_id))];
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, school_id")
    .in("id", studentIds);

  if (studentsError || !students) {
    return { error: "Gagal memvalidasi data siswa." };
  }

  const invalidStudent = students.find((s) => s.school_id !== profile.school_id);
  if (invalidStudent) {
    return { error: "Beberapa data siswa tidak berada di sekolah yang sama." };
  }

  const deletePromises = items.map((item) =>
    supabase
      .from("student_guardians")
      .delete()
      .eq("guardian_profile_id", item.guardian_profile_id)
      .eq("student_id", item.student_id)
  );

  const results = await Promise.all(deletePromises);
  const failed = results.find((res) => res.error);

  if (failed?.error) {
    return { error: "Gagal menghapus sebagian hubungan wali." };
  }

  return { success: true, deletedCount: items.length };
}

export async function exportGuardiansAction() {
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

  const { data: guardians, error: guardiansError } = await supabase
    .from("student_guardians")
    .select(`
      guardian_profile_id,
      student_id,
      profiles!inner (full_name, email, phone),
      students!inner (nis, full_name)
    `)
    .eq("students.school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (guardiansError) {
    return { error: "Gagal memuat data wali untuk export." };
  }

  const headers = ["Nama Wali", "Email", "No HP", "Hubungan", "NIS Siswa", "Nama Siswa"];
  const rows = (guardians || []).map((g) => {
    const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
    const student = Array.isArray(g.students) ? g.students[0] : g.students;
    return [
      profile?.full_name || "",
      profile?.email || "",
      profile?.phone || "",
      "",
      student?.nis || "",
      student?.full_name || "",
    ];
  });

  const { buildExcel } = await import("@/lib/import-export/excel");
  const blob = buildExcel(headers, rows);

  return { success: true, data: { blob, filename: "wali.xlsx" } };
}

export async function importGuardiansAction(formData: FormData) {
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

  const expectedHeaders = ["Nama Wali", "Email", "No HP", "Hubungan", "NIS Siswa", "Nama Siswa"];
  if (headers.length !== expectedHeaders.length || headers.some((header, index) => header !== expectedHeaders[index])) {
    return { error: `Header tidak valid. Yang diharapkan: ${expectedHeaders.join(", ")}` };
  }

  const results: { row: number; email: string; nis: string; status: "inserted" | "updated" | "error"; message?: string }[] = [];
  const adminSupabase = await createAdminClient();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    if (row.length < 6) {
      results.push({ row: rowNumber, email: "-", nis: "-", status: "error", message: "Kolom tidak lengkap" });
      continue;
    }

    const [fullName, email, phone, relationship, nis] = row;

    if (!fullName || !email || !nis) {
      results.push({ row: rowNumber, email: email || "-", nis: nis || "-", status: "error", message: "Nama, Email, dan NIS harus diisi" });
      continue;
    }

    const { data: student } = await adminSupabase
      .from("students")
      .select("id, school_id")
      .eq("nis", nis.trim())
      .eq("school_id", profile.school_id)
      .maybeSingle();

    if (!student) {
      results.push({ row: rowNumber, email: email || "-", nis: nis || "-", status: "error", message: "Siswa dengan NIS tersebut tidak ditemukan" });
      continue;
    }

    const trimmedEmail = email.trim();
    const trimmedPhone = phone ? phone.trim() : "";
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("id, email, full_name, phone")
      .or(`email.eq.${trimmedEmail}${trimmedPhone ? `,phone.eq.${trimmedPhone}` : ""}`)
      .maybeSingle();

    let matchedProfile = existingProfile;
    if (!matchedProfile?.id && trimmedPhone) {
      const { data: phoneProfile } = await adminSupabase
        .from("profiles")
        .select("id, email, full_name, phone")
        .eq("phone", trimmedPhone)
        .maybeSingle();

      if (phoneProfile?.id) {
        matchedProfile = phoneProfile;
      }
    }

    if (matchedProfile?.id) {
      const isPlaceholder = matchedProfile.email?.includes("@placeholder.local");
      const needsUpdate = isPlaceholder || matchedProfile.email !== trimmedEmail || matchedProfile.full_name !== fullName.trim() || matchedProfile.phone !== trimmedPhone;

      if (needsUpdate) {
        await adminSupabase.from("profiles").update({
          email: trimmedEmail,
          full_name: fullName.trim(),
          phone: trimmedPhone || null,
        }).eq("id", matchedProfile.id);

        try {
          await adminSupabase.auth.admin.updateUserById(matchedProfile.id, {
            email: trimmedEmail,
          });
        } catch {
          // Ignore auth email update error
        }
      }

      const { data: existingRelation } = await adminSupabase
        .from("student_guardians")
        .select("id")
        .eq("guardian_profile_id", matchedProfile.id)
        .eq("student_id", student.id)
        .maybeSingle();

      if (existingRelation?.id) {
        results.push({ row: rowNumber, email, nis, status: "error", message: "Wali sudah terhubung dengan siswa ini" });
        continue;
      }

      const { error: relationError } = await adminSupabase.from("student_guardians").insert({
        guardian_profile_id: matchedProfile.id,
        student_id: student.id,
        relationship: relationship || "wali",
      });

      if (relationError) {
        results.push({ row: rowNumber, email, nis, status: "error", message: "Gagal menghubungkan wali ke siswa" });
        continue;
      }

      const matchedBy = matchedProfile.email === trimmedEmail ? "email" : "phone";
      results.push({ row: rowNumber, email, nis, status: "updated", message: `Wali sudah ada, relasi siswa ditambahkan (match via ${matchedBy})` });
    } else {
      const temporaryPassword = generateTemporaryPassword();
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: email.trim(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName.trim() },
      });

      if (authError || !authData.user) {
        results.push({ row: rowNumber, email, nis, status: "error", message: "Gagal membuat akun wali" });
        continue;
      }

      const { error: profileUpsertError } = await adminSupabase.from("profiles").upsert({
        id: authData.user.id,
        school_id: profile.school_id,
        role: "orang_tua",
        full_name: fullName.trim(),
        phone: phone || null,
        email: email.trim(),
        must_change_password: true,
      });

      if (profileUpsertError) {
        results.push({ row: rowNumber, email, nis, status: "error", message: "Gagal menyimpan profil wali" });
        continue;
      }

      const { error: relationError } = await adminSupabase.from("student_guardians").insert({
        guardian_profile_id: authData.user.id,
        student_id: student.id,
        relationship: relationship || "wali",
      });

      if (relationError) {
        results.push({ row: rowNumber, email, nis, status: "error", message: "Gagal menghubungkan wali ke siswa" });
        continue;
      }

      results.push({ row: rowNumber, email, nis, status: "inserted", message: "Akun wali baru dibuat" });
    }
  }

  return {
    success: true,
    data: {
      successCount: results.filter((r) => r.status === "inserted" || r.status === "updated").length,
      insertedCount: results.filter((r) => r.status === "inserted").length,
      updatedCount: results.filter((r) => r.status === "updated").length,
      errorCount: results.filter((r) => r.status === "error").length,
      results,
    },
  };
}

export async function getGuardianSearchAction(query: string) {
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

  if (!query || query.trim().length === 0) {
    return { guardians: [] } as const;
  }

  const { data: guardians, error: guardiansError } = await supabase
    .from("student_guardians")
    .select(`
      guardian_profile_id,
      profiles!inner (id, full_name, email, phone)
    `)
    .eq("profiles.school_id", profile.school_id)
    .or(`profiles.full_name.ilike.%${query}%,profiles.email.ilike.%${query}%,profiles.phone.ilike.%${query}%`)
    .order("profiles.full_name", { ascending: true })
    .limit(20);

  if (guardiansError) {
    return { error: "Gagal memuat data wali." } as const;
  }

  const seen = new Set<string>();
  const normalized: { guardian_profile_id: string; full_name: string; email: string; phone: string }[] = [];
  for (const g of guardians || []) {
    const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
    const guardianProfileId = g.guardian_profile_id as string;
    if (seen.has(guardianProfileId)) continue;
    seen.add(guardianProfileId);
    normalized.push({
      guardian_profile_id: guardianProfileId,
      full_name: (profile?.full_name as string) || "",
      email: (profile?.email as string) || "",
      phone: (profile?.phone as string) || "",
    });
  }

  return { guardians: normalized } as const;
}

export async function bulkLinkGuardianToStudentsAction(formData: FormData) {
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

  const guardianProfileId = String(formData.get("guardian_profile_id") || "").trim();
  const studentIds = formData.getAll("student_ids").map((id) => String(id).trim()).filter(Boolean);

  if (!guardianProfileId || studentIds.length === 0) {
    return { error: "Wali dan siswa harus diisi." };
  }

  const { data: guardianProfile, error: guardianError } = await supabase
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", guardianProfileId)
    .maybeSingle();

  if (guardianError || !guardianProfile) {
    return { error: "Wali tidak ditemukan." };
  }

  if (guardianProfile.school_id !== profile.school_id) {
    return { error: "Wali tidak berada di sekolah yang sama." };
  }

  if (guardianProfile.role !== "orang_tua") {
    return { error: "Profil yang dipilih bukan wali." };
  }

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, school_id")
    .in("id", studentIds)
    .eq("school_id", profile.school_id);

  if (studentsError || !students || students.length === 0) {
    return { error: "Siswa tidak ditemukan." };
  }

  const relationsToInsert = students
    .filter((student) => student.school_id === profile.school_id)
    .map((student) => ({
      guardian_profile_id: guardianProfileId,
      student_id: student.id,
      relationship: "wali",
    }));

  const { error: relationError } = await supabase.from("student_guardians").insert(relationsToInsert);

  if (relationError) {
    if (relationError.code === "23505") {
      return { error: "Beberapa siswa sudah terhubung dengan wali ini." };
    }
    return { error: "Gagal menghubungkan wali ke siswa." };
  }

  return { success: true, linkedCount: relationsToInsert.length };
}