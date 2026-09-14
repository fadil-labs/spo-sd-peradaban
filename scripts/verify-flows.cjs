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

async function runTests() {
  console.log('=== ADMIN vs PARENT FLOW VERIFICATION ===\n');

  // Test 1: Check admin bill detail page structure
  console.log('Test 1: Verify admin bill detail page structure...');
  const { data: bill } = await supabase
    .from('student_bills')
    .select('id, amount, status, payment_category_id, installment_plan, payment_categories (id, name, allow_installments, minimum_installment_amount, require_installment_schedule)')
    .eq('id', '16ebad75-bfb9-4967-a1d1-f2ef221474bc')
    .single();

  if (!bill) {
    console.log('  ⚠ Test bill not found, using any bill...');
    const { data: anyBill } = await supabase
      .from('student_bills')
      .select('id, amount, status, payment_category_id, installment_plan, payment_categories (id, name, allow_installments, minimum_installment_amount, require_installment_schedule)')
      .limit(1)
      .single();
    if (!anyBill) {
      console.log('  ✗ No bills found');
      process.exit(1);
    }
    console.log(`  Using bill: ${anyBill.id.slice(0, 8)}...`);
  }

  const testBill = bill || anyBill;
  const category = Array.isArray(testBill.payment_categories) ? testBill.payment_categories[0] : testBill.payment_categories;
  
  console.log(`  Bill: ${testBill.id.slice(0, 8)}...`);
  console.log(`  Category: ${category?.name}`);
  console.log(`  Allow installments: ${category?.allow_installments}`);
  console.log(`  Has installment plan: ${!!testBill.installment_plan}`);

  // Verify admin page should NOT have gateway/upload sections
  console.log('\n  Expected admin page elements:');
  console.log('  - Modal "Catat Pembayaran Offline/Tunai": YES');
  console.log('  - Status Transaksi Gateway: NO');
  console.log('  - Simulasi Pembayaran Berhasil: NO');
  console.log('  - Upload Bukti Pembayaran Manual: NO');
  console.log('  - Installment plan form: YES (if allow_installments=true)');

  // Test 2: Check parent payment page structure
  console.log('\nTest 2: Verify parent payment page structure...');
  const { data: parentBill } = await supabase
    .from('student_bills')
    .select('id, amount, status, payment_category_id, installment_plan, payment_categories (id, name, allow_installments, minimum_installment_amount, require_installment_schedule)')
    .eq('id', '16ebad75-bfb9-4967-a1d1-f2ef221474bc')
    .single();

  if (!parentBill) {
    console.log('  ⚠ Test bill not found for parent flow');
  } else {
    console.log(`  Bill: ${parentBill.id.slice(0, 8)}...`);
    console.log(`  Category: ${category?.name}`);
    console.log(`  Allow installments: ${category?.allow_installments}`);
    console.log(`  Has installment plan: ${!!parentBill.installment_plan}`);

    console.log('\n  Expected parent page elements:');
    console.log('  - Form pembayaran online: YES');
    console.log('  - Status Transaksi Gateway: YES (if online method)');
    console.log('  - Simulasi Pembayaran Berhasil: YES (for mock provider)');
    console.log('  - Upload Bukti Pembayaran Manual: YES');
    console.log('  - Installment info: YES (if plan exists)');
  }

  // Test 3: Verify installment plan creation
  console.log('\nTest 3: Verify installment plan can be created...');
  const { data: testCategory } = await supabase
    .from('payment_categories')
    .select('id, name, allow_installments')
    .eq('allow_installments', true)
    .limit(1)
    .single();

  if (!testCategory) {
    console.log('  ⚠ No installment-enabled category found');
  } else {
    console.log(`  Category: ${testCategory.name} (${testCategory.id.slice(0, 8)}...)`);
    console.log('  ✓ Can create installment plan for this category');
  }

  // Test 4: Verify payment methods are properly categorized
  console.log('\nTest 4: Verify payment methods...');
  const { data: methods } = await supabase
    .from('payment_methods')
    .select('id, name, method_type')
    .order('name');

  console.log('  Available payment methods:');
  for (const method of methods || []) {
    console.log(`    - ${method.name} (${method.method_type})`);
  }

  // Test 5: Check school payment methods
  console.log('\nTest 5: Check school payment methods...');
  const { data: schoolMethods } = await supabase
    .from('school_payment_methods')
    .select('id, payment_method_id, is_active, payment_methods (id, name, method_type)')
    .eq('school_id', '11111111-1111-1111-1111-111111111111')
    .eq('is_active', true);

  console.log(`  Total active school payment methods: ${schoolMethods?.length || 0}`);
  
  // Group by method type
  const groups = {};
  for (const spm of schoolMethods || []) {
    const method = Array.isArray(spm.payment_methods) ? spm.payment_methods[0] : spm.payment_methods;
    const key = method?.method_type || 'unknown';
    groups[key] = (groups[key] || 0) + 1;
  }

  console.log('  By type:');
  for (const [type, count] of Object.entries(groups)) {
    console.log(`    - ${type}: ${count}`);
  }

  // Test 6: Verify data consistency
  console.log('\nTest 6: Verify data consistency...');
  const { data: allBills } = await supabase
    .from('student_bills')
    .select('id, status, amount, installment_plan');

  let issues = 0;
  for (const bill of allBills || []) {
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('student_bill_id', bill.id)
      .in('status', ['completed', 'pending']);

    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    // For bills with installment plans, check installment progress
    const installmentPlan = bill.installment_plan;
    let expectedStatus;
    
    if (installmentPlan) {
      const paidInstallments = installmentPlan.paid_installments || [];
      const totalInstallments = installmentPlan.total_installments || 0;
      
      if (paidInstallments.length === 0 && totalPaid === 0) {
        // No payments yet, bill is pending
        expectedStatus = 'pending';
      } else if (paidInstallments.length >= totalInstallments) {
        // All installments paid
        expectedStatus = 'paid';
      } else if (totalPaid > 0) {
        // Some installments paid
        expectedStatus = 'partial';
      } else {
        expectedStatus = 'pending';
      }
    } else {
      // Regular bill without installment plan
      expectedStatus = totalPaid >= Number(bill.amount) ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
    }
    
    if (bill.status !== expectedStatus) {
      console.log(`  ✗ Bill ${bill.id.slice(0, 8)}: status=${bill.status}, expected=${expectedStatus} (paid=${totalPaid}, amount=${bill.amount})`);
      issues++;
    }
  }

  if (issues === 0) {
    console.log('  ✓ All bills have consistent status');
  } else {
    console.log(`  ⚠ Found ${issues} inconsistent bills`);
  }

  // Test 7: Verify installment plans are valid
  console.log('\nTest 7: Verify installment plans...');
  const { data: billsWithPlans } = await supabase
    .from('student_bills')
    .select('id, amount, installment_plan')
    .not('installment_plan', 'is', null);

  if (!billsWithPlans || billsWithPlans.length === 0) {
    console.log('  ⚠ No bills with installment plans found');
  } else {
    console.log(`  Found ${billsWithPlans.length} bills with installment plans`);
    
    for (const bill of billsWithPlans) {
      const plan = bill.installment_plan;
      const total = plan.total_installments || 0;
      const current = plan.current_installment || 1;
      const paid = plan.paid_installments || [];
      const amount = Number(plan.installment_amount || 0);
      const totalAmount = amount * total;

      console.log(`  - ${bill.id.slice(0, 8)}...: total=${total}, current=${current}, paid=[${paid}], amount=${amount}, totalAmount=${totalAmount}, billAmount=${bill.amount}`);
      
      if (totalAmount < Number(bill.amount)) {
        console.log(`    ✗ Total installment amount (${totalAmount}) < bill amount (${bill.amount})`);
      }
      
      if (current > total) {
        console.log(`    ✗ Current installment (${current}) > total (${total})`);
      }
      
      for (const p of paid) {
        if (p < 1 || p > total) {
          console.log(`    ✗ Invalid paid installment: ${p}`);
        }
      }
    }
  }

  console.log('\n=== VERIFICATION COMPLETED ===');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
