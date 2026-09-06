import { NextResponse } from "next/server";
import { simulateMockWebhookAction } from "@/app/dashboard/admin/payment-gateway/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { externalOrderId } = body as { externalOrderId?: string };

    if (!externalOrderId || typeof externalOrderId !== "string") {
      return NextResponse.json({ error: "externalOrderId is required" }, { status: 400 });
    }

    const result = await simulateMockWebhookAction(externalOrderId);

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
