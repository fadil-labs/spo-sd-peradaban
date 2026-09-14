const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function testApprove(proof) {
  console.log('Testing APPROVE action...');
  
  const { data, error } = await supabase
    .from('payment_proofs')
    .update({ 
      status: 'approved', 
      verified_by: '87b3bf52-ebe9-4e27-9029-59553f8ced5d', 
      verified_at: new Date().toISOString()
    })
    .eq('id', proof.id)
    .eq('school_id', proof.school_id)
    .eq('status', 'pending')
    .select();

  if (error) {
    console.log('  APPROVE FAILED:', error.message);
    console.log('  Details:', error.details);
    console.log('  Hint:', error.hint);
    console.log('  Code:', error.code);
  } else {
    console.log('  APPROVE SUCCESS:', data[0]?.status);
  }
}

async function checkConstraints() {
  const { data: proofs } = await supabase
    .from('payment_proofs')
    .select('id, school_id, status, file_path, file_name, mime_type, file_size, uploaded_by')
    .limit(1);

  if (!proofs || proofs.length === 0) {
    console.log('No payment proofs found, creating test data...');
    
    const { data: payment } = await supabase
      .from('payments')
      .select('id, school_id')
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (!payment) {
      console.log('No pending payments found');
      return;
    }

    const { data: proof, error } = await supabase
      .from('payment_proofs')
      .insert({
        school_id: payment.school_id,
        payment_id: payment.id,
        file_path: 'test/approve-test.txt',
        file_name: 'approve-test.txt',
        mime_type: 'text/plain',
        file_size: 123,
        uploaded_by: '755ad1cf-9801-4e07-8316-8139db0981d4',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.log('Failed to create test proof:', error.message);
      return;
    }

    console.log('Created test proof:', proof.id);
    await testApprove(proof);
  } else {
    const proof = proofs[0];
    console.log('Using existing proof:', proof.id, 'status:', proof.status);
    
    if (proof.status !== 'pending') {
      await supabase
        .from('payment_proofs')
        .update({ status: 'pending', verified_by: null, verified_at: null, rejection_reason: null })
        .eq('id', proof.id);
      console.log('Reset to pending');
    }
    
    await testApprove(proof);
  }
}

checkConstraints().catch(console.error);
