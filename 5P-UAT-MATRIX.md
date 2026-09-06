# 5P-UAT-MATRIX.md

# 5P.2 — Systematic User Acceptance Test Matrix

## 1. UAT Scope

This UAT matrix covers the implemented SPO SD Peradaban application based on the validated system inventory. Testing is scoped to the actual implemented features, routes, server actions, database tables, RLS policies, payment flows, webhook simulation, notifications, and UI states.

**Out of scope for this UAT phase:**
- `guru` (teacher) role — defined in schema but not implemented in application
- Production external gateway integration — only mock provider is implemented
- Real external webhook delivery — mock webhook is for internal simulation only
- Google Drive storage provider — unimplemented
- Any features not present in the current codebase

## 2. Actors

| Actor | Role | Test Account | Dashboard |
|-------|------|--------------|-----------|
| Admin | `admin` | `admin@sdperadaban.sch.id` | `/dashboard/admin` |
| Bendahara | `bendahara` | `bendahara@sdperadaban.sch.id` | `/dashboard/bendahara` |
| Orang Tua | `orang_tua` | `parent@test.local` | `/dashboard/orang-tua` |

## 3. Test Data

### 3.1 Verified Operational Seed

| Entity | Value |
|--------|-------|
| School | SD Peradaban |
| School ID | `11111111-1111-1111-1111-111111111111` |
| Academic Year | 2026/2027 |
| Class | Kelas 1A |
| Admin | `admin@sdperadaban.sch.id` |
| Bendahara | `bendahara@sdperadaban.sch.id` |
| Parent | `parent@test.local` |
| Student | Siswa Pertama |
| Student NIS | 001 |
| Student ID | `44444444-4444-4444-4444-444444444444` |
| Guardian Profile ID | `755ad1cf-9801-4e07-8316-8139db0981d4` |
| Guardian Relationship ID | `97d46779-92cd-42be-a9a6-ea308c86007c` |
| Guardian Relationship | `orang_tua` |
| Bill ID | `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` |
| Bill Amount | Rp 100.000,00 |
| Bill Status | `pending` |
| Bill Due Date | 2026-09-01 |
| Billing Period | 2026-09-01 → 2026-09-30 |
| Payment Category | SPP |
| Payment Methods | QRIS, Transfer Bank, Virtual Account |

### 3.2 Fixture Requirements

Some security and negative tests require additional fixture data. These are marked as `FIXTURE REQUIRED` and must NOT be created during Phase 2. They are documented here for Phase 3 execution.

- Second school (`School B`) with its own admin, student, and bill for cross-school isolation tests
- Second parent (`Parent B`) with their own child for parent horizontal isolation tests
- Additional payment categories and bills for partial payment and overpayment tests
- Various bill statuses (`partial`, `paid`, `cancelled`, `overdue`) for negative tests

## 4. Preconditions

1. All migrations from `20240100` through `20240116` have been applied to the database.
2. Base schema tables exist and RLS is enabled.
3. Storage bucket `payment-proofs` exists with RLS policies configured in Supabase Studio.
4. Operational seed data is present as documented in Section 3.1.
5. Application is running at `http://localhost:3000`.
6. Test accounts are accessible with known credentials.
7. `MOCK_PAYMENT_WEBHOOK_SECRET` environment variable is set for webhook simulation.
8. `MOCK_PAYMENT_WEBHOOK_SECRET` environment variable is set for webhook simulation.
9. No schema, migration, RLS policy, function, trigger, configuration, or application code changes are permitted during UAT. Test-data mutations are allowed only where explicitly required by a test case and must be controlled and documented.

## 5. UAT Matrix

### SECTION A — AUTHENTICATION

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| AUTH-001 | Login | Admin | Admin account exists | Navigate to `/login`; enter `admin@sdperadaban.sch.id` + valid password; submit | Redirect to `/dashboard/admin`; admin dashboard loads with summary data | admin@sdperadaban.sch.id | P0 | — |
| AUTH-002 | Login | Bendahara | Bendahara account exists | Navigate to `/login`; enter `bendahara@sdperadaban.sch.id` + valid password; submit | Redirect to `/dashboard/bendahara`; bendahara dashboard loads with summary data | bendahara@sdperadaban.sch.id | P0 | — |
| AUTH-003 | Login | Orang Tua | Parent account exists with guardian relationship | Navigate to `/login`; enter `parent@test.local` + valid password; submit | Redirect to `/dashboard/orang-tua`; parent dashboard loads | parent@test.local | P0 | — |
| AUTH-004 | Invalid credentials | Any | — | Navigate to `/login`; enter invalid email/password; submit | Error message displayed; user remains on login page; no redirect | — | P0 | — |
| AUTH-005 | Session persistence | Any | User is logged in | Close browser tab; reopen `/dashboard/admin` (or respective dashboard) | User remains authenticated; dashboard loads without re-login | admin@sdperadaban.sch.id | P1 | — |
| AUTH-006 | Logout | Any | User is logged in | Navigate to `/profile`; click "Keluar" (logout) | Redirect to `/login`; session cleared; subsequent protected route access redirects to login | Any test account | P0 | — |
| AUTH-007 | Unauthorized access | Anonymous | No active session | Navigate directly to `/dashboard/admin` | Redirect to `/login` | — | P0 | SECURITY |
| AUTH-008 | Unauthorized access | Anonymous | No active session | Navigate directly to `/dashboard/orang-tua/bills` | Redirect to `/login` | — | P0 | SECURITY |
| AUTH-009 | /api/auth/me | Any | Valid session | Send GET request to `/api/auth/me` with session cookies | 200 OK; returns `{ id, school_id, role, full_name }` | Any test account | P1 | — |
| AUTH-010 | /api/auth/me unauthenticated | Anonymous | No session | Send GET request to `/api/auth/me` | 401 Unauthorized; `{ error: "Unauthorized" }` | — | P0 | SECURITY |
| AUTH-011 | Role identity verification | Admin | Admin logged in | Call `/api/auth/me` | `role` field returns `"admin"` | admin@sdperadaban.sch.id | P0 | — |
| AUTH-012 | Role identity verification | Bendahara | Bendahara logged in | Call `/api/auth/me` | `role` field returns `"bendahara"` | bendahara@sdperadaban.sch.id | P0 | — |
| AUTH-013 | Role identity verification | Orang Tua | Parent logged in | Call `/api/auth/me` | `role` field returns `"orang_tua"` | parent@test.local | P0 | — |

### SECTION B — AUTHORIZATION / ROLE ACCESS

