/* eslint-disable @typescript-eslint/no-unused-vars */
import { PaymentWebhookPayload } from '../types';

export function dispatchWebhook(_payload: PaymentWebhookPayload): { accepted: boolean; reason?: string } {
  // Placeholder for webhook event dispatching
  return { accepted: true };
}
