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

    const { data: proof } = await supabase
      .from('payment_proofs')
      .select('id, school_id, status')
      .eq('uploaded_by', parent.id)
      .limit(1)
      .single();

    console.log('Parent ID:', parent.id);
    console.log('Proof:', JSON.stringify(proof, null, 2));

    if (!proof) {
      console.log('No proof found for parent, aborting test');
      process.exit(0);
    }

    const { data: updated, error } = await supabase
      .from('payment_proofs')
      .update({ status: 'approved', verified_by: parent.id, verified_at: new Date().toISOString() })
      .eq('id', proof.id)
      .eq('school_id', proof.school_id)
      .eq('status', 'pending')
      .select();

    console.log('Parent trying to approve:', JSON.stringify({ updated, error }, null, 2));

    const { data: proof2 } = await supabase
      .from('payment_proofs')
      .select('id, school_id, status')
      .eq('id', proof.id)
      .single();
    console.log('Proof after:', JSON.stringify(proof2, null, 2));
  } catch (e) {
    console.error('Error:', e?.message || e);
  }
})();
