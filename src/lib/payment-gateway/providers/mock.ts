import { PaymentGatewayProvider } from "../types";

export function createMockProvider(): PaymentGatewayProvider {
  return {
    async createPaymentIntent({ amount, paymentMethodType, externalOrderId }) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const externalTransactionId = `mock-txn-${externalOrderId}-${Date.now()}`;
      const qrCodeUrl = `mock://payment-gateway/qr/${externalTransactionId}`;

      const rawPayload = {
        provider: "mock",
        external_order_id: externalOrderId,
        external_transaction_id: externalTransactionId,
        amount,
        payment_method_type: paymentMethodType,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        qr_code_url: qrCodeUrl,
      };

      return {
        externalTransactionId,
        qrCodeUrl,
        expiresAt,
        rawPayload,
        providerStatus: "pending",
      };
    },

    async checkPaymentStatus(_externalTransactionId) {
      return {
        providerStatus: "pending",
        rawPayload: {
          provider: "mock",
          external_transaction_id: _externalTransactionId,
          status: "pending",
        },
      };
    },

    async cancelPayment(_externalTransactionId) {
      return {
        providerStatus: "cancelled",
        rawPayload: {
          provider: "mock",
          external_transaction_id: _externalTransactionId,
          status: "cancelled",
        },
      };
    },
  };
}