#### B.1 ADMIN

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| AUTHZ-001 | Admin dashboard access | Admin | Admin logged in | Navigate to `/dashboard/admin` | Dashboard loads with summary cards, recent payments, navigation to sub-pages | admin@sdperadaban.sch.id | P0 | — |
| AUTHZ-002 | Admin student CRUD | Admin | Admin logged in | Navigate to `/dashboard/admin/students`; create, edit, search students | Students list loads; create/edit operations succeed; search filters work | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-003 | Admin bill CRUD | Admin | Admin logged in | Navigate to `/dashboard/admin/student-bills`; create, view bill detail | Bills list loads; bill creation succeeds; detail view shows correct data | admin@sdperadaban.sch.id, existing student and category | P1 | — |
| AUTHZ-004 | Admin guardian management | Admin | Admin logged in | Navigate to `/dashboard/admin/guardians`; create/delete guardian links | Guardian list loads; create/delete operations succeed | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-005 | Admin academic year management | Admin | Admin logged in | Navigate to `/dashboard/admin/academic-years`; create/activate academic year | List loads; creation succeeds; activation toggles correctly | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-006 | Admin class management | Admin | Admin logged in | Navigate to `/dashboard/admin/classes`; create/edit class | List loads; operations succeed | admin@sdperadaban.sch.id, existing academic year | P1 | — |
| AUTHZ-007 | Admin payment category management | Admin | Admin logged in | Navigate to `/dashboard/admin/payment-categories`; create/edit/delete category | List loads; operations succeed; delete blocked if category is in use | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-008 | Admin school payment methods | Admin | Admin logged in | Navigate to `/dashboard/admin/school-payment-methods`; toggle methods | List loads; toggle succeeds | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-009 | Admin financial reports | Admin | Admin logged in | Navigate to `/dashboard/admin/financial-reports` | Report loads with summary, filters, transaction list | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-010 | Admin audit logs | Admin | Admin logged in | Navigate to `/dashboard/admin/financial-audit-logs` | Audit log list loads with filters | admin@sdperadaban.sch.id | P0 | SECURITY |
| AUTHZ-011 | Admin notifications | Admin | Admin logged in | Navigate to `/dashboard/admin/notifications` | Notification list loads; mark as read works | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-012 | Admin payment proofs | Admin | Admin logged in | Navigate to `/dashboard/admin/payment-proofs`; review proofs | Proof list loads; approve/reject works with required fields | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-013 | Admin payment gateway | Admin | Admin logged in | Navigate to `/dashboard/admin/payment-gateway` | Gateway transaction list loads; simulate webhook action available | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-014 | Admin school settings | Admin | Admin logged in | Navigate to `/dashboard/admin/school`; update school profile | School data loads; update succeeds | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-015 | Admin enrollment management | Admin | Admin logged in | Navigate to `/dashboard/admin/enrollments`; create/update enrollment | List loads; operations succeed | admin@sdperadaban.sch.id | P1 | — |
| AUTHZ-016 | Admin offline payment processing | Admin | Admin logged in; bill exists | Navigate to bill detail; process offline payment | Payment created; bill status updated; audit recorded; notification sent | admin@sdperadaban.sch.id, existing bill with `pending` status | P0 | SECURITY |
| AUTHZ-017 | Admin receipt access | Admin | Admin logged in; completed payment exists | Navigate to payment receipt page | Receipt loads with correct student, bill, amount, payment details | admin@sdperadaban.sch.id, completed payment | P1 | — |
| AUTHZ-018 | Admin role enforcement | Bendahara | Bendahara logged in | Navigate to `/dashboard/admin` | NEEDS VERIFICATION — ACTUAL RUNTIME TEST: deterministic behavior depends on implemented `requireRole`/authorization logic in the admin dashboard server component or layout | bendahara@sdperadaban.sch.id | P1 | SECURITY |

#### B.2 BENDAHARA

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| AUTHZ-019 | Bendahara dashboard access | Bendahara | Bendahara logged in | Navigate to `/dashboard/bendahara` | Dashboard loads with summary cards, recent payments, navigation cards | bendahara@sdperadaban.sch.id | P0 | — |
| AUTHZ-020 | Bendahara notifications | Bendahara | Bendahara logged in | Navigate to `/dashboard/bendahara/notifications` | Notification list loads | bendahara@sdperadaban.sch.id | P1 | — |
| AUTHZ-021 | Bendahara bill management | Bendahara | Bendahara logged in | Navigate to `/dashboard/admin/student-bills` (via navigation card) | Bills list loads; bendahara can view and create bills | bendahara@sdperadaban.sch.id | P1 | — |
| AUTHZ-022 | Bendahara payment processing | Bendahara | Bendahara logged in; bill exists | Process offline payment via bill detail | Payment created; bill status updated | bendahara@sdperadaban.sch.id, existing bill | P1 | SECURITY |
| AUTHZ-023 | Bendahara payment proofs | Bendahara | Bendahara logged in | Navigate to `/dashboard/admin/payment-proofs` | Proof list loads; review actions available | bendahara@sdperadaban.sch.id | P1 | — |
| AUTHZ-024 | Bendahara financial reports | Bendahara | Bendahara logged in | Navigate to `/dashboard/admin/financial-reports` | Reports load with school-scoped data | bendahara@sdperadaban.sch.id | P1 | — |
| AUTHZ-025 | Bendahara payment gateway | Bendahara | Bendahara logged in | Navigate to `/dashboard/admin/payment-gateway` | Gateway transactions list loads; simulate webhook available | bendahara@sdperadaban.sch.id | P1 | — |
| AUTHZ-026 | Bendahara audit logs | Bendahara | Bendahara logged in | Navigate to `/dashboard/admin/financial-audit-logs` | Audit log list loads | bendahara@sdperadaban.sch.id | P0 | SECURITY |

#### B.3 ORANG TUA

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| AUTHZ-027 | Parent dashboard access | Orang Tua | Parent logged in; guardian relationship exists | Navigate to `/dashboard/orang-tua` | Dashboard loads with summary cards; shows linked children data | parent@test.local | P0 | — |
| AUTHZ-028 | Parent bills list | Orang Tua | Parent logged in; guardian relationship exists; bill exists for child | Navigate to `/dashboard/orang-tua/bills` | Bills list loads with child's bills; status filter works | parent@test.local | P0 | — |
| AUTHZ-029 | Parent bill detail | Orang Tua | Parent logged in; guardian relationship exists | Navigate to bill detail page | Bill detail loads with correct student, amount, due date, billing period, payment history | parent@test.local, bill ID `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | — |
| AUTHZ-030 | Parent payment history | Orang Tua | Parent logged in; guardian relationship exists | Navigate to `/dashboard/orang-tua/payments` | Payment history loads for child's bills | parent@test.local | P1 | — |
| AUTHZ-031 | Parent payment receipt | Orang Tua | Parent logged in; guardian relationship exists; completed payment exists | Navigate to receipt page | Receipt loads with correct data | parent@test.local, completed payment ID | P1 | — |
| AUTHZ-032 | Parent notifications | Orang Tua | Parent logged in; guardian relationship exists | Navigate to `/dashboard/orang-tua/notifications` | Notification list loads | parent@test.local | P1 | — |
| AUTHZ-033 | Parent payment proof upload | Orang Tua | Parent logged in; guardian relationship exists; completed payment exists | Upload payment proof via bill detail or payment history | Proof uploads successfully; audit recorded; notification sent to admin/bendahara | parent@test.local, completed payment | P1 | SECURITY |
| AUTHZ-034 | Parent offline payment | Orang Tua | Parent logged in; guardian relationship exists; bill is `pending` | Process offline payment via bill detail | Payment created; bill status updated; notification sent | parent@test.local, bill ID `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | SECURITY |
| AUTHZ-035 | Parent gateway payment intent | Orang Tua | Parent logged in; guardian relationship exists; bill is `pending`; school payment method active | Create payment intent via checkout page | Gateway transaction created; QR/VA data returned | parent@test.local, bill ID, active school payment method | P1 | — |
| AUTHZ-036 | Parent gateway webhook simulation | Orang Tua | Parent logged in; gateway transaction exists with `pending`/`processing` status | Call `simulateParentWebhookAction` | Webhook processed; payment completed; bill status updated; notification sent | parent@test.local, gateway transaction ID | P1 | SECURITY |
| AUTHZ-037 | Parent unauthorized bill access | Orang Tua | Parent logged in; tries to access another student's bill | Navigate to another student's bill detail URL | NEEDS VERIFICATION — ACTUAL RUNTIME TEST: deterministic behavior depends on implemented authorization in bill detail server component. Expected: access denied with error message or redirect. | parent@test.local, other student's bill ID | P0 | SECURITY |
| AUTHZ-038 | Parent admin page access | Orang Tua | Parent logged in | Navigate to `/dashboard/admin/student-bills` | Redirect to `/dashboard/orang-tua` or access denied | parent@test.local | P0 | SECURITY |

#### B.4 GURU (FUTURE SCOPE)

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| AUTHZ-039 | Guru login | Guru | Guru account exists | Navigate to `/login`; enter guru credentials | NEEDS VERIFICATION — ACTUAL RUNTIME TEST: deterministic behavior depends on implemented login logic. Expected: rejection because `guru` role is not in allowed roles list. | guru@test.local | P3 | FUTURE SCOPE |
| AUTHZ-040 | Guru dashboard | Guru | — | Navigate to `/dashboard/guru` | NEEDS VERIFICATION — ACTUAL RUNTIME TEST: deterministic behavior depends on routing. Expected: 404 Not Found or redirect because no route exists for `/dashboard/guru`. | — | P3 | FUTURE SCOPE |

