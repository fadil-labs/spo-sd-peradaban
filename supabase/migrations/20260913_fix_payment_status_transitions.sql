-- Fix payment status transition to allow webhook reversions
-- This allows payments to transition from completed -> failed/cancelled
-- when payment gateway webhooks indicate transaction expiration/cancellation

CREATE OR REPLACE FUNCTION public.validate_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status hasn't changed, allow
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  -- pending -> completed, failed, cancelled
  IF OLD.status = 'pending' AND NEW.status IN ('completed', 'failed', 'cancelled') THEN
    RETURN NEW;
  -- completed -> refunded, cancelled, failed (allow webhook reversions)
  ELSIF OLD.status = 'completed' AND NEW.status IN ('refunded', 'cancelled', 'failed') THEN
    RETURN NEW;
  -- failed -> completed, pending, cancelled (allow webhook re-success or retry)
  ELSIF OLD.status = 'failed' AND NEW.status IN ('completed', 'pending', 'cancelled') THEN
    RETURN NEW;
  -- cancelled -> (no transitions - terminal state)
  ELSIF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Terminal state cannot be changed.', OLD.status, NEW.status;
  -- refunded -> (no transitions - terminal state)
  ELSIF OLD.status = 'refunded' THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Terminal state cannot be changed.', OLD.status, NEW.status;
  ELSE
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure it uses the new function
DROP TRIGGER IF EXISTS trg_validate_payment_status_transition ON public.payments;
CREATE TRIGGER trg_validate_payment_status_transition
  BEFORE UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_payment_status_transition();
