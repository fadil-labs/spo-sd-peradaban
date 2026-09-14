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
  console.log('=== SCHOOL PAYMENT METHODS DUPLICATE FIX TEST ===\n');

  // Test 1: Check for duplicates in database
  console.log('Test 1: Checking for duplicate school payment methods...');
  const { data: schoolMethods, error } = await supabase
    .from('school_payment_methods')
    .select('id, school_id, payment_method_id, is_active, payment_methods (id, name, method_type)')
    .order('created_at', { ascending: true });

  if (error) {
    console.log('✗ Failed to fetch school payment methods:', error.message);
    process.exit(1);
  }

  console.log(`Total school payment methods: ${schoolMethods.length}\n`);

  // Group by payment_method_id to find duplicates
  const groups = {};
  for (const spm of schoolMethods) {
    const key = `${spm.school_id}:${spm.payment_method_id}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(spm);
  }

  let duplicateCount = 0;
  for (const [key, items] of Object.entries(groups)) {
    if (items.length > 1) {
      duplicateCount++;
      console.log(`  ✗ Duplicate found: ${key}`);
      console.log(`    Count: ${items.length}`);
      for (const item of items) {
        console.log(`      - ${item.id.slice(0, 8)}... | ${item.payment_methods?.name || 'unknown'} | active=${item.is_active}`);
      }
    }
  }

  if (duplicateCount === 0) {
    console.log('  ✓ No duplicates found');
  } else {
    console.log(`\n  Total duplicate groups: ${duplicateCount}`);
  }

  // Test 2: Verify unique constraint exists
  console.log('\nTest 2: Checking unique constraint...');
  const { data: constraints, error: constraintError } = await supabase
    .from('information_schema.table_constraints')
    .select('constraint_name, constraint_type')
    .eq('table_name', 'school_payment_methods')
    .eq('table_schema', 'public');

  if (constraintError) {
    console.log('✗ Failed to fetch constraints:', constraintError.message);
  } else {
    const uniqueConstraint = constraints?.find(c => c.constraint_name === 'uq_school_payment_methods_school_payment_method');
    if (uniqueConstraint) {
      console.log('  ✓ Unique constraint uq_school_payment_methods_school_payment_method exists');
    } else {
      console.log('  ✗ Unique constraint not found');
    }
  }

  // Test 3: Simulate frontend deduplication
  console.log('\nTest 3: Simulating frontend deduplication...');
  const seen = new Set();
  const unique = [];
  for (const spm of schoolMethods) {
    const key = spm.payment_method_id || spm.id;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(spm);
    }
  }

  console.log(`  Before dedup: ${schoolMethods.length} items`);
  console.log(`  After dedup: ${unique.length} items`);
  console.log(`  Removed: ${schoolMethods.length - unique.length} duplicates`);

  if (schoolMethods.length === unique.length) {
    console.log('  ✓ No duplicates to remove');
  } else {
    console.log(`  ✓ Deduplication would remove ${schoolMethods.length - unique.length} items`);
  }

  // Test 4: Verify unique list has no duplicate payment_method_ids
  console.log('\nTest 4: Verifying unique list...');
  const uniquePaymentMethodIds = new Set();
  let hasDuplicates = false;
  for (const spm of unique) {
    if (uniquePaymentMethodIds.has(spm.payment_method_id)) {
      console.log(`  ✗ Duplicate payment_method_id in unique list: ${spm.payment_method_id}`);
      hasDuplicates = true;
    }
    uniquePaymentMethodIds.add(spm.payment_method_id);
  }

  if (!hasDuplicates) {
    console.log('  ✓ Unique list has no duplicates');
  }

  // Test 5: Show sample of unique methods
  console.log('\nTest 5: Sample unique payment methods:');
  unique.slice(0, 5).forEach((spm, index) => {
    console.log(`  ${index + 1}. ${spm.payment_methods?.name || 'unknown'} (${spm.payment_methods?.method_type || 'unknown'})`);
  });

  console.log('\n=== TESTS COMPLETED ===');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