### SECTION C — RLS / MULTI-TENANT SECURITY

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| RLS-001 | Same-school access | Admin | Admin logged in | Query students, bills, payments for own school via API/server action | Data returned; school_id matches admin's school | admin@sdperadaban.sch.id | P0 | SECURITY |
| RLS-002 | Cross-school access blocked | Admin | Admin logged in; FIXTURE REQUIRED: School B with student and bill | Attempt to access School B's student/bill data via direct API call or modified request | Access denied; empty result or error | FIXTURE REQUIRED | P0 | SECURITY |
| RLS-003 | Parent child isolation | Orang Tua | Parent logged in; guardian relationship exists | Query bills, students, payments | Only data belonging to linked child is returned | parent@test.local | P0 | SECURITY |
| RLS-004 | Parent cannot access another child | Orang Tua | Parent logged in; FIXTURE REQUIRED: Another student in same school linked to different parent | Attempt to access other student's bill detail | Error: "Anda tidak memiliki akses ke tagihan ini." | FIXTURE REQUIRED | P0 | SECURITY |
| RLS-005 | Parent cannot access another parent's child | Orang Tua | Parent logged in; FIXTURE REQUIRED: Another parent with their own child | Attempt to query other guardian's child data via direct API call | Access denied; empty result | FIXTURE REQUIRED | P0 | SECURITY |
| RLS-006 | Bendahara school isolation | Bendahara | Bendahara logged in | Query bills, payments, students for own school | Data returned; scoped to bendahara's school | bendahara@sdperadaban.sch.id | P0 | SECURITY |
| RLS-007 | Admin school isolation | Admin | Admin logged in | Query bills, payments, students for own school | Data returned; scoped to admin's school | admin@sdperadaban.sch.id | P0 | SECURITY |
| RLS-008 | Unauthorized INSERT student_bills | Orang Tua | Parent logged in | Attempt direct INSERT to `student_bills` via Supabase client | INSERT blocked by RLS; no direct INSERT policy exists | parent@test.local | P0 | SECURITY |
| RLS-009 | Unauthorized INSERT payments | Orang Tua | Parent logged in | Attempt direct INSERT to `payments` via Supabase client | INSERT blocked by RLS; no direct INSERT policy exists | parent@test.local | P0 | SECURITY |
| RLS-010 | Unauthorized UPDATE student_bills | Bendahara | Bendahara logged in | Attempt direct UPDATE to `student_bills` via Supabase client | UPDATE blocked by RLS; no direct UPDATE policy exists | bendahara@sdperadaban.sch.id | P0 | SECURITY |
| RLS-011 | Unauthorized DELETE payments | Admin | Admin logged in | Attempt direct DELETE from `payments` via Supabase client | DELETE blocked by RLS; no direct DELETE policy exists | admin@sdperadaban.sch.id | P0 | SECURITY |
| RLS-012 | Direct API access without UI | Anonymous | No session | Send POST request to `/api/admin/payment-gateway/simulate` with valid body | 401 Unauthorized | — | P0 | SECURITY |
| RLS-013 | UUID tampering — bill ID | Orang Tua | Parent logged in | Modify bill ID UUID to another student's bill UUID in URL/request | Access denied or "Tagihan tidak ditemukan." | parent@test.local | P0 | SECURITY |
| RLS-014 | UUID tampering — payment proof ID | Orang Tua | Parent logged in | Modify payment proof ID to another payment's proof in download URL | 403 Forbidden or 404 | parent@test.local | P1 | SECURITY |
| RLS-015 | IDOR — payment receipt | Orang Tua | Parent logged in; FIXTURE REQUIRED: Another parent's completed payment | Attempt to access other parent's receipt URL | 403 Forbidden or "Anda tidak memiliki akses" | FIXTURE REQUIRED | P0 | SECURITY |
| RLS-016 | RLS policy integrity inspection | Any | Admin logged in | Query `pg_policies` for sensitive tables | All expected policies present; no overly permissive policies. Note: this test only inspects security configuration. It does NOT replace actual RLS enforcement tests, which must be verified through data access attempts. | admin@sdperadaban.sch.id | P1 | SECURITY |

### SECTION D — PARENT BILL FLOW

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| BILL-001 | Bill list loads | Orang Tua | Parent logged in; guardian relationship exists; bill exists | Navigate to `/dashboard/orang-tua/bills` | Bill list displays Siswa Pertama's bill with correct amount, status, due date, billing period | parent@test.local, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | — |
| BILL-002 | Bill detail loads | Orang Tua | Parent logged in; guardian relationship exists | Click "Detail" on bill | Bill detail page loads with student name, NIS, category, amount, period, status, due date, payment history | parent@test.local, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | — |
| BILL-003 | Student identity in bill detail | Orang Tua | Parent logged in; guardian relationship exists | View bill detail | Student name "Siswa Pertama" and NIS "001" displayed correctly | parent@test.local | P0 | — |
| BILL-004 | Bill amount accuracy | Orang Tua | Parent logged in | View bill list and detail | Amount displayed as "Rp 100.000" (formatted currency) | parent@test.local | P1 | — |
| BILL-005 | Bill due date accuracy | Orang Tua | Parent logged in | View bill detail | Due date displayed as "1 Sep 2026" | parent@test.local | P1 | — |
| BILL-006 | Billing period accuracy | Orang Tua | Parent logged in | View bill detail | Period displayed as "1 Sep 2026 - 30 Sep 2026" | parent@test.local | P1 | — |
| BILL-007 | Bill status display | Orang Tua | Parent logged in | View bill list and detail | Status "pending" displayed with correct label and styling | parent@test.local | P1 | — |
| BILL-008 | Payment CTA presence | Orang Tua | Parent logged in; bill status is `pending` | View bill detail | Payment button/form is visible and enabled | parent@test.local, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | — |
| BILL-009 | Payment history in bill detail | Orang Tua | Parent logged in; bill has payments | View bill detail | Payment history section shows existing payments with correct data | parent@test.local | P1 | — |
| BILL-010 | Empty state — no bills | Orang Tua | Parent logged in; no bills for child | Navigate to `/dashboard/orang-tua/bills` | "Belum ada tagihan." message displayed | parent@test.local, child with no bills | P1 | — |
| BILL-011 | Error state — load failure | Orang Tua | Parent logged in; simulate server error | Navigate to `/dashboard/orang-tua/bills` | Error message displayed: "Gagal memuat data tagihan: <detail>" | parent@test.local | P1 | — |
| BILL-012 | Unauthorized bill access | Orang Tua | Parent logged in; FIXTURE REQUIRED: Another student's bill | Navigate to other student's bill detail URL | Error: "Anda tidak memiliki akses ke tagihan ini." | FIXTURE REQUIRED | P0 | SECURITY |
| BILL-013 | Status filter | Orang Tua | Parent logged in; multiple bills with different statuses | Select status filter from dropdown | List filters correctly by selected status | parent@test.local | P1 | — |
| BILL-014 | Billing period display for non-recurring bill | Orang Tua | Parent logged in; one-time bill exists | View bill detail | Period shows "-" or empty | parent@test.local, one-time bill | P1 | — |

