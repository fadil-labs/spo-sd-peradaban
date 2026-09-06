# 5P.1 Inventory Validation

## Finding 1: Parent UAT Data — Guardian Relationship

### Original Assessment
`parent@test.local` has no `student_guardians` records. Parent flow is BLOCKED.

### Evidence
- Operational seed specification states:
  - Parent: `parent@test.local`
  - Student: Siswa Pertama (NIS: 001)
  - Guardian relationship: parent@test.local → Siswa Pertama
- Independent database verification performed on 2026-09-03 confirmed the following record exists in `student_guardians`:
  - `student_guardians.id`: `97d46779-92cd-42be-a9a6-ea308c86007c`
  - `student_id`: `44444444-4444-4444-4444-444444444444`
  - `student`: Siswa Pertama
  - `NIS`: 001
  - `guardian_profile_id`: `755ad1cf-9801-4e07-8316-8139db0981d4`
  - `guardian`: Orang Tua Siswa 1
  - `guardian email`: parent@test.local
  - `relationship`: orang_tua
  - `school_id`: `11111111-1111-1111-1111-111111111111`
- Source code inspection shows no self-service guardian creation for `orang_tua` role. Guardian creation is admin/bendahara-only via `src/app/dashboard/admin/guardians/actions.ts`.
- The relationship is already present in the database; no seed/migration action is required.

### Validation Result
The guardian relationship for `parent@test.local` → Siswa Pertama **exists** in the database and matches the operational UAT seed. Parent flow is therefore unblocked by data setup.

### Classification
**CONFIRMED — PASS**

### Recommendation
Do NOT create any guardian relationship. The existing record already satisfies the UAT operational seed. No database or application changes are required for this finding.

---

## Finding 2: Webhook Requires Authenticated Session

### Original Assessment
"Webhook requires authenticated session — cannot receive real external gateway callbacks in production."

### Evidence
**File: `src/app/api/webhooks/payment/mock/route.ts`**
- Line 125-133: Calls `supabase.auth.getUser()` and requires valid session
- Returns `401 Unauthorized` if no authenticated user
- This endpoint is ONLY for mock provider (`provider = "mock"`)

**File: `src/app/lib/payment-gateway/service.ts`**
- Lines 155-170: `createPaymentIntent()` and `createParentPaymentIntent()` both insert `payment_gateway_transactions` with `provider: "mock"`
- No production provider implementation exists — only `"mock"` is supported in `resolveProvider()`

**File: `src/app/dashboard/admin/payment-gateway/actions.ts`**
- Lines 123-222: `simulateMockWebhookAction()` — makes authenticated internal `fetch` call to `/api/webhooks/payment/mock`
- This is the ONLY mechanism to complete a mock payment

**File: `src/app/dashboard/orang-tua/actions.ts`**
- Lines 845-955: `simulateParentWebhookAction()` — same pattern, authenticated internal call

### Key Findings
1. **There is NO separate production webhook endpoint.** The only webhook route is `/api/webhooks/payment/mock`.
2. **The mock webhook is exclusively for UAT/testing.** It requires authenticated session because it's designed to be called internally by simulation functions, not by external gateways.
3. **No production gateway provider is implemented.** Only `"mock"` provider exists in `resolveProvider()`.

### Original Assessment
Correct for production context, but misleading for UAT scope.

### Validation Result
The authenticated session requirement is **by design** for the mock webhook. The mock webhook is not intended to receive real external gateway callbacks. A real production gateway would require a separate webhook endpoint without user session dependency.

### Classification
**DESIGN LIMITATION** — The mock webhook is intentionally scoped to authenticated internal simulation. This is not a bug for UAT purposes. Production deployment would require a separate webhook handler.

### Recommendation
Document as design limitation. For UAT, use the provided simulation functions (`simulateMockWebhookAction` / `simulateParentWebhookAction`). For production, implement a separate webhook endpoint with proper gateway authentication (HMAC, IP allowlist, etc.) without Supabase user session dependency.

