-- ============================================
-- PAYMENT METHODS FULL SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Seed all payment methods if not exist
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
  ('Kartu Kredit/Debit', 'card', true),
  ('Manual/Transfer', 'other', true)
ON CONFLICT DO NOTHING;

-- 2. Enable ALL payment methods for the school
-- Replace SCHOOL_ID below with your actual school ID
INSERT INTO public.school_payment_methods (id, school_id, payment_method_id, is_active)
SELECT gen_random_uuid(), '11111111-1111-1111-1111-111111111111', pm.id, true
FROM public.payment_methods pm
WHERE pm.is_active = true
ON CONFLICT DO NOTHING;

-- 3. Verify result
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
