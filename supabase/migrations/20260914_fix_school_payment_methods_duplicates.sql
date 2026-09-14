-- Fix duplicate school payment methods
-- This migration adds a unique constraint and cleans up duplicates

-- First, deduplicate school_payment_methods keeping the oldest entry per (school_id, payment_method_id)
-- We keep the oldest because newer ones might have custom account info
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY school_id, payment_method_id
      ORDER BY created_at ASC
    ) AS row_num
  FROM public.school_payment_methods
)
DELETE FROM public.school_payment_methods
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.school_payment_methods
DROP CONSTRAINT IF EXISTS uq_school_payment_methods_school_payment_method;

ALTER TABLE public.school_payment_methods
ADD CONSTRAINT uq_school_payment_methods_school_payment_method
UNIQUE (school_id, payment_method_id);
