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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('=== Checking Recent Payments ===');
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, school_id, student_id, amount, status, payment_method_id, school_payment_method_id, idempotency_key, created_at, student_bill_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  } else {
    console.log('Recent payments:', JSON.stringify(payments, null, 2));
  }

  console.log('\n=== Checking Recent Gateway Transactions ===');
  const { data: gatewayTx, error: gatewayError } = await supabase
    .from('payment_gateway_transactions')
    .select('id, school_id, payment_id, provider, external_order_id, provider_status, payment_method_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (gatewayError) {
    console.error('Error fetching gateway transactions:', gatewayError);
  } else {
    console.log('Recent gateway transactions:', JSON.stringify(gatewayTx, null, 2));
  }

  console.log('\n=== Checking Payment Methods ===');
  const { data: methods, error: methodsError } = await supabase
    .from('payment_methods')
    .select('id, name, method_type, is_active')
    .order('name');

  if (methodsError) {
    console.error('Error fetching payment methods:', methodsError);
  } else {
    console.log('Payment methods:', JSON.stringify(methods, null, 2));
  }

  console.log('\n=== Checking School Payment Methods ===');
  const { data: schoolMethods, error: schoolMethodsError } = await supabase
    .from('school_payment_methods')
    .select('id, school_id, is_active, payment_methods(id, name, method_type, is_active)')
    .limit(5);

  if (schoolMethodsError) {
    console.error('Error fetching school payment methods:', schoolMethodsError);
  } else {
    console.log('School payment methods:', JSON.stringify(schoolMethods, null, 2));
  }
}

checkData().catch(console.error);
