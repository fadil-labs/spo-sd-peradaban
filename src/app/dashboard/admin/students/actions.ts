"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const STUDENT_STATUSES = ["active", "inactive", "graduated", "transferred"] as const;

const DAPODIK_HEADERS = [
  "No",
  "NISN",
  "NIPD / NIS",
  "Nama Lengkap Peserta Didik",
  "JK",
  "NIK",
  "Tempat Lahir",
  "Tanggal Lahir",
  "Agama",
  "Kelas",
  "Alamat Jalan",
  "RT/RW",
  "Kelurahan",
  "Kecamatan",
  "Nama Ayah",
  "Pekerjaan Ayah",
  "Nama Ibu",
  "Pekerjaan Ibu",
  "No. HP Orang Tua",
  "Anak Ke",
  "Status Siswa",
];

const SIMPLE_HEADERS = ["NIS", "Nama Lengkap", "Tanggal Lahir", "Alamat", "Status"];

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[0];
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeStatus(value: string): string {
  const lowered = value.trim().toLowerCase();
  if (["aktif", "active"].includes(lowered)) return "active";
  if (["tidak aktif", "inactive", "nonaktif"].includes(lowered)) return "inactive";
  if (["lulus", "graduated"].includes(lowered)) return "graduated";
  if (["pindah", "transferred"].includes(lowered)) return "transferred";
  if (STUDENT_STATUSES.includes(lowered as typeof STUDENT_STATUSES[number])) return lowered;
  return "active";
}

