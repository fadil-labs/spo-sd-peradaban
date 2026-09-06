import { PaymentProviderAdapter, PaymentIntentRequest, PaymentIntentResult, PaymentWebhookPayload, PaymentStatus } from '../types';

export class MockPaymentProvider implements PaymentProviderAdapter {
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const externalTransactionId = `mock-txn-${request.externalOrderId}-${Date.now()}`;
    const qrCodeUrl = `mock://payment-gateway/qr/${externalTransactionId}`;
    const vaNumber = `mock-va-${externalTransactionId.slice(-8)}`;

    const rawPayload: Record<string, unknown> = {
      provider: 'mock',
      external_order_id: request.externalOrderId,
      external_transaction_id: externalTransactionId,
      amount: request.amount,
      payment_method_type: request.paymentMethodType,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      qr_code_url: qrCodeUrl,
      va_number: vaNumber,
    };

    return {
      externalTransactionId,
      providerStatus: 'pending',
      qrCodeUrl,
      vaNumber,
      expiresAt,
      rawPayload,
      methodType: request.paymentMethodType,
    };
  }

  async checkPaymentStatus(externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    return {
      status: 'pending',
      rawPayload: {
        provider: 'mock',
        external_transaction_id: externalTransactionId,
        status: 'pending',
      },
    };
  }

  async cancelPayment(externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    return {
      status: 'cancelled',
      rawPayload: {
        provider: 'mock',
        external_transaction_id: externalTransactionId,
        status: 'cancelled',
      },
    };
  }

  async expirePayment(externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    return {
      status: 'expired',
      rawPayload: {
        provider: 'mock',
        external_transaction_id: externalTransactionId,
        status: 'expired',
      },
    };
  }

  parseWebhook(_payload: unknown): PaymentWebhookPayload {
    return {
      provider: 'mock',
      externalTransactionId: '',
      status: 'pending',
      rawPayload: _payload as Record<string, unknown>,
    };
  }
}
