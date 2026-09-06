/* eslint-disable @typescript-eslint/no-unused-vars */
import { PaymentProviderAdapter, PaymentIntentRequest, PaymentIntentResult, PaymentWebhookPayload, PaymentStatus } from '../types';

/**
 * Midtrans payment provider adapter.
 *
 * This is a placeholder implementation. To activate Midtrans:
 * 1. Install the Midtrans SDK or use their Snap/Redirect API directly.
 * 2. Implement createPaymentIntent by calling Midtrans charge API.
 * 3. Implement checkPaymentStatus using Midtrans transaction status API.
 * 4. Implement cancelPayment and expirePayment using Midtrans cancel API.
 * 5. Implement parseWebhook to parse Midtrans notification payload.
 */
export class MidtransPaymentProvider implements PaymentProviderAdapter {
  async createPaymentIntent(_request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    throw new Error('Midtrans provider belum diimplementasi.');
  }

  async checkPaymentStatus(_externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    throw new Error('Midtrans provider belum diimplementasi.');
  }

  async cancelPayment(_externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    throw new Error('Midtrans provider belum diimplementasi.');
  }

  async expirePayment(_externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    throw new Error('Midtrans provider belum diimplementasi.');
  }

  parseWebhook(_payload: unknown): PaymentWebhookPayload {
    throw new Error('Midtrans provider belum diimplementasi.');
  }
}
