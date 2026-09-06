# PHASE 2.5C.1 — API 500 ROOT-CAUSE REPORT

## 1. Executive Summary

**Status:** BLOCKED — ENVIRONMENT REQUIRED FOR EXACT DIAGNOSIS

Two API endpoints return HTTP 500:
1. `/api/payment-proofs`
2. `/api/admin/payment-gateway`

The exact Supabase/PostgreSQL error is hidden by application-level error handling. Based on static code analysis, runtime behavior, and database schema review, the most likely root causes are:
- **`/api/payment-proofs`**: RLS policy subquery behavior with empty `payments` table, or PostgREST nested join behavior
- **`/api/admin/payment-gateway`**: Similar pattern — nested joins through `payments` table

Both are **environment-dependent** issues that cannot be fully diagnosed without:
1. Live database access
2. Supabase logs
3. Actual Supabase error object

---

## 2. Environment State

| Component | Status |
|-----------|--------|
| Next.js dev server | Running on localhost:3000 |
| Database | Partially populated (students, bills exist; no payment_proofs, no payment_gateway_transactions) |
| Auth users | Present (session cookie exists in browser) |
| Profiles | Present (pages render successfully) |
| Migrations applied | 20240100 through 20240116 |
| RLS enabled | YES |

---

## 3. `/api/payment-proofs`

### Request
```
GET /api/payment-proofs
```

### Auth
- `supabase.auth.getUser()` → returns user (session exists)
- Profile lookup → succeeds (user has profile with school_id)

### Authorization
- No role check in API route
- RLS policy: `payment_proofs_select_school` requires `payment_id IN (SELECT id FROM payments WHERE school_id = current_user_school_id())`

### Query
```sql
SELECT id, school_id, payment_id, file_path, file_name, mime_type, file_size, status, created_at, updated_at, uploaded_by,
  payments (
    id, amount, payment_date, reference_number, status,
    payment_methods (id, name, method_type),
    students (id, nis, full_name),
    student_bills (id, amount, due_date, status)
  )
FROM payment_proofs
WHERE school_id = <profile.school_id>
ORDER BY created_at DESC
```

### Database Objects
- `payment_proofs` table: EXISTS (created in 20240100_base_schema.sql)
- `payments` table: EXISTS (created in 20240100_base_schema.sql)
- `payment_methods` table: EXISTS
- `students` table: EXISTS
- `student_bills` table: EXISTS
- Foreign keys: All defined in base schema

### RLS
- `payment_proofs_select_school`: `payment_id IN (SELECT id FROM payments WHERE school_id = current_user_school_id())`
- `payment_proofs_select_own_children`: parent access
- `payment_proofs_modify_school`: admin/bendahara write access

### Actual HTTP Status
500 Internal Server Error

### Exact Error
**Cannot be determined.** Application code swallows the actual Supabase error:
```typescript
if (proofsError) {
  return NextResponse.json({ error: "Failed to load payment proofs." }, { status: 500 });
}
```

The actual Supabase error object (`proofsError`) is not logged or returned.

### Root Cause
**Most likely: Category F — SERVER CODE BUG or Category A — EMPTY DATA causing unexpected behavior**

**Evidence:**
1. Database is partially populated (students and bills exist, but no payment_proofs records)
2. The `payments` table likely has no records (payment proofs require existing payments)
3. RLS policy `payment_proofs_select_school` uses subquery: `payment_id IN (SELECT id FROM payments WHERE school_id = current_user_school_id())`
4. With empty `payments` table, subquery returns empty set
5. Expected behavior: return empty array `[]`
6. Actual behavior: returns 500

**Possible explanations:**
- **Hypothesis 1:** Supabase/PostgREST returns an error when RLS policy subquery returns empty for all rows, instead of returning empty results. This would be a PostgREST behavior issue.
- **Hypothesis 2:** The nested join structure (`payments` → `payment_methods`/`students`/`student_bills`) causes PostgREST to error when the `payments` table is empty or when FK relationships are not fully populated.
- **Hypothesis 3:** `current_user_school_id()` function throws an exception in certain edge cases not covered by the profile lookup.
- **Hypothesis 4:** There is a schema mismatch between what the query expects and what the database actually has.

**What we know for certain:**
- The query structure is valid (same pattern works in other endpoints with simpler data)
- Auth and profile lookup succeed
- The error occurs during the Supabase query execution
- The error is consistent (reproducible on every request)

**What we don't know:**
- The actual Supabase error message/code
- Whether the error is from PostgREST, PostgreSQL, or RLS
- The exact SQLSTATE if any

### Classification
**ENVIRONMENT DEPENDENT — Likely APPLICATION BUG in error handling or query structure**

The endpoint should return `200 + []` when no records exist, not `500`. This is an application behavior defect regardless of the underlying database state.

---

## 4. `/api/admin/payment-gateway`

### Request
```
GET /api/admin/payment-gateway
```

### Auth
- `supabase.auth.getUser()` → returns user
- Profile lookup → succeeds
- Role check → passes (admin/bendahara)

### Authorization
- Server-side: requires admin or bendahara role
- RLS policy: `payment_gateway_transactions_select_school`

### Query
```sql
SELECT id, school_id, payment_id, provider, external_order_id, external_transaction_id, provider_status, payment_method_type, qr_code_url, expires_at, raw_payload, webhook_received_at, created_at, updated_at,
  payments (
    id, amount, status,
    students (id, nis, full_name),
    student_bills (id, amount, status)
  )
FROM payment_gateway_transactions
WHERE school_id = <profile.school_id>
ORDER BY created_at DESC
LIMIT 20 OFFSET 0
```

