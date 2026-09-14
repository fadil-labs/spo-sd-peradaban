const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

function loadEnv() {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env.local');
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

const BASE_URL = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const MOCK_SECRET = env.MOCK_PAYMENT_WEBHOOK_SECRET || 'replace_me';

function signMockWebhook(payload) {
  const encoder = new TextEncoder();
  const key = crypto.subtle.importKey(
    'raw',
    encoder.encode(MOCK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(payload)))
    .then(buf => 'sha256=' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== WEBHOOK FIX VERIFICATION TESTS ===\n');

  // Test 1: Find a mock gateway transaction to test with
  console.log('Test 1: Finding mock gateway transaction...');
  const { data: gatewayTxs, error: gwError } = await supabase
    .from('payment_gateway_transactions')
    .select('id, external_order_id, provider, provider_status, payment_id, school_id, raw_payload')
    .eq('provider', 'mock')
    .in('provider_status', ['pending', 'processing', 'failed'])
    .limit(1);

  if (gwError || !gatewayTxs || gatewayTxs.length === 0) {
    console.log('⚠ No mock gateway transaction found. Creating test transaction...');
    // Create test data if none exists
    const { data: school } = await supabase.from('schools').select('id').limit(1).single();
    const { data: student } = await supabase.from('students').select('id, school_id').limit(1).single();
    const { data: bill } = await supabase.from('student_bills').select('id, amount, school_id, student_id').limit(1).single();
    
    if (!school || !student || !bill) {
      console.log('✗ Cannot create test data - missing school/student/bill');
      process.exit(1);
    }

    const externalOrderId = `bill-test-${bill.id.slice(0, 8)}-${Date.now()}`;
    const idempotencyKey = `gw-${externalOrderId}`;
    
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        school_id: bill.school_id,
        student_id: bill.student_id,
        student_bill_id: bill.id,
        amount: 100000,
        payment_date: new Date().toISOString(),
        reference_number: `GW-${externalOrderId}`,
        status: 'pending',
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    if (paymentError || !payment) {
      console.log('✗ Failed to create test payment:', paymentError);
      process.exit(1);
    }

    const { data: gwTx, error: gwError2 } = await supabase
      .from('payment_gateway_transactions')
      .insert({
        school_id: bill.school_id,
        payment_id: payment.id,
        provider: 'mock',
        external_order_id: externalOrderId,
        external_transaction_id: `test-tx-${Date.now()}`,
        provider_status: 'pending',
        payment_method_type: 'BANK_TRANSFER',
        raw_payload: { requested_amount: 100000, payment_method_id: 'test', school_payment_method_id: 'test' },
        webhook_received_at: null,
      })
      .select('id, external_order_id, provider_status, payment_id')
      .single();

    if (gwError2 || !gwTx) {
      console.log('✗ Failed to create test gateway transaction:', gwError2);
      process.exit(1);
    }

    console.log(`✓ Created test gateway transaction: ${gwTx.external_order_id}`);
    console.log(`  - payment_id: ${gwTx.payment_id}`);
    console.log(`  - status: ${gwTx.provider_status}\n`);
    await sleep(1000);
  } else {
    console.log(`✓ Found mock gateway transaction: ${gatewayTxs[0].external_order_id}`);
    console.log(`  - payment_id: ${gatewayTxs[0].payment_id}`);
    console.log(`  - status: ${gatewayTxs[0].provider_status}\n`);
  }

  // Test 2: Mock webhook success
  console.log('Test 2: Mock webhook SUCCESS...');
  const { data: successTx } = await supabase
    .from('payment_gateway_transactions')
    .select('id, external_order_id, provider_status, payment_id, raw_payload')
    .eq('provider', 'mock')
    .in('provider_status', ['pending', 'processing', 'failed'])
    .limit(1)
    .single();

  if (!successTx) {
    console.log('⚠ No suitable mock transaction for success test');
  } else {
    const webhookPayload = {
      external_order_id: successTx.external_order_id,
      external_transaction_id: successTx.external_transaction_id || `success-tx-${Date.now()}`,
      status: 'success',
      amount: 100000,
      payment_method_type: 'BANK_TRANSFER',
    };

    const signature = await signMockWebhook(webhookPayload);
    const response = await fetch(`${BASE_URL}/api/webhooks/payment/mock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-signature': signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    const result = await response.json();
    console.log(`  Response: ${response.status} ${JSON.stringify(result)}`);

    if (response.ok) {
      // Verify payment status
      const { data: paymentAfter } = await supabase
        .from('payments')
        .select('status, student_bill_id')
        .eq('id', successTx.payment_id)
        .single();

      const { data: billAfter } = paymentAfter?.student_bill_id ? await supabase
        .from('student_bills')
        .select('status')
        .eq('id', paymentAfter.student_bill_id)
        .single() : { data: null };

      console.log(`  ✓ Payment status after success webhook: ${paymentAfter?.status}`);
      console.log(`  ✓ Bill status after success webhook: ${billAfter?.status}\n`);
    } else {
      console.log(`  ✗ Success webhook failed: ${JSON.stringify(result)}\n`);
    }
  }

  // Test 3: Mock webhook expired
  console.log('Test 3: Mock webhook EXPIRED...');
  const { data: expiredTx } = await supabase
    .from('payment_gateway_transactions')
    .select('id, external_order_id, provider_status, payment_id, raw_payload')
    .eq('provider', 'mock')
    .in('provider_status', ['pending', 'processing', 'failed'])
    .limit(1)
    .single();

  if (!expiredTx) {
    console.log('⚠ No suitable mock transaction for expired test');
  } else {
    const webhookPayload = {
      external_order_id: expiredTx.external_order_id,
      external_transaction_id: expiredTx.external_transaction_id || `expired-tx-${Date.now()}`,
      status: 'expired',
      amount: 100000,
      payment_method_type: 'BANK_TRANSFER',
    };

    const signature = await signMockWebhook(webhookPayload);
    const response = await fetch(`${BASE_URL}/api/webhooks/payment/mock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-signature': signature,
      },
      body: JSON.stringify(webhookPayload),
    });

    const result = await response.json();
    console.log(`  Response: ${response.status} ${JSON.stringify(result)}`);

    if (response.ok) {
      const { data: paymentAfter } = await supabase
        .from('payments')
        .select('status, student_bill_id')
        .eq('id', expiredTx.payment_id)
        .single();

      const { data: billAfter } = paymentAfter?.student_bill_id ? await supabase
        .from('student_bills')
        .select('status')
        .eq('id', paymentAfter.student_bill_id)
        .single() : { data: null };

      console.log(`  ✓ Payment status after expired webhook: ${paymentAfter?.status}`);
      console.log(`  ✓ Bill status after expired webhook: ${billAfter?.status}\n`);
    } else {
      console.log(`  ✗ Expired webhook failed: ${JSON.stringify(result)}\n`);
    }
  }

  // Test 4: Verify Midtrans webhook logic (database-level test)
  console.log('Test 4: Verify webhook handling logic in database...');
  const { data: testBills } = await supabase
    .from('student_bills')
    .select('id, status, amount')
    .in('status', ['paid', 'pending'])
    .limit(3);

  if (testBills && testBills.length > 0) {
    for (const bill of testBills) {
      const { data: validPayments } = await supabase
        .from('payments')
        .select('id, amount, status')
        .eq('student_bill_id', bill.id)
        .in('status', ['completed', 'pending']);

      const totalPaid = (validPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const expectedStatus = totalPaid >= Number(bill.amount) ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

      const statusMatch = bill.status === expectedStatus;
      console.log(`  Bill ${bill.id.slice(0, 8)}: status=${bill.status}, expected=${expectedStatus} ${statusMatch ? '✓' : '✗'}`);
    }
  }

  console.log('\n=== TESTS COMPLETED ===');
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
