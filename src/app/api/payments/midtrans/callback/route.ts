import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[Midtrans Callback] Received:", JSON.stringify(body, null, 2));

    const { order_id, transaction_status, transaction_id, gross_amount } = body;

    if (!order_id) {
      return NextResponse.json({ status: "error", message: "Invalid callback data" }, { status: 400 });
    }

    const supabase = await createClient();
    let status = "pending";

    switch (transaction_status) {
      case "capture":
      case "settlement":
        status = "paid";
        break;
      case "pending":
        status = "waiting_payment";
        break;
      case "cancel":
      case "deny":
      case "expire":
        status = "cancelled";
        break;
      case "refund":
        status = "refunded";
        break;
      default:
        status = "pending";
    }

    const { data: existingBill, error: fetchError } = await supabase
      .from("student_bills")
      .select("id, student_id, status")
      .eq("midtrans_order_id", order_id)
      .single();

    if (fetchError || !existingBill) {
      return NextResponse.json({ status: "error", message: "Bill not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("student_bills")
      .update({
        status,
        midtrans_transaction_id: transaction_id,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", existingBill.id);

    if (updateError) {
      console.error("Failed to update bill:", updateError);
      return NextResponse.json({ status: "error", message: "Failed to update bill" }, { status: 500 });
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Midtrans callback error:", error);
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}