### Database Objects
- `payment_gateway_transactions` table: EXISTS (created in 20240112_payment_gateway_foundation.sql)
- `payments` table: EXISTS
- `students` table: EXISTS
- `student_bills` table: EXISTS

### RLS
- `payment_gateway_transactions_select_school`: admin/bendahara can view same school
- `payment_gateway_transactions_select_children`: parent can view children's transactions
- `payment_gateway_transactions_update_school`: admin/bendahara can update same school

### Actual HTTP Status
500 Internal Server Error

### Exact Error
**Cannot be determined.** Application code swallows the actual Supabase error:
```typescript
if (transactionsError) {
  return NextResponse.json({ error: "Failed to load gateway transactions." }, { status: 500 });
}
```

### Root Cause
**Most likely: Category F — SERVER CODE BUG or Category A — EMPTY DATA causing unexpected behavior**

**Evidence:**
1. Database has no `payment_gateway_transactions` records
2. Query structure is similar to `/api/payment-proofs`
3. Nested joins through `payments` → `students` / `student_bills`
4. RLS policy filters by `school_id`
5. Other endpoints with similar patterns work when data exists

**Possible explanations:**
- Same as `/api/payment-proofs`: empty data + nested joins + RLS subquery behavior
- PostgREST error when joining through empty related tables
- RLS policy evaluation error when `payments` table is empty

### Classification
**ENVIRONMENT DEPENDENT — Likely APPLICATION BUG in error handling or query structure**

---

## 5. Related Endpoint Audit

| Endpoint | Status | Root Cause | Category |
|----------|--------|------------|----------|
| `/api/payment-methods` | 200 | Works correctly | N/A |
| `/api/payment-proofs` | 500 | Likely empty data + RLS/join behavior | ENVIRONMENT DEPENDENT |
| `/api/admin/payment-gateway` | 500 | Likely empty data + RLS/join behavior | ENVIRONMENT DEPENDENT |
| `/dashboard/admin/student-bills` | 200 | Works correctly | N/A |
| `/dashboard/admin/students` | 200 | Works correctly | N/A |
| `/dashboard/admin/notifications` | 200 | Works correctly | N/A |
| `/dashboard/admin/payments` | Not tested | N/A | N/A |

**Pattern identified:** Endpoints with deep nested joins through `payments` table fail when related tables are empty. Endpoints with simpler queries or direct table access work correctly.

---

## 6. Classification

| Endpoint | Classification | Severity |
|----------|---------------|----------|
| `/api/payment-proofs` | ENVIRONMENT DEPENDENT / APPLICATION BUG | P2 |
| `/api/admin/payment-gateway` | ENVIRONMENT DEPENDENT / APPLICATION BUG | P2 |

**Rationale:**
- The endpoints should return `200 + []` when no data exists
- Returning `500` for empty data is incorrect HTTP semantics
- The actual Supabase error is hidden, making diagnosis difficult
- The issue only manifests with empty or specific data states

---

## 7. Severity

**P2 — MEDIUM**

**Reasoning:**
- Not a security vulnerability
- Not a data corruption risk
- Affects user experience (error state instead of empty state)
- Blocks visual verification of these pages
- Does not block environment restoration
- Will likely resolve when database is populated with related records

---

## 8. Recommended Remediation

### For both endpoints:

1. **Log the actual Supabase error:**
   ```typescript
   if (proofsError) {
     console.error("Payment proofs query error:", proofsError);
     return NextResponse.json({ error: "Failed to load payment proofs.", details: proofsError.message }, { status: 500 });
   }
   ```
   This would reveal the exact error for future debugging.

2. **Handle empty results gracefully:**
   - If the query returns empty results, return `200 + []`
   - Only return `500` for actual server errors (connection failure, timeout, etc.)

3. **Review RLS policies:**
   - The `payment_proofs_select_school` policy uses a subquery that might behave unexpectedly with empty `payments` table
   - Consider adding a direct `school_id` check to the policy as a fallback

4. **Review nested join depth:**
   - Consider flattening the query or using multiple simpler queries if PostgREST has limitations with deep nesting

### For `/api/payment-proofs` specifically:

5. **Verify schema compatibility:**
   - Ensure all FK relationships used in joins are properly defined
   - Verify `payments.payment_methods`, `payments.students`, `payments.student_bills` relations exist

### For `/api/admin/payment-gateway` specifically:

6. **Verify `payment_gateway_transactions` schema:**
   - Ensure `payments` relation is properly defined
   - Verify `payments.students` and `payments.student_bills` relations exist

---

## 9. Environment Restoration Dependency

### Can be investigated before restoration:
- Code review of query structure
- RLS policy review
- Schema compatibility check
- Error logging improvement

### Requires database/auth environment:
- Actual Supabase error message
- Database logs
- PostgREST query plan
- Live testing with populated data

---

## 10. Final Decision

**BLOCKED — ENVIRONMENT REQUIRED**

The exact root cause cannot be determined without:
1. Access to Supabase logs
2. The actual Supabase error object
3. Live database with populated related tables

**What we know:**
- Both endpoints return 500 instead of 200 + []
- The error occurs during Supabase query execution
- The actual error is hidden by application error handling
- The issue is reproducible

**What we don't know:**
- Whether it's a PostgREST limitation, RLS issue, schema mismatch, or code bug
- The exact SQLSTATE or error code
- Whether the issue resolves with populated data

**Next steps:**
1. Add error logging to reveal actual Supabase errors
2. Test with populated database after environment restoration
3. Review Supabase/PostgREST logs for query execution details

---

**STOP. DO NOT FIX CODE. DO NOT RUN SEED. DO NOT CREATE AUTH USERS. DO NOT START PHASE 3 UAT.**
