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

export async function getGuardiansAction() {
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
      created_at,
      profiles!inner (id, full_name, role),
      students!inner (id, nis, full_name, school_id)
    `)
    .eq("students.school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (guardiansError) {
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

  return { guardians: normalized } as const;
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
    console.error("[GUARDIAN_CREATION_FAILED]", {
      action: "lookup_profile",
      code: existingProfileError.code,
      message: existingProfileError.message,
      payload: { email },
      school_id: profile.school_id,
      user_id: user.id,
    });
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
        const { data: usersData, error: usersError } = await adminSupabase.auth.admin.listUsers({
          page: 1,
          perPage: 100,
        });

        if (usersError || !usersData?.users) {
          console.error("[GUARDIAN_CREATION_FAILED]", {
            action: "lookup_existing_auth_user",
            code: usersError?.code,
            message: usersError?.message,
            payload: { email, fullName },
            school_id: profile.school_id,
            user_id: user.id,
          });
          return { error: "Email sudah terdaftar, tetapi akunnya tidak dapat ditemukan." };
        }

        const existingAuthUser = usersData.users.find((user) => user.email === email);
        if (!existingAuthUser) {
          console.error("[GUARDIAN_CREATION_FAILED]", {
            action: "lookup_existing_auth_user",
            code: "not_found",
            message: "Email exists in auth but not found in listUsers",
            payload: { email, fullName },
            school_id: profile.school_id,
            user_id: user.id,
          });
          return { error: "Email sudah terdaftar, tetapi akunnya tidak dapat ditemukan." };
        }

        guardianProfileId = existingAuthUser.id;
        isNewUser = false;
      } else {
        console.error("[GUARDIAN_CREATION_FAILED]", {
          action: "create_auth_user",
          code: authError?.code,
          message: authError?.message,
          payload: { email, fullName },
          school_id: profile.school_id,
          user_id: user.id,
        });
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
    console.error("[GUARDIAN_CREATION_FAILED]", {
      action: "upsert_profile",
      code: profileUpsertError.code,
      message: profileUpsertError.message,
      details: profileUpsertError.details,
      hint: profileUpsertError.hint,
      payload: {
        id: guardianProfileId,
        school_id: profile.school_id,
        role: "orang_tua",
        full_name: fullName,
        phone: phone || null,
        email,
      },
      school_id: profile.school_id,
      user_id: user.id,
    });
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
    console.error("[GUARDIAN_CREATION_FAILED]", {
      action: "insert_student_guardians",
      code: relationError.code,
      message: relationError.message,
      details: relationError.details,
      hint: relationError.hint,
      payload: relationsToInsert,
      school_id: profile.school_id,
      user_id: user.id,
    });
    if (relationError.code === "23505") {
      return { error: "Wali sudah terhubung dengan salah satu siswa ini." };
    }
    return { error: "Gagal menghubungkan wali. Silakan coba lagi." };
  }

  const auditResult = await recordFinancialAuditEvent({
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

  if (!auditResult.success) {
    console.error("Failed to record guardian creation audit event", auditResult.error);
  }

  if (!guardianProfileId) {
    return { error: "Gagal membuat akun wali." };
  }

  const notificationPromises = [
    createNotification({
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
    }),
  ];

  if (phone) {
    notificationPromises.push(
      createNotification({
        recipientProfileId: guardianProfileId,
        notificationType: "guardian_welcome",
        title: "Akun Wali Dibuat",
        message: `Akun wali untuk ${fullName} telah dibuat dengan email ${email}.`,
        schoolId: profile.school_id,
        entityType: "guardian",
        entityId: guardianProfileId,
        actionLabel: "Login",
        actionHref: "/login",
        metadata: {
          email,
          phone,
          is_new_user: isNewUser,
        },
      })
    );
  }

  const notificationResults = await Promise.allSettled(notificationPromises);
  notificationResults.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Failed to create guardian notification", index, result.reason);
    }
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notification:refresh"));
  }

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
    console.error("Failed to delete guardian relation", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      guardianProfileId,
      studentId,
    });
    return { error: "Gagal menghapus hubungan wali." };
  }

  return { success: true };
}
