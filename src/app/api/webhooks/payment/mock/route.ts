import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GatewayWebhookPayload, ProviderStatus } from "@/lib/payment-gateway/types";

const MOCK_WEBHOOK_SECRET = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;

function safeError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!MOCK_WEBHOOK_SECRET) {
    return Promise.resolve(false);
  }

  if (!signature) {
    return Promise.resolve(false);
  }

  const expected = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(MOCK_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = new Uint8Array(
    signature.replace("sha256=", "").match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );

  const expectedBuffer = new Uint8Array(
    await crypto.subtle.sign("HMAC", expected, new TextEncoder().encode(rawBody))
  );

  if (signatureBuffer.length !== expectedBuffer.length) {
    return Promise.resolve(false);
  }

  let result = 0;
  for (let i = 0; i < signatureBuffer.length; i++) {
    result |= signatureBuffer[i] ^ expectedBuffer[i];
  }

  return result === 0;
}

function validateWebhookPayload(payload: unknown): payload is GatewayWebhookPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const obj = payload as Record<string, unknown>;

  if (typeof obj.external_order_id !== "string" || obj.external_order_id.trim() === "") {
    return false;
  }

  const validStatuses: ProviderStatus[] = ["pending", "processing", "success", "failed", "cancelled", "expired"];

  if (!validStatuses.includes(obj.status as ProviderStatus)) {
    return false;
  }

  if (obj.external_transaction_id !== undefined && typeof obj.external_transaction_id !== "string") {
    return false;
  }

  if (obj.amount !== undefined && (typeof obj.amount !== "number" || obj.amount <= 0)) {
    return false;
  }

  if (obj.payment_method_type !== undefined && typeof obj.payment_method_type !== "string") {
    return false;
  }

  return true;
}

