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

export async function sendWhatsAppTemplate(phoneNumberId: string, to: string, templateName: string, languageCode: string, variables: string[]) {
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!token) {
    console.error("[WhatsApp] WHATSAPP_API_TOKEN is not set");
    return;
  }

  const formattedTo = formatPhoneNumber(to);
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const components: any[] = [
    {
      type: "body",
      parameters: variables.map((value) => ({
        type: "text",
        text: value,
      })),
    },
  ];

  const payload = {
    messaging_product: "whatsapp",
    to: formattedTo,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
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
      console.error("[WhatsApp] Failed to send template:", response.status, error);
    } else {
      const result = await response.json();
      console.log(`[WhatsApp] Template sent to ${formattedTo}:`, result);
    }
  } catch (error) {
    console.error("[WhatsApp] Exception:", error);
  }
}

export async function sendNewBillNotification(studentId: string, billTitle: string, amount: number, dueDate: string) {
  const supabase = await createClient();

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id, profiles(full_name, phone)")
    .eq("student_id", studentId);

  if (!guardianLinks || guardianLinks.length === 0) return;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) return;

  for (const link of guardianLinks) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile?.phone) continue;

    const guardianName = profile.full_name?.trim() || "Orang Tua";
    const formattedAmount = `Rp ${amount.toLocaleString("id-ID")}`;
    const formattedDate = new Date(dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    await sendWhatsAppTemplate(
      phoneNumberId,
      profile.phone,
      "notifikasi_tagihan",
      "id",
      [guardianName, billTitle, formattedAmount, formattedDate]
    );
  }
}

export async function sendOverdueNotification(studentId: string, billTitle: string, amount: number, dueDate: string) {
  const supabase = await createClient();

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id, profiles(full_name, phone)")
    .eq("student_id", studentId);

  if (!guardianLinks || guardianLinks.length === 0) return;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) return;

  for (const link of guardianLinks) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile?.phone) continue;

    const guardianName = profile.full_name?.trim() || "Orang Tua";
    const formattedAmount = `Rp ${amount.toLocaleString("id-ID")}`;
    const formattedDate = new Date(dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    await sendWhatsAppTemplate(
      phoneNumberId,
      profile.phone,
      "notifikasi_tagihan",
      "id",
      [guardianName, billTitle, formattedAmount, formattedDate]
    );
  }
}

export async function sendPaymentConfirmation(studentId: string, billTitle: string, amount: number) {
  const supabase = await createClient();

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id, profiles(full_name, phone)")
    .eq("student_id", studentId);

  if (!guardianLinks || guardianLinks.length === 0) return;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) return;

  for (const link of guardianLinks) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile?.phone) continue;

    const guardianName = profile.full_name?.trim() || "Orang Tua";
    const formattedAmount = `Rp ${amount.toLocaleString("id-ID")}`;

    await sendWhatsAppTemplate(
      phoneNumberId,
      profile.phone,
      "notifikasi_tagihan",
      "id",
      [guardianName, billTitle, formattedAmount, "Lunas"]
    );
  }
}
