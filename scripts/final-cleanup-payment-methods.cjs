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

async function finalCleanup() {
  console.log('=== FINAL CLEANUP OF DUPLICATE PAYMENT METHODS ===\n');

  // Step 1: Get all payment methods
  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('id, name, method_type, created_at')
    .order('created_at', { ascending: true });

  // Group by (name, method_type)
  const groups = {};
  for (const pm of paymentMethods) {
    const key = `${pm.name}:${pm.method_type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(pm);
  }

  // Step 2: For each duplicate group, keep the oldest
  for (const [key, items] of Object.entries(groups)) {
    if (items.length <= 1) continue;

    const canonical = items[0];
    const duplicates = items.slice(1);

    console.log(`Processing: ${key}`);
    console.log(`  Canonical: ${canonical.id.slice(0, 8)}...`);

    for (const dup of duplicates) {
      // Update school_payment_methods
      const { data: updatedSpms } = await supabase
        .from('school_payment_methods')
        .update({ payment_method_id: canonical.id })
        .eq('payment_method_id', dup.id)
        .select('id');

      console.log(`  Updated ${updatedSpms?.length || 0} school_payment_methods`);

      // Try to delete duplicate
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', dup.id);

      if (error) {
        console.log(`  ⚠ Cannot delete ${dup.id.slice(0, 8)}... (referenced by payments)`);
        console.log(`    This duplicate will remain but won't appear in dropdown due to frontend dedup`);
      } else {
        console.log(`  ✓ Deleted ${dup.id.slice(0, 8)}...`);
      }
    }
  }

  // Step 3: Verify final state
  console.log('\n=== FINAL STATE ===');
  const { data: finalMethods } = await supabase
    .from('payment_methods')
    .select('id, name, method_type')
    .order('name');

  console.log(`Total payment methods: ${finalMethods?.length || 0}`);
  
  const finalGroups = {};
  for (const pm of finalMethods || []) {
    const key = `${pm.name}:${pm.method_type}`;
    finalGroups[key] = (finalGroups[key] || 0) + 1;
  }

  const finalDuplicates = Object.entries(finalGroups).filter(([key, count]) => count > 1);
  if (finalDuplicates.length === 0) {
    console.log('✓ No duplicates in payment_methods');
  } else {
    console.log(`⚠ Still have ${finalDuplicates.length} duplicate groups (referenced by payments):`);
    finalDuplicates.forEach(([key, count]) => {
      console.log(`  - ${key}: ${count} entries`);
    });
  }

  // Step 4: Verify school_payment_methods
  console.log('\n=== SCHOOL PAYMENT METHODS ===');
  const { data: schoolMethods } = await supabase
    .from('school_payment_methods')
    .select('id, payment_method_id, payment_methods (name, method_type)')
    .order('created_at');

  console.log(`Total school payment methods: ${schoolMethods?.length || 0}`);

  // Simulate frontend deduplication
  const seen = new Set();
  const unique = [];
  for (const spm of schoolMethods || []) {
    const key = spm.payment_method_id || spm.id;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(spm);
    }
  }

  console.log(`Unique after dedup: ${unique.length}`);
  console.log('Unique methods:');
  unique.forEach((spm, index) => {
    console.log(`  ${index + 1}. ${spm.payment_methods?.name} (${spm.payment_methods?.method_type})`);
  });

  console.log('\n=== CLEANUP COMPLETED ===');
}

finalCleanup().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
