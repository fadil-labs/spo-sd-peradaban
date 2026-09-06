-- PHASE 03 — STEP 3D: SUPABASE STORAGE & PAYMENT PROOF SECURITY HARDENING
-- This migration hardens payment proof storage security.
--
-- IMPORTANT:
-- - This migration assumes base schema and previous migrations have been applied.
-- - This migration is idempotent where possible (uses IF NOT EXISTS, DROP IF EXISTS).
-- - Do NOT deploy to production without running verification tests.
-- - Storage bucket 'payment-proofs' must exist and be PRIVATE.
-- - Application code must use signed URLs for download, never public URLs.

-- ============================================
-- 1. PAYMENT_PROOFS ADDITIONAL SECURITY
-- ============================================

-- Ensure payment_proofs has school_id column for tenant isolation
-- If the column does not exist, add it
ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS school_id uuid;

-- Update existing records to populate school_id from payments
UPDATE public.payment_proofs pp
SET school_id = p.school_id
FROM public.payments p
WHERE pp.payment_id = p.id
  AND pp.school_id IS NULL;

-- Add FK: payment_proofs.school_id -> payments.school_id (with RESTRICT)
ALTER TABLE payment_proofs DROP CONSTRAINT IF EXISTS fk_payment_proofs_school;
ALTER TABLE payment_proofs ADD CONSTRAINT fk_payment_proofs_school
  FOREIGN KEY (school_id)
  REFERENCES schools(id)
  ON DELETE RESTRICT;

-- ============================================
-- 2. IMMUTABLE FIELDS ON PAYMENT_PROOFS
-- ============================================

-- payment_id, school_id, uploaded_by must be immutable after insert
CREATE OR REPLACE FUNCTION public.validate_payment_proof_immutable()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing payment_id
  IF TG_OP = 'UPDATE' AND NEW.payment_id != OLD.payment_id THEN
    RAISE EXCEPTION 'payment_id cannot be changed';
  END IF;

  -- Prevent changing school_id
  IF TG_OP = 'UPDATE' AND NEW.school_id != OLD.school_id THEN
    RAISE EXCEPTION 'school_id cannot be changed';
  END IF;

  -- Prevent changing uploaded_by
  IF TG_OP = 'UPDATE' AND NEW.uploaded_by != OLD.uploaded_by THEN
    RAISE EXCEPTION 'uploaded_by cannot be changed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_payment_proof_immutable_trigger ON payment_proofs;

CREATE TRIGGER validate_payment_proof_immutable_trigger
  BEFORE UPDATE ON payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_proof_immutable();

-- ============================================
-- 3. PAYMENT_PROOFS SCHOOL CONSISTENCY TRIGGER
-- ============================================

-- Ensure payment_proofs.school_id always matches payments.school_id
CREATE OR REPLACE FUNCTION public.validate_payment_proof_school_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    SELECT p.school_id INTO NEW.school_id
    FROM public.payments p
    WHERE p.id = NEW.payment_id;

    IF NEW.school_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine school_id for payment_proof';
    END IF;
  ELSE
    IF NEW.school_id != (SELECT p.school_id FROM public.payments p WHERE p.id = NEW.payment_id) THEN
      RAISE EXCEPTION 'payment_proofs.school_id does not match payments.school_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_payment_proof_school_consistency_trigger ON payment_proofs;

CREATE TRIGGER validate_payment_proof_school_consistency_trigger
  BEFORE INSERT OR UPDATE ON payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_proof_school_consistency();

-- ============================================
-- 4. STORAGE HELPER FUNCTIONS
-- ============================================

-- Helper: validate storage path format
CREATE OR REPLACE FUNCTION public.validate_storage_path(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_path ~ '^schools/[a-f0-9-]+/payments/[a-f0-9-]+/[a-f0-9-]+-[^/]+$'
    AND p_path NOT LIKE '%/%/%/%/%'
    AND p_path NOT LIKE '..%'
    AND p_path NOT LIKE '/%';
$$;

-- Helper: extract school_id from storage path
CREATE OR REPLACE FUNCTION public.extract_school_id_from_path(p_path text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT split_part(split_part(p_path, '/', 2), '/', 1)::uuid;
$$;

-- ============================================
-- 5. STORAGE RLS POLICIES
-- ============================================
-- NOTE: Storage RLS policies must be configured manually in Supabase Studio:
--   Storage -> payment-proofs -> Policies -> New policy
-- Because ALTER TABLE storage.objects requires superuser/owner privileges.
-- ============================================

-- ============================================
-- 6. ORPHAN DETECTION VIEWS
-- ============================================

-- View: payment proofs without corresponding storage objects
CREATE OR REPLACE VIEW public.orphan_payment_proofs AS
SELECT pp.*
FROM public.payment_proofs pp
LEFT JOIN storage.objects so ON so.bucket_id = 'payment-proofs' AND so.name = pp.file_path
WHERE so.id IS NULL;

-- View: storage objects without corresponding payment proofs
CREATE OR REPLACE VIEW public.orphan_storage_objects AS
SELECT so.*
FROM storage.objects so
LEFT JOIN public.payment_proofs pp ON pp.file_path = so.name
WHERE so.bucket_id = 'payment-proofs'
  AND pp.id IS NULL;

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE payment_proofs IS 'Payment proof metadata. Immutable record. File stored in private Supabase Storage bucket payment-proofs.';
COMMENT ON COLUMN payment_proofs.payment_id IS 'Immutable. FK to payments.id.';
COMMENT ON COLUMN payment_proofs.school_id IS 'Immutable. Derived from payments.school_id. Tenant boundary.';
COMMENT ON COLUMN payment_proofs.uploaded_by IS 'Immutable. FK to profiles.id.';
COMMENT ON FUNCTION public.validate_storage_path IS 'Validates payment proof storage path format. Returns true if path matches expected pattern.';
COMMENT ON FUNCTION public.extract_school_id_from_path IS 'Extracts school_id UUID from storage path. Used for RLS on storage.objects.';
COMMENT ON VIEW public.orphan_payment_proofs IS 'Payment proofs without corresponding storage objects. Use for cleanup/audit.';
COMMENT ON VIEW public.orphan_storage_objects IS 'Storage objects without corresponding payment proofs. Use for cleanup/audit.';
