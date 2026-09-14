import { PaymentGatewayProvider, ProviderStatus } from "../types";
import { MidtransPaymentProvider } from "@/lib/payments/providers/midtrans";

const midtransPaymentProvider = new MidtransPaymentProvider();

function mapToProviderStatus(status: string): ProviderStatus {
  const normalized = String(status).toLowerCase();
  if (["capture", "settlement", "paid", "success"].includes(normalized)) {
    return "success";
  }
  if (["pending", "challenge", "waiting_payment", "processing"].includes(normalized)) {
    return "pending";
  }
  if (["cancel", "deny", "expire", "expired", "cancelled"].includes(normalized)) {
    return "cancelled";
  }
  if (["refund", "refunded"].includes(normalized)) {
    return "success";
  }
  if (["failure", "failed"].includes(normalized)) {
    return "failed";
  }
  return "pending";
}

export function createMidtransProvider(): PaymentGatewayProvider {
  return {
    async createPaymentIntent({ amount, paymentMethodType, externalOrderId }) {
      const result = await midtransPaymentProvider.createPaymentIntent({
        externalOrderId,
        amount,
        paymentMethodType: paymentMethodType as any,
      });

      return {
        externalTransactionId: result.externalTransactionId,
        qrCodeUrl: result.qrCodeUrl || "",
        expiresAt: result.expiresAt || new Date(),
        rawPayload: result.rawPayload,
        providerStatus: mapToProviderStatus(result.providerStatus as string),
      };
    },

    async checkPaymentStatus(externalTransactionId) {
      const result = await midtransPaymentProvider.checkPaymentStatus(externalTransactionId);
      return {
        providerStatus: mapToProviderStatus(result.status as string),
        rawPayload: result.rawPayload,
      };
    },

    async cancelPayment(externalTransactionId) {
      const result = await midtransPaymentProvider.cancelPayment(externalTransactionId);
      return {
        providerStatus: "cancelled",
        rawPayload: result.rawPayload,
      };
    },
  };
}