---

## Finding 3: `guru` Role Has Zero RLS Policies

### Original Assessment
"guru role has zero RLS policies — teachers see empty result sets for all queries."

### Evidence
**File: `src/app/dashboard/admin/actions.ts`** — No `guru` in allowed roles
**File: `src/app/dashboard/orang-tua/actions.ts`** — No `guru` routes
**File: `src/app/dashboard/bendahara/actions.ts`** — No `guru` routes
**File: `supabase/migrations/20240104_rls_tenant_isolation.sql`** — No policies granting `guru` access to any table
**File: `supabase/migrations/20240100_base_schema.sql`** — `profiles.role` CHECK allows `'guru'`
**File: `src/app/login/page.tsx`** — Only allows `admin`, `bendahara`, `orang_tua` roles

### Key Findings
1. `guru` is defined in the database schema as a valid role.
2. **No application routes, pages, or server actions exist for `guru`.**
3. **No RLS policies grant any access to `guru`.**
4. Login page explicitly rejects `guru` role with error "Akun belum dikonfigurasi dengan benar."

### Original Assessment
Correct, but severity classification needs adjustment.

### Validation Result
`guru` is a **defined but unimplemented role**. It is not a UAT blocker because:
- It is not in the current application scope
- No routes or pages exist for teachers
- The login page correctly rejects `guru` accounts

### Classification
**FUTURE SCOPE** — `guru` role is not part of the current UAT scope. No action required for 5P UAT.

### Recommendation
If `guru` is planned for future phases, document as future scope. If `guru` should be functional in Phase 5, this would be a UAT blocker requiring:
- Dashboard routes and pages
- Server actions
- RLS policies
- Business logic for teacher-specific features

---

## Finding 4: Cross-School Student Bill Gap

### Original Assessment
"student_bills.student_id is not directly validated against student_bills.school_id"

### Evidence
**Database Schema:**
- `student_bills.student_id` → `students(id)` ON DELETE RESTRICT (simple FK)
- `student_bills.school_id` → `schools(id)` ON DELETE CASCADE
- `student_bills.student_enrollment_id` → `student_enrollments(id, school_id)` ON DELETE SET NULL (composite FK)
- NO composite FK `(student_id, school_id) → students(id, school_id)` on `student_bills`
- NO trigger on `student_bills` validating `student_id`'s school matches `school_id`

**Application Logic:**
- `src/app/dashboard/admin/student-bills/actions.ts` `createStudentBillAction()`:
  - Validates student exists and belongs to same school (via `eq(school_id, profile.school_id)` on student query)
  - Validates payment_category belongs to same school
  - Validates enrollment belongs to same school if provided
- `process_payment()` RPC:
  - Validates `v_bill.school_id == v_user_school_id` (tenant validation)
  - Sets `payments.school_id = v_bill.school_id` (derives from bill, not from user input)

**Triggers:**
- `validate_payment_student_consistency()` on `payments`: ensures `payments.student_id == student_bills.student_id`
- No trigger on `student_bills` for school-student consistency

### Key Findings
1. **At database level:** There is no direct enforcement that `student_bills.student_id` belongs to the same school as `student_bills.school_id`.
2. **At application level:** `createStudentBillAction` validates student and school match before insert.
3. **At RLS level:** `student_bills_select_school` filters by `school_id`, but a cross-school bill would still be visible to the bill's school admin.
4. **Indirect enforcement:** If `student_enrollment_id` is provided, the composite FK `(student_enrollment_id, school_id) → student_enrollments(id, school_id)` ensures enrollment matches bill's school, and enrollment's student must match via triggers.

### Validation Result
The gap **exists at the database schema level**, but is **mitigated by application-level validation**. A cross-school bill could theoretically be created if:
- `student_enrollment_id` is NULL
- Application code bypasses the school validation