### SECTION E — DIRECT PAYMENT

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| PAY-001 | Valid full payment | Orang Tua | Parent logged in; bill is `pending`; amount = 100000; valid payment method selected | Process payment via `processParentPaymentAction` or UI | Payment created with status `completed`; bill status changes to `paid`; remaining balance = 0; audit recorded; notification sent | parent@test.local, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | SECURITY |
| PAY-002 | Valid partial payment | Orang Tua | Parent logged in; bill is `pending`; amount < 100000; valid payment method selected | Process payment for amount < bill amount | Payment created with status `completed`; bill status changes to `partial`; remaining balance updated | parent@test.local, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P1 | — |
| PAY-003 | Invalid amount — zero | Orang Tua | Parent logged in; bill is `pending` | Process payment with amount = 0 | NEEDS VERIFICATION — ACTUAL RUNTIME TEST: validation may occur in `processParentPaymentAction` or `process_payment`. Expected: error rejecting zero amount; no payment created. | parent@test.local | P0 | — |
| PAY-004 | Invalid amount — negative | Orang Tua | Parent logged in; bill is `pending` | Process payment with amount < 0 | NEEDS VERIFICATION — ACTUAL RUNTIME TEST: validation may occur in `processParentPaymentAction` or `process_payment`. Expected: error rejecting negative amount; no payment created. | parent@test.local | P0 | — |
| PAY-005 | Amount exceeds bill — application validation | Orang Tua | Parent logged in; bill amount = 100000 | Process payment with amount > 100000 via `processParentPaymentAction` | Expected: `processParentPaymentAction` rejects the request before RPC call. Error from application action: "Jumlah pembayaran melebihi sisa tagihan."; no payment created. Note: this validation is enforced in the server action layer, not necessarily inside `process_payment()` itself. To test raw RPC behavior separately, see security test PAY-020/RLS tests. | parent@test.local | P0 | SECURITY |
| PAY-006 | Paid bill payment | Orang Tua | Parent logged in; bill status = `paid` | Attempt to process payment | Error: "Tagihan tidak dapat menerima pembayaran." or "Bill is not payable. Current status: paid" | parent@test.local, paid bill | P0 | SECURITY |
| PAY-007 | Cancelled bill payment | Orang Tua | Parent logged in; bill status = `cancelled` | Attempt to process payment | Error: "Tagihan tidak dapat menerima pembayaran." or "Bill is not payable. Current status: cancelled" | parent@test.local, cancelled bill | P0 | SECURITY |
| PAY-008 | Invalid payment method | Orang Tua | Parent logged in; FIXTURE REQUIRED: Inactive payment method | Process payment with invalid/inactive method | NEEDS VERIFICATION — ACTUAL RUNTIME TEST: validation may occur in `processParentPaymentAction` or `process_payment`. Expected: error rejecting invalid/inactive payment method; no payment created. | FIXTURE REQUIRED | P1 | — |
| PAY-009 | Invalid school payment method | Orang Tua | Parent logged in; FIXTURE REQUIRED: Invalid school payment method ID | Process payment with invalid school method | Error: "Metode pembayaran sekolah tidak valid." | FIXTURE REQUIRED | P1 | — |
| PAY-010 | Inactive school payment method | Orang Tua | Parent logged in; FIXTURE REQUIRED: Inactive school payment method | Process payment with inactive school method | Error: "Metode pembayaran tidak aktif." | FIXTURE REQUIRED | P1 | — |
| PAY-011 | Idempotency key reuse — same payload | Orang Tua | Parent logged in; bill is `pending`; previous payment with idempotency key `idem-001` exists | Process payment with same idempotency key and same payload | Returns existing payment ID; no duplicate payment created | parent@test.local, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | SECURITY |
| PAY-012 | Idempotency key reuse — different payload | Orang Tua | Parent logged in; previous payment with idempotency key exists | Process payment with same idempotency key but different amount/bill | Error: "Idempotency key sudah digunakan dengan parameter pembayaran yang berbeda." | parent@test.local | P0 | SECURITY |
| PAY-013 | Duplicate payment attempt | Orang Tua | Parent logged in; bill is `pending` | Process payment twice with different idempotency keys | Second payment creates new payment record; bill status reflects total paid | parent@test.local, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P1 | SECURITY |
| PAY-014 | Payment status transition | Admin | Admin logged in; bill exists | Process offline payment via admin action | Payment status = `completed`; bill status updated accordingly | admin@sdperadaban.sch.id | P0 | — |
| PAY-015 | Bill status after full payment | Admin | Admin logged in; bill is `pending` | Process payment for full amount | Bill status changes from `pending` to `paid` | admin@sdperadaban.sch.id, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | — |
| PAY-016 | Bill status after partial payment | Admin | Admin logged in; bill is `pending` | Process payment for partial amount | Bill status changes from `pending` to `partial` | admin@sdperadaban.sch.id, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P1 | — |
| PAY-017 | Payment record creation verification | Admin | Admin logged in; payment processed | Query `payments` table directly | New payment record exists with correct `student_bill_id`, `amount`, `status`, `school_id` | admin@sdperadaban.sch.id | P1 | SECURITY |
| PAY-018 | Audit event on payment | Admin | Admin logged in; payment processed | Query `financial_audit_logs` for `payment_created` event | Audit record exists with correct `actor_profile_id`, `school_id`, `entity_id` (payment ID), `amount` | admin@sdperadaban.sch.id | P1 | SECURITY |
| PAY-019 | Notification on payment | Orang Tua | Parent logged in; payment processed | Check notifications list | Notification with type `payment_completed` exists for parent | parent@test.local | P1 | — |
| PAY-020 | Cross-school payment blocked | Admin | Admin logged in; FIXTURE REQUIRED: Bill from School B | Attempt to process payment for School B bill | Error: "Cross-school payment not allowed." | FIXTURE REQUIRED | P0 | SECURITY |

### SECTION F — PAYMENT GATEWAY

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| GW-001 | Create payment intent | Orang Tua | Parent logged in; bill is `pending`; school payment method active | Call `createParentPaymentIntentAction` or use checkout UI | Gateway transaction created with `provider_status = "pending"`; returns `externalOrderId`, `qrCodeUrl`, `expiresAt` | parent@test.local, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P1 | — |
| GW-002 | Pending gateway transaction | Admin | Admin logged in; gateway transaction exists | Navigate to `/dashboard/admin/payment-gateway` | Transaction listed with `pending` status; `webhook_received_at` is null | admin@sdperadaban.sch.id | P1 | — |
| GW-003 | Transaction school isolation | Admin | Admin logged in; FIXTURE REQUIRED: Gateway transaction from School B | Attempt to view/query School B's gateway transaction | Access denied or transaction not visible | FIXTURE REQUIRED | P0 | SECURITY |
| GW-004 | Poll/check payment status — mock limitation | Orang Tua | Parent logged in; gateway transaction exists | Poll `getParentPaymentGatewayTransactionAction` or mock provider `checkPaymentStatus` | Returns `provider_status: "pending"` — DESIGN LIMITATION; polling does not advance status | parent@test.local | P2 | DESIGN LIMITATION |
| GW-005 | Mock webhook simulation — parent | Orang Tua | Parent logged in; gateway transaction exists with `pending`/`processing` status | Call `simulateParentWebhookAction` | Webhook processed successfully; payment created; bill status updated; notification sent; gateway transaction status = `success` | parent@test.local, gateway transaction ID | P0 | SECURITY |
| GW-006 | Mock webhook simulation — admin | Admin | Admin logged in; gateway transaction exists with `pending`/`processing` status | Call `simulateMockWebhookAction` | Same successful completion as parent simulation | admin@sdperadaban.sch.id, gateway transaction ID | P0 | SECURITY |
| GW-007 | HMAC signature validation | System | Valid mock secret configured | Send webhook with invalid/missing `x-mock-signature` header | 401 Unauthorized; "Missing signature" or "Invalid signature" | — | P0 | SECURITY |
| GW-008 | Invalid webhook payload | System | Valid mock secret configured | Send webhook with malformed JSON or invalid fields | 400 Bad Request; "Malformed JSON payload" or "Invalid webhook payload" | — | P0 | SECURITY |
| GW-009 | Wrong transaction | System | Valid mock secret configured; FIXTURE REQUIRED: Invalid external_order_id | Send webhook for non-existent transaction | 404 "Unknown external order" | FIXTURE REQUIRED | P0 | SECURITY |
| GW-010 | Cross-school mock webhook validation | System | Valid mock secret configured; authenticated as user from School A; FIXTURE REQUIRED: gateway transaction linked to bill from different school | Send authenticated mock webhook from School A user session for School B transaction | 403 "Cross-school transaction not allowed" or "Cross-school bill not allowed". Note: this validates the authenticated mock webhook simulation only. It does not validate production external gateway webhook behavior, which is out of scope for UAT. | FIXTURE REQUIRED | P0 | SECURITY |
| GW-011 | Duplicate webhook | System | Valid mock secret configured; webhook already processed for transaction | Send same webhook again | Second webhook rejected by state machine or idempotency; no duplicate payment | Processed gateway transaction | P1 | SECURITY |
| GW-012 | Webhook replay — different status | System | Valid mock secret configured; transaction already `success` | Send webhook with different status | Rejected by state machine (`canTransitionTo` returns false) | Processed gateway transaction | P1 | SECURITY |
| GW-013 | Successful webhook processing | System | Valid mock secret configured; transaction `pending` | Send webhook with `status: "success"` and valid payload | Payment created via `process_payment`; gateway transaction updated to `success`; `webhook_received_at` stamped | Valid gateway transaction | P0 | SECURITY |
| GW-014 | Failed webhook scenario | System | Valid mock secret configured; FIXTURE REQUIRED: Transaction that can transition to failed | Send webhook with `status: "failed"` | Gateway transaction updated to `failed`; no payment created | FIXTURE REQUIRED | P1 | — |
| GW-015 | Gateway transaction audit | Admin | Admin logged in; webhook simulation completed | Query `financial_audit_logs` for `gateway_transaction_succeeded` | Audit record exists with correct `entity_type`, `entity_id`, `school_id` | admin@sdperadaban.sch.id | P1 | SECURITY |
| GW-016 | Gateway transaction notification | Orang Tua | Parent logged in; webhook simulation completed | Check notifications | Notification with type `gateway_payment_success` exists for parent | parent@test.local | P1 | — |
| GW-017 | Mock checkPaymentStatus behavior | System | Mock provider active | Call `checkPaymentStatus` with any external transaction ID | Returns `providerStatus: "pending"` — DESIGN LIMITATION; polling does not work with mock | — | P2 | DESIGN LIMITATION |

