"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordFinancialAuditEvent } from "@/lib/financial-audit/actions";
import { createNotification } from "@/lib/notifications/service";
import { resolveProvider } from "@/lib/payment-gateway/service";
import { ProviderStatus } from "@/lib/payment-gateway/types";

export async function getPaymentGatewayTransactionsAction() {
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

  const { data: transactions, error: transactionsError } = await supabase
    .from("payment_gateway_transactions")
    .select(`
      id,
      school_id,
      payment_id,
      provider,
      external_order_id,
      external_transaction_id,
      provider_status,
      payment_method_type,
      qr_code_url,
      expires_at,
      raw_payload,
      webhook_received_at,
      created_at,
      updated_at,
      payments (
        id,
        amount,
        status,
        students (
          id,
          nis,
          full_name
        ),
        student_bills (
          id,
          amount,
          status
        )
      )
    `)
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (transactionsError) {
    return { error: "Gagal memuat data transaksi gateway." };
  }

  const normalized = (transactions || []).map((t) => {
    const tx = t as Record<string, unknown>;
    const payment = tx.payments as Record<string, unknown> | undefined;
    const student = payment?.students as Record<string, unknown> | undefined;
    const bill = payment?.student_bills as Record<string, unknown> | undefined;

    return {
      id: tx.id as string,
      school_id: tx.school_id as string,
      payment_id: tx.payment_id as string | null,
      provider: tx.provider as string,
      external_order_id: tx.external_order_id as string,
      external_transaction_id: tx.external_transaction_id as string | null,
      provider_status: tx.provider_status as string,
      payment_method_type: tx.payment_method_type as string | null,
      qr_code_url: tx.qr_code_url as string | null,
      expires_at: tx.expires_at as string | null,
      raw_payload: (tx.raw_payload as Record<string, unknown>) || {},
      webhook_received_at: tx.webhook_received_at as string | null,
      created_at: tx.created_at as string,
      updated_at: tx.updated_at as string,
      payments: payment
        ? {
            id: payment.id as string,
            amount: payment.amount as number,
            status: payment.status as string,
            students: student
              ? {
                  id: student.id as string,
                  nis: student.nis as string,
                  name: student.full_name as string,
                }
              : null,
            student_bills: bill
              ? {
                  id: bill.id as string,
                  amount: bill.amount as number,
                  status: bill.status as string,
                }
              : null,
          }
        : null,
    };
  });

  return { transactions: normalized };
}

export async function simulateMockWebhookAction(externalOrderId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  if (!["admin", "bendahara"].includes(profile.role)) {
    return { error: "Forbidden" };
  }

  const { data: gatewayTransaction, error: gatewayError } = await supabase
    .from("payment_gateway_transactions")
    .select("id, school_id, provider, external_order_id, provider_status, raw_payload, payment_id, payment_method_type, external_transaction_id")
    .eq("external_order_id", externalOrderId)
    .eq("provider", "mock")
    .single();

  if (gatewayError || !gatewayTransaction) {
    return { error: "Transaksi gateway tidak ditemukan." };
  }

  const tx = gatewayTransaction as Record<string, unknown>;

  if (tx.school_id !== profile.school_id) {
    return { error: "Cross-school transaction not allowed." };
  }

  const currentStatus = tx.provider_status as string;

  if (!["pending", "processing", "failed"].includes(currentStatus)) {
    return { error: "Transaksi gateway tidak dapat disimulasikan lagi." };
  }

  const rawPayload = (tx.raw_payload as Record<string, unknown>) || {};
  const requestedAmount = Number(rawPayload.requested_amount || 0);

  if (!requestedAmount || requestedAmount <= 0) {
    return { error: "Jumlah pembayaran tidak valid pada transaksi gateway." };
  }

  const mockProvider = resolveProvider("mock");

  try {
    await mockProvider.createPaymentIntent({
      amount: requestedAmount,
      paymentMethodType: (tx.payment_method_type as string) || "mock",
      externalOrderId: tx.external_order_id as string,
    });
  } catch {
    return { error: "Gagal memproses simulasi webhook." };
  }

  const webhookPayload = {
    external_order_id: externalOrderId,
    external_transaction_id: tx.external_transaction_id,
    status: "success" as ProviderStatus,
    amount: requestedAmount,
    payment_method_type: tx.payment_method_type,
  };

  const mockSecret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET || "replace_me";

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(mockSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify(webhookPayload)));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signature = "sha256=" + signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const webhookUrl = `${baseUrl}/api/webhooks/payment/mock`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mock-signature": signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      return { error: errorData.error || `Webhook simulation failed: ${response.status}` };
    }

    await recordFinancialAuditEvent({
      actionType: "gateway_transaction_succeeded",
      entityType: "payment_gateway_transaction",
      schoolId: profile.school_id,
      actorProfileId: user.id,
      actorRole: profile.role,
      entityId: gatewayTransaction.id,
      paymentId: gatewayTransaction.payment_id || null,
      newStatus: "success",
      metadata: {
        provider: gatewayTransaction.provider,
        external_order_id: gatewayTransaction.external_order_id,
        external_transaction_id: gatewayTransaction.external_transaction_id,
    },
  });

  if (gatewayTransaction.payment_id) {
    const { data: payment } = await supabase
      .from("payments")
      .select("student_id")
      .eq("id", gatewayTransaction.payment_id)
      .single();

    if (payment?.student_id) {
      const { data: guardianRelations } = await supabase
        .from("student_guardians")
        .select("guardian_profile_id")
        .eq("student_id", payment.student_id);

      if (guardianRelations && guardianRelations.length > 0) {
        for (const relation of guardianRelations) {
          await createNotification({
            recipientProfileId: relation.guardian_profile_id,
            notificationType: "gateway_payment_success",
            title: "Pembayaran Berhasil",
            message: "Pembayaran Anda telah berhasil diproses.",
            schoolId: profile.school_id,
            entityType: "payment_gateway_transaction",
            entityId: gatewayTransaction.id,
            actionLabel: "Lihat Bukti",
            actionHref: `/dashboard/orang-tua/payments/receipt/${gatewayTransaction.payment_id}`,
            metadata: {
              payment_id: gatewayTransaction.payment_id,
              provider: gatewayTransaction.provider,
              external_transaction_id: gatewayTransaction.external_transaction_id,
            },
          });
        }
      }
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notification:refresh"));
  }

  return { success: true };
} catch {
  return { error: "Gagal memanggil webhook simulasi." };
}
}
