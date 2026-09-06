-- PHASE 05 — STEP 5B: PAYMENT MASTER MANAGEMENT + E-WALLET + INSTALLMENT FOUNDATION
-- This migration adds method_type support and installment fields for payment categories.

-- ============================================
-- 1. PAYMENT_METHODS METHOD_TYPE
-- ============================================

ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS method_type text;

-- Method type enum validation
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS chk_payment_method_type;
ALTER TABLE payment_methods ADD CONSTRAINT chk_payment_method_type
  CHECK (method_type IS NULL OR method_type IN ('cash', 'transfer', 'e_wallet', 'virtual_account', 'other'));

COMMENT ON COLUMN payment_methods.method_type IS 'Payment method type: cash, transfer, e_wallet, virtual_account, other';

-- ============================================
-- 2. PAYMENT_CATEGORIES INSTALLMENT SUPPORT
-- ============================================

ALTER TABLE payment_categories
  ADD COLUMN IF NOT EXISTS allow_installments boolean NOT NULL DEFAULT false;

ALTER TABLE payment_categories
  ADD COLUMN IF NOT EXISTS minimum_installment_amount numeric(15,2);

ALTER TABLE payment_categories
  ADD COLUMN IF NOT EXISTS require_installment_schedule boolean NOT NULL DEFAULT false;

-- Minimum installment amount must be non-negative if set
ALTER TABLE payment_categories DROP CONSTRAINT IF EXISTS chk_minimum_installment_amount;
ALTER TABLE payment_categories ADD CONSTRAINT chk_minimum_installment_amount
  CHECK (minimum_installment_amount IS NULL OR minimum_installment_amount >= 0);

COMMENT ON COLUMN payment_categories.allow_installments IS 'Allow this payment category to be paid in installments';
COMMENT ON COLUMN payment_categories.minimum_installment_amount IS 'Minimum amount per installment when installments are allowed';
COMMENT ON COLUMN payment_categories.require_installment_schedule IS 'Require a fixed installment schedule to be defined';

-- ============================================
-- 3. SEED PAYMENT_METHODS
-- ============================================

INSERT INTO payment_methods (name, method_type, is_active)
VALUES
  ('Cash', 'cash', true),
  ('Transfer Bank', 'transfer', true),
  ('QRIS', 'e_wallet', true),
  ('GoPay', 'e_wallet', true),
  ('OVO', 'e_wallet', true),
  ('DANA', 'e_wallet', true),
  ('ShopeePay', 'e_wallet', true),
  ('LinkAja', 'e_wallet', true),
  ('Virtual Account', 'virtual_account', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. COMMENTS
-- ============================================

COMMENT ON TABLE payment_methods IS 'Global payment methods. method_type categorizes methods for e-wallet, transfer, cash, etc.';
COMMENT ON TABLE payment_categories IS 'School-scoped payment categories. Supports installment configuration.';
COMMENT ON TABLE school_payment_methods IS 'School-specific enabled payment methods.';
