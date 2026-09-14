const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const content = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) env[key.trim()] = valueParts.join('=').trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT proname FROM pg_proc WHERE proname IN ('current_user_school_id', 'current_user_role')"
    });
    console.log('Functions:', JSON.stringify(data, null, 2));
    console.log('Error:', error?.message);
  } catch (e) {
    console.error('Error:', e?.message || e);
  }
})();
