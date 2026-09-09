const fetch = require('node-fetch');

export async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!token) {
    console.error("[WhatsApp] WHATSAPP_API_TOKEN is not set");
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
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
      console.log(`[WhatsApp] Sent to ${to}:`, result);
    }
  } catch (error) {
    console.error("[WhatsApp] Exception:", error);
  }
}

export async function sendNewBillNotification(studentId: string, billTitle: string, amount: number, dueDate: string) {
  const { createClient } = require("@/lib/supabase/server");
  const supabase = createClient();

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
  const { createClient } = require("@/lib/supabase/server");
  const supabase = createClient();

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
  const { createClient } = require("@/lib/supabase/server");
  const supabase = createClient();

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
