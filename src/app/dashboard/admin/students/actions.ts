"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STUDENT_STATUSES = ["active", "inactive", "graduated", "transferred"] as const;

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