However, `createStudentBillAction` explicitly queries `students` with `eq(school_id, profile.school_id)` and rejects mismatches. The RPC `process_payment` derives `school_id` from the bill itself, not from user input.

### Classification
**CONFIRMED** — Schema gap exists, but application-level controls mitigate the risk. This is a defense-in-depth concern, not an exploitable vulnerability in the current implementation.

### Recommendation
Document as schema hardening opportunity. If defense-in-depth is required, add a trigger or composite FK. Do NOT add without evidence of actual exploitability.

---

## Finding 5: Payment Gateway Cross-School Gap

### Original Assessment
"payment_gateway_transactions has no composite FK to payments"

### Evidence
**Database Schema:**
- `payment_gateway_transactions.payment_id` → `payments(id)` ON DELETE RESTRICT (simple FK)
- `payment_gateway_transactions.school_id` → `schools(id)` ON DELETE RESTRICT
- NO composite FK `(payment_id, school_id) → payments(id, school_id)`

**Application Logic:**
- `createPaymentIntentInternal()` inserts `payment_gateway_transactions` with `school_id = profile.school_id`
- Webhook handler checks `gatewayTransaction.school_id !== profile.school_id` and `studentBill.school_id !== profile.school_id`
- `process_payment()` RPC validates `v_bill.school_id == v_user_school_id`

**Cross-School Scenario Analysis:**
Could an admin from School A create a gateway transaction referencing a payment from School B?
1. `createPaymentIntentInternal` requires `bill.school_id === profile.school_id` — bill must be in admin's school
2. `process_payment` creates payment with `school_id = v_bill.school_id`
3. Webhook validates `gatewayTransaction.school_id === profile.school_id`
4. There is no direct link between `payment_gateway_transactions.payment_id` and `payments.school_id` at DB level

### Validation Result
The gap **exists at the database schema level**, but is **mitigated by application logic**:
- Gateway transaction creation is scoped to the user's school via `profile.school_id`
- Payment creation via `process_payment` derives `school_id` from the bill
- Webhook handler validates school ownership before processing

A cross-school gateway transaction could only occur if:
1. Application code is bypassed
2. `school_id` is manually tampered with in the database

### Classification
**CONFIRMED** — Schema gap exists, but application-level controls mitigate the risk. Similar to Finding 4, this is a defense-in-depth concern.

### Recommendation
Document as schema hardening opportunity. Current application-level validation is sufficient for UAT.

---

## Finding 6: Missing Audit Events

### Original Assessment
"gateway_transaction_created, gateway_transaction_failed, bill_status_changed defined but never recorded"

### Evidence
**Financial Audit Action Types Defined:**
- `src/lib/financial-audit/types.ts`: Defines `FinancialAuditActionType` including `gateway_transaction_created`, `gateway_transaction_failed`, `bill_status_changed`

**Actual Audit Recording Call Sites:**
1. `src/app/dashboard/admin/student-bills/actions.ts:323` — `bill_created` ✅
2. `src/app/dashboard/admin/student-bills/actions.ts:492` — `payment_created` ✅
3. `src/app/dashboard/orang-tua/actions.ts:452` — `payment_created` ✅
4. `src/app/dashboard/orang-tua/actions.ts:574` — `payment_proof_submitted` ✅
5. `src/app/dashboard/orang-tua/actions.ts:922` — `gateway_transaction_succeeded` ✅
6. `src/app/dashboard/admin/payment-gateway/actions.ts:225` — `gateway_transaction_succeeded` ✅

**Missing:**
- `gateway_transaction_created` — Not recorded when `payment_gateway_transactions` is inserted in `createPaymentIntentInternal` (service.ts line 115-131)
- `gateway_transaction_failed` — Not recorded when webhook sets `provider_status = "failed"` (mock/route.ts line 236-243)
- `bill_status_changed` — Not recorded after `process_payment` updates bill status

