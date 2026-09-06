export type PaymentProvider = "mock" | "midtrans" | "xendit";

export type ProviderStatus = "pending" | "processing" | "success" | "failed" | "cancelled" | "expired";

export type PaymentMethodType = string;

export interface PaymentIntentRequest {
  studentBillId: string;
  amount: number;
  paymentMethodId: string;
  schoolPaymentMethodId: string;
  provider: PaymentProvider;
  paymentMethodType: PaymentMethodType;
}

export interface PaymentIntentResult {
  id: string;
  schoolId: string;
  paymentId: string;
  provider: PaymentProvider;
  externalOrderId: string;
  externalTransactionId: string;
  providerStatus: ProviderStatus;
  paymentMethodType: PaymentMethodType;
  qrCodeUrl: string;
  expiresAt: string;
  rawPayload: Record<string, unknown>;
  webhookReceivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GatewayWebhookPayload {
  external_order_id: string;
  status: ProviderStatus;
  external_transaction_id?: string;
  amount?: number;
  payment_method_type?: string;
}

export interface PaymentGatewayProvider {
  createPaymentIntent(request: {
    amount: number;
    paymentMethodType: PaymentMethodType;
    externalOrderId: string;
  }): Promise<{
    externalTransactionId: string;
    qrCodeUrl: string;
    expiresAt: Date;
    rawPayload: Record<string, unknown>;
    providerStatus: ProviderStatus;
  }>;

  checkPaymentStatus(externalTransactionId: string): Promise<{
    providerStatus: ProviderStatus;
    rawPayload: Record<string, unknown>;
  }>;

  cancelPayment(externalTransactionId: string): Promise<{
    providerStatus: ProviderStatus;
    rawPayload: Record<string, unknown>;
  }>;
}
