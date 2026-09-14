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
    const { data: parent } = await supabase
      .from('profiles')
      .select('id, school_id')
      .eq('role', 'orang_tua')
      .limit(1)
      .single();

    const { data: payment } = await supabase
      .from('payments')
      .select('id, school_id, student_id')
      .eq('status', 'pending')
      .limit(1)
      .single();

    console.log('Parent:', JSON.stringify(parent, null, 2));
    console.log('Payment:', JSON.stringify(payment, null, 2));

    if (!parent || !payment) {
      console.log('Missing parent or payment, aborting test');
      process.exit(0);
    }

    const storagePath = `${parent.school_id}/${payment.id}/${Date.now()}.jpg`;
    const testImage = Buffer.from('fake-image');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(storagePath, testImage, { contentType: 'image/jpeg', upsert: false });

    console.log('Upload:', JSON.stringify({ uploadData, uploadError }, null, 2));

    const { data: proof, error: insertError } = await supabase
      .from('payment_proofs')
      .insert({
        school_id: payment.school_id,
        payment_id: payment.id,
        file_path: storagePath,
        file_name: 'test-upload.jpg',
        mime_type: 'image/jpeg',
        file_size: testImage.length,
        uploaded_by: parent.id,
        status: 'pending',
      })
      .select()
      .single();

    console.log('Insert proof:', JSON.stringify({ proof, insertError }, null, 2));
  } catch (e) {
    console.error('Error:', e?.message || e);
  }
})();
