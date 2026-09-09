"use server";

import { createClient } from "@/lib/supabase/server";

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    return "62" + cleaned.slice(1);
  }
  if (cleaned.startsWith("+")) {
    return cleaned.slice(1);
  }
  return cleaned;
}

export async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!token) {
    console.error("[WhatsApp] WHATSAPP_API_TOKEN is not set");
    return;
  }

  const formattedTo = formatPhoneNumber(to);
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: formattedTo,
    type: "text",
    text: { body: text },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[WhatsApp] Failed to send:", response.status, error);
    } else {
      const result = await response.json();
      console.log(`[WhatsApp] Sent to ${formattedTo}:`, result);
    }
  } catch (error) {
    console.error("[WhatsApp] Exception:", error);
  }
}

export async function sendNewBillNotification(studentId: string, billTitle: string, amount: number, dueDate: string) {
  const supabase = await createClient();

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id, profiles(phone)")
    .eq("student_id", studentId);

  if (!guardianLinks || guardianLinks.length === 0) return;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) return;

  for (const link of guardianLinks) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile?.phone) continue;

    const text = `Halo! Ada tagihan baru:\n\n*${billTitle}*\nJumlah: Rp ${amount.toLocaleString("id-ID")}\nJatuh tempo: ${dueDate}\n\nSilakan lakukan pembayaran.`;

    await sendWhatsAppMessage(phoneNumberId, profile.phone, text);
  }
}

export async function sendOverdueNotification(studentId: string, billTitle: string, amount: number, dueDate: string) {
  const supabase = await createClient();

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id, profiles(phone)")
    .eq("student_id", studentId);

  if (!guardianLinks || guardianLinks.length === 0) return;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) return;

  for (const link of guardianLinks) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile?.phone) continue;

    const text = `*Tagihan Terlambat*\n\n${billTitle}\nJumlah: Rp ${amount.toLocaleString("id-ID")}\nJatuh tempo: ${dueDate}\n\nSegera lakukan pembayaran.`;

    await sendWhatsAppMessage(phoneNumberId, profile.phone, text);
  }
}

export async function sendPaymentConfirmation(studentId: string, billTitle: string, amount: number) {
  const supabase = await createClient();

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id, profiles(phone)")
    .eq("student_id", studentId);

  if (!guardianLinks || guardianLinks.length === 0) return;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) return;

  for (const link of guardianLinks) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile?.phone) continue;

    const text = `*Pembayaran Berhasil*\n\n${billTitle}\nJumlah: Rp ${amount.toLocaleString("id-ID")}\nStatus: Lunas\n\nTerima kasih.`;

    await sendWhatsAppMessage(phoneNumberId, profile.phone, text);
  }
}
