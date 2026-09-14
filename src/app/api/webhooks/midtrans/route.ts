import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
    } = body;

    // 1. Verifikasi Signature Key (SHA-512)
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const hashString = order_id + status_code + gross_amount + serverKey;
    const computedSignature = crypto
      .createHash('sha512')
      .update(hashString)
      .digest('hex');

    if (computedSignature !== signature_key) {
      return NextResponse.json(
        { error: 'Invalid signature key' },
        { status: 401 }
      );
    }

    // 2. Petakan Status Midtrans ke Check Constraints Tabel
    // payment_gateway_transactions.provider_status: 'pending', 'processing', 'success', 'failed', 'cancelled', 'expired'
    let providerStatus = 'pending';
    // payments.status: 'pending', 'completed', 'failed', 'cancelled', 'refunded'
    let paymentStatus = 'pending';
    // student_bills.status: 'pending', 'partial', 'paid', 'overdue', 'cancelled'
    let billStatus = 'paid';

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (fraud_status === 'challenge') {
        providerStatus = 'processing';
        paymentStatus = 'pending';
      } else {
        providerStatus = 'success';
        paymentStatus = 'completed';
      }
    } else if (transaction_status === 'cancel') {
      providerStatus = 'cancelled';
      paymentStatus = 'cancelled';
    } else if (transaction_status === 'deny') {
      providerStatus = 'failed';
      paymentStatus = 'failed';
    } else if (transaction_status === 'expire') {
      providerStatus = 'expired';
      paymentStatus = 'failed';
    }

    // 3. Ambil data transaksi gateway terlebih dahulu untuk mendapatkan relasi payment_id
    const { data: gatewayTx, error } = await supabaseAdmin
      .from('payment_gateway_transactions')
      .select('payment_id, school_id')
      .eq('external_order_id', order_id)
      .eq('provider', 'midtrans')
      .single();

    if (error || !gatewayTx) {
      console.error('Transaksi gateway tidak ditemukan:', order_id);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // 4. Perbarui Status di tabel payment_gateway_transactions
    const { error: updateGatewayError } = await supabaseAdmin
      .from('payment_gateway_transactions')
      .update({
        provider_status: providerStatus,
        external_transaction_id: transaction_id || null,
        payment_method_type: payment_type || null,
        raw_payload: body,
        webhook_received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('external_order_id', order_id)
      .eq('provider', 'midtrans');

    if (updateGatewayError) {
      console.error('Gagal memperbarui payment_gateway_transactions:', updateGatewayError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // 5. Jika ada relasi payment_id, perbarui juga status pada tabel payments dan student_bills
    if (gatewayTx.payment_id) {
      // Perbarui status tabel payments
      const { data: paymentData, error: updatePaymentError } = await supabaseAdmin
        .from('payments')
        .update({
          status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gatewayTx.payment_id)
        .select('student_bill_id')
        .single();

      if (!updatePaymentError && paymentData?.student_bill_id) {
        if (providerStatus === 'success') {
          await supabaseAdmin
            .from('student_bills')
            .update({
              status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentData.student_bill_id);
        } else if (providerStatus === 'expired' || providerStatus === 'cancelled' || providerStatus === 'failed') {
          const { data: otherCompleted } = await supabaseAdmin
            .from('payments')
            .select('id', { count: 'exact', head: true })
            .eq('student_bill_id', paymentData.student_bill_id)
            .in('status', ['completed', 'pending'])
            .neq('id', gatewayTx.payment_id);

          const hasOtherValid = (otherCompleted as unknown as { count?: number } | null)?.count && (otherCompleted as unknown as { count: number }).count > 0;
          const newBillStatus = hasOtherValid ? 'partial' : 'pending';

          await supabaseAdmin
            .from('student_bills')
            .update({
              status: newBillStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentData.student_bill_id);
        }
      }
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Kesalahan pada webhook Midtrans:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}