-- Test script to verify payment methods setup
-- Run this AFTER setup-payment-methods.sql

-- Check payment_methods table
SELECT '=== PAYMENT METHODS ===' AS info;
SELECT id, name, method_type, is_active FROM payment_methods ORDER BY name;

-- Check school_payment_methods for this school
SELECT '=== SCHOOL PAYMENT METHODS ===' AS info;
SELECT spm.id, spm.is_active, pm.name, pm.method_type
FROM school_payment_methods spm
JOIN payment_methods pm ON pm.id = spm.payment_method_id
WHERE spm.school_id = '11111111-1111-1111-1111-111111111111'
ORDER BY pm.name;

-- Count total methods
SELECT '=== SUMMARY ===' AS info;
SELECT 
  COUNT(*) FILTER (WHERE pm.is_active = true) AS total_active_methods,
  COUNT(spm.id) FILTER (WHERE spm.is_active = true) AS total_enabled_for_school
FROM payment_methods pm
LEFT JOIN school_payment_methods spm 
  ON spm.payment_method_id = pm.id 
  AND spm.school_id = '11111111-1111-1111-1111-111111111111';