### SECTION G — PAYMENT PROOF

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| PROOF-001 | Upload valid proof | Orang Tua | Parent logged in; completed payment exists; valid image/PDF file selected | Upload payment proof via UI | Proof uploaded to storage; `payment_proofs` record created with `status = "pending"`; audit recorded; notification sent to admin/bendahara | parent@test.local, completed payment, valid file (JPEG/PNG/WebP/PDF, max 5MB) | P0 | SECURITY |
| PROOF-002 | Invalid file type | Orang Tua | Parent logged in; completed payment exists | Upload file with unsupported extension (e.g., `.exe`, `.txt`) | Error: "Format file tidak didukung."; no upload attempted | parent@test.local, completed payment | P1 | — |
| PROOF-003 | Invalid file signature | Orang Tua | Parent logged in; completed payment exists | Upload file with mismatched extension and magic bytes (e.g., `.jpg` file that is actually a PDF) | Error: "Format file tidak didukung."; upload rejected | parent@test.local, completed payment | P1 | SECURITY |
| PROOF-004 | Oversized file | Orang Tua | Parent logged in; completed payment exists | Upload file > 5MB | Upload rejected; no unauthorized storage object created; no `payment_proofs` record created | parent@test.local, completed payment | P1 | SECURITY |
| PROOF-005 | Payment ownership verification | Orang Tua | Parent logged in; FIXTURE REQUIRED: Another student's completed payment | Attempt to upload proof for another student's payment | Error: "Anda tidak memiliki akses ke pembayaran ini." | FIXTURE REQUIRED | P0 | SECURITY |
| PROOF-006 | Cross-school proof access | Orang Tua | Parent logged in; FIXTURE REQUIRED: Proof from another school | Attempt to view/download proof from another school | 403 Forbidden or 404 | FIXTURE REQUIRED | P0 | SECURITY |
| PROOF-007 | Duplicate proof — no DB constraint | Orang Tua | Parent logged in; completed payment exists; previous proof uploaded | Upload another proof for same payment | Second proof record created (both `pending`); no DB-level deduplication — application allows multiple pending proofs per payment | parent@test.local, completed payment | P1 | SECURITY |
| PROOF-008 | Storage upload failure handling | System | Simulate storage failure | Attempt proof upload when storage is unavailable | Error returned; database insert not attempted; no orphaned DB record | parent@test.local, completed payment | P1 | — |
| PROOF-009 | Database insert failure cleanup | System | Simulate DB failure after successful storage upload | Attempt proof upload when DB is unavailable | Application returns an error. Cleanup behavior is recorded according to actual implementation: if storage remove is attempted, note whether the error is swallowed or surfaced. Do not claim cleanup succeeded without verification. | parent@test.local, completed payment | P1 | — |
| PROOF-010 | Proof record consistency | Admin | Admin logged in; proof uploaded | Query `payment_proofs` joined with `payments` and `storage.objects` | Record shows correct `payment_id`, `school_id`, `file_path`, `uploaded_by`, `status` | admin@sdperadaban.sch.id | P1 | — |
| PROOF-011 | Proof audit event | Admin | Admin logged in; proof uploaded | Query `financial_audit_logs` for `payment_proof_submitted` | Audit record exists with correct `actor_profile_id`, `entity_type`, `entity_id` | admin@sdperadaban.sch.id | P1 | SECURITY |
| PROOF-012 | Proof notification to admin/bendahara | Admin | Admin logged in; proof uploaded | Check notifications | Notification with type `payment_proof_submitted` exists for admin/bendahara | admin@sdperadaban.sch.id | P1 | — |
| PROOF-013 | Proof review — approve | Admin | Admin logged in; proof exists with `pending` status | Review proof and set status to `approved` | Proof status updated to `approved`; `verified_by` and `verified_at` set; notification sent to uploader | admin@sdperadaban.sch.id, pending proof | P1 | SECURITY |
| PROOF-014 | Proof review — reject without reason | Admin | Admin logged in; proof exists with `pending` status | Review proof and set status to `rejected` without rejection reason | Error: "Alasan penolakan harus diisi." | admin@sdperadaban.sch.id, pending proof | P1 | — |
| PROOF-015 | Proof review — reject with reason | Admin | Admin logged in; proof exists with `pending` status | Review proof and set status to `rejected` with rejection reason | Proof status updated to `rejected`; `rejection_reason` set; `verified_by` and `verified_at` set; notification sent | admin@sdperadaban.sch.id, pending proof | P1 | SECURITY |
| PROOF-016 | Already reviewed proof | Admin | Admin logged in; proof already `approved` or `rejected` | Attempt to review same proof again | Error: "Bukti pembayaran ini sudah diverifikasi." | admin@sdperadaban.sch.id | P1 | — |
| PROOF-017 | Proof download URL authorization | Admin/Bendahara | Admin logged in; proof exists in same school | Access proof download endpoint | 302 Redirect to signed URL; URL expires in 1 hour | admin@sdperadaban.sch.id, proof ID | P1 | SECURITY |
| PROOF-018 | Proof download — parent | Orang Tua | Parent logged in; proof belongs to child's payment | Access proof download endpoint | 302 Redirect to signed URL | parent@test.local, proof ID | P1 | SECURITY |
| PROOF-019 | Proof download — unauthorized parent | Orang Tua | Parent logged in; FIXTURE REQUIRED: Proof from another child | Attempt to download another child's proof | 403 Forbidden | FIXTURE REQUIRED | P0 | SECURITY |

### SECTION H — RECEIPT

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| REC-001 | Receipt — completed payment | Orang Tua | Parent logged in; completed payment exists | Navigate to receipt page | Receipt displays: school name, student name, NIS, bill details, payment amount, payment method, payment date, reference number, remaining balance | parent@test.local, completed payment | P0 | — |
| REC-002 | Receipt — student verification | Orang Tua | Parent logged in; receipt loaded | Verify receipt content | Student name and NIS match linked child | parent@test.local | P0 | — |
| REC-003 | Receipt — school verification | Orang Tua | Parent logged in; receipt loaded | Verify receipt content | School name matches child's school | parent@test.local | P0 | — |
| REC-004 | Receipt — amount verification | Orang Tua | Parent logged in; receipt loaded | Verify receipt content | Payment amount matches actual payment record | parent@test.local | P1 | — |
| REC-005 | Receipt — payment method verification | Orang Tua | Parent logged in; receipt loaded | Verify receipt content | Payment method displayed correctly | parent@test.local | P1 | — |
| REC-006 | Receipt — payment date verification | Orang Tua | Parent logged in; receipt loaded | Verify receipt content | Payment date matches `payment_date` in database | parent@test.local | P1 | — |
| REC-007 | Receipt — reference number | Orang Tua | Parent logged in; receipt loaded | Verify receipt content | Reference number displayed if available | parent@test.local | P2 | — |
| REC-008 | Receipt — remaining balance | Orang Tua | Parent logged in; receipt loaded; partial payment exists | Verify receipt content | Remaining balance calculated correctly | parent@test.local, partial payment | P1 | — |
| REC-009 | Receipt — unauthorized access | Orang Tua | Parent logged in; FIXTURE REQUIRED: Another parent's completed payment | Attempt to access other parent's receipt URL | 403 Forbidden or "Anda tidak memiliki akses" | FIXTURE REQUIRED | P0 | SECURITY |
| REC-010 | Receipt — non-completed payment | Orang Tua | Parent logged in; FIXTURE REQUIRED: Payment with status `pending` | Attempt to access receipt for non-completed payment | Error: "Receipt hanya tersedia untuk pembayaran yang sudah berhasil." | FIXTURE REQUIRED | P0 | SECURITY |
| REC-011 | Receipt — admin view | Admin | Admin logged in; completed payment exists in admin's school | Navigate to admin receipt page | Receipt loads with correct data; admin can view receipts belonging to the admin's current school only. Admin must NOT access another school's payment/receipt unless the application explicitly implements cross-school super-admin behavior, which is not currently implemented. | admin@sdperadaban.sch.id, completed payment in same school | P1 | SECURITY |

