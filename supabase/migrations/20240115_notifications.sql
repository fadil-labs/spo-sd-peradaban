-- PHASE 07 — STEP 5N: NOTIFICATION SYSTEM FOUNDATION
-- This migration creates the notifications table, RLS policies, indexes,
-- and a SECURITY DEFINER function for controlled notification creation.

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  recipient_profile_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id uuid,
  action_label text,
  action_href text,
  metadata jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. CONSTRAINTS
-- ============================================

-- Notification type enum
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS chk_notification_type;
ALTER TABLE public.notifications ADD CONSTRAINT chk_notification_type
  CHECK (notification_type IN (
    'bill_created',
    'payment_created',
    'payment_completed',
    'payment_failed',
    'payment_cancelled',
    'payment_proof_submitted',
    'payment_proof_approved',
    'payment_proof_rejected',
    'gateway_payment_success',
    'general'
  ));

-- Entity type enum
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS chk_notification_entity_type;
ALTER TABLE public.notifications ADD CONSTRAINT chk_notification_entity_type
  CHECK (entity_type IN (
    'student_bill',
    'payment',
    'payment_proof',
    'payment_gateway_transaction',
    'student',
    'general'
  ));

-- If provided, read_at must be >= created_at
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS chk_notification_read_at;
ALTER TABLE public.notifications ADD CONSTRAINT chk_notification_read_at
  CHECK (read_at IS NULL OR read_at >= created_at);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_school_id
  ON public.notifications (school_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_profile_id
  ON public.notifications (recipient_profile_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read
  ON public.notifications (is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_notification_type
  ON public.notifications (notification_type);

CREATE INDEX IF NOT EXISTS idx_notifications_entity_type
  ON public.notifications (entity_type);

-- Composite index for recipient + created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_profile_id, created_at DESC, id DESC);

-- Composite index for school + created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_notifications_school_created
  ON public.notifications (school_id, created_at DESC, id DESC);

-- ============================================
-- 4. FOREIGN KEYS (SAFE DELETE BEHAVIOR)
-- ============================================

-- notifications -> schools (school_id)
-- Do NOT use CASCADE. Use RESTRICT to prevent accidental school deletion.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS fk_notifications_school;
ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_school
  FOREIGN KEY (school_id)
  REFERENCES public.schools(id)
  ON DELETE RESTRICT;

-- notifications -> profiles (recipient_profile_id)
-- If a profile is deleted, notifications should remain but recipient becomes orphaned.
-- In practice, profiles should not be deleted. Use RESTRICT.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS fk_notifications_recipient;
ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_recipient
  FOREIGN KEY (recipient_profile_id)
  REFERENCES public.profiles(id)
  ON DELETE RESTRICT;

-- ============================================
-- 5. DETERMINISTIC DEDUPLICATION
-- ============================================

-- Unique index to prevent duplicate notifications for the same source event + recipient + type
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_dedup
  ON public.notifications (school_id, recipient_profile_id, notification_type, entity_type, entity_id)
  WHERE entity_id IS NOT NULL AND entity_type IS NOT NULL;

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admin can view their own school's notifications
CREATE POLICY "notifications_select_admin_school"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() = 'admin'
    AND recipient_profile_id IN (
      SELECT id FROM public.profiles WHERE school_id = public.current_user_school_id()
    )
  );

-- Bendahara can view their own school's notifications
CREATE POLICY "notifications_select_bendahara_school"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() = 'bendahara'
    AND recipient_profile_id IN (
      SELECT id FROM public.profiles WHERE school_id = public.current_user_school_id()
    )
  );

-- Parent can view only their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    recipient_profile_id = auth.uid()
    AND school_id = public.current_user_school_id()
  );

-- Users can update only their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    recipient_profile_id = auth.uid()
    AND school_id = public.current_user_school_id()
  )
  WITH CHECK (
    recipient_profile_id = auth.uid()
    AND school_id = public.current_user_school_id()
  );

-- ============================================
-- 7. CONTROLLED NOTIFICATION CREATION (SECURITY DEFINER)
-- ============================================

