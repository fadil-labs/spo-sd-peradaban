/* eslint-disable @typescript-eslint/no-unused-vars */
import { PaymentProviderAdapter, PaymentIntentRequest, PaymentIntentResult, PaymentWebhookPayload, PaymentStatus, PaymentMethodType } from '../types';
import { midtrans } from '../midtrans';

function mapMidtransStatus(status: string): PaymentStatus {
  const normalized = String(status).toLowerCase();
  if (['capture', 'settlement'].includes(normalized)) return 'paid';
  if (['pending', 'challenge'].includes(normalized)) return 'waiting_payment';
  if (['cancel', 'deny', 'expire', 'expired'].includes(normalized)) return 'cancelled';
  if (['refund', 'refunded'].includes(normalized)) return 'refunded';
  if (['failure', 'failed'].includes(normalized)) return 'failed';
  return 'pending';
}

export class MidtransPaymentProvider implements PaymentProviderAdapter {
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    const orderId = request.externalOrderId || `SPO-${Date.now()}`;
    const payload = {
      payment_type: 'bank_transfer',
      transaction_details: {
        order_id: orderId,
        gross_amount: request.amount,
      },
      customer_details: {
        first_name: 'Pembayaran',
      },
      item_details: [
        {
          id: orderId,
          name: 'Pembayaran Tagihan',
          price: request.amount,
          quantity: 1,
        },
      ],
      bank_transfer: {
        bank: 'bca',
      },
    };

    const result = await midtrans.createPayment(payload);

    if ((result as Record<string, unknown>).error) {
      throw new Error((result as Record<string, unknown>).error as string);
    }

    const data = result as Record<string, unknown>;
    const vaNumbers = data.va_numbers as Array<{ va_number: string; bank: string }> | undefined;
    const vaNumber = Array.isArray(vaNumbers) && vaNumbers[0]?.va_number ? vaNumbers[0].va_number : undefined;
    const expiryRaw = data.expiry;
    const expiresAt = expiryRaw ? new Date(expiryRaw as string) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      externalTransactionId: (data.transaction_id as string) || orderId,
      providerStatus: mapMidtransStatus((data.transaction_status as string) || 'pending'),
      qrCodeUrl: data.qr_code as string || undefined,
      vaNumber,
      expiresAt,
      rawPayload: data,
      methodType: request.paymentMethodType,
    };
  }

  async checkPaymentStatus(externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    const result = await midtrans.checkStatus(externalTransactionId);
    const data = result as Record<string, unknown>;

    return {
      status: mapMidtransStatus((data.transaction_status as string) || 'pending'),
      rawPayload: data,
    };
  }

  async cancelPayment(externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    const response = await fetch(`${midtrans['baseUrl']}/v2/${externalTransactionId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${midtrans['serverKey']}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if ((data as Record<string, unknown>).error) {
      throw new Error((data as Record<string, unknown>).error as string);
    }

    return {
      status: 'cancelled',
      rawPayload: data,
    };
  }

  async expirePayment(externalTransactionId: string): Promise<{ status: PaymentStatus; rawPayload: Record<string, unknown> }> {
    return this.cancelPayment(externalTransactionId);
  }

  parseWebhook(payload: unknown): PaymentWebhookPayload {
    const data = payload as Record<string, unknown>;
    const paymentMethodType = data.payment_type as string | undefined;
    return {
      provider: 'midtrans',
      externalTransactionId: (data.transaction_id as string) || (data.order_id as string) || '',
      status: mapMidtransStatus((data.transaction_status as string) || 'pending'),
      amount: data.gross_amount ? Number(data.gross_amount) : undefined,
      paymentMethodType: paymentMethodType as PaymentMethodType | undefined,
      metadata: data,
      rawPayload: data,
    };
  }
}
