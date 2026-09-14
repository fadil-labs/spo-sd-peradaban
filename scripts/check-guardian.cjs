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

async function checkGuardian() {
  const billId = '3139e4a8-144f-40d4-9ede-b77713d4f4d8';
  
  console.log('=== Checking Student for Bill ===');
  const { data: bill, error: billError } = await supabase
    .from('student_bills')
    .select('student_id, school_id')
    .eq('id', billId)
    .single();

  if (billError || !bill) {
    console.error('Bill not found:', billError);
    return;
  }

  console.log(`Student ID: ${bill.student_id}`);
  console.log(`School ID: ${bill.school_id}`);

  console.log('\n=== Checking Guardian Relations ===');
  const { data: guardians, error: guardianError } = await supabase
    .from('student_guardians')
    .select('guardian_profile_id, relationship')
    .eq('student_id', bill.student_id);

  if (guardianError) {
    console.error('Error:', guardianError);
    return;
  }

  console.log(`Found ${guardians.length} guardian(s):`);
  guardians.forEach((g, i) => {
    console.log(`  ${i + 1}. Guardian Profile: ${g.guardian_profile_id} (${g.relationship})`);
  });

  if (guardians.length > 0) {
    console.log('\n=== Checking Guardian Profile ===');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name')
      .eq('id', guardians[0].guardian_profile_id)
      .single();

    if (profileError) {
      console.error('Error:', profileError);
    } else {
      console.log('Profile:', JSON.stringify(profile, null, 2));
    }
  }
}

checkGuardian().catch(console.error);
