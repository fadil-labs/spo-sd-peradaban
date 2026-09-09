export class MidtransService {
  private serverKey: string;
  private clientKey: string;
  private isProduction: boolean;
  private baseUrl: string;

  constructor() {
    this.serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    this.clientKey = process.env.MIDTRANS_CLIENT_KEY || "";
    this.isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    this.baseUrl = this.isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
  }

  async createPayment(payload: {
    payment_type: string;
    transaction_details: {
      order_id: string;
      gross_amount: number;
    };
    customer_details: {
      first_name: string;
      email?: string | null;
      phone?: string | null;
    };
    item_details: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
    bank_transfer?: {
      bank: string;
    };
  }) {
    const response = await fetch(`${this.baseUrl}/v2/charge`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.serverKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as Record<string, unknown>;
    return data;
  }

  async checkStatus(orderId: string) {
    const response = await fetch(`${this.baseUrl}/v2/${orderId}/status`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.serverKey}:`).toString("base64")}`,
      },
    });

    const data = (await response.json()) as Record<string, unknown>;
    return data;
  }
}

export const midtrans = new MidtransService();
