"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordFinancialAuditEvent } from "@/lib/financial-audit/actions";

export async function getSchoolPaymentMethodsAction() {
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

  const { data: schoolMethods, error: schoolMethodsError } = await supabase
    .from("school_payment_methods")
    .select(`
      id,
      payment_method_id,
      is_active,
      payment_methods (
        id,
        name,
        method_type,
        is_active
      )
    `)
    .eq("school_id", profile.school_id)
    .order("payment_methods(name)", { ascending: true });

  if (schoolMethodsError) {
    return { error: "Gagal memuat data metode pembayaran." };
  }

  const { data: allMethods, error: allMethodsError } = await supabase
    .from("payment_methods")
    .select("id, name, method_type, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (allMethodsError) {
    return { error: "Gagal memuat daftar metode pembayaran." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enabledIds = new Set((schoolMethods || []).map((m: any) => m.payment_method_id));

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schoolMethods: (schoolMethods || []).map((m: any) => ({
      id: m.id,
      payment_method_id: m.payment_method_id,
      is_active: m.is_active,
      payment_methods: Array.isArray(m.payment_methods) ? m.payment_methods[0] : m.payment_methods,
    })),
    allMethods: allMethods || [],
    enabledIds,
  };
}

export async function toggleSchoolPaymentMethodAction(paymentMethodId: string, currentStatus: boolean) {
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

  if (currentStatus) {
    const { error } = await supabase
      .from("school_payment_methods")
      .delete()
      .eq("school_id", profile.school_id)
      .eq("payment_method_id", paymentMethodId);

    if (error) {
      return { error: "Gagal menonaktifkan metode pembayaran." };
    }
  } else {
    const { error } = await supabase.from("school_payment_methods").insert({
      school_id: profile.school_id,
      payment_method_id: paymentMethodId,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "Metode pembayaran sudah diaktifkan." };
      }
      return { error: "Gagal mengaktifkan metode pembayaran." };
    }
  }

  await recordFinancialAuditEvent({
    actionType: "payment_method_toggled",
    entityType: "school_payment_method",
    schoolId: profile.school_id,
    actorProfileId: user.id,
    actorRole: profile.role,
    entityId: paymentMethodId,
    newStatus: currentStatus ? "inactive" : "active",
    oldStatus: currentStatus ? "active" : "inactive",
    metadata: { payment_method_id: paymentMethodId },
  });

  return { success: true };
}
