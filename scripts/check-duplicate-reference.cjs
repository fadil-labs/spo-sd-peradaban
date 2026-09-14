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

async function checkReference() {
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
      const duplicateId = items[1].id;
      console.log('Checking duplicate:', duplicateId);
      
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, status, school_payment_method_id')
        .eq('school_payment_method_id', duplicateId);

      console.log('Payments referencing this duplicate:', payments?.length || 0);
      if (payments && payments.length > 0) {
        console.log('Payment IDs:', payments.map(p => p.id.slice(0, 8)));
      }
    }
  }
}

checkReference().catch(console.error);
