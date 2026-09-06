"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getPaymentCategoriesAction() {
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

  const { data: categories, error: categoriesError } = await supabase
    .from("payment_categories")
    .select("*")
    .eq("school_id", profile.school_id)
    .order("name", { ascending: true });

  if (categoriesError) {
    return { error: "Gagal memuat data kategori pembayaran." };
  }

  return { categories: categories || [] };
}

export async function createPaymentCategoryAction(formData: FormData) {
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
  const description = String(formData.get("description") || "").trim() || null;
  const allowInstallments = formData.get("allow_installments") === "true";
  const minimumInstallmentAmount = String(formData.get("minimum_installment_amount") || "").trim() || null;
  const requireInstallmentSchedule = formData.get("require_installment_schedule") === "true";

  if (!name) {
    return { error: "Nama kategori harus diisi." };
  }

  if (allowInstallments && !minimumInstallmentAmount) {
    return { error: "Jumlah cicilan minimum harus diisi jika cicilan diizinkan." };
  }

  const payload: Record<string, unknown> = {
    school_id: profile.school_id,
    name,
    description,
    allow_installments: allowInstallments,
    require_installment_schedule: requireInstallmentSchedule,
  };

  if (allowInstallments && minimumInstallmentAmount) {
    payload.minimum_installment_amount = Number(minimumInstallmentAmount);
  }

  const { error } = await supabase.from("payment_categories").insert(payload);

  if (error) {
    if (error.code === "23505") {
      return { error: "Kategori pembayaran dengan nama ini sudah ada." };
    }
    return { error: "Gagal membuat kategori pembayaran. Silakan coba lagi." };
  }

  return { success: true };
}

export async function updatePaymentCategoryAction(formData: FormData) {
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
  const description = String(formData.get("description") || "").trim() || null;
  const allowInstallments = formData.get("allow_installments") === "true";
  const minimumInstallmentAmount = String(formData.get("minimum_installment_amount") || "").trim() || null;
  const requireInstallmentSchedule = formData.get("require_installment_schedule") === "true";

  if (!id) {
    return { error: "ID kategori tidak valid." };
  }

  if (!name) {
    return { error: "Nama kategori harus diisi." };
  }

  if (allowInstallments && !minimumInstallmentAmount) {
    return { error: "Jumlah cicilan minimum harus diisi jika cicilan diizinkan." };
  }

  const payload: Record<string, unknown> = {
    name,
    description,
    allow_installments: allowInstallments,
    require_installment_schedule: requireInstallmentSchedule,
  };

  if (allowInstallments && minimumInstallmentAmount) {
    payload.minimum_installment_amount = Number(minimumInstallmentAmount);
  } else {
    payload.minimum_installment_amount = null;
  }

  const { error } = await supabase
    .from("payment_categories")
    .update(payload)
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Kategori pembayaran dengan nama ini sudah ada." };
    }
    return { error: "Gagal memperbarui kategori pembayaran. Silakan coba lagi." };
  }

  return { success: true };
}

export async function deletePaymentCategoryAction(id: string) {
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

  const { data: category, error: categoryError } = await supabase
    .from("payment_categories")
    .select("id, school_id")
    .eq("id", id)
    .eq("school_id", profile.school_id)
    .single();

  if (categoryError || !category) {
    return { error: "Kategori pembayaran tidak ditemukan." };
  }

  const { data: bills, error: billCountError } = await supabase
    .from("student_bills")
    .select("id")
    .eq("payment_category_id", id)
    .eq("school_id", profile.school_id)
    .limit(1);

  if (billCountError) {
    return { error: "Gagal memeriksa penggunaan kategori pembayaran." };
  }

  if (bills && bills.length > 0) {
    return {
      error: "Kategori pembayaran tidak dapat dihapus karena sedang digunakan oleh tagihan siswa.",
    };
  }

  const { error } = await supabase
    .from("payment_categories")
    .delete()
    .eq("id", id)
    .eq("school_id", profile.school_id);

  if (error) {
    return { error: "Gagal menghapus kategori pembayaran." };
  }

  return { success: true };
}
