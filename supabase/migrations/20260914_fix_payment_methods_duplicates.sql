-- Fix duplicate payment methods
-- This migration deduplicates the payment_methods table and updates references

-- Step 1: Identify canonical payment methods (oldest per name+method_type)
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_payment_methods()
RETURNS void AS $$
DECLARE
  v_canonical_id uuid;
  v_duplicate_id uuid;
BEGIN
  -- Loop through each duplicate group (name, method_type)
  FOR v_canonical_id, v_duplicate_id IN
    SELECT 
      MIN(id) AS canonical_id,
      STRING_AGG(id::text, ',') AS duplicate_ids
    FROM public.payment_methods
    GROUP BY name, method_type
    HAVING COUNT(*) > 1
  LOOP
    -- Update school_payment_methods to use canonical ID
    UPDATE public.school_payment_methods
    SET payment_method_id = v_canonical_id
    WHERE payment_method_id = v_duplicate_id::uuid;
    
    -- Delete the duplicate payment method
    DELETE FROM public.payment_methods
    WHERE id = v_duplicate_id::uuid;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the cleanup
SELECT public.cleanup_duplicate_payment_methods();

-- Drop the function after use
DROP FUNCTION IF EXISTS public.cleanup_duplicate_payment_methods();

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.payment_methods
DROP CONSTRAINT IF EXISTS uq_payment_methods_name_method_type;

ALTER TABLE public.payment_methods
ADD CONSTRAINT uq_payment_methods_name_method_type
UNIQUE (name, method_type);