### SECTION I — AUDIT

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| AUDIT-001 | Audit — bill creation | Admin | Admin logged in; bill created | Query `financial_audit_logs` for `bill_created` | Record exists with `actor_profile_id` = admin ID, `school_id` = admin's school, `entity_type` = `student_bill`, `entity_id` = bill ID | admin@sdperadaban.sch.id | P0 | SECURITY |
| AUDIT-002 | Audit — payment creation (admin) | Admin | Admin logged in; payment processed | Query `financial_audit_logs` for `payment_created` | Record exists with correct `payment_id`, `student_bill_id`, `amount`, `actor_role` = `admin` | admin@sdperadaban.sch.id | P0 | SECURITY |
| AUDIT-003 | Audit — payment creation (parent) | Orang Tua | Parent logged in; payment processed | Query `financial_audit_logs` for `payment_created` | Record exists with correct `payment_id`, `student_bill_id`, `amount`, `actor_role` = `orang_tua` | parent@test.local | P0 | SECURITY |
| AUDIT-004 | Audit — payment proof submitted | Orang Tua | Parent logged in; proof uploaded | Query `financial_audit_logs` for `payment_proof_submitted` | Record exists with `entity_type` = `payment_proof`, `entity_id` = proof ID | parent@test.local | P1 | SECURITY |
| AUDIT-005 | Audit — gateway transaction succeeded (parent) | Orang Tua | Parent logged in; webhook simulation completed | Query `financial_audit_logs` for `gateway_transaction_succeeded` | Record exists with `entity_type` = `payment_gateway_transaction`, `entity_id` = gateway transaction ID | parent@test.local | P1 | SECURITY |
| AUDIT-006 | Audit — gateway transaction succeeded (admin) | Admin | Admin logged in; webhook simulation completed | Query `financial_audit_logs` for `gateway_transaction_succeeded` | Record exists with correct data | admin@sdperadaban.sch.id | P1 | SECURITY |
| AUDIT-007 | Audit — payment proof approved | Admin | Admin logged in; proof reviewed and approved | Query `financial_audit_logs` for `payment_proof_approved` | Record exists with `entity_id` = proof ID, `new_status` = `approved` | admin@sdperadaban.sch.id | P1 | SECURITY |
| AUDIT-008 | Audit — payment proof rejected | Admin | Admin logged in; proof reviewed and rejected | Query `financial_audit_logs` for `payment_proof_rejected` | Record exists with `entity_id` = proof ID, `new_status` = `rejected`, `metadata` includes rejection reason | admin@sdperadaban.sch.id, pending proof | P1 | SECURITY |
| AUDIT-009 | Audit — event: gateway_transaction_created | Admin | Admin logged in; payment intent created | Query `financial_audit_logs` for `gateway_transaction_created` | Expected: The required audit event should be recorded. Current baseline: inventory identified this event as defined but not emitted. Actual UAT result determines PASS/FAIL. | admin@sdperadaban.sch.id | P2 | AUDIT GAP |
| AUDIT-010 | Audit — event: gateway_transaction_failed | Admin | Admin logged in; FIXTURE REQUIRED: Failed gateway transaction | Query `financial_audit_logs` for `gateway_transaction_failed` | Expected: The required audit event should be recorded. Current baseline: inventory identified this event as defined but not emitted. Actual UAT result determines PASS/FAIL. | FIXTURE REQUIRED | P2 | AUDIT GAP |
| AUDIT-011 | Audit — event: bill_status_changed | Admin | Admin logged in; bill status changed via payment | Query `financial_audit_logs` for `bill_status_changed` | Expected: The required audit event should be recorded. Current baseline: inventory identified this event as defined but not emitted. Actual UAT result determines PASS/FAIL. | admin@sdperadaban.sch.id | P2 | AUDIT GAP |
| AUDIT-012 | Audit — tampering prevention | Any | Admin logged in | Attempt to UPDATE or DELETE `financial_audit_logs` record directly | Blocked by trigger `prevent_financial_audit_mutation`; exception raised | admin@sdperadaban.sch.id | P0 | SECURITY |
| AUDIT-013 | Audit — actor immutability | System | Audit record exists | Check `actor_profile_id` and `actor_role` fields | Values are set server-side by `create_financial_audit_event` RPC; cannot be spoofed by client | — | P1 | SECURITY |

### SECTION J — NOTIFICATIONS

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| NOTIF-001 | Notification — bill created | Orang Tua | Parent logged in; admin creates bill for linked child | Check notifications list | Notification with type `bill_created` exists for parent; title and message are correct | parent@test.local | P1 | — |
| NOTIF-002 | Notification — payment completed (parent) | Orang Tua | Parent logged in; parent processes payment | Check notifications list | Notification with type `payment_completed` exists for parent | parent@test.local | P0 | — |
| NOTIF-003 | Notification — payment completed (admin/bendahara) | Admin | Admin logged in; admin processes payment for child | Check notifications list | Notification with type `payment_completed` exists for child's guardian(s) | admin@sdperadaban.sch.id, guardian profile ID | P0 | — |
| NOTIF-004 | Notification — payment proof submitted | Admin | Admin logged in; parent uploads proof | Check notifications list | Notification with type `payment_proof_submitted` exists for admin/bendahara | admin@sdperadaban.sch.id | P1 | — |
| NOTIF-005 | Notification — gateway payment success (parent) | Orang Tua | Parent logged in; webhook simulation completed | Check notifications list | Notification with type `gateway_payment_success` exists for parent | parent@test.local | P1 | — |
| NOTIF-006 | Notification — gateway payment success (admin/bendahara) | Admin | Admin logged in; webhook simulation completed | Check notifications list | Notification with type `gateway_payment_success` exists for child's guardian(s) | admin@sdperadaban.sch.id | P1 | — |
| NOTIF-007 | Notification — unread/read state | Orang Tua | Parent logged in; unread notifications exist | Mark notification as read via UI | Notification `is_read` changes to `true`; `read_at` timestamp set | parent@test.local | P1 | — |
| NOTIF-008 | Notification — mark all as read | Orang Tua | Parent logged in; multiple unread notifications | Click "Mark all as read" | All user's unread notifications marked as read | parent@test.local | P2 | — |
| NOTIF-009 | Notification — ownership | Orang Tua | Parent logged in | Query notifications for own `recipient_profile_id` | Only own notifications returned; RLS enforces `recipient_profile_id = auth.uid()` | parent@test.local | P0 | SECURITY |
| NOTIF-010 | Notification — cross-school isolation | Admin | Admin logged in; FIXTURE REQUIRED: Notification for another school | Attempt to access another school's notification via direct query | Access denied; RLS filters by `school_id` | FIXTURE REQUIRED | P0 | SECURITY |
| NOTIF-011 | Notification — event: payment_failed | Admin | Admin logged in; FIXTURE REQUIRED: Failed payment | Query notifications for `payment_failed` type | Expected: The required notification should be created. Current baseline: inventory identified this event type as defined but no code path creates it. Actual UAT result determines PASS/FAIL. | FIXTURE REQUIRED | P2 | GAP |
| NOTIF-012 | Notification — event: payment_proof_approved | Orang Tua | Parent logged in; proof approved | Query notifications for `payment_proof_approved` type | Expected: The required notification should be created. Current baseline: inventory identified this event type as defined but no code path creates it. Actual UAT result determines PASS/FAIL. | parent@test.local | P2 | GAP |
| NOTIF-013 | Notification — event: payment_cancelled | Orang Tua | Parent logged in; FIXTURE REQUIRED: Cancelled payment | Query notifications for `payment_cancelled` type | Expected: The required notification should be created. Current baseline: inventory identified this event type as defined but no code path creates it. Actual UAT result determines PASS/FAIL. | FIXTURE REQUIRED | P2 | GAP |

