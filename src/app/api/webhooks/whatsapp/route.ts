import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ status: "success", challenge }, { status: 200 });
  }

  return NextResponse.json({ status: "error", message: "Verification failed" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[WhatsApp Webhook] Received:", JSON.stringify(body, null, 2));

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "bendahara"].includes(profile.role)) {
      return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
    }

    const entries = body.entry || [];
    const changes = entries.flatMap((entry: any) => entry.changes || []);
    const value = changes.find((change: any) => change.field === "messages")?.value;

    if (!value) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const messages = value.messages || [];
    const phoneNumber = value.metadata?.display_phone_number;

    for (const message of messages) {
      if (message.type !== "text") continue;

      const phone = message.from;
      const text = message.text?.body?.trim() || "";

      const { data: guardianProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .eq("role", "orang_tua")
        .maybeSingle();

      if (!guardianProfile?.id) continue;

      const { data: guardianLinks } = await supabase
        .from("student_guardians")
        .select("student_id")
        .eq("guardian_profile_id", guardianProfile.id)
        .limit(1);

      if (!guardianLinks || guardianLinks.length === 0) continue;

      const studentId = guardianLinks[0].student_id;
      const lowerText = text.toLowerCase();

      if (lowerText === "tagihan" || lowerText === "billing" || lowerText === "tagihan saya") {
        const { data: bills } = await supabase
          .from("student_bills")
          .select("id, title, amount, status, due_date")
          .eq("student_id", studentId)
          .order("due_date", { ascending: true });

        if (!bills || bills.length === 0) {
          await sendWhatsAppMessage(phoneNumber, phone, "Tidak ada tagihan aktif saat ini.");
          continue;
        }

        const pending = bills.filter((b) => b.status === "pending");
        const paid = bills.filter((b) => b.status === "paid");

        let reply = `Halo! Berikut tagihan Anda:\n\n`;
        if (pending.length > 0) {
          reply += `*Tagihan Belum Lunas:*\n`;
          pending.forEach((bill, idx) => {
            reply += `${idx + 1}. ${bill.title}\n   Jumlah: Rp ${bill.amount.toLocaleString("id-ID")}\n   Jatuh tempo: ${bill.due_date}\n\n`;
          });
        }
        if (paid.length > 0) {
          reply += `*Tagihan Sudah Lunas:*\n`;
          paid.forEach((bill, idx) => {
            reply += `${idx + 1}. ${bill.title}\n   Jumlah: Rp ${bill.amount.toLocaleString("id-ID")}\n   Status: Lunas\n\n`;
          });
        }

        await sendWhatsAppMessage(phoneNumber, phone, reply);
      } else if (lowerText === "bayar" || lowerText === "pembayaran") {
        const { data: pendingBills } = await supabase
          .from("student_bills")
          .select("id, title, amount, due_date")
          .eq("student_id", studentId)
          .eq("status", "pending")
          .order("due_date", { ascending: true });

        if (!pendingBills || pendingBills.length === 0) {
          await sendWhatsAppMessage(phoneNumber, phone, "Tidak ada tagihan yang perlu dibayar.");
          continue;
        }

        let reply = `Silakan lakukan pembayaran melalui:\n\n`;
        reply += `1. Transfer ke rekening sekolah\n`;
        reply += `2. Upload bukti transfer di aplikasi\n`;
        reply += `3. Admin akan memverifikasi pembayaran\n\n`;
        reply += `Tagihan yang perlu dibayar:\n`;
        pendingBills.forEach((bill, idx) => {
          reply += `${idx + 1}. ${bill.title} - Rp ${bill.amount.toLocaleString("id-ID")}\n`;
        });

        await sendWhatsAppMessage(phoneNumber, phone, reply);
      } else {
        await sendWhatsAppMessage(
          phoneNumber,
          phone,
          "Halo! Perintah yang tersedia:\n- tagihan: melihat tagihan aktif\n- bayar: informasi pembayaran\n\nSilakan kirim perintah di atas."
        );
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook Error]", error);
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}

async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!token) return;

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
      console.error("[WhatsApp Send Error]", response.status, error);
    } else {
      const result = await response.json();
      console.log("[WhatsApp Send Success]", result);
    }
  } catch (error) {
    console.error("[WhatsApp Send Exception]", error);
  }
}
