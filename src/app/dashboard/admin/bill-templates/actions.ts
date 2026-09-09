"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getBillTemplatesAction() {
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

  const { data: templates, error: templatesError } = await supabase
    .from("bill_templates")
    .select(`
      id,
      school_id,
      payment_category_id,
      class_id,
      student_id,
      amount,
      description,
      is_recurring,
      created_at,
      updated_at,
      payment_categories (id, name),
      classes (id, name),
      students (id, nis, full_name)
    `)
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (templatesError) {
    return { error: "Gagal memuat data templat tagihan." };
  }

  const normalized = (templates || []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    school_id: t.school_id as string,
    payment_category_id: t.payment_category_id as string,
    class_id: t.class_id as string | null,
    student_id: t.student_id as string | null,
    amount: t.amount as number,
    description: t.description as string | null,
    is_recurring: t.is_recurring as boolean,
    created_at: t.created_at as string,
    updated_at: t.updated_at as string,
    payment_categories: Array.isArray(t.payment_categories) ? t.payment_categories[0] : t.payment_categories,
    classes: Array.isArray(t.classes) ? t.classes[0] : t.classes,
    students: Array.isArray(t.students) ? t.students[0] : t.students,
  }));

  return { templates: normalized };
}

export async function createBillTemplateAction(formData: FormData) {
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

  const paymentCategoryId = String(formData.get("payment_category_id") || "").trim();
  const classId = String(formData.get("class_id") || "").trim() || null;
  const studentId = String(formData.get("student_id") || "").trim() || null;
  const amount = String(formData.get("amount") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const isRecurring = formData.get("is_recurring") === "true";

  if (!paymentCategoryId) {
    return { error: "Kategori pembayaran harus diisi." };
  }

  if (!amount || isNaN(Number(amount))) {
    return { error: "Jumlah harus diisi dengan angka yang valid." };
  }

  if (classId && studentId) {
    return { error: "Templat tidak boleh untuk kelas dan siswa sekaligus. Pilih salah satu." };
  }

  const { error } = await supabase.from("bill_templates").insert({
    school_id: profile.school_id,
    payment_category_id: paymentCategoryId,
    class_id: classId,
    student_id: studentId,
    amount: Number(amount),
    description,
    is_recurring: isRecurring,
  });

  if (error) {
    if (error.code === "23503") {
      return { error: "Kategori pembayaran, kelas, atau siswa tidak valid." };
    }
    return { error: "Gagal membuat templat tagihan. Silakan coba lagi." };
  }

  return { success: true };
}

export async function updateBillTemplateAction(formData: FormData) {
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
  const paymentCategoryId = String(formData.get("payment_category_id") || "").trim();
  const classId = String(formData.get("class_id") || "").trim() || null;
  const studentId = String(formData.get("student_id") || "").trim() || null;
  const amount = String(formData.get("amount") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const isRecurring = formData.get("is_recurring") === "true";

  if (!id) {
    return { error: "ID templat tidak valid." };
  }

  if (!paymentCategoryId) {
    return { error: "Kategori pembayaran harus diisi." };
  }

  if (!amount || isNaN(Number(amount))) {
    return { error: "Jumlah harus diisi dengan angka yang valid." };
  }

  if (classId && studentId) {
    return { error: "Templat tidak boleh untuk kelas dan siswa sekaligus. Pilih salah satu." };
  }

  const { error } = await supabase
    .from("bill_templates")
    .update({
      payment_category_id: paymentCategoryId,
      class_id: classId,
      student_id: studentId,
      amount: Number(amount),
      description,
      is_recurring: isRecurring,
    })
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    if (error.code === "23503") {
      return { error: "Kategori pembayaran, kelas, atau siswa tidak valid." };
    }
    return { error: "Gagal memperbarui templat tagihan. Silakan coba lagi." };
  }

  return { success: true };
}

export async function deleteBillTemplateAction(id: string) {
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
    .from("bill_templates")
    .delete()
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    return { error: "Gagal menghapus templat tagihan. Silakan coba lagi." };
  }

  return { success: true };
}
