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

async function findRemainingDuplicates() {
  const { data: schoolMethods } = await supabase
    .from('school_payment_methods')
    .select('id, school_id, payment_method_id, is_active, payment_methods (id, name, method_type), created_at')
    .order('created_at', { ascending: true });

  const groups = {};
  for (const spm of schoolMethods) {
    const key = `${spm.school_id}:${spm.payment_method_id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(spm);
  }

  for (const [key, items] of Object.entries(groups)) {
    if (items.length > 1) {
      console.log('Remaining duplicate:', key);
      for (const item of items) {
        console.log(' ', item.id.slice(0, 8), item.payment_methods?.name, 'created:', item.created_at);
      }
    }
  }
}

findRemainingDuplicates().catch(console.error);
