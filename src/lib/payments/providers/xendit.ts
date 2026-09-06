/* eslint-disable @typescript-eslint/no-unused-vars */
import { PaymentProviderAdapter, PaymentIntentRequest, PaymentIntentResult, PaymentWebhookPayload, PaymentStatus } from '../types';

/**
 * Xendit payment provider adapter.
 *
 * This is a placeholder implementation. To activate Xendit:
 * 1. Install the Xendit SDK (@xendit/xendit-node).
 * 2. Implement createPaymentIntent by calling Xendit Invoice or Payment Request API.
 * 3. Implement checkPaymentStatus using Xendit invoice/payment retrieval API.
 * 4. Implement cancelPayment and expirePayment using Xendit cancel API.
 * 5. Implement parseWebhook to parse Xendit webhook payload.
 */
export class XenditPaymentProvider implements PaymentProviderAdapter {
  async createPaymentIntent(_request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    throw new Error('Xendit provider belum diimplementasi.');
  }

  async checkPaymentStatus(_externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    throw new Error('Xendit provider belum diimplementasi.');
  }

  async cancelPayment(_externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    throw new Error('Xendit provider belum diimplementasi.');
  }

  async expirePayment(_externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    throw new Error('Xendit provider belum diimplementasi.');
  }

  parseWebhook(_payload: unknown): PaymentWebhookPayload {
    throw new Error('Xendit provider belum diimplementasi.');
  }
}
