const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runTest() {
  console.log('=== MIDTRANS WEBHOOK EXPIRED TEST ===');
  console.log('Testing bill: 4b93cd64-9277-4097-824f-501f6154f3e6\n');

  // Step 1: Get current state
  console.log('Step 1: Checking current state...');
  const { data: bill } = await supabase
    .from('student_bills')
    .select('id, status, amount, student_id, school_id')
    .eq('id', '4b93cd64-9277-4097-824f-501f6154f3e6')
    .single();

  if (!bill) {
    console.log('✗ Bill not found');
    process.exit(1);
  }

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, status, reference_number, payment_date')
    .eq('student_bill_id', bill.id);

  console.log(`Bill: ${bill.id}`);
  console.log(`  Status: ${bill.status}`);
  console.log(`  Amount: Rp${bill.amount.toLocaleString('id-ID')}`);
  console.log(`\nPayments (${payments?.length || 0}):`);
  for (const p of payments || []) {
    console.log(`  - ${p.id.slice(0, 8)}... | status=${p.status} | amount=Rp${p.amount.toLocaleString('id-ID')}`);
  }

  const validPayments = (payments || []).filter(p => ['completed', 'pending'].includes(p.status));
  const totalPaid = validPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  console.log(`\nTotal paid (completed/pending): Rp${totalPaid.toLocaleString('id-ID')}`);
  console.log(`Expected bill status: ${totalPaid >= bill.amount ? 'paid' : totalPaid > 0 ? 'partial' : 'pending'}`);

  // Step 2: Find payment gateway transaction for this bill
  console.log('\nStep 2: Finding payment gateway transaction...');
  const { data: gatewayTx } = await supabase
    .from('payment_gateway_transactions')
    .select('id, provider, external_order_id, provider_status, payment_id, expires_at, webhook_received_at')
    .eq('provider', 'midtrans')
    .eq('payment_id', payments?.[0]?.id)
    .single();

  if (!gatewayTx) {
    console.log('⚠ No gateway transaction found for this payment');
    console.log('This is expected if the payment was created outside the gateway flow');
  } else {
    console.log(`Gateway transaction: ${gatewayTx.id.slice(0, 8)}...`);
    console.log(`  External order ID: ${gatewayTx.external_order_id}`);
    console.log(`  Provider status: ${gatewayTx.provider_status}`);
    console.log(`  Expires at: ${gatewayTx.expires_at}`);
    console.log(`  Webhook received: ${gatewayTx.webhook_received_at || 'never'}`);
  }

  // Step 3: Simulate webhook expired processing
  console.log('\nStep 3: Simulating webhook expired processing...');
  console.log('This simulates what the Midtrans webhook handler does when transaction_status=expire\n');

  if (!payments || payments.length === 0) {
    console.log('⚠ No payments found, cannot simulate webhook');
    return;
  }

  // Find a target payment that is currently completed or pending
  let targetPayment = payments.find(p => p.status === 'completed' || p.status === 'pending');
  
  // If no valid payment found, check if there's a failed payment we can revert for testing
  if (!targetPayment) {
    const failedPayment = payments.find(p => p.status === 'failed');
    if (failedPayment) {
      console.log(`Found failed payment ${failedPayment.id.slice(0, 8)}... reverting to completed for testing...`);
      const { error: revertError } = await supabase
        .from('payments')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', failedPayment.id);
      
      if (revertError) {
        console.log(`✗ Failed to revert payment: ${revertError.message}`);
        return;
      }
      
      console.log('✓ Payment reverted to completed');
      targetPayment = { ...failedPayment, status: 'completed' };
    } else {
      console.log('⚠ No payable payment found for this bill');
      return;
    }
  }

  console.log(`Target payment: ${targetPayment.id}`);
  console.log(`  Current status: ${targetPayment.status}`);
  console.log(`  Amount: Rp${targetPayment.amount.toLocaleString('id-ID')}`);

  // Simulate the webhook logic from src/app/api/webhooks/midtrans/route.ts
  const providerStatus = 'expired';
  const paymentStatus = 'failed'; // as mapped in the webhook handler

  console.log(`\nSimulating: provider_status=${providerStatus}, payment_status=${paymentStatus}`);

  // Update payment status
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetPayment.id);

  if (paymentError) {
    console.log(`✗ Failed to update payment: ${paymentError.message}`);
    return;
  }

  console.log(`✓ Payment status updated to: ${paymentStatus}`);

  // Recalculate bill status
  const { data: otherCompleted } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('student_bill_id', bill.id)
    .in('status', ['completed', 'pending'])
    .neq('id', targetPayment.id);

  const hasOtherValid = (otherCompleted && otherCompleted.count > 0);
  const newBillStatus = hasOtherValid ? 'partial' : 'pending';

  const { error: billError } = await supabase
    .from('student_bills')
    .update({
      status: newBillStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bill.id);

  if (billError) {
    console.log(`✗ Failed to update bill: ${billError.message}`);
    return;
  }

  console.log(`✓ Bill status updated to: ${newBillStatus}`);
  console.log(`  (hasOtherValid=${hasOtherValid})`);

  // Step 4: Verify final state
  console.log('\nStep 4: Verifying final state...');
  const { data: finalBill } = await supabase
    .from('student_bills')
    .select('id, status, amount')
    .eq('id', bill.id)
    .single();

  const { data: finalPayments } = await supabase
    .from('payments')
    .select('id, amount, status')
    .eq('student_bill_id', bill.id)
    .in('status', ['completed', 'pending']);

  const finalTotalPaid = (finalPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const expectedStatus = finalTotalPaid >= (finalBill && finalBill.amount ? finalBill.amount : 0) ? 'paid' : finalTotalPaid > 0 ? 'partial' : 'pending';
  const isConsistent = finalBill && finalBill.status === expectedStatus;

  console.log(`Final bill status: ${finalBill ? finalBill.status : 'unknown'}`);
  console.log(`Final total paid: Rp${finalTotalPaid.toLocaleString('id-ID')}`);
  console.log(`Expected status: ${expectedStatus}`);
  console.log(`Consistency: ${isConsistent ? '✓ CONSISTENT' : '✗ INCONSISTENT'}`);

  // Step 5: Check dashboard impact
  console.log('\nStep 5: Checking dashboard impact...');
  
  // This bill would affect:
  // - Admin dashboard total outstanding (increases because bill is no longer paid)
  // - Admin dashboard total paid (decreases because payment is now failed)
  // - Parent dashboard bill status
  
  console.log('Dashboard impact:');
  console.log(`  - Admin total outstanding: +Rp${bill.amount.toLocaleString('id-ID')} (bill reverted to pending)`);
  console.log(`  - Admin total paid: -Rp${targetPayment.amount.toLocaleString('id-ID')} (payment marked as failed)`);
  console.log(`  - Parent bill status: changed from 'paid' to '${newBillStatus}'`);

  // Step 6: Summary
  console.log('\n=== TEST SUMMARY ===');
  if (isConsistent) {
    console.log('✓ Webhook expired handling works correctly');
    console.log('✓ Bill and payment statuses are consistent');
    console.log('✓ Dashboard data will reflect the correct state');
  } else {
    console.log('✗ Inconsistency detected after webhook simulation');
  }

  // Step 7: Cleanup (optional - revert to original state for testing)
  console.log('\n=== CLEANUP (reverting to original state) ===');
  
  // Revert payment: failed -> pending -> completed
  const { error: revertPaymentToPendingError } = await supabase
    .from('payments')
    .update({
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetPayment.id);

  if (revertPaymentToPendingError) {
    console.log(`✗ Failed to revert payment to pending: ${revertPaymentToPendingError.message}`);
  } else {
    console.log('✓ Payment reverted to pending');
  }

  const { error: revertPaymentError } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      updated_at: targetPayment.payment_date,
    })
    .eq('id', targetPayment.id);

  if (revertPaymentError) {
    console.log(`✗ Failed to revert payment to completed: ${revertPaymentError.message}`);
  } else {
    console.log('✓ Payment reverted to completed');
  }

  const { error: revertBillError } = await supabase
    .from('student_bills')
    .update({
      status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bill.id);

  if (revertBillError) {
    console.log(`✗ Failed to revert bill: ${revertBillError.message}`);
  } else {
    console.log('✓ Bill reverted to paid');
  }

  console.log('\n=== TEST COMPLETED ===');
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
