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

async function fixDuplicateReference() {
  console.log('=== FIXING DUPLICATE QRIS REFERENCE ===\n');

  const duplicateId = 'c828c06f-5d01-47fc-912b-b67cff973f8f';
  const originalId = 'a319c564-43f4-4932-bd50-95c40fea4591';

  // Find all payments referencing the duplicate
  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, amount, status, school_payment_method_id')
    .eq('school_payment_method_id', duplicateId);

  if (error) {
    console.log('✗ Failed to fetch payments:', error.message);
    process.exit(1);
  }

  console.log(`Found ${payments?.length || 0} payments referencing duplicate QRIS method`);

  if (!payments || payments.length === 0) {
    console.log('No payments to update');
    return;
  }

  // Update payments to reference the original
  for (const payment of payments) {
    const { error: updateError } = await supabase
      .from('payments')
      .update({ school_payment_method_id: originalId })
      .eq('id', payment.id);

    if (updateError) {
      console.log(`✗ Failed to update payment ${payment.id.slice(0, 8)}...: ${updateError.message}`);
    } else {
      console.log(`✓ Updated payment ${payment.id.slice(0, 8)}... to original QRIS method`);
    }
  }

  // Now delete the duplicate
  const { error: deleteError } = await supabase
    .from('school_payment_methods')
    .delete()
    .eq('id', duplicateId);

  if (deleteError) {
    console.log(`✗ Failed to delete duplicate: ${deleteError.message}`);
  } else {
    console.log(`✓ Deleted duplicate QRIS method ${duplicateId.slice(0, 8)}...`);
  }

  // Verify
  const { data: remaining } = await supabase
    .from('school_payment_methods')
    .select('id, payment_method_id, payment_methods (name)')
    .eq('payment_method_id', '38d75d95-53fb-46c3-be8a-bbde90b0bce8');

  console.log(`\nRemaining QRIS methods: ${remaining?.length || 0}`);
  for (const spm of remaining || []) {
    console.log(`  - ${spm.id.slice(0, 8)}... | ${spm.payment_methods?.name}`);
  }

  console.log('\n=== FIX COMPLETED ===');
}

fixDuplicateReference().catch(err => {
  console.error('Fix error:', err);
  process.exit(1);
});