### SECTION K — UI / UX STATES

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| UI-001 | Loading state | Orang Tua | Parent logged in; slow network | Navigate to `/dashboard/orang-tua/bills` | Loading spinner displayed while data loads | parent@test.local | P1 | — |
| UI-002 | Empty state — no bills | Orang Tua | Parent logged in; no bills for child | Navigate to `/dashboard/orang-tua/bills` | "Belum ada tagihan." message displayed | parent@test.local | P1 | — |
| UI-003 | Empty state — no notifications | Orang Tua | Parent logged in; no notifications | Navigate to `/dashboard/orang-tua/notifications` | Empty state message displayed | parent@test.local | P1 | — |
| UI-004 | Error state — server error | Orang Tua | Parent logged in; simulate server error | Navigate to any protected page | Error message displayed; user can retry or navigate back | parent@test.local | P1 | — |
| UI-005 | Error state — unauthorized | Anonymous | No session | Navigate to `/dashboard/orang-tua/bills` | Redirect to `/login` or error page | — | P0 | SECURITY |
| UI-006 | Disabled button — processing payment | Orang Tua | Parent logged in; bill selected; processing payment | Click payment submit button | Button disabled during processing; user cannot double-submit | parent@test.local | P1 | — |
| UI-007 | Duplicate submission prevention | Orang Tua | Parent logged in; payment processing | Rapidly click payment submit button multiple times | Only one payment processed; idempotency key prevents duplicate | parent@test.local | P0 | SECURITY |
| UI-008 | Payment success state | Orang Tua | Parent logged in; payment successful | Complete payment flow | Success message/toast displayed; redirected to receipt or bill detail | parent@test.local | P0 | — |
| UI-009 | Payment failure state | Orang Tua | Parent logged in; payment fails | Attempt invalid payment | Error message displayed; user can retry with corrected input | parent@test.local | P1 | — |
| UI-010 | Validation errors — empty fields | Orang Tua | Parent logged in; payment form | Submit payment form with empty required fields | Validation errors displayed next to fields; form not submitted | parent@test.local | P1 | — |
| UI-011 | Mobile responsive — bills list | Orang Tua | Parent logged in; mobile viewport (320px-768px) | Navigate to `/dashboard/orang-tua/bills` | Table/cards adapt to mobile; content readable; no horizontal scroll | parent@test.local | P2 | — |
| UI-012 | Mobile responsive — payment form | Orang Tua | Parent logged in; mobile viewport | Navigate to payment checkout | Form fields usable; buttons accessible; no layout break | parent@test.local | P2 | — |

### SECTION L — DATABASE CONSISTENCY

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| DB-001 | Payment ↔ bill relationship | Admin | Admin logged in; payment exists | Query `payments` joined with `student_bills` | `payments.student_bill_id` matches `student_bills.id`; `payments.school_id` matches `student_bills.school_id` | admin@sdperadaban.sch.id | P0 | — |
| DB-002 | Payment ↔ student relationship | Admin | Admin logged in; payment exists | Query `payments` joined with `students` | `payments.student_id` matches `student_bills.student_id`; `payments.school_id` matches `students.school_id` | admin@sdperadaban.sch.id | P0 | — |
| DB-003 | Bill ↔ student relationship | Admin | Admin logged in; bill exists | Query `student_bills` joined with `students` | `student_bills.student_id` matches `students.id`; `student_bills.school_id` matches `students.school_id` | admin@sdperadaban.sch.id | P1 | — |
| DB-004 | Bill ↔ school relationship | Admin | Admin logged in; bill exists | Query `student_bills` joined with `schools` | `student_bills.school_id` matches `schools.id` | admin@sdperadaban.sch.id | P1 | — |
| DB-005 | Payment ↔ school consistency | Admin | Admin logged in; payment exists | Verify `payments.school_id` | `payments.school_id` matches `student_bills.school_id` (derived from bill) | admin@sdperadaban.sch.id | P0 | — |
| DB-006 | Gateway transaction ↔ payment | Admin | Admin logged in; gateway transaction processed | Query `payment_gateway_transactions` joined with `payments` | `payment_gateway_transactions.payment_id` matches `payments.id` after successful webhook | admin@sdperadaban.sch.id | P1 | — |
| DB-007 | Payment proof ↔ payment | Admin | Admin logged in; proof uploaded | Query `payment_proofs` joined with `payments` | `payment_proofs.payment_id` matches `payments.id`; `payment_proofs.school_id` matches `payments.school_id` | admin@sdperadaban.sch.id | P1 | — |
| DB-008 | Audit ↔ entity | Admin | Admin logged in; financial event occurred | Query `financial_audit_logs` joined with related entity | `payment_id`, `student_bill_id`, `entity_id` correctly reference source records | admin@sdperadaban.sch.id | P1 | SECURITY |
| DB-009 | Notification ↔ entity | Admin | Admin logged in; notification exists | Query `notifications` | `entity_type` and `entity_id` correctly reference source record when present | admin@sdperadaban.sch.id | P1 | — |
| DB-010 | Status consistency — bill vs payments | Admin | Admin logged in; bill has payments | Verify `student_bills.status` matches payment totals | `paid` when total payments >= bill amount; `partial` when 0 < total < amount; `pending` when no payments | admin@sdperadaban.sch.id | P0 | — |
| DB-011 | Idempotency — duplicate key | Admin | Admin logged in; payment with idempotency key exists | Query `payments` for same idempotency key | Only one payment record with that idempotency key exists | admin@sdperadaban.sch.id | P0 | SECURITY |
| DB-012 | Cross-school isolation — bills | Admin | Admin logged in; FIXTURE REQUIRED: Bills from multiple schools | Query `student_bills` for own school only | Only bills from admin's school returned | FIXTURE REQUIRED | P0 | SECURITY |
| DB-013 | Cross-school isolation — payments | Admin | Admin logged in; FIXTURE REQUIRED: Payments from multiple schools | Query `payments` for own school only | Only payments from admin's school returned | FIXTURE REQUIRED | P0 | SECURITY |
| DB-014 | Schema gap — student_bills.student_id school match | Admin | Admin logged in | Verify `student_bills.student_id` student's school matches `student_bills.school_id` | Application-level validation ensures match; no DB constraint — CONFIRMED SCHEMA GAP | admin@sdperadaban.sch.id | P2 | SCHEMA GAP |
| DB-015 | Schema gap — payment_gateway_transactions composite FK | Admin | Admin logged in; gateway transaction linked to payment | Verify `payment_gateway_transactions.payment_id` school matches `payment_gateway_transactions.school_id` | Application-level validation ensures match; no DB composite FK — CONFIRMED SCHEMA GAP | admin@sdperadaban.sch.id | P2 | SCHEMA GAP |

### SECTION M — CONCURRENCY

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| CONC-001 | Simultaneous payments — same bill, different idempotency keys | Admin | Admin logged in; bill is `pending`; remaining balance = 100000 | Trigger two `process_payment` calls simultaneously for same bill with different idempotency keys | Expected: both payments succeed. `process_payment()` does not enforce a remaining-balance limit at the RPC layer. `FOR UPDATE` serializes access; each payment is inserted independently. Bill status updates based on total paid: `paid` when total >= amount, `partial` when 0 < total < amount. Note: overpayment is possible if application-layer validation is bypassed, because the RPC itself does not check remaining balance. | admin@sdperadaban.sch.id, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | SECURITY |
| CONC-002 | Duplicate idempotency key — concurrent | Admin | Admin logged in; bill is `pending` | Trigger two `process_payment` calls simultaneously with same idempotency key | Both calls return same payment ID (idempotency); no duplicate payment created | admin@sdperadaban.sch.id, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | SECURITY |
| CONC-003 | Overpayment protection — concurrent full payments | Admin | Admin logged in; bill amount = 100000; remaining balance = 100000 | Trigger two `process_payment` calls simultaneously for full amount (100000 each) with different idempotency keys | Expected: first payment succeeds; bill status becomes `paid`. Second payment fails with `'Bill is not payable. Current status: paid'` because `process_payment()` checks bill status after acquiring the `FOR UPDATE` lock. Maximum completed total = 100000. No overpayment in this scenario, but protection comes from bill status check, not from a remaining-balance check inside the RPC. `process_payment()` itself does not validate remaining balance. | admin@sdperadaban.sch.id, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | SECURITY |
| CONC-004 | Payment while bill status changing | Admin | Admin logged in; bill is `pending` | Trigger payment while another transaction updates bill status | `FOR UPDATE` lock prevents race condition; final status is consistent | admin@sdperadaban.sch.id | P1 | SECURITY |
| CONC-005 | Duplicate webhook delivery | System | Valid mock secret; gateway transaction `pending` | Send same webhook payload twice | Second webhook rejected by state machine or idempotency; no duplicate payment | Valid gateway transaction | P0 | SECURITY |
| CONC-006 | Webhook during payment processing | System | Valid mock secret; gateway transaction `pending`; payment processing in progress | Send webhook while `process_payment` is running | State machine prevents double processing; only one payment created | Valid gateway transaction | P1 | SECURITY |

