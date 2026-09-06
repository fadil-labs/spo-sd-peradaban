import { PaymentWebhookPayload, PaymentProvider } from '../types';

export function parseWebhookPayload(provider: PaymentProvider, payload: unknown): PaymentWebhookPayload {
  // Placeholder — each provider will have its own parser
  return {
    provider,
    externalTransactionId: '',
    status: 'pending',
    rawPayload: payload as Record<string, unknown>,
  };
}
