"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SchoolProfile = {
  id: string;
  school_id: string;
  role: string;
  full_name: string;
  phone: string | null;
};

export async function getSchoolAction() {
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

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("*")
    .eq("id", profile.school_id)
    .single();

  if (schoolError || !school) {
    return { error: "Gagal memuat data sekolah." };
  }

  return { school };
}

export async function updateSchoolAction(formData: FormData) {
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
  const address = String(formData.get("address") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const logoFile = formData.get("logo_file") as File | null;

  if (!name) {
    return { error: "Nama sekolah harus diisi." };
  }

  if (name.length > 255) {
    return { error: "Nama sekolah terlalu panjang." };
  }

  if (phone && phone.length > 50) {
    return { error: "Nomor telepon terlalu panjang." };
  }

  if (email && email.length > 255) {
    return { error: "Email terlalu panjang." };
  }

  const { data: existingSchool } = await supabase
    .from("schools")
    .select("logo_url")
    .eq("id", profile.school_id)
    .single();

  let logoUrl = existingSchool?.logo_url || null;

  if (logoFile && logoFile.size > 0) {
    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(logoFile.type)) {
      return { error: "Format logo tidak didukung. Gunakan PNG, JPG, SVG, atau WebP." };
    }

    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: "Ukuran logo maksimal 2MB." };
    }

    const fileExt = logoFile.type.split("/")[1] || "bin";
    const filePath = `${profile.school_id}/logo-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("school-logos")
      .upload(filePath, logoFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("School logo upload failed", uploadError);
      return { error: `Gagal mengupload logo: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from("school-logos")
      .getPublicUrl(filePath);

    logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    if (existingSchool?.logo_url) {
      const oldPath = existingSchool.logo_url.replace(/^.*\/storage\/v1\/object\/public\/school-logos\//, "");
      if (oldPath && oldPath !== filePath) {
        await supabase.storage.from("school-logos").remove([oldPath]);
      }
    }
  }

  const { error } = await supabase
    .from("schools")
    .update({
      name,
      address,
      phone,
      email,
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.school_id);

  if (error) {
    console.error("School update failed", error);
    return { error: `Gagal memperbarui data sekolah: ${error.message}` };
  }

  revalidatePath("/dashboard/admin/school");

  return { success: true };
}
