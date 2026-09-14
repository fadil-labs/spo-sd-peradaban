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

async function verifyStoragePolicies() {
  console.log('=== VERIFYING STORAGE POLICIES ===\n');

  // Get admin profile
  const { data: admin } = await supabase
    .from('profiles')
    .select('id, school_id')
    .eq('role', 'admin')
    .limit(1)
    .single();

  if (!admin) {
    console.log('✗ No admin profile found');
    return;
  }

  console.log('Admin profile:', admin.id.slice(0, 8), '| school:', admin.school_id);

  // Test 1: Can we list files in payment-proofs bucket?
  console.log('\nTest 1: List files in payment-proofs bucket...');
  const { data: files, error: listError } = await supabase.storage
    .from('payment-proofs')
    .list('', { limit: 10 });

  if (listError) {
    console.log('  ✗ List failed:', listError.message);
  } else {
    console.log('  ✓ List successful, files:', files?.length || 0);
  }

  // Test 2: Can we generate signed URL?
  console.log('\nTest 2: Generate signed URL...');
  const { data: signedUrl, error: signError } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl('test/path.txt', 3600);

  if (signError) {
    console.log('  ✗ Sign failed:', signError.message);
  } else {
    console.log('  ✓ Signed URL generated:', signedUrl.signedUrl ? 'YES' : 'NO');
  }

  // Test 3: Can we upload a test file?
  console.log('\nTest 3: Upload test file...');
  const testPath = `test/verify-${Date.now()}.txt`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(testPath, Buffer.from('test'), {
      contentType: 'text/plain',
      upsert: false,
    });

  if (uploadError) {
    console.log('  ✗ Upload failed:', uploadError.message);
  } else {
    console.log('  ✓ Upload successful:', uploadData.path);
  }

  // Test 4: Can we download the file?
  console.log('\nTest 4: Download test file...');
  const { data: downloadData, error: downloadError } = await supabase.storage
    .from('payment-proofs')
    .download(testPath);

  if (downloadError) {
    console.log('  ✗ Download failed:', downloadError.message);
  } else {
    console.log('  ✓ Download successful');
  }

  // Cleanup
  console.log('\nCleanup: Removing test file...');
  const { error: removeError } = await supabase.storage
    .from('payment-proofs')
    .remove([testPath]);

  if (removeError) {
    console.log('  ✗ Remove failed:', removeError.message);
  } else {
    console.log('  ✓ Test file removed');
  }

  // Test 5: Verify payment proof insert works
  console.log('\nTest 5: Insert payment proof record...');
  const { data: payment } = await supabase
    .from('payments')
    .select('id, school_id')
    .eq('status', 'pending')
    .limit(1)
    .single();

  if (!payment) {
    console.log('  ⚠ No pending payments found, skipping');
  } else {
    const { data: proof, error: proofError } = await supabase
      .from('payment_proofs')
      .insert({
        school_id: payment.school_id,
        payment_id: payment.id,
        file_path: testPath,
        file_name: 'verify-test.txt',
        mime_type: 'text/plain',
        file_size: 4,
        uploaded_by: admin.id,
        status: 'pending',
      })
      .select()
      .single();

    if (proofError) {
      console.log('  ✗ Insert failed:', proofError.message);
    } else {
      console.log('  ✓ Payment proof created:', proof.id.slice(0, 8));
    }
  }

  console.log('\n=== VERIFICATION COMPLETED ===');
}

verifyStoragePolicies().catch(console.error);
