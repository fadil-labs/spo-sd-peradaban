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

async function cleanupPaymentMethods() {
  console.log('=== CLEANING UP DUPLICATE PAYMENT METHODS ===\n');

  // Step 1: Get all payment methods
  const { data: paymentMethods, error } = await supabase
    .from('payment_methods')
    .select('id, name, method_type, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.log('✗ Failed to fetch payment methods:', error.message);
    process.exit(1);
  }

  console.log(`Total payment methods: ${paymentMethods.length}`);

  // Step 2: Group by (name, method_type) and identify duplicates
  const groups = {};
  for (const pm of paymentMethods) {
    const key = `${pm.name}:${pm.method_type}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(pm);
  }

  let totalDuplicates = 0;
  for (const [key, items] of Object.entries(groups)) {
    if (items.length > 1) {
      totalDuplicates += items.length - 1;
      console.log(`\nDuplicate group: ${key}`);
      console.log(`  Count: ${items.length}`);
      for (const item of items) {
        console.log(`    - ${item.id.slice(0, 8)}... | created: ${item.created_at}`);
      }
    }
  }

  if (totalDuplicates === 0) {
    console.log('\n✓ No duplicates found in payment_methods table');
    return;
  }

  console.log(`\nTotal duplicate entries: ${totalDuplicates}`);

  // Step 3: For each duplicate group, keep the oldest and update references
  for (const [key, items] of Object.entries(groups)) {
    if (items.length <= 1) continue;

    const canonical = items[0]; // Keep the oldest
    const duplicates = items.slice(1); // Delete the rest

    console.log(`\nProcessing duplicate group: ${key}`);
    console.log(`  Canonical: ${canonical.id.slice(0, 8)}...`);

    for (const dup of duplicates) {
      console.log(`  Updating references from ${dup.id.slice(0, 8)}... to ${canonical.id.slice(0, 8)}...`);

      // Update school_payment_methods references
      const { data: updatedSpms, error: updateSpmError } = await supabase
        .from('school_payment_methods')
        .update({ payment_method_id: canonical.id })
        .eq('payment_method_id', dup.id)
        .select('id');

      if (updateSpmError) {
        console.log(`    ✗ Failed to update school_payment_methods: ${updateSpmError.message}`);
      } else {
        console.log(`    ✓ Updated ${updatedSpms?.length || 0} school_payment_methods`);
      }

      // Delete the duplicate payment method
      const { error: deleteError } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', dup.id);

      if (deleteError) {
        console.log(`    ✗ Failed to delete duplicate: ${deleteError.message}`);
      } else {
        console.log(`    ✓ Deleted duplicate ${dup.id.slice(0, 8)}...`);
      }
    }
  }

  // Step 4: Verify cleanup
  console.log('\n=== VERIFICATION ===');
  const { data: remainingMethods } = await supabase
    .from('payment_methods')
    .select('id, name, method_type')
    .order('name');

  console.log(`Remaining payment methods: ${remainingMethods?.length || 0}`);
  for (const pm of remainingMethods || []) {
    console.log(`  - ${pm.name} (${pm.method_type}): ${pm.id.slice(0, 8)}...`);
  }

  // Step 5: Check for remaining duplicates
  const remainingGroups = {};
  for (const pm of remainingMethods || []) {
    const key = `${pm.name}:${pm.method_type}`;
    remainingGroups[key] = (remainingGroups[key] || 0) + 1;
  }

  const remainingDuplicates = Object.entries(remainingGroups).filter(([key, count]) => count > 1);
  if (remainingDuplicates.length === 0) {
    console.log('\n✓ No remaining duplicates in payment_methods');
  } else {
    console.log(`\n✗ Still have ${remainingDuplicates.length} duplicate groups:`);
    remainingDuplicates.forEach(([key, count]) => {
      console.log(`  - ${key}: ${count} entries`);
    });
  }

  console.log('\n=== CLEANUP COMPLETED ===');
}

cleanupPaymentMethods().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
