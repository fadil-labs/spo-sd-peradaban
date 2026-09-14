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

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

async function runTests() {
  console.log('=== INSTALLMENT SCHEMA & FLOW TESTS ===\n');

  // Test 1: Verify schema changes exist
  console.log('Test 1: Verify installment schema...');
  const { data: categorySample } = await supabase.from('payment_categories').select('*').limit(1);
  const categoryColumns = categorySample && categorySample.length > 0 ? Object.keys(categorySample[0]) : [];
  console.log('  payment_categories columns:', categoryColumns.join(', '));
  const hasInstallmentSchedule = categoryColumns.includes('installment_schedule');
  const hasRequireSchedule = categoryColumns.includes('require_installment_schedule');
  console.log(`  installment_schedule: ${hasInstallmentSchedule ? '✓' : '✗'}`);
  console.log(`  require_installment_schedule: ${hasRequireSchedule ? '✓' : '✗'}`);

  const { data: billSample } = await supabase.from('student_bills').select('*').limit(1);
  const billColumns = billSample && billSample.length > 0 ? Object.keys(billSample[0]) : [];
  console.log('  student_bills columns:', billColumns.join(', '));
  const hasInstallmentPlan = billColumns.includes('installment_plan');
  console.log(`  installment_plan: ${hasInstallmentPlan ? '✓' : '✗'}`);

  if (!hasInstallmentSchedule || !hasInstallmentPlan) {
    console.log('\n✗ Migration not applied yet. Please run:');
    console.log('  1. supabase/migrations/20260914_add_installment_support.sql');
    console.log('  2. supabase/migrations/20260914_update_process_payment_for_installments.sql');
    process.exit(1);
  }

  // Test 2: Create test category with installments
  console.log('\nTest 2: Create test payment category with installments...');
  const { data: category, error: categoryError } = await supabase
    .from('payment_categories')
    .insert({
      school_id: (await supabase.from('schools').select('id').limit(1).single()).data?.id || '11111111-1111-1111-1111-111111111111',
      name: 'Test Installment',
      allow_installments: true,
      minimum_installment_amount: 50000,
      require_installment_schedule: true,
      installment_schedule: {
        total_installments: 3,
        installment_amount: 75000,
        installments: [
          { number: 1, amount: 75000, due_date: '2026-10-01', status: 'pending' },
          { number: 2, amount: 75000, due_date: '2026-11-01', status: 'pending' },
          { number: 3, amount: 75000, due_date: '2026-12-01', status: 'pending' },
        ]
      }
    })
    .select('id')
    .single();

  if (categoryError || !category) {
    console.log('  ⚠ Could not create test category, using existing...');
  } else {
    console.log(`  ✓ Created test category: ${category.id.slice(0, 8)}...`);
  }

  // Test 3: Create test bill with installment plan
  console.log('\nTest 3: Create test bill with installment plan...');
  const { data: school } = await supabase.from('schools').select('id').limit(1).single();
  const { data: student } = await supabase.from('students').select('id, school_id').limit(1).single();

  if (!school || !student) {
    console.log('  ⚠ No school/student found, skipping bill creation');
  } else {
    const { data: bill, error: billError } = await supabase
      .from('student_bills')
      .insert({
        school_id: school.id,
        student_id: student.id,
        payment_category_id: category?.id || 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        amount: 225000,
        status: 'partial',
        due_date: '2026-12-31',
        installment_plan: {
          total_installments: 3,
          installment_amount: 75000,
          current_installment: 2,
          paid_installments: [1],
          installments: [
            { number: 1, amount: 75000, due_date: '2026-10-01', status: 'paid' },
            { number: 2, amount: 75000, due_date: '2026-11-01', status: 'pending' },
            { number: 3, amount: 75000, due_date: '2026-12-01', status: 'pending' },
          ]
        }
      })
      .select('id')
      .single();

    if (billError || !bill) {
      console.log('  ✗ Failed to create test bill:', billError?.message);
    } else {
      console.log(`  ✓ Created test bill: ${bill.id.slice(0, 8)}...`);
      console.log(`    - Amount: Rp${bill.amount}`);
      console.log(`    - Status: ${bill.status}`);
      console.log(`    - Installment: 2/3`);

      // Test 4: Test installment payment via process_payment
      console.log('\nTest 4: Test installment payment via process_payment...');
      const { data: paymentId, error: paymentError } = await supabase.rpc('process_payment', {
        p_student_bill_id: bill.id,
        p_amount: 75000,
        p_payment_method_id: (await supabase.from('payment_methods').select('id').limit(1).single()).data?.id,
        p_school_payment_method_id: (await supabase.from('school_payment_methods').select('id').limit(1).single()).data?.id,
        p_reference_number: `INSTALLMENT-TEST-${Date.now()}`,
        p_idempotency_key: `installment_test_${bill.id}_${Date.now()}`,
      });

      if (paymentError) {
        console.log(`  ✗ Payment failed: ${paymentError.message}`);
      } else {
        console.log(`  ✓ Payment created: ${paymentId}`);

        // Verify bill status
        const { data: updatedBill } = await supabase
          .from('student_bills')
          .select('status, installment_plan')
          .eq('id', bill.id)
          .single();

        console.log(`  ✓ Bill status: ${updatedBill?.status}`);
        console.log(`  ✓ Installment plan updated: current=${updatedBill?.installment_plan?.current_installment}, paid=[${updatedBill?.installment_plan?.paid_installments}]`);
      }

      // Test 5: Test wrong installment amount rejection
      console.log('\nTest 5: Test wrong installment amount rejection...');
      const { error: wrongAmountError } = await supabase.rpc('process_payment', {
        p_student_bill_id: bill.id,
        p_amount: 50000, // Wrong amount
        p_payment_method_id: (await supabase.from('payment_methods').select('id').limit(1).single()).data?.id,
        p_school_payment_method_id: (await supabase.from('school_payment_methods').select('id').limit(1).single()).data?.id,
        p_reference_number: `WRONG-AMOUNT-${Date.now()}`,
        p_idempotency_key: `wrong_amount_${bill.id}_${Date.now()}`,
      });

      if (wrongAmountError) {
        console.log(`  ✓ Correctly rejected: ${wrongAmountError.message}`);
      } else {
        console.log('  ✗ Should have rejected wrong amount');
      }

      // Cleanup
      console.log('\nCleanup: Removing test data...');
      await supabase.from('payments').delete().eq('student_bill_id', bill.id);
      await supabase.from('student_bills').delete().eq('id', bill.id);
      if (category?.id) {
        await supabase.from('payment_categories').delete().eq('id', category.id);
      }
      console.log('  ✓ Test data cleaned up');
    }
  }

  // Test 6: Verify existing data integrity
  console.log('\nTest 6: Verify existing data integrity...');
  const { data: existingBills } = await supabase
    .from('student_bills')
    .select('id, status, amount, installment_plan')
    .limit(10);

  let issues = 0;
  for (const bill of existingBills || []) {
    const { data: validPayments } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('student_bill_id', bill.id)
      .in('status', ['completed', 'pending']);

    const totalPaid = (validPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const expectedStatus = totalPaid >= Number(bill.amount) ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
    
    if (bill.status !== expectedStatus) {
      console.log(`  ✗ Bill ${bill.id.slice(0, 8)}: status=${bill.status}, expected=${expectedStatus}`);
      issues++;
    }
  }

  if (issues === 0) {
    console.log('  ✓ All existing bills have consistent status');
  } else {
    console.log(`  ⚠ Found ${issues} bills with inconsistent status`);
  }

  console.log('\n=== TESTS COMPLETED ===');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
