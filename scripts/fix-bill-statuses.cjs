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

async function fixBillStatuses() {
  console.log('=== FIX BILL STATUSES ===\n');

  // Get all bills that are not paid/cancelled
  const { data: bills, error: billsError } = await supabase
    .from('student_bills')
    .select('id, status, amount')
    .in('status', ['pending', 'partial', 'overdue']);

  if (billsError) {
    console.log('✗ Failed to fetch bills:', billsError.message);
    process.exit(1);
  }

  console.log(`Found ${bills.length} bills to check...\n`);

  let fixedCount = 0;
  for (const bill of bills) {
    const { data: validPayments } = await supabase
      .from('payments')
      .select('id, amount, status')
      .eq('student_bill_id', bill.id)
      .in('status', ['completed', 'pending']);

    const totalPaid = (validPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const expectedStatus = totalPaid >= Number(bill.amount) ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

    if (bill.status !== expectedStatus) {
      console.log(`Fixing bill ${bill.id.slice(0, 8)}...`);
      console.log(`  Current: ${bill.status}, Expected: ${expectedStatus}, Paid: ${totalPaid}, Amount: ${bill.amount}`);

      const { error: updateError } = await supabase
        .from('student_bills')
        .update({ status: expectedStatus, updated_at: new Date().toISOString() })
        .eq('id', bill.id);

      if (updateError) {
        console.log(`  ✗ Failed to update: ${updateError.message}`);
      } else {
        console.log(`  ✓ Updated to ${expectedStatus}`);
        fixedCount++;
      }
    }
  }

  console.log(`\n✓ Fixed ${fixedCount} bills`);
}

fixBillStatuses().catch(err => {
  console.error('Fix runner error:', err);
  process.exit(1);
});
