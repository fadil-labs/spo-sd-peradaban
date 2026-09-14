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

async function diagnose() {
  // Use a known pending payment proof
  const proofId = '1f8dca02-50b6-4b11-99f8-ddf7ff895693';

  // 1) Revert to pending so we can test approve path cleanly
  await supabase
    .from('payment_proofs')
    .update({ status: 'pending', verified_by: null, verified_at: null, rejection_reason: null })
    .eq('id', proofId);

  const { data: proof } = await supabase
    .from('payment_proofs')
    .select('id, school_id, status, payment_id, file_path')
    .eq('id', proofId)
    .single();

  console.log('Proof:', proof);

  // 2) Test approve
  console.log('\nTest approve:');
  const { data: approved, error: approveError } = await supabase
    .from('payment_proofs')
    .update({
      status: 'approved',
      verified_by: '87b3bf52-ebe9-4e27-9029-59553f8ced5d',
      verified_at: new Date().toISOString(),
    })
    .eq('id', proofId)
    .eq('school_id', proof.school_id)
    .eq('status', 'pending')
    .select();

  if (approveError) {
    console.log('  Approve failed:', approveError.message);
  } else {
    console.log('  Approve success:', approved && approved[0] ? approved[0].status : null);
  }

  // 3) Test reject
  console.log('\nTest reject:');
  const { data: rejected, error: rejectError } = await supabase
    .from('payment_proofs')
    .update({
      status: 'rejected',
      verified_by: '87b3bf52-ebe9-4e27-9029-59553f8ced5d',
      verified_at: new Date().toISOString(),
      rejection_reason: 'Test reject',
    })
    .eq('id', proofId)
    .eq('school_id', proof.school_id)
    .eq('status', 'approved')
    .select();

  if (rejectError) {
    console.log('  Reject failed:', rejectError.message);
  } else {
    console.log('  Reject success:', rejected && rejected[0] ? rejected[0].status : null);
  }

  // 4) Test parent insert
  console.log('\nTest parent insert:');
  const { data: payment } = await supabase
    .from('payments')
    .select('id, school_id, student_id')
    .eq('status', 'pending')
    .limit(1)
    .single();

  const { data: inserted, error: insertError } = await supabase
    .from('payment_proofs')
    .insert({
      school_id: payment.school_id,
      payment_id: payment.id,
      file_path: 'test/parent-diagnostic.txt',
      file_name: 'parent-diagnostic.txt',
      mime_type: 'text/plain',
      file_size: 123,
      uploaded_by: '755ad1cf-9801-4e07-8316-8139db0981d4',
      status: 'pending',
    })
    .select();

  if (insertError) {
    console.log('  Parent insert failed:', insertError.message);
  } else {
    console.log('  Parent insert success:', inserted && inserted[0] ? inserted[0].id : null);
  }

  // 5) Test signed URL
  console.log('\nTest signed URL:');
  const testPath = proof.file_path;
  const { data: signedUrl, error: signedError } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(testPath, 3600);

  if (signedError) {
    console.log('  Signed URL failed:', signedError.message);
  } else {
    console.log('  Signed URL success:', signedUrl ? 'YES' : 'NO');
  }

  // 6) Test download
  console.log('\nTest download:');
  const { data: downloadData, error: downloadError } = await supabase.storage
    .from('payment-proofs')
    .download(testPath);

  if (downloadError) {
    console.log('  Download failed:', downloadError.message);
  } else {
    console.log('  Download success:', downloadData ? 'YES' : 'NO');
  }

  console.log('\n=== DIAGNOSIS COMPLETED ===');
}

diagnose().catch(console.error);
