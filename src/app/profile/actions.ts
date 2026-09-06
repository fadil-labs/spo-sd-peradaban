"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!fullName) {
    return { error: "Nama lengkap harus diisi." };
  }

  if (fullName.length > 255) {
    return { error: "Nama lengkap terlalu panjang." };
  }

  if (phone.length > 20) {
    return { error: "Nomor telepon terlalu panjang." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Gagal memperbarui profil. Silakan coba lagi." };
  }

  return { success: true };
}

export async function changePasswordAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (newPassword.length < 8) {
    return { error: "Password harus minimal 8 karakter." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Konfirmasi password tidak cocok." };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: "Gagal mengubah password. Silakan coba lagi." };
  }

  return { success: true };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
