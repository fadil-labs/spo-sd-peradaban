import { createClient } from "@/lib/supabase/server";

export async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("[Email] RESEND_API_KEY is not set");
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "noreply@krakataumedia.com",
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Email] Failed to send:", response.status, error);
    } else {
      console.log(`[Email] Sent to ${to}: ${subject}`);
    }
  } catch (error) {
    console.error("[Email] Exception:", error);
  }
}

export async function sendNewBillNotification(studentId: string, billTitle: string, amount: number, dueDate: string) {
  const supabase = await createClient();

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id, profiles(email, full_name)")
    .eq("student_id", studentId);

  if (!guardianLinks || guardianLinks.length === 0) return;

  for (const link of guardianLinks) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile?.email) continue;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Tagihan Baru</h2>
        <p>Halo ${profile.full_name},</p>
        <p>Ada tagihan baru untuk siswa Anda:</p>
        <ul>
          <li><strong>Tagihan:</strong> ${billTitle}</li>
          <li><strong>Jumlah:</strong> Rp ${amount.toLocaleString("id-ID")}</li>
          <li><strong>Jatuh tempo:</strong> ${dueDate}</li>
        </ul>
        <p>Silakan melakukan pembayaran sebelum jatuh tempo.</p>
      </div>
    `;

    await sendEmail(profile.email, `Tagihan Baru: ${billTitle}`, html);
  }
}

export async function sendOverdueNotification(studentId: string, billTitle: string, amount: number, dueDate: string) {
  const supabase = await createClient();

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id, profiles(email, full_name)")
    .eq("student_id", studentId);

  if (!guardianLinks || guardianLinks.length === 0) return;

  for (const link of guardianLinks) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile?.email) continue;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Tagihan Terlambat</h2>
        <p>Halo ${profile.full_name},</p>
        <p>Tagihan berikut sudah melewati jatuh tempo:</p>
        <ul>
          <li><strong>Tagihan:</strong> ${billTitle}</li>
          <li><strong>Jumlah:</strong> Rp ${amount.toLocaleString("id-ID")}</li>
          <li><strong>Jatuh tempo:</strong> ${dueDate}</li>
        </ul>
        <p>Segera lakukan pembayaran untuk menghindari denda.</p>
      </div>
    `;

    await sendEmail(profile.email, `Tagihan Terlambat: ${billTitle}`, html);
  }
}

export async function sendPaymentConfirmation(studentId: string, billTitle: string, amount: number) {
  const supabase = await createClient();

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("guardian_profile_id, profiles(email, full_name)")
    .eq("student_id", studentId);

  if (!guardianLinks || guardianLinks.length === 0) return;

  for (const link of guardianLinks) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile?.email) continue;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Pembayaran Berhasil</h2>
        <p>Halo ${profile.full_name},</p>
        <p>Pembayaran Anda telah berhasil dikonfirmasi:</p>
        <ul>
          <li><strong>Tagihan:</strong> ${billTitle}</li>
          <li><strong>Jumlah:</strong> Rp ${amount.toLocaleString("id-ID")}</li>
          <li><strong>Status:</strong> Lunas</li>
        </ul>
        <p>Terima kasih.</p>
      </div>
    `;

    await sendEmail(profile.email, `Pembayaran Berhasil: ${billTitle}`, html);
  }
}
