-- Installment support schema migration
-- Adds installment scheduling fields to payment_categories and student_bills

-- payment_categories.installment_schedule: optional fixed schedule for the category
-- Example:
-- {
--   "total_installments": 3,
--   "installment_amount": 75000,
--   "installments": [
--     { "number": 1, "amount": 75000, "due_date": "2026-10-01" },
--     { "number": 2, "amount": 75000, "due_date": "2026-11-01" },
--     { "number": 3, "amount": 75000, "due_date": "2026-12-01" }
--   ]
-- }

ALTER TABLE public.payment_categories
  ADD COLUMN IF NOT EXISTS installment_schedule jsonb DEFAULT NULL;

COMMENT ON COLUMN public.payment_categories.installment_schedule IS 'Optional fixed installment schedule configuration for this category.';

-- student_bills.installment_plan: per-bill installment state
-- Example:
-- {
--   "total_installments": 3,
--   "installment_amount": 75000,
--   "paid_installments": [1],
--   "current_installment": 2,
--   "installments": [
--     { "number": 1, "amount": 75000, "due_date": "2026-10-01", "status": "paid" },
--     { "number": 2, "amount": 75000, "due_date": "2026-11-01", "status": "pending" },
--     { "number": 3, "amount": 75000, "due_date": "2026-12-01", "status": "pending" }
--   ]
-- }

ALTER TABLE public.student_bills
  ADD COLUMN IF NOT EXISTS installment_plan jsonb DEFAULT NULL;

COMMENT ON COLUMN public.student_bills.installment_plan IS 'Per-bill installment plan and progress tracking.';
