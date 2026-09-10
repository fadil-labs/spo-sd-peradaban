-- ============================================
-- PAYMENT METHODS FULL SETUP (FINAL FIX)
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Clean up duplicate school_payment_methods
-- Keep only the first entry per school_id + payment_method_id
DELETE FROM public.school_payment_methods a
USING public.school_payment_methods b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.payment_method_id = b.payment_method_id;

-- 2. Fix Kartu Kredit/Debit method_type to 'other' to satisfy check constraint
UPDATE public.payment_methods
SET method_type = 'other'
WHERE name = 'Kartu Kredit/Debit' AND method_type = 'card';

-- 3. Ensure all payment methods exist in payment_methods table
INSERT INTO public.payment_methods (name, method_type, is_active)
VALUES
  ('Cash', 'cash', true),
  ('Transfer Bank', 'transfer', true),
  ('QRIS', 'e_wallet', true),
  ('GoPay', 'e_wallet', true),
  ('OVO', 'e_wallet', true),
  ('DANA', 'e_wallet', true),
  ('ShopeePay', 'e_wallet', true),
  ('LinkAja', 'e_wallet', true),
  ('Virtual Account', 'virtual_account', true),
  ('Kartu Kredit/Debit', 'other', true),
  ('Manual/Transfer', 'other', true)
ON CONFLICT DO NOTHING;

-- 4. Enable ALL payment methods for the school
INSERT INTO public.school_payment_methods (id, school_id, payment_method_id, is_active)
SELECT gen_random_uuid(), '11111111-1111-1111-1111-111111111111', pm.id, true
FROM public.payment_methods pm
WHERE pm.is_active = true
ON CONFLICT DO NOTHING;

-- 5. Verify result - should show exactly one row per method
SELECT 
  pm.name,
  pm.method_type,
  pm.is_active as global_active,
  spm.is_active as school_enabled
FROM public.payment_methods pm
LEFT JOIN public.school_payment_methods spm 
  ON spm.payment_method_id = pm.id 
  AND spm.school_id = '11111111-1111-1111-1111-111111111111'
ORDER BY pm.name;
