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

async function checkBills() {
  console.log('=== Checking Student Bills (payable) ===');
  const { data: bills, error: billsError } = await supabase
    .from('student_bills')
    .select('id, school_id, student_id, amount, status, payment_category_id, created_at')
    .in('status', ['pending', 'partial'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (billsError) {
    console.error('Error fetching bills:', billsError);
    return;
  }

  console.log(`Found ${bills.length} payable bills:`);
  bills.forEach((bill, index) => {
    console.log(`\n${index + 1}. Bill ID: ${bill.id}`);
    console.log(`   School: ${bill.school_id}`);
    console.log(`   Student: ${bill.student_id}`);
    console.log(`   Amount: ${bill.amount}`);
    console.log(`   Status: ${bill.status}`);
    console.log(`   Category: ${bill.payment_category_id}`);
    console.log(`   Created: ${bill.created_at}`);
  });
}

checkBills().catch(console.error);