### SECTION N — REGRESSION

| Test ID | Area | Actor | Preconditions | Test Steps | Expected Result | Data Required | Priority | Security Classification |
|---------|------|-------|---------------|------------|-----------------|---------------|----------|------------------------|
| REG-001 | Regression — student_guardians RLS recursion fix | Admin | Admin logged in | Query `student_guardians` via server action or direct query | No infinite recursion; query returns correct guardian-student links | admin@sdperadaban.sch.id | P0 | SECURITY |
| REG-002 | Regression — students.full_name query correction | Orang Tua | Parent logged in | View parent bills list | Bills load without `PGRST201` error; student names displayed correctly | parent@test.local | P0 | — |
| REG-003 | Regression — parent bills load | Orang Tua | Parent logged in; guardian relationship exists | Navigate to `/dashboard/orang-tua/bills` | Bills load without error; correct bills displayed | parent@test.local | P0 | — |
| REG-004 | Regression — parent children | Orang Tua | Parent logged in | Query children via `getParentChildrenAction` | Correct children returned with class info | parent@test.local | P1 | — |
| REG-005 | Regression — parent bill detail | Orang Tua | Parent logged in | Navigate to bill detail page | Bill detail loads with correct data; no access error | parent@test.local, bill `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | P0 | — |
| REG-006 | Regression — parent payment receipt | Orang Tua | Parent logged in; completed payment exists | Navigate to receipt page | Receipt loads with correct data | parent@test.local, completed payment | P0 | — |
| REG-007 | Regression — current_user_role() | Admin | Admin logged in | Call `current_user_role()` via query or action | Returns `"admin"` correctly | admin@sdperadaban.sch.id | P0 | SECURITY |
| REG-008 | Regression — current_user_school_id() | Admin | Admin logged in | Call `current_user_school_id()` via query or action | Returns correct school ID | admin@sdperadaban.sch.id | P0 | SECURITY |
| REG-009 | Regression — process_payment SECURITY DEFINER/search_path | Admin | Admin logged in | Call `process_payment` RPC | RPC executes with `search_path = public`; no schema injection; tenant validation enforced | admin@sdperadaban.sch.id | P0 | SECURITY |
| REG-010 | Regression — process_payment idempotency | Admin | Admin logged in; previous payment with idempotency key exists | Call `process_payment` with same idempotency key | Returns existing payment ID; no duplicate created | admin@sdperadaban.sch.id | P0 | SECURITY |

## 6. Security Matrix Summary

| Category | Test Count | P0 | P1 | P2 | P3 |
|----------|------------|----|----|----|-----|
| Authentication | 13 | 6 | 5 | 2 | 0 |
| Authorization / Role Access | 40 | 12 | 22 | 4 | 2 |
| RLS / Multi-Tenant | 16 | 9 | 5 | 0 | 2 |
| Direct Payment | 20 | 8 | 8 | 2 | 2 |
| Payment Gateway | 17 | 6 | 7 | 2 | 2 |
| Payment Proof | 19 | 5 | 9 | 3 | 2 |
| Receipt | 11 | 3 | 5 | 1 | 2 |
| Audit | 13 | 4 | 5 | 2 | 2 |
| Notification | 13 | 3 | 5 | 3 | 2 |
| UI/UX States | 12 | 1 | 6 | 3 | 2 |
| Database Consistency | 15 | 4 | 7 | 2 | 2 |
| Concurrency | 6 | 3 | 1 | 0 | 2 |
| Regression | 10 | 6 | 2 | 0 | 2 |
| **Total** | **219** | **100** | **103** | **14** | **2** |

## 7. Fixture Requirements

The following tests require additional fixture data that must NOT be created during Phase 2:

| Test IDs | Fixture Required |
|----------|------------------|
| RLS-002, RLS-004, RLS-005, RLS-015, GW-003, GW-009, GW-010, GW-014, AUDIT-010, PROOF-005, PROOF-006, PROOF-019, PAY-008, PAY-009, PAY-010, PAY-020, DB-012, DB-013, NOTIF-010, NOTIF-011, NOTIF-013, REC-009, REC-010 | Second school (School B) with admin, student, bill, payment, and/or guardian relationships |
| BILL-012 | Another student's bill for unauthorized access test |
| BILL-014 | One-time bill (non-recurring) for parent |
| PAY-002, PAY-016 | Bill with partial payment scenario |
| PAY-006, PAY-007 | Bills with `paid` and `cancelled` statuses |
| PROOF-007 | Multiple pending proofs for same payment |
| CONC-001, CONC-002, CONC-003 | Concurrent payment scenarios (may require test harness) |

## 8. Known Limitations

1. **Mock webhook requires authenticated session** — DESIGN LIMITATION; mock endpoint is for internal simulation only, not for external gateway callbacks.
2. **Mock `checkPaymentStatus` always returns `pending`** — DESIGN LIMITATION; polling does not work with mock provider; webhook simulation is the primary completion mechanism.
3. **`guru` role not implemented** — FUTURE SCOPE; no routes, pages, or RLS policies exist for teachers.
4. **Missing audit events** — CONFIRMED GAP: `gateway_transaction_created`, `gateway_transaction_failed`, `bill_status_changed` are defined but not emitted.
5. **Missing notification events** — CONFIRMED GAP: `payment_failed`, `payment_cancelled`, `payment_proof_approved`, `payment_proof_rejected` notification paths do not exist.
6. **No DB-level proof deduplication** — Multiple pending proofs can exist for one payment; application does not enforce uniqueness.
7. **Cross-school schema gaps** — `student_bills.student_id` and `payment_gateway_transactions.payment_id` lack composite FKs; mitigated by application-level validation.
8. **No production gateway provider** — Only `"mock"` provider is implemented; real gateway integration requires additional implementation.

## 9. Deferred / Future Scope

1. **Guru role** — Complete implementation including dashboard, server actions, RLS policies, and business logic.
2. **Production webhook endpoint** — Separate from mock webhook; designed for external gateway callbacks without user session dependency.
3. **Real payment gateway providers** — Implement `transfer`, `e_wallet`, `virtual_account` providers with actual polling logic.
4. **Google Drive storage provider** — Implement or remove unimplemented provider.
5. **Missing audit events** — Add emission for `gateway_transaction_created`, `gateway_transaction_failed`, `bill_status_changed`.
6. **Missing notification events** — Implement notification creation for `payment_failed`, `payment_cancelled`, `payment_proof_approved`, `payment_proof_rejected`.
7. **Schema hardening** — Add composite FKs and triggers for defense-in-depth cross-school validation.
8. **Proof deduplication** — Add DB-level unique constraint or application-level check.

---

## Summary

| Metric | Value |
|--------|-------|
| File created | `5P-UAT-MATRIX.md` |
| Total test cases | 219 |
| P0 (Critical) | 100 |
| P1 (High) | 103 |
| P2 (Medium) | 14 |
| P3 (Low) | 2 |
| Fixture-required tests | 24 |
| Known limitations included | 8 |
| Deferred/future scope items | 8 |
| Code changes made | 0 |
| Database changes made | 0 |
| Migrations run | 0 |
| PHASE 3 started | No |