export async function getStudentsAction(searchQuery?: string, statusFilter?: string, page?: number, pageSize?: number) {
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
    .from("students")
    .select("*", { count: "exact" })
    .eq("school_id", profile.school_id)
    .order("full_name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (searchQuery) {
    query = query.or(`nis.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
  }

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: students, error: studentsError, count } = await query;

  if (studentsError) {
    return { error: "Gagal memuat data siswa." };
  }

  return { students: students || [], page: pageNum, pageSize: pageSizeNum, totalRows: count || 0 };
}

export async function createStudentAction(formData: FormData) {
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

  const nis = String(formData.get("nis") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const birthDate = String(formData.get("birth_date") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const status = String(formData.get("status") || "active").trim();

  if (!name) {
    return { error: "Nama siswa harus diisi." };
  }

  if (!nis) {
    return { error: "NIS harus diisi." };
  }

  if (!STUDENT_STATUSES.includes(status as typeof STUDENT_STATUSES[number])) {
    return { error: "Status tidak valid." };
  }

  const { error } = await supabase.from("students").insert({
    school_id: profile.school_id,
    nis,
    full_name: name,
    birth_date: birthDate,
    address,
    status,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "NIS sudah terdaftar di sekolah ini." };
    }
    return { error: "Gagal membuat siswa. Silakan coba lagi." };
  }

  return { success: true };
}

export async function updateStudentAction(formData: FormData) {
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
  const nis = String(formData.get("nis") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const birthDate = String(formData.get("birth_date") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const status = String(formData.get("status") || "active").trim();

  if (!id) {
    return { error: "ID siswa tidak valid." };
  }

  if (!name) {
    return { error: "Nama siswa harus diisi." };
  }

  if (!nis) {
    return { error: "NIS harus diisi." };
  }

  if (!STUDENT_STATUSES.includes(status as typeof STUDENT_STATUSES[number])) {
    return { error: "Status tidak valid." };
  }

  const { error } = await supabase
    .from("students")
    .update({
      nis,
      full_name: name,
      birth_date: birthDate,
      address,
      status,
    })
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    if (error.code === "23505") {
      return { error: "NIS sudah terdaftar di sekolah ini." };
    }
    return { error: "Gagal memperbarui siswa. Silakan coba lagi." };
  }

  return { success: true };
}

export async function exportStudentsAction() {
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

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("nis, full_name, birth_date, address, status")
    .eq("school_id", profile.school_id)
    .order("full_name", { ascending: true });

  if (studentsError) {
    return { error: "Gagal memuat data siswa untuk export." };
  }

  const headers = ["NIS", "Nama Lengkap", "Tanggal Lahir", "Alamat", "Status"];
  const rows = (students || []).map((student) => [
    student.nis,
    student.full_name,
    student.birth_date || "",
    student.address || "",
    student.status,
  ]);

  const { buildExcel } = await import("@/lib/import-export/excel");
  const blob = buildExcel(headers, rows);

  return { success: true, data: { blob, filename: "siswa.xlsx" } };
}

export async function importStudentsAction(formData: FormData) {
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

  const schoolId = profile.school_id;
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { error: "File tidak valid." };
  }

  const academicYearId = String(formData.get("academic_year_id") || "").trim();

  const { parseImportFile } = await import("@/lib/import-export/excel");
  let parsed;
  try {
    parsed = await parseImportFile(file);
  } catch {
    return { error: "Gagal membaca file. Pastikan file berformat .xlsx atau .csv dan tidak rusak." };
  }

  const { headers, rows } = parsed;

  const isDapodik = headers.length === DAPODIK_HEADERS.length && headers.every((h, idx) => h === DAPODIK_HEADERS[idx]);
  const isSimple = headers.length === SIMPLE_HEADERS.length && headers.every((h, idx) => h === SIMPLE_HEADERS[idx]);

  if (!isDapodik && !isSimple) {
    return { error: `Header tidak valid. Yang diharapkan:\n- Format Dapodik: ${DAPODIK_HEADERS.join(", ")}\n- Format Sederhana: ${SIMPLE_HEADERS.join(", ")}` };
  }

  const results: { row: number; nis: string; full_name: string; status: "inserted" | "updated" | "error"; message?: string }[] = [];

  if (isSimple) {
    const upserts: { school_id: string; nis: string; full_name: string; birth_date: string | null; address: string | null; status: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      if (row.length < 5) {
        results.push({ row: rowNumber, nis: "-", full_name: "-", status: "error", message: "Kolom tidak lengkap" });
        continue;
      }

      const [nis, fullName, birthDate, address, status] = row;

      if (!nis || !fullName) {
        results.push({ row: rowNumber, nis: nis || "-", full_name: fullName || "-", status: "error", message: "NIS dan Nama Lengkap harus diisi" });
        continue;
      }

      if (!STUDENT_STATUSES.includes(status as typeof STUDENT_STATUSES[number])) {
        results.push({ row: rowNumber, nis, full_name: fullName, status: "error", message: `Status tidak valid: ${status}` });
        continue;
      }

      upserts.push({
        school_id: profile.school_id,
        nis: nis.trim(),
        full_name: fullName.trim(),
        birth_date: birthDate || null,
        address: address || null,
        status: status.trim(),
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    if (upserts.length > 0) {
      const { data: existingStudents, error: existingError } = await supabase
        .from("students")
        .select("nis")
        .eq("school_id", profile.school_id)
        .in("nis", upserts.map((u) => u.nis));

      if (existingError) {
        return { error: `Gagal memeriksa data siswa yang sudah ada: ${existingError.message}` };
      }

      const existingNis = new Set((existingStudents || []).map((s) => s.nis));

      const inserts = upserts.filter((student) => !existingNis.has(student.nis));
      const updates = upserts.filter((student) => existingNis.has(student.nis));

      for (const student of inserts) {
        insertedCount += 1;
        results.push({ row: 0, nis: student.nis, full_name: student.full_name, status: "inserted", message: "Siswa baru ditambahkan" });
      }

      for (const student of updates) {
        updatedCount += 1;
        results.push({ row: 0, nis: student.nis, full_name: student.full_name, status: "updated", message: "NIS sudah terdaftar, data diperbarui" });
      }

      if (inserts.length > 0) {
        const { error: insertError } = await supabase.from("students").insert(
          inserts.map((student) => ({
            ...student,
            updated_at: new Date().toISOString(),
          }))
        );

        if (insertError) {
          return { error: `Gagal menambahkan data siswa: ${insertError.message}` };
        }
      }

      if (updates.length > 0) {
        for (const student of updates) {
          const { error: updateError } = await supabase
            .from("students")
            .update({
              full_name: student.full_name,
              birth_date: student.birth_date,
              address: student.address,
              status: student.status,
              updated_at: new Date().toISOString(),
            })
            .eq("nis", student.nis)
            .eq("school_id", schoolId);

          if (updateError) {
            return { error: `Gagal memperbarui data siswa: ${updateError.message}` };
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
        results: results.map((r) => ({
          row: r.row,
          nis: r.nis,
          full_name: r.full_name,
          status: r.status,
          message: r.message,
        })),
      },
    };
  }

  const adminSupabase = await createAdminClient();
  type DapodikStudentUpsert = {
    school_id: string;
    nis: string;
    nisn: string | null;
    full_name: string;
    gender: string | null;
    religion: string | null;
    birth_place: string | null;
    birth_date: string | null;
    address_street: string | null;
    rt_rw: string | null;
    kelurahan: string | null;
    kecamatan: string | null;
    city: string | null;
    postal_code: string | null;
    student_phone: string | null;
    student_email: string | null;
    child_order: number | null;
    father_name: string | null;
    father_occupation: string | null;
    mother_name: string | null;
    mother_occupation: string | null;
    guardian_phone: string | null;
    class_name: string | null;
    status: string;
  };
  const upserts: DapodikStudentUpsert[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    if (row.length < DAPODIK_HEADERS.length) {
      results.push({ row: rowNumber, nis: "-", full_name: "-", status: "error", message: "Kolom tidak lengkap" });
      continue;
    }

    const [
      ,
      nisn,
      nipdNis,
      fullName,
      jk,
      _nik,
      birthPlace,
      birthDate,
      religion,
      _kelas,
      addressStreet,
      rtRw,
      kelurahan,
      kecamatan,
      fatherName,
      fatherOccupation,
      motherName,
      motherOccupation,
      guardianPhone,
      childOrder,
      status,
    ] = row;

    const trimmedNipdNis = String(nipdNis || "").trim();
    const trimmedFullName = String(fullName || "").trim();
    const trimmedNisn = String(nisn || "").trim();

    if (!trimmedNipdNis || !trimmedFullName) {
      results.push({ row: rowNumber, nis: trimmedNipdNis || "-", full_name: trimmedFullName || "-", status: "error", message: "NIS/NIPD dan Nama Lengkap harus diisi" });
      continue;
    }

    const normalizedGender = String(jk || "").trim().toUpperCase();
    const gender = normalizedGender === "P" ? "P" : normalizedGender === "L" ? "L" : null;

    const childOrderNum = childOrder ? parseInt(String(childOrder).trim(), 10) : null;

    upserts.push({
      school_id: profile.school_id,
      nis: trimmedNipdNis,
      nisn: trimmedNisn || null,
      full_name: trimmedFullName,
      gender,
      religion: String(religion || "").trim() || null,
      birth_place: String(birthPlace || "").trim() || null,
      birth_date: parseDate(String(birthDate || "")),
      address_street: String(addressStreet || "").trim() || null,
      rt_rw: String(rtRw || "").trim() || null,
      kelurahan: String(kelurahan || "").trim() || null,
      kecamatan: String(kecamatan || "").trim() || null,
      city: null,
      postal_code: null,
      student_phone: null,
      student_email: null,
      child_order: Number.isNaN(childOrderNum) ? null : childOrderNum,
      father_name: String(fatherName || "").trim() || null,
      father_occupation: String(fatherOccupation || "").trim() || null,
      mother_name: String(motherName || "").trim() || null,
      mother_occupation: String(motherOccupation || "").trim() || null,
      guardian_phone: String(guardianPhone || "").trim() || null,
      class_name: String(_kelas || "").trim() || null,
      status: normalizeStatus(String(status || "Aktif")),
    });
  }

  const allNisnValues = upserts.map((u) => u.nisn).filter((nisn): nisn is string => Boolean(nisn));

  let insertedCount = 0;
  let updatedCount = 0;

  if (upserts.length > 0) {
    const nisValues = upserts.map((u) => u.nis);
    const nisnValues = allNisnValues;

    const [existingByNisResult, existingByNisnResult] = await Promise.all([
      supabase
        .from("students")
        .select("nis, nisn, id")
        .eq("school_id", profile.school_id)
        .in("nis", nisValues),
      nisnValues.length > 0
        ? supabase
            .from("students")
            .select("nis, nisn, id")
            .eq("school_id", profile.school_id)
            .in("nisn", nisnValues)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (existingByNisResult.error) {
      return { error: `Gagal memeriksa data siswa yang sudah ada: ${existingByNisResult.error.message}` };
    }
    if (existingByNisnResult.error) {
      return { error: `Gagal memeriksa data siswa yang sudah ada: ${existingByNisnResult.error.message}` };
    }

    const existingStudents = [...(existingByNisResult.data || []), ...(existingByNisnResult.data || [])];
    const existingByNis = new Map((existingStudents || []).map((s) => [s.nis, s]));
    const existingByNisn = new Map((existingStudents || []).filter((s) => s.nisn).map((s) => [s.nisn, s]));

    const inserts: DapodikStudentUpsert[] = [];
    const updates: { existing: { id: string; nis: string }; update: DapodikStudentUpsert; class_name: string | null }[] = [];

    for (const student of upserts) {
      const existing = existingByNis.get(student.nis) || (student.nisn ? existingByNisn.get(student.nisn) : undefined);
      if (existing) {
        updates.push({ existing, update: student, class_name: student.class_name });
      } else {
        inserts.push(student);
      }
    }

    for (const item of updates) {
      updatedCount += 1;
      results.push({ row: 0, nis: item.update.nis, full_name: item.update.full_name, status: "updated", message: "Data siswa diperbarui" });
    }

    for (const student of inserts) {
      insertedCount += 1;
      results.push({ row: 0, nis: student.nis, full_name: student.full_name, status: "inserted", message: "Siswa baru ditambahkan" });
    }

    const insertedIds: { nis: string; nisn?: string; full_name: string; class_name?: string | null; data?: DapodikStudentUpsert | null }[] = [];
    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("students").insert(
        inserts.map(({ class_name: _class_name, ...student }) => ({
          ...student,
          updated_at: new Date().toISOString(),
        }))
      );

      if (insertError) {
        return { error: `Gagal menambahkan data siswa: ${insertError.message}` };
      }

      const { data: insertedStudents, error: insertedError } = await supabase
        .from("students")
        .select("id, nis, nisn, full_name")
        .eq("school_id", profile.school_id)
        .in("nis", inserts.map((s) => s.nis));

      if (insertedError) {
        return { error: `Gagal memuat data siswa yang baru ditambahkan: ${insertedError.message}` };
      }

      for (const s of insertedStudents || []) {
        const original = inserts.find((ins) => ins.nis === s.nis);
        insertedIds.push({ nis: s.nis, nisn: s.nisn || undefined, full_name: s.full_name, class_name: original?.class_name || null, data: original || null });
      }
    }

    if (updates.length > 0) {
      for (const item of updates) {
        const { class_name: _update_class_name, ...updatePayload } = item.update;
        const { error: updateError } = await supabase
          .from("students")
          .update({
            ...updatePayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.existing.id);

        if (updateError) {
          return { error: `Gagal memperbarui data siswa: ${updateError.message}` };
        }
      }
    }

    const allProcessed = [
      ...updates.map((item) => ({ existingId: item.existing.id, data: item.update, class_name: item.class_name })),
      ...insertedIds.map((s) => ({ existingId: s.nis, data: (s.data || { nis: s.nis, nisn: s.nisn || null, full_name: s.full_name, father_name: null, mother_name: null, guardian_phone: null, status: "active" }) as DapodikStudentUpsert, class_name: s.class_name || null })),
    ];

    for (const item of allProcessed) {
      const studentId = typeof item.existingId === "string" && item.existingId.length > 20 ? item.existingId : null;
      const studentNis = typeof item.existingId === "string" && item.existingId.length <= 20 ? item.existingId : item.data.nis;

      if (!studentId) {
        const { data: insertedStudent } = await supabase
          .from("students")
          .select("id")
          .eq("nis", studentNis)
          .eq("school_id", profile.school_id)
          .maybeSingle();

        if (!insertedStudent?.id) continue;
      }

      const finalStudentId = studentId || (await supabase.from("students").select("id").eq("nis", studentNis).eq("school_id", profile.school_id).maybeSingle()).data?.id;
      if (!finalStudentId) continue;

      const guardianLinks: { guardian_profile_id: string; relationship: string }[] = [];
      const guardianEmails = new Set<string>();

      const fatherName = (item.data as DapodikStudentUpsert).father_name;
      const motherName = (item.data as DapodikStudentUpsert).mother_name;
      const guardianPhone = (item.data as DapodikStudentUpsert).guardian_phone;

      async function findOrCreateParent(name: string, phone: string | null, roleLabel: "ayah" | "ibu", existingEmails: Set<string>): Promise<string | null> {
        const trimmedName = name.trim();
        const trimmedPhone = phone ? phone.trim() : "";

        if (!trimmedName && !trimmedPhone) return null;

        let profileId: string | null = null;

        if (trimmedName) {
          const { data: nameProfile } = await adminSupabase
            .from("profiles")
            .select("id, phone")
            .eq("school_id", schoolId)
            .eq("full_name", trimmedName)
            .maybeSingle();

          if (nameProfile?.id) {
            profileId = nameProfile.id;
            if (trimmedPhone && !nameProfile.phone) {
              await adminSupabase
                .from("profiles")
                .update({ phone: trimmedPhone })
                .eq("id", nameProfile.id);
            }
          }
        }

        if (!profileId && trimmedPhone) {
          const { data: phoneProfile } = await adminSupabase
            .from("profiles")
            .select("id, full_name")
            .eq("school_id", schoolId)
            .eq("phone", trimmedPhone)
            .maybeSingle();

          if (phoneProfile?.id) {
            const existingName = String(phoneProfile.full_name || "").trim();
            if (!existingName) {
              profileId = phoneProfile.id;
              await adminSupabase
                .from("profiles")
                .update({ full_name: trimmedName })
                .eq("id", phoneProfile.id);
            } else if (existingName === trimmedName) {
              profileId = phoneProfile.id;
            }
          }
        }

        if (profileId) {
          if (existingEmails.has(profileId)) {
            return profileId;
          }
          const { data: existingGuardian } = await adminSupabase
            .from("student_guardians")
            .select("id")
            .eq("guardian_profile_id", profileId)
            .eq("student_id", finalStudentId)
            .maybeSingle();

          if (!existingGuardian?.id) {
            guardianLinks.push({ guardian_profile_id: profileId, relationship: roleLabel });
            existingEmails.add(profileId);
          }
          return profileId;
        }

        const baseEmail = studentNis ? `${studentNis}@sekolah.id` : `${roleLabel}_${finalStudentId}@placeholder.local`;
        let email = baseEmail;
        let authUserId: string | null = null;

        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
          email,
          password: Math.random().toString(36).slice(2),
          email_confirm: true,
          user_metadata: { full_name: trimmedName },
        });

        if (authError || !authData?.user) {
          if (authError?.code === "email_exists") {
            const { data: usersData, error: usersError } = await adminSupabase.auth.admin.listUsers({
              page: 1,
              perPage: 100,
            });

            const existingAuthUser = usersData?.users?.find((u) => u.email === email);
            if (existingAuthUser?.id) {
              const { data: existingProfile } = await adminSupabase
                .from("profiles")
                .select("full_name")
                .eq("id", existingAuthUser.id)
                .maybeSingle();

              const existingName = String(existingProfile?.full_name || "").trim();
              if (!existingName || existingName === trimmedName) {
                authUserId = existingAuthUser.id;
              } else {
                const suffix = roleLabel === "ibu" ? "_ibu" : "_ayah";
                email = studentNis ? `${studentNis}${suffix}@sekolah.id` : `${roleLabel}_${finalStudentId}@placeholder.local`;

                const { data: altAuthData, error: altAuthError } = await adminSupabase.auth.admin.createUser({
                  email,
                  password: Math.random().toString(36).slice(2),
                  email_confirm: true,
                  user_metadata: { full_name: trimmedName },
                });

                if (altAuthError || !altAuthData?.user) {
                  console.error(`Failed to create alternative ${roleLabel} account`, altAuthError);
                  return null;
                }

                authUserId = altAuthData.user.id;
              }
            }
          }

          if (!authUserId) {
            console.error(`Failed to create or find ${roleLabel} account`, authError);
            return null;
          }
        } else {
          authUserId = authData.user.id;
        }

        const { error: profileError } = await adminSupabase.from("profiles").upsert({
          id: authUserId,
          school_id: schoolId,
          role: "orang_tua",
          full_name: trimmedName,
          phone: trimmedPhone || null,
          email,
          username: studentNis ? `nis_${studentNis}` : null,
        });

        if (profileError) {
          console.error(`Failed to create ${roleLabel} profile`, profileError);
          return null;
        }

        guardianLinks.push({ guardian_profile_id: authUserId, relationship: roleLabel });
        existingEmails.add(authUserId);
        return authUserId;
      }

      if (fatherName || guardianPhone) {
        await findOrCreateParent(fatherName || "", guardianPhone, "ayah", guardianEmails);
      }

      if (motherName) {
        await findOrCreateParent(motherName, guardianPhone, "ibu", guardianEmails);
      }

      if (guardianLinks.length > 0) {
        const { error: relationError } = await adminSupabase.from("student_guardians").insert(
          guardianLinks.map((link) => ({
            ...link,
            student_id: finalStudentId,
          }))
        );

        if (relationError && relationError.code !== "23505") {
          console.error("Failed to auto-link guardians during import", relationError);
        }
      }

      if (academicYearId && item.class_name) {
        const className = String(item.class_name).trim();
        const { data: existingClass } = await adminSupabase
          .from("classes")
          .select("id")
          .eq("school_id", profile.school_id)
          .eq("academic_year_id", academicYearId)
          .eq("name", className)
          .maybeSingle();

        let classId = existingClass?.id;
        if (!classId) {
          const { data: newClass, error: classError } = await adminSupabase
            .from("classes")
            .insert({
              school_id: schoolId,
              academic_year_id: academicYearId,
              name: className,
            })
            .select("id")
            .single();

          if (!classError && newClass) {
            classId = newClass.id;
          }
        }

        if (classId) {
          const studentStatus = String((item.data as DapodikStudentUpsert).status || "").toLowerCase();
          const isActive = studentStatus === "active" || studentStatus === "aktif";

          if (isActive) {
            const { data: existingEnrollment } = await adminSupabase
              .from("student_enrollments")
              .select("id")
              .eq("student_id", finalStudentId)
              .eq("academic_year_id", academicYearId)
              .maybeSingle();

            if (!existingEnrollment?.id) {
              await adminSupabase.from("student_enrollments").insert({
          school_id: schoolId,
                student_id: finalStudentId,
                academic_year_id: academicYearId,
                class_id: classId,
                status: "active",
              });
            } else {
              await adminSupabase
                .from("student_enrollments")
                .update({
                  class_id: classId,
                  status: "active",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingEnrollment.id);
            }
          }
        }
      }
    }
  }

  const placeholderGuardians = await adminSupabase
    .from("profiles")
    .select("id, email, phone")
    .eq("school_id", schoolId)
    .like("email", "%@placeholder.local");

  if (!placeholderGuardians.error && placeholderGuardians.data) {
    for (const guardian of placeholderGuardians.data) {
      const { data: studentLinks } = await adminSupabase
        .from("student_guardians")
        .select("student_id")
        .eq("guardian_profile_id", guardian.id)
        .limit(1);

      if (!studentLinks || studentLinks.length === 0) continue;

      const { data: student } = await adminSupabase
        .from("students")
        .select("nis")
        .eq("id", studentLinks[0].student_id)
        .maybeSingle();

      if (student?.nis) {
        const newEmail = `${student.nis}@sekolah.id`;
        await adminSupabase.from("profiles").update({ email: newEmail }).eq("id", guardian.id);
        try {
          await adminSupabase.auth.admin.updateUserById(guardian.id, { email: newEmail });
        } catch {
          // ignore auth email update errors
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
      results: results.map((r) => ({
        row: r.row,
        nis: r.nis,
        full_name: r.full_name,
        status: r.status,
        message: r.message,
      })),
    },
  };
}

export async function getStudentAction(studentId: string | undefined): Promise<
  | { error: string }
  | {
      student: {
        id: string;
        school_id: string;
        nis: string;
        nisn: string | null;
        full_name: string;
        gender: string | null;
        religion: string | null;
        birth_place: string | null;
        birth_date: string | null;
        address: string | null;
        address_street: string | null;
        rt_rw: string | null;
        kelurahan: string | null;
        kecamatan: string | null;
        city: string | null;
        postal_code: string | null;
        student_phone: string | null;
        student_email: string | null;
        child_order: number | null;
        father_name: string | null;
        father_occupation: string | null;
        mother_name: string | null;
        mother_occupation: string | null;
        guardian_phone: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      };
      guardians: {
        id: string;
        relationship: string;
        profiles: { id: string; full_name: string; email: string; phone: string; role: string }[];
      }[];
      enrollments: {
        id: string;
        status: string;
        class_id: string;
        academic_year_id: string;
        class_name: string;
        academic_year_name: string;
      }[];
    }
> {
  if (!studentId) {
    return { error: "ID siswa tidak valid." };
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

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .eq("school_id", profile.school_id)
    .maybeSingle();

  if (studentError || !student) {
    return { error: "Siswa tidak ditemukan." };
  }

  const { data: guardians, error: guardiansError } = await supabase
    .from("student_guardians")
    .select(`
      id,
      relationship,
      profiles!inner (id, full_name, email, phone, role)
    `)
    .eq("student_id", studentId);

  if (guardiansError) {
    return { error: "Gagal memuat data wali siswa." };
  }

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("student_enrollments")
    .select(`
      id,
      status,
      class_id,
      academic_year_id,
      classes (id, name),
      academic_years (id, name)
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (enrollmentsError) {
    return { error: "Gagal memuat data enrollment siswa." };
  }

  type StudentEnrollmentRow = {
    id: string;
    status: string;
    class_id: string;
    academic_year_id: string;
    classes: { id: string; name: string }[] | null;
    academic_years: { id: string; name: string }[] | null;
  };

  return {
    student,
    guardians: guardians || [],
    enrollments: (enrollments || []).map((enrollment: StudentEnrollmentRow) => {
      const classItem = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes;
      const yearItem = Array.isArray(enrollment.academic_years) ? enrollment.academic_years[0] : enrollment.academic_years;
      return {
        id: enrollment.id,
        status: enrollment.status,
        class_id: enrollment.class_id,
        academic_year_id: enrollment.academic_year_id,
        class_name: classItem?.name || "-",
        academic_year_name: yearItem?.name || "-",
      };
    }),
  };
}