**Database-Level Triggers:**
- No trigger on `payment_gateway_transactions` that calls `create_financial_audit_event`
- No trigger on `student_bills` that calls `create_financial_audit_event`

### Key Findings
1. `gateway_transaction_created` is never recorded — the intent creation path does not call `recordFinancialAuditEvent`.
2. `gateway_transaction_failed` is never recorded — the webhook failure path does not call `recordFinancialAuditEvent`.
3. `bill_status_changed` is never recorded — `process_payment` RPC changes bill status but does not emit an audit event.

### Validation Result
The finding is **CONFIRMED**. These audit events are defined in the type system but are not emitted by any code path.

### Classification
**CONFIRMED** — Missing audit events for:
- `gateway_transaction_created`
- `gateway_transaction_failed`
- `bill_status_changed`

### Recommendation
Document as audit completeness gap. For UAT, note that:
- `gateway_transaction_succeeded` IS recorded (via simulation functions)
- `payment_created` IS recorded (via payment actions)
- The missing events represent audit blind spots for failed transactions and bill status changes

Do NOT add audit events during UAT validation phase. Document and address in post-UAT hardening.

---

## Finding 7: Mock Payment Status Always Pending

### Original Assessment
"Mock provider checkPaymentStatus always returns 'pending' — polling non-functional"

### Evidence
**File: `src/lib/payment-gateway/providers/mock.ts`**
```typescript
async checkPaymentStatus(_externalTransactionId) {
  return {
    providerStatus: "pending",
    rawPayload: {
      provider: "mock",
      external_transaction_id: _externalTransactionId,
      status: "pending",
    },
  };
}
```

**UI Dependencies:**
- `PaymentCheckoutClient` polls `getParentPaymentGatewayTransactionAction` for status updates
- Since `checkPaymentStatus` always returns `"pending"`, polling never advances the UI state
- The ONLY way to complete a mock payment is via `simulateMockWebhookAction` or `simulateParentWebhookAction`

### Key Findings
1. `checkPaymentStatus` is intentionally a no-op for the mock provider.
2. The mock provider only implements `createPaymentIntent` and `cancelPayment`.
3. Webhook simulation is the **primary** mechanism for completing mock payments.
4. Polling is a **placeholder** for future real provider integration.

### Validation Result
The behavior is **by design** for the mock provider. Polling is not intended to work with the mock. The webhook simulation is the primary completion mechanism.

### Classification
**DESIGN LIMITATION** — Mock provider intentionally returns static `"pending"` status. This is expected behavior for UAT mock.

### Recommendation
Document as mock limitation. For UAT, always use webhook simulation to complete payments. For production, implement real provider polling logic.

---

## Summary Table

| # | Finding | Original Classification | Validated Classification |
|---|---------|------------------------|--------------------------|
| 1 | Parent guardian relationship missing | BLOCKED | CONFIRMED — PASS |
| 2 | Webhook requires authenticated session | HIGH SECURITY/ARCHITECTURE FINDING | DESIGN LIMITATION |
| 3 | `guru` role has zero RLS policies | GAP / FUTURE SCOPE | FUTURE SCOPE |
| 4 | Cross-school student_bill gap | CONFIRMED | CONFIRMED (mitigated) |
| 5 | Payment gateway cross-school gap | CONFIRMED | CONFIRMED (mitigated) |
| 6 | Missing audit events | CONFIRMED | CONFIRMED |
| 7 | Mock payment status always pending | MEDIUM | DESIGN LIMITATION |

---

## Blockers for UAT Continuation

1. **Parent guardian relationship** — Verified as existing. No blocker.
2. **None of the confirmed gaps are UAT blockers** — They are defense-in-depth concerns that do not prevent UAT execution.

---

## Next Steps

Awaiting your direction:
1. Proceed to PHASE 2 — DEFINE UAT MATRIX

No code, database, or configuration changes have been made per your instructions.
