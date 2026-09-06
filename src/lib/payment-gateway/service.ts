import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentIntentRequest, PaymentIntentResult, PaymentGatewayProvider, ProviderStatus } from "./types";
import { createMockProvider } from "./providers/mock";
import { resolveProviderForMethod } from "@/lib/payments/strategy";
import { PaymentProvider as PaymentsPaymentProvider } from "@/lib/payments/types";

async function createPaymentIntentInternal(request: PaymentIntentRequest, allowedRoles: string[]): Promise<PaymentIntentResult> {
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

  if (!allowedRoles.includes(profile.role)) {
    redirect("/dashboard/admin");
  }

  const { data: bill, error: billError } = await supabase
    .from("student_bills")
    .select("id, school_id, amount, status")
    .eq("id", request.studentBillId)
    .single();

  if (billError || !bill) {
    throw new Error("Tagihan tidak ditemukan.");
  }

  if (bill.school_id !== profile.school_id) {
    throw new Error("Tagihan tidak berada di sekolah yang sama.");
  }

  if (bill.status === "paid" || bill.status === "cancelled") {
    throw new Error("Tagihan ini tidak dapat menerima pembayaran.");
  }

  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    throw new Error("Jumlah pembayaran tidak valid.");
  }

  if (request.amount > bill.amount) {
    throw new Error("Jumlah pembayaran melebihi sisa tagihan.");
  }

  const { data: schoolMethod, error: schoolMethodError } = await supabase
    .from("school_payment_methods")
    .select("id, is_active, payment_methods (id, name, method_type, is_active)")
    .eq("id", request.schoolPaymentMethodId)
    .eq("school_id", profile.school_id)
    .single();

  if (schoolMethodError || !schoolMethod) {
    throw new Error("Metode pembayaran sekolah tidak valid.");
  }

  if (!schoolMethod.is_active) {
    throw new Error("Metode pembayaran sekolah tidak aktif.");
  }

  const paymentMethod = Array.isArray(schoolMethod.payment_methods)
    ? schoolMethod.payment_methods[0]
    : schoolMethod.payment_methods;

  if (!paymentMethod || !paymentMethod.is_active) {
    throw new Error("Metode pembayaran tidak aktif.");
  }

  const externalOrderId = `bill-${request.studentBillId}-${Date.now()}`;

  const { data: existingGateway, error: existingError } = await supabase
    .from("payment_gateway_transactions")
    .select("id, provider_status")
    .eq("provider", request.provider)
    .eq("external_order_id", externalOrderId)
    .eq("school_id", profile.school_id)
    .in("provider_status", ["pending", "processing", "success"])
    .maybeSingle();

  if (existingError) {
    throw new Error("Gagal memeriksa transaksi gateway yang ada.");
  }

  if (existingGateway) {
    throw new Error("Transaksi gateway untuk tagihan ini sudah ada dan masih aktif.");
  }

  const provider = resolveProvider(request.provider);

  const intent = await provider.createPaymentIntent({
    amount: request.amount,
    paymentMethodType: request.paymentMethodType,
    externalOrderId,
  });

  const rawPayload = {
    ...intent.rawPayload,
    student_bill_id: request.studentBillId,
    payment_method_id: request.paymentMethodId,
    school_payment_method_id: request.schoolPaymentMethodId,
    requested_amount: request.amount,
  };

  const { data: gatewayTransaction, error: insertError } = await supabase
    .from("payment_gateway_transactions")
    .insert({
      school_id: profile.school_id,
      payment_id: null,
      provider: request.provider,
      external_order_id: externalOrderId,
      external_transaction_id: intent.externalTransactionId,
      provider_status: intent.providerStatus,
      payment_method_type: request.paymentMethodType,
      qr_code_url: intent.qrCodeUrl,
      expires_at: intent.expiresAt.toISOString(),
      raw_payload: rawPayload,
      webhook_received_at: null,
    })
    .select("id, school_id, payment_id, provider, external_order_id, external_transaction_id, provider_status, payment_method_type, qr_code_url, expires_at, raw_payload, webhook_received_at, created_at, updated_at")
    .single();

  if (insertError || !gatewayTransaction) {
    throw new Error("Gagal membuat transaksi gateway.");
  }

  return {
    id: gatewayTransaction.id,
    schoolId: gatewayTransaction.school_id,
    paymentId: gatewayTransaction.payment_id || "",
    provider: gatewayTransaction.provider,
    externalOrderId: gatewayTransaction.external_order_id,
    externalTransactionId: gatewayTransaction.external_transaction_id,
    providerStatus: gatewayTransaction.provider_status,
    paymentMethodType: gatewayTransaction.payment_method_type,
    qrCodeUrl: gatewayTransaction.qr_code_url,
    expiresAt: gatewayTransaction.expires_at,
    rawPayload: (gatewayTransaction.raw_payload as Record<string, unknown>) || {},
    webhookReceivedAt: gatewayTransaction.webhook_received_at,
    createdAt: gatewayTransaction.created_at,
    updatedAt: gatewayTransaction.updated_at,
  };
}

export async function createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
  return createPaymentIntentInternal(request, ["admin", "bendahara"]);
}

export async function createParentPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
  return createPaymentIntentInternal(request, ["orang_tua"]);
}

export async function createPaymentIntentViaStrategy(request: {
  amount: number;
  paymentMethodType: string;
  externalOrderId: string;
  provider?: PaymentsPaymentProvider;
}): Promise<PaymentIntentResult> {
  const paymentProvider = resolveProviderForMethod(request.paymentMethodType as 'QRIS' | 'VA' | 'BANK_TRANSFER' | 'E_WALLET' | 'MANUAL', request.provider);

  const methodType = request.paymentMethodType as 'QRIS' | 'VA' | 'BANK_TRANSFER' | 'E_WALLET' | 'MANUAL';
  const intent = await paymentProvider.createPaymentIntent({
    amount: request.amount,
    paymentMethodType: methodType,
    externalOrderId: request.externalOrderId,
  });

  const strategyToGatewayStatus: Record<string, ProviderStatus> = {
    pending: 'pending',
    waiting_payment: 'pending',
    paid: 'success',
    failed: 'failed',
    expired: 'expired',
    cancelled: 'cancelled',
    refunded: 'success',
  };

  return {
    id: '',
    schoolId: '',
    paymentId: '',
    provider: 'mock',
    externalOrderId: request.externalOrderId,
    externalTransactionId: intent.externalTransactionId,
    providerStatus: strategyToGatewayStatus[intent.providerStatus] || 'pending',
    paymentMethodType: methodType,
    qrCodeUrl: intent.qrCodeUrl || '',
    expiresAt: intent.expiresAt?.toISOString() || '',
    rawPayload: intent.rawPayload,
    webhookReceivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function resolveProvider(provider: string): PaymentGatewayProvider {
  switch (provider) {
    case "mock":
      return createMockProvider();
    default:
      throw new Error(`Provider ${provider} belum didukung.`);
  }
}
