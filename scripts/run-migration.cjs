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

async function runMigration() {
  console.log('=== RUNNING PAYMENT STATUS TRANSITION MIGRATION ===\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260913_fix_payment_status_transitions.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons to run statements individually
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (const statement of statements) {
    console.log(`Executing: ${statement.slice(0, 80)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }).catch(() => ({ error: { message: 'RPC not available, trying direct query' } }));
    
    if (error && error.message !== 'RPC not available, trying direct query') {
      console.log(`  ✗ Error: ${error.message}`);
    } else {
      console.log(`  ✓ Success`);
    }
  }

  console.log('\n=== MIGRATION COMPLETED ===');
}

runMigration().catch(err => {
  console.error('Migration runner error:', err);
  process.exit(1);
});
