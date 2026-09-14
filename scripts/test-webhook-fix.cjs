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

async function runTests() {
  console.log('=== WEBHOOK FIX VERIFICATION TESTS ===\n');

  // Test 1: Verify current database state
  console.log('Test 1: Verify current database state...');
  const { data: bills, error: billsError } = await supabase
    .from('student_bills')
    .select('id, status, amount')
    .order('created_at', { ascending: false })
    .limit(5);

  if (billsError) {
    console.log('✗ Failed to fetch bills:', billsError.message);
    process.exit(1);
  }

  console.log('Recent bills:');
  for (const bill of bills) {
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, status')
      .eq('student_bill_id', bill.id)
      .in('status', ['completed', 'pending']);

    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const expectedStatus = totalPaid >= Number(bill.amount) ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
    const statusMatch = bill.status === expectedStatus;

    console.log(`  - ${bill.id.slice(0, 8)}... | status=${bill.status} | amount=${bill.amount} | paid=${totalPaid} | expected=${expectedStatus} ${statusMatch ? '✓' : '✗'}`);
  }

  // Test 2: Verify all paid bills have valid supporting payments
  console.log('\nTest 2: Verify all paid bills have valid supporting payments...');
  const { data: paidBills, error: paidBillsError } = await supabase
    .from('student_bills')
    .select('id, status, amount')
    .eq('status', 'paid');

  if (paidBillsError) {
    console.log('✗ Failed to fetch paid bills:', paidBillsError.message);
  } else if (paidBills.length === 0) {
    console.log('⚠ No paid bills found');
  } else {
    let allValid = true;
    for (const bill of paidBills) {
      const { data: validPayments } = await supabase
        .from('payments')
        .select('id, amount, status')
        .eq('student_bill_id', bill.id)
        .in('status', ['completed', 'pending']);

      const totalPaid = (validPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const isValid = totalPaid >= Number(bill.amount);

      if (!isValid) {
        console.log(`  ✗ Bill ${bill.id.slice(0, 8)} is paid but total paid (${totalPaid}) < amount (${bill.amount})`);
        allValid = false;
      }
    }
    if (allValid) {
      console.log(`  ✓ All ${paidBills.length} paid bills have valid supporting payments`);
    }
  }

  // Test 3: Verify pending/partial bills don't have completed payments
  console.log('\nTest 3: Verify pending/partial bills have correct payment states...');
  const { data: pendingBills, error: pendingBillsError } = await supabase
    .from('student_bills')
    .select('id, status, amount')
    .in('status', ['pending', 'partial']);

  if (pendingBillsError) {
    console.log('✗ Failed to fetch pending bills:', pendingBillsError.message);
  } else if (pendingBills.length === 0) {
    console.log('⚠ No pending/partial bills found');
  } else {
    let allValid = true;
    for (const bill of pendingBills) {
      const { data: validPayments } = await supabase
        .from('payments')
        .select('id, amount, status')
        .eq('student_bill_id', bill.id)
        .in('status', ['completed', 'pending']);

      const totalPaid = (validPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const expectedStatus = totalPaid >= Number(bill.amount) ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
      const isValid = bill.status === expectedStatus;

      if (!isValid) {
        console.log(`  ✗ Bill ${bill.id.slice(0, 8)} status=${bill.status} but expected=${expectedStatus} (paid=${totalPaid}, amount=${bill.amount})`);
        allValid = false;
      }
    }
    if (allValid) {
      console.log(`  ✓ All ${pendingBills.length} pending/partial bills have correct states`);
    }
  }

  // Test 4: Check payment_gateway_transactions consistency
  console.log('\nTest 4: Check payment_gateway_transactions consistency...');
  const { data: gwTransactions, error: gwError } = await supabase
    .from('payment_gateway_transactions')
    .select('id, provider_status, payment_id, provider')
    .eq('provider', 'mock')
    .not('payment_id', 'is', null)
    .limit(10);

  if (gwError) {
    console.log('✗ Failed to fetch gateway transactions:', gwError.message);
  } else if (!gwTransactions || gwTransactions.length === 0) {
    console.log('⚠ No mock gateway transactions found');
  } else {
    let allConsistent = true;
    for (const tx of gwTransactions) {
      const { data: payment } = await supabase
        .from('payments')
        .select('status')
        .eq('id', tx.payment_id)
        .single();

      const isConsistent = tx.provider_status === 'success' ? payment?.status === 'completed' : true;
      if (!isConsistent) {
        console.log(`  ✗ Gateway tx ${tx.id.slice(0, 8)} has provider_status=${tx.provider_status} but payment status=${payment?.status}`);
        allConsistent = false;
      }
    }
    if (allConsistent) {
      console.log(`  ✓ All ${gwTransactions.length} gateway transactions are consistent`);
    }
  }

  // Test 5: Check for expired transactions with completed payments
  console.log('\nTest 5: Check for expired transactions with completed payments...');
  const { data: expiredTxs, error: expiredTxError } = await supabase
    .from('payment_gateway_transactions')
    .select('id, provider_status, payment_id, provider')
    .eq('provider_status', 'expired')
    .not('payment_id', 'is', null)
    .limit(10);

  if (expiredTxError) {
    console.log('✗ Failed to fetch expired gateway transactions:', expiredTxError.message);
  } else if (!expiredTxs || expiredTxs.length === 0) {
    console.log('⚠ No expired gateway transactions found');
  } else {
    let allReverted = true;
    for (const tx of expiredTxs) {
      const { data: payment } = await supabase
        .from('payments')
        .select('status')
        .eq('id', tx.payment_id)
        .single();

      if (payment?.status === 'completed') {
        console.log(`  ✗ Gateway tx ${tx.id.slice(0, 8)} is expired but payment is still completed`);
        allReverted = false;
      }
    }
    if (allReverted) {
      console.log(`  ✓ All ${expiredTxs.length} expired gateway transactions have reverted payments`);
    }
  }

  console.log('\n=== TESTS COMPLETED ===');
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
