# Test & Verification Guide for Webhook Fix

## Automated Test Script

Jalankan script verifikasi otomatis:

```bash
node scripts/test-webhook-fix.cjs
```

Script ini akan:
1. Cek konsistensi bill status dengan payments
2. Verifikasi semua paid bills memiliki supporting payments
3. Cek consistency payment_gateway_transactions dengan payments
4. Cek apakah ada expired transactions yang masih memiliki completed payments

## Manual Migration

Jika Test 5 menunjukkan adanya expired transactions dengan completed payments, jalankan migration berikut di Supabase SQL Editor:

```sql
-- File: supabase/migrations/20260913_fix_payment_status_transitions.sql

CREATE OR REPLACE FUNCTION public.validate_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status IN ('completed', 'failed', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'completed' AND NEW.status IN ('refunded', 'cancelled', 'failed') THEN
    RETURN NEW;
  ELSIF OLD.status = 'failed' AND NEW.status IN ('pending', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Terminal state cannot be changed.', OLD.status, NEW.status;
  ELSIF OLD.status = 'refunded' THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Terminal state cannot be changed.', OLD.status, NEW.status;
  ELSE
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payment_status_transition ON public.payments;
CREATE TRIGGER trg_validate_payment_status_transition
  BEFORE UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_payment_status_transition();
```

## Manual Data Fix

Jika ada bill yang statusnya tidak konsisten, jalankan:

```bash
node scripts/fix-bill-statuses.cjs
```

Ini akan:
1. Scan semua bill dengan status pending/partial/overdue
2. Hitung total paid dari payments dengan status completed/pending
3. Update bill status sesuai perhitungan

## End-to-End Webhook Test

### Test 1: Mock Webhook Success

1. Buat payment via gateway dengan provider `mock`
2. Dapatkan `external_order_id`
3. Kirim webhook success:

```bash
curl -X POST http://localhost:3000/api/webhooks/payment/mock \
  -H "Content-Type: application/json" \
  -H "x-mock-signature: <SIGNATURE>" \
  -d '{
    "external_order_id": "bill-xxxxx-...",
    "status": "success",
    "amount": 221000,
    "payment_method_type": "BANK_TRANSFER"
  }'
```

Verifikasi:
```sql
-- payment_gateway_transactions: provider_status = 'success'
-- payments: status = 'completed'
-- student_bills: status = 'paid' (jika amount terpenuhi)
```

### Test 2: Mock Webhook Expired

```bash
curl -X POST http://localhost:3000/api/webhooks/payment/mock \
  -H "Content-Type: application/json" \
  -H "x-mock-signature: <SIGNATURE>" \
  -d '{
    "external_order_id": "bill-xxxxx-...",
    "status": "expired",
    "amount": 221000,
    "payment_method_type": "BANK_TRANSFER"
  }'
```

Verifikasi:
```sql
-- payment_gateway_transactions: provider_status = 'expired'
-- payments: status = 'failed'
-- student_bills: status = 'pending' (karena tidak ada payment valid lain)
```

### Test 3: Midtrans Webhook Expired

```bash
curl -X POST http://localhost:3000/api/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "bill-4b93cd64-...",
    "status_code": "200",
    "gross_amount": "765001",
    "signature_key": "<SIGNATURE>",
    "transaction_status": "expire",
    "fraud_status": "accept",
    "payment_type": "qris",
    "transaction_id": "expired-tx-123"
  }'
```

Verifikasi:
```sql
-- payment_gateway_transactions: provider_status = 'expired'
-- payments: status = 'failed'
-- student_bills: status = 'pending' atau 'partial'
```

## Expected Results

Setelah semua test berhasil:
- ✓ Tidak ada expired gateway transactions dengan completed payments
- ✓ Semua paid bills memiliki total payments >= amount
- ✓ Semua pending/partial bills memiliki total payments < amount
- ✓ Dashboard admin menunjukkan data yang akurat
