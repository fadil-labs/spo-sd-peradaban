const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const fs = require('fs');
  const path = require('path');
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

async function runTests() {
  console.log('=== ADMIN PAYMENT FLOW TEST ===\n');

  // Test 1: Find a test bill
  console.log('Test 1: Finding test bill...');
  const { data: bill } = await supabase
    .from('student_bills')
    .select('id, status, amount, student_id, school_id')
    .neq('status', 'paid')
    .limit(1)
    .single();

  if (!bill) {
    console.log('⚠ No payable bill found, getting any bill...');
    const { data: anyBill } = await supabase
      .from('student_bills')
      .select('id, status, amount, student_id, school_id')
      .limit(1)
      .single();

    if (!anyBill) {
      console.log('✗ No bills found at all');
      process.exit(1);
    }
    console.log(`Using bill: ${anyBill.id.slice(0, 8)}... (status: ${anyBill.status})`);
  } else {
    console.log(`Found bill: ${bill.id.slice(0, 8)}... (status: ${bill.status}, amount: ${bill.amount})`);
  }

  // Test 2: Get school payment methods (simulating BillDetailClient fetch)
  console.log('\nTest 2: Getting school payment methods...');
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('role', 'admin')
    .limit(1)
    .single();

  if (!profile) {
    console.log('✗ No admin profile found');
    process.exit(1);
  }

  const { data: schoolPaymentMethods } = await supabase
    .from('school_payment_methods')
    .select('id, payment_method_id, is_active, payment_methods (id, name, method_type)')
    .eq('school_id', profile.school_id)
    .eq('is_active', true);

  console.log(`Found ${schoolPaymentMethods?.length || 0} school payment methods`);

  // Simulate frontend deduplication
  const seen = new Set();
  const uniqueMethods = [];
  for (const spm of schoolPaymentMethods || []) {
    const key = spm.payment_method_id || spm.id;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMethods.push(spm);
    }
  }

  console.log(`After deduplication: ${uniqueMethods.length} unique methods`);
  console.log('Available payment methods:');
  uniqueMethods.forEach((spm, index) => {
    console.log(`  ${index + 1}. ${spm.payment_methods?.name || 'unknown'} (${spm.payment_methods?.method_type || 'unknown'})`);
  });

  if (uniqueMethods.length === 0) {
    console.log('✗ No payment methods available');
    process.exit(1);
  }

  // Test 3: Simulate admin payment submission
  console.log('\nTest 3: Simulating admin payment submission...');
  
  const targetBill = bill || anyBill;
  const selectedMethod = uniqueMethods[0];
  const paymentAmount = 100000; // Test amount
  const referenceNumber = `TEST-${Date.now()}`;
  const idempotencyKey = `pay_test_${targetBill.id}_${Date.now()}`;

  console.log(`Creating payment for bill ${targetBill.id.slice(0, 8)}...`);
  console.log(`  Amount: Rp${paymentAmount}`);
  console.log(`  Method: ${selectedMethod.payment_methods?.name}`);
  console.log(`  Reference: ${referenceNumber}`);

  // Check if bill can accept payment
  if (targetBill.status === 'paid' || targetBill.status === 'cancelled') {
    console.log('  ⚠ Bill is not payable, creating test bill...');
    
    // Create a test bill
    const { data: testBill, error: billError } = await supabase
      .from('student_bills')
      .insert({
        school_id: profile.school_id,
        student_id: targetBill.student_id,
        amount: 200000,
        status: 'pending',
        payment_category_id: 'test',
        billing_period_start: '2026-01-01',
        billing_period_end: '2026-01-31',
        due_date: '2026-01-31',
      })
      .select('id, status, amount')
      .single();

    if (billError || !testBill) {
      console.log('✗ Failed to create test bill:', billError?.message);
      process.exit(1);
    }

    console.log(`✓ Created test bill: ${testBill.id.slice(0, 8)}...`);
    targetBill.id = testBill.id;
    targetBill.amount = testBill.amount;
    targetBill.status = testBill.status;
  }

  // Create payment using process_payment RPC
  const { data: paymentId, error: paymentError } = await supabase.rpc('process_payment', {
    p_student_bill_id: targetBill.id,
    p_amount: paymentAmount,
    p_payment_method_id: selectedMethod.payment_method_id,
    p_school_payment_method_id: selectedMethod.id,
    p_reference_number: referenceNumber,
    p_idempotency_key: idempotencyKey,
  });

  if (paymentError) {
    console.log(`✗ Payment failed: ${paymentError.message}`);
    process.exit(1);
  }

  console.log(`✓ Payment created: ${paymentId}`);

  // Verify payment
  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, status, student_bill_id, reference_number')
    .eq('id', paymentId)
    .single();

  console.log(`  Payment status: ${payment?.status}`);
  console.log(`  Payment amount: Rp${payment?.amount}`);
  console.log(`  Reference: ${payment?.reference_number}`);

  // Verify bill status updated
  const { data: updatedBill } = await supabase
    .from('student_bills')
    .select('id, status, amount')
    .eq('id', targetBill.id)
    .single();

  const expectedStatus = paymentAmount >= updatedBill.amount ? 'paid' : paymentAmount > 0 ? 'partial' : 'pending';
  console.log(`\nBill status: ${updatedBill?.status} (expected: ${expectedStatus})`);

  if (updatedBill?.status === expectedStatus) {
    console.log('✓ Bill status correctly updated');
  } else {
    console.log('✗ Bill status mismatch');
  }

  // Test 4: Verify payment history
  console.log('\nTest 4: Verifying payment history...');
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, status, payment_date, reference_number')
    .eq('student_bill_id', targetBill.id)
    .order('payment_date', { ascending: false });

  console.log(`Payments for bill ${targetBill.id.slice(0, 8)}...:`);
  for (const p of payments || []) {
    console.log(`  - ${p.id.slice(0, 8)}... | Rp${p.amount} | ${p.status} | ${p.payment_date?.split('T')[0]}`);
  }

  // Test 5: Cleanup (optional)
  console.log('\nTest 5: Cleanup...');
  const { error: deleteError } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId);

  if (deleteError) {
    console.log(`✗ Failed to delete test payment: ${deleteError.message}`);
  } else {
    console.log('✓ Test payment deleted');
  }

  // If we created a test bill, delete it too
  if (targetBill.id !== bill?.id) {
    const { error: deleteBillError } = await supabase
      .from('student_bills')
      .delete()
      .eq('id', targetBill.id);

    if (deleteBillError) {
      console.log(`✗ Failed to delete test bill: ${deleteBillError.message}`);
    } else {
      console.log('✓ Test bill deleted');
    }
  }

  console.log('\n=== ADMIN PAYMENT FLOW TEST COMPLETED ===');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
