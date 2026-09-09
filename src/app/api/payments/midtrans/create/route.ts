import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { midtrans } from "@/lib/payments/midtrans";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "bendahara"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { bill_id, amount, customer_name, customer_email, customer_phone } = body;

    if (!bill_id || !amount || !customer_name) {
      return NextResponse.json({ error: "Bill ID, amount, and customer name are required" }, { status: 400 });
    }

    const { data: bill, error: billError } = await supabase
      .from("student_bills")
      .select("id, student_id, title, amount, due_date, status, students(full_name)")
      .eq("id", bill_id)
      .single();

    if (billError || !bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.status !== "pending") {
      return NextResponse.json({ error: "Bill is not pending" }, { status: 400 });
    }

    const orderId = `SPO-${bill_id}-${Date.now()}`;
    const payload = {
      payment_type: "bank_transfer",
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: customer_name,
        email: customer_email || null,
        phone: customer_phone || null,
      },
      item_details: [
        {
          id: bill.id,
          name: bill.title || "School Payment",
          price: amount,
          quantity: 1,
        },
      ],
      bank_transfer: {
        bank: "bca",
      },
    };

    const paymentResult = await midtrans.createPayment(payload);

    if (paymentResult.error) {
      return NextResponse.json({ error: paymentResult.error }, { status: 500 });
    }

    const paymentResponse = paymentResult as any;
    if ((paymentResponse as any).error) {
      return NextResponse.json({ error: (paymentResponse as any).error }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("student_bills")
      .update({
        payment_method: "midtrans",
        midtrans_order_id: orderId,
        midtrans_transaction_id: (paymentResponse as any).transaction_id,
        status: "waiting_payment",
      })
      .eq("id", bill_id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update bill status" }, { status: 500 });
    }

    const vaNumber = Array.isArray(paymentResponse.va_numbers) && paymentResponse.va_numbers[0]?.va_number;
    const bank = Array.isArray(paymentResponse.va_numbers) && paymentResponse.va_numbers[0]?.bank;

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        va_number: vaNumber || null,
        bank: bank || null,
        amount: amount,
        expires_at: paymentResponse.expiry || null,
      },
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
