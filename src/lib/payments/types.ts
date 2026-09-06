export type PaymentProvider = 'mock' | 'midtrans' | 'xendit';

export type PaymentMethodType = 'QRIS' | 'VA' | 'BANK_TRANSFER' | 'E_WALLET' | 'MANUAL';

export type PaymentStatus = 'pending' | 'waiting_payment' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded';

export interface PaymentCapability {
  provider: PaymentProvider;
  methods: PaymentMethodType[];
  supportsWebhook: boolean;
  supportsRefund: boolean;
  supportsPartialPayment: boolean;
}

export interface PaymentIntentRequest {
  amount: number;
  paymentMethodType: PaymentMethodType;
  externalOrderId: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  externalTransactionId: string;
  providerStatus: PaymentStatus;
  qrCodeUrl?: string;
  vaNumber?: string;
  expiresAt?: Date;
  rawPayload: Record<string, unknown>;
  methodType: PaymentMethodType;
}

export interface PaymentWebhookPayload {
  provider: PaymentProvider;
  externalTransactionId: string;
  status: PaymentStatus;
  amount?: number;
  paymentMethodType?: PaymentMethodType;
  metadata?: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult>;
  checkPaymentStatus(externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }>;
  cancelPayment(externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }>;
  expirePayment(externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }>;
  parseWebhook(payload: unknown): PaymentWebhookPayload;
}