-- This function allows authorized users to create notifications without
-- granting direct table INSERT access. It derives identity server-side
-- from auth.uid() and validates school membership and recipient.
CREATE OR REPLACE FUNCTION public.create_notification(
  p_school_id uuid,
  p_recipient_profile_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_action_label text DEFAULT NULL,
  p_action_href text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_profile record;
  v_recipient record;
  v_notification_id uuid;
BEGIN
  -- Derive authenticated identity server-side
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated user';
  END IF;

  -- Load caller profile
  SELECT school_id, role INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR SHARE;

  IF v_profile IS NULL OR v_profile.school_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found or incomplete';
  END IF;

  -- Validate caller school matches requested school
  IF v_profile.school_id != p_school_id THEN
    RAISE EXCEPTION 'Cross-school notification not allowed. User school: %, Requested school: %',
      v_profile.school_id, p_school_id;
  END IF;

  -- Validate recipient exists and belongs to same school
  SELECT id, school_id INTO v_recipient
  FROM public.profiles
  WHERE id = p_recipient_profile_id
  FOR SHARE;

  IF v_recipient IS NULL THEN
    RAISE EXCEPTION 'Recipient profile not found';
  END IF;

  IF v_recipient.school_id != p_school_id THEN
    RAISE EXCEPTION 'Cross-school recipient not allowed. Recipient school: %, Caller school: %',
      v_recipient.school_id, p_school_id;
  END IF;

  -- Validate notification_type against enum
  IF p_notification_type NOT IN (
    'bill_created', 'payment_created', 'payment_completed', 'payment_failed',
    'payment_cancelled', 'payment_proof_submitted', 'payment_proof_approved',
    'payment_proof_rejected', 'gateway_payment_success', 'general'
  ) THEN
    RAISE EXCEPTION 'Invalid notification_type: %', p_notification_type;
  END IF;

  -- Validate entity_type against enum if provided
  IF p_entity_type IS NOT NULL AND p_entity_type NOT IN (
    'student_bill', 'payment', 'payment_proof', 'payment_gateway_transaction', 'student', 'general'
  ) THEN
    RAISE EXCEPTION 'Invalid entity_type: %', p_entity_type;
  END IF;

  -- Validate action_href if provided: must be internal path
  IF p_action_href IS NOT NULL AND NOT p_action_href LIKE '/dashboard/%' THEN
    RAISE EXCEPTION 'Invalid action_href: must be internal dashboard path';
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (
    school_id,
    recipient_profile_id,
    notification_type,
    title,
    message,
    entity_type,
    entity_id,
    action_label,
    action_href,
    metadata
  ) VALUES (
    p_school_id,
    p_recipient_profile_id,
    p_notification_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
    p_action_label,
    p_action_href,
    p_metadata
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Grant EXECUTE to all authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification(
  uuid, uuid, text, text, text, text, uuid, text, text, jsonb
) TO authenticated;

-- ============================================
-- 8. UPDATE TRIGGER FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notifications_updated_at();

-- ============================================
-- 9. COMMENTS
-- ============================================

COMMENT ON TABLE public.notifications IS 'In-app notifications for school users. Immutable audit trail of notifications.';
COMMENT ON COLUMN public.notifications.notification_type IS 'Type of notification: bill_created, payment_created, payment_completed, etc.';
COMMENT ON COLUMN public.notifications.entity_type IS 'Type of referenced entity: student_bill, payment, payment_proof, etc.';
COMMENT ON COLUMN public.notifications.entity_id IS 'ID of the referenced entity, if applicable.';
COMMENT ON COLUMN public.notifications.action_label IS 'Label for action button/link, if applicable.';
COMMENT ON COLUMN public.notifications.action_href IS 'Internal dashboard path for navigation. Must start with /dashboard/.';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional context as JSONB. Never store secrets.';
COMMENT ON FUNCTION public.create_notification IS 'SECURITY DEFINER function for creating notifications. Derives identity from auth.uid(). Validates school and recipient membership.';
