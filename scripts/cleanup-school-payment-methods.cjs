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

async function cleanupDuplicates() {
  console.log('=== CLEANING UP DUPLICATE SCHOOL PAYMENT METHODS ===\n');

  // Get all school payment methods
  const { data: schoolMethods, error } = await supabase
    .from('school_payment_methods')
    .select('id, school_id, payment_method_id, is_active, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.log('✗ Failed to fetch school payment methods:', error.message);
    process.exit(1);
  }

  console.log(`Total school payment methods: ${schoolMethods.length}`);

  // Group by (school_id, payment_method_id) and keep only the oldest
  const groups = {};
  for (const spm of schoolMethods) {
    const key = `${spm.school_id}:${spm.payment_method_id}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(spm);
  }

  let deletedCount = 0;
  for (const [key, items] of Object.entries(groups)) {
    if (items.length > 1) {
      // Keep the oldest, delete the rest
      const toDelete = items.slice(1);
      for (const item of toDelete) {
        const { error: deleteError } = await supabase
          .from('school_payment_methods')
          .delete()
          .eq('id', item.id);

        if (deleteError) {
          console.log(`  ✗ Failed to delete ${item.id.slice(0, 8)}...: ${deleteError.message}`);
        } else {
          console.log(`  ✓ Deleted duplicate ${item.id.slice(0, 8)}... (${items[0].payment_method_id.slice(0, 8)}...)`);
          deletedCount++;
        }
      }
    }
  }

  console.log(`\n✓ Deleted ${deletedCount} duplicate school payment methods`);

  // Verify cleanup
  const { data: remaining } = await supabase
    .from('school_payment_methods')
    .select('id, school_id, payment_method_id');

  console.log(`Remaining school payment methods: ${remaining?.length || 0}`);

  // Check for remaining duplicates
  const remainingGroups = {};
  for (const spm of remaining || []) {
    const key = `${spm.school_id}:${spm.payment_method_id}`;
    remainingGroups[key] = (remainingGroups[key] || 0) + 1;
  }

  const remainingDuplicates = Object.entries(remainingGroups).filter(([key, count]) => count > 1);
  if (remainingDuplicates.length === 0) {
    console.log('✓ No remaining duplicates');
  } else {
    console.log(`✗ Still have ${remainingDuplicates.length} duplicate groups`);
  }

  console.log('\n=== CLEANUP COMPLETED ===');
}

cleanupDuplicates().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