function canTransitionTo(currentStatus: string, requestedStatus: ProviderStatus): boolean {
  if (currentStatus === "pending" && ["processing", "success", "failed", "cancelled", "expired"].includes(requestedStatus)) {
    return true;
  }

  if (currentStatus === "processing" && ["success", "failed"].includes(requestedStatus)) {
    return true;
  }

  if (currentStatus === "failed" && ["processing"].includes(requestedStatus)) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-mock-signature");

  if (!signature) {
    return safeError("Missing signature", 401);
  }

  const isValidSignature = await verifySignature(rawBody, signature);

  if (!isValidSignature) {
    return safeError("Invalid signature", 401);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return safeError("Malformed JSON payload", 400);
  }

  if (!validateWebhookPayload(payload)) {
    return safeError("Invalid webhook payload", 400);
  }

  const webhookPayload = payload as GatewayWebhookPayload;
  const { external_order_id, status, external_transaction_id, amount, payment_method_type } = webhookPayload;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return safeError("Unauthorized", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return safeError("Profile not found", 404);
  }

  const { data: gatewayTransaction, error: gatewayError } = await supabase
    .from("payment_gateway_transactions")
    .select("id, school_id, payment_id, provider, external_order_id, provider_status, raw_payload, student_bills (id, school_id, amount, status)")
    .eq("external_order_id", external_order_id)
    .eq("provider", "mock")
    .single();

  if (gatewayError || !gatewayTransaction) {
    return safeError("Unknown external order", 404);
  }

  const rawPayload = (gatewayTransaction.raw_payload as Record<string, unknown>) || {};
  const studentBill = Array.isArray(gatewayTransaction.student_bills)
    ? gatewayTransaction.student_bills[0]
    : gatewayTransaction.student_bills;

  if (!studentBill || !studentBill.id) {
    return safeError("Invalid gateway transaction: missing bill relationship", 400);
  }

  if (gatewayTransaction.school_id !== profile.school_id) {
    return safeError("Cross-school transaction not allowed", 403);
  }

  if (studentBill.school_id !== profile.school_id) {
    return safeError("Cross-school bill not allowed", 403);
  }

  const currentStatus = gatewayTransaction.provider_status;
  const normalizedStatus = status.toLowerCase() as ProviderStatus;

  if (!canTransitionTo(currentStatus, normalizedStatus)) {
    return safeError("Invalid state transition", 400);
  }

  const now = new Date().toISOString();

  if (normalizedStatus === "processing") {
    const { error: processingError } = await supabase
      .from("payment_gateway_transactions")
      .update({
        provider_status: "processing",
        updated_at: now,
      })
      .eq("id", gatewayTransaction.id)
      .in("provider_status", ["pending", "failed"]);

    if (processingError) {
      return safeError("Failed to update gateway transaction", 500);
    }

    return NextResponse.json({ status: "accepted", provider_status: "processing" }, { status: 200 });
  }

  if (normalizedStatus === "success") {
    const trustedAmount = Number(rawPayload.requested_amount || 0);

    if (!trustedAmount || trustedAmount <= 0) {
      return safeError("Invalid payment amount in gateway transaction", 400);
    }

    if (typeof amount === "number" && amount > 0 && amount !== trustedAmount) {
      return safeError("Webhook amount does not match trusted gateway transaction amount", 400);
    }

    const { data: updatedTransaction, error: updateError } = await supabase
      .from("payment_gateway_transactions")
      .update({
        provider_status: "processing",
        updated_at: now,
      })
      .eq("id", gatewayTransaction.id)
      .in("provider_status", ["pending", "failed"])
      .select("id, provider_status, payment_id, school_id")
      .single();

    if (updateError || !updatedTransaction) {
      return safeError("Failed to update gateway transaction", 500);
    }

    try {
      const { data: payment, error: paymentError } = await supabase.rpc("process_payment", {
        p_student_bill_id: studentBill.id,
        p_amount: trustedAmount,
        p_payment_method_id: String(rawPayload.payment_method_id || ""),
        p_school_payment_method_id: String(rawPayload.school_payment_method_id || ""),
        p_reference_number: `GW-${external_order_id}`,
        p_idempotency_key: `gw-${external_order_id}`,
      });

      if (paymentError) {
        await supabase
          .from("payment_gateway_transactions")
          .update({
            provider_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", updatedTransaction.id)
          .eq("provider_status", "processing");

        return safeError("Payment processing failed", 500);
      }

      const updatePayload: Record<string, unknown> = {
        provider_status: "success",
        updated_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
        raw_payload: {
          ...rawPayload,
          webhook_payload: payload,
        },
        payment_id: payment,
      };

      if (external_transaction_id) {
        updatePayload.external_transaction_id = external_transaction_id;
      }

      if (payment_method_type) {
        updatePayload.payment_method_type = payment_method_type;
      }

      const { error: successUpdateError } = await supabase
        .from("payment_gateway_transactions")
        .update(updatePayload)
        .eq("id", updatedTransaction.id)
        .eq("provider_status", "processing");

      if (successUpdateError) {
        return safeError("Failed to finalize gateway transaction", 500);
      }

      return NextResponse.json({ status: "accepted", provider_status: "success" }, { status: 200 });
    } catch {
      await supabase
        .from("payment_gateway_transactions")
        .update({
          provider_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedTransaction.id)
        .eq("provider_status", "processing");

      return safeError("Payment processing failed", 500);
    }
  }

  if (normalizedStatus === "failed" || normalizedStatus === "cancelled" || normalizedStatus === "expired") {
    const updatePayload: Record<string, unknown> = {
      provider_status: normalizedStatus,
      updated_at: now,
      webhook_received_at: now,
      raw_payload: {
        ...rawPayload,
        webhook_payload: payload,
      },
    };

    if (external_transaction_id) {
      updatePayload.external_transaction_id = external_transaction_id;
    }

    if (payment_method_type) {
      updatePayload.payment_method_type = payment_method_type;
    }

    const { error: updateError } = await supabase
      .from("payment_gateway_transactions")
      .update(updatePayload)
      .eq("id", gatewayTransaction.id)
      .in("provider_status", ["pending", "processing", "failed"]);

    if (updateError) {
      return safeError("Failed to update gateway transaction", 500);
    }

    return NextResponse.json({ status: "accepted", provider_status: normalizedStatus }, { status: 200 });
  }

  return safeError("Unhandled webhook status", 400);
}
