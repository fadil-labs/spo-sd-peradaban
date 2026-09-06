# 5P-UAT-CRITICAL-CHECKPOINT-A.md

## Checkpoint A — Schema Fix & Pre-UAT State

**Date:** 2026-09-03  
**Phase:** Phase 2 — Preparation for UAT  
**Status:** BLOCKED — awaiting test data seeding

---

## 1. Schema Mismatch Fixed

The application code was written assuming the `students` table contained columns `name`, `gender`, and `date_of_birth`. The actual database schema (from migrations `20240100_base_schema.sql`) defines:

| Actual Column | Application Assumed | Action Taken |
|---------------|---------------------|--------------|
| `full_name`   | `name`              | Updated all references from `student.name` / `students.name` to `student.full_name` / `students.full_name` |
| `birth_date`  | `date_of_birth`     | Removed `date_of_birth` form field; birth_date is not exposed in CRUD for now |
| *(missing)*   | `gender`            | Removed gender field from student CRUD form and actions |

### Files Modified

- `src/app/dashboard/admin/students/actions.ts`
- `src/app/dashboard/admin/students/page.tsx`
- `src/app/dashboard/admin/actions.ts`
- `src/app/dashboard/admin/enrollments/actions.ts`
- `src/app/dashboard/admin/enrollments/page.tsx`
- `src/app/dashboard/admin/student-bills/actions.ts`
- `src/app/dashboard/admin/student-bills/page.tsx`
- `src/app/dashboard/admin/student-bills/[id]/BillDetailClient.tsx`
- `src/app/dashboard/admin/guardians/page.tsx`
- `src/app/dashboard/admin/payment-proofs/actions.ts`
- `src/app/dashboard/admin/payment-proofs/PaymentProofsClient.tsx`
- `src/app/dashboard/admin/page.tsx`
- `src/app/dashboard/admin/payment-gateway/actions.ts`
- `src/app/dashboard/admin/payment-gateway/PaymentGatewayClient.tsx`
- `src/app/dashboard/admin/financial-reports/actions.ts`
- `src/app/dashboard/admin/payments/actions.ts`
- `src/app/dashboard/admin/payments/PaymentsClient.tsx`
- `src/app/dashboard/orang-tua/payments/actions.ts`
- `src/app/dashboard/orang-tua/payments/PaymentHistoryClient.tsx`
- `src/app/dashboard/orang-tua/payments/receipt/[paymentId]/PaymentReceiptClient.tsx`
- `src/app/dashboard/orang-tua/bills/page.tsx`
- `src/app/dashboard/orang-tua/bills/[id]/ParentBillDetailClient.tsx`
- `src/app/dashboard/orang-tua/payments/[billId]/PaymentCheckoutClient.tsx`
- `src/app/dashboard/bendahara/actions.ts`
- `src/app/dashboard/bendahara/page.tsx`
- `src/app/api/admin/payment-gateway/route.ts`
- `src/app/api/payment-proofs/route.ts`

---

## 2. Current Database State

| Table | Row Count | Notes |
|-------|-----------|-------|
| `schools` | 0 | Empty |
| `profiles` | 0 | Empty |
| `students` | 0 | Empty |
| `student_bills` | 0 | Empty |
| `payments` | 0 | Empty |
| `payment_proofs` | 0 | Empty |
| `academic_years` | 0 | Empty |
| `classes` | 0 | Empty |
| `student_enrollments` | 0 | Empty |
| `student_guardians` | 0 | Empty |
| `payment_categories` | 0 | Empty |
| `payment_methods` | 0 | Empty |
| `school_payment_methods` | 0 | Empty |
| `audit_logs` | 0 | Empty |
| `financial_audit_logs` | 0 | Empty |
| `notifications` | 0 | Empty |
| `payment_gateway_transactions` | 0 | Empty |

**Migrations applied:** `20240100` through `20240116` confirmed present.  
**RLS enabled:** Yes (verified via `students` table query returning empty array with anon key).

---

## 3. Preconditions Status

| # | Precondition | Status |
|---|--------------|--------|
| 1 | All migrations applied | PASS |
| 2 | Base schema tables exist and RLS is enabled | PASS |
| 3 | Storage bucket `payment-proofs` exists with RLS | UNVERIFIED |
| 4 | Operational seed data present | FAIL — database is empty |
| 5 | Application running at localhost:3000 | PASS |
| 6 | Test accounts accessible with known credentials | FAIL — no auth.users / profiles records exist |
| 7 | `MOCK_PAYMENT_WEBHOOK_SECRET` set | PASS (value: `replace_me`) |

---

## 4. P0 Test Execution Plan

### 4.1 AUTH P0 Tests

| Test ID | Description | Expected | Actual |
|---------|-------------|----------|--------|
| AUTH-001 | Admin login → `/dashboard/admin` | 302 redirect + dashboard loads | **BLOCKED** — no admin user exists |
| AUTH-002 | Bendahara login → `/dashboard/bendahara` | 302 redirect + dashboard loads | **BLOCKED** — no bendahara user exists |
| AUTH-003 | Orang Tua login → `/dashboard/orang-tua` | 302 redirect + dashboard loads | **BLOCKED** — no orang_tua user exists |
| AUTH-004 | Invalid credentials | Error message, stays on login | **READY** — can test once app is accessible |
| AUTH-006 | Logout | Redirect to `/login`, session cleared | **BLOCKED** — requires logged-in user |
| AUTH-007 | Anonymous → `/dashboard/admin` | Redirect to `/login` | **READY** |
| AUTH-008 | Anonymous → `/dashboard/orang-tua/bills` | Redirect to `/login` | **READY** |
| AUTH-010 | `/api/auth/me` unauthenticated | 401 | **READY** |
| AUTH-011 | `/api/auth/me` returns role=admin | role = "admin" | **BLOCKED** — no admin user |

### 4.2 AUTHZ P0 Tests

| Test ID | Description | Expected | Actual |
|---------|-------------|----------|--------|
| AUTHZ-001 | Admin dashboard access | Dashboard loads | **BLOCKED** — no admin user |
| AUTHZ-019 | Bendahara dashboard access | Dashboard loads | **BLOCKED** — no bendahara user |
| AUTHZ-027 | Parent dashboard access | Dashboard loads with child data | **BLOCKED** — no parent user |
| AUTHZ-016 | Admin offline payment processing | Payment created, audit recorded | **BLOCKED** — no data |
| AUTHZ-026 | Bendahara audit logs access | Audit log list loads | **BLOCKED** — no data |
| AUTHZ-034 | Parent offline payment | Payment created | **BLOCKED** — no data |
| AUTHZ-038 | Parent admin page access | Redirect/denied | **BLOCKED** — no parent user |

### 4.3 RLS P0 Tests

| Test ID | Description | Expected | Actual |
|---------|-------------|----------|--------|
| RLS-001 | Admin same-school access | Data returned for own school | **BLOCKED** — no admin user or school data |
| RLS-007 | Admin school isolation | Cannot access other school data | **BLOCKED** — requires School B fixture |
| RLS-003 | Parent child isolation | Only linked child data returned | **BLOCKED** — no parent user or guardian relationship |
| RLS-008 | Parent cannot INSERT student_bills | INSERT blocked by RLS | **BLOCKED** — requires parent user |
| RLS-013 | UUID tampering bill ID | Access denied | **BLOCKED** — requires existing bill |

---

## 5. Test Data Seeding Plan

To unblock UAT, the following seed data must be inserted into the database:

### 5.1 Auth Users (auth.users)

| Email | Password | Role |
|-------|----------|------|
| admin@sdperadaban.sch.id | [to be set] | admin |
| bendahara@sdperadaban.sch.id | [to be set] | bendahara |
| parent@test.local | [to be set] | orang_tua |

### 5.2 Profiles

| Profile ID | User ID | School ID | Role | Full Name | Email |
|------------|---------|-----------|------|-----------|-------|
| [uuid] | admin user id | `11111111-1111-1111-1111-111111111111` | admin | Admin Peradaban | admin@sdperadaban.sch.id |
| [uuid] | bendahara user id | `11111111-1111-1111-1111-111111111111` | bendahara | Bendahara Peradaban | bendahara@sdperadaban.sch.id |
| `755ad1cf-9801-4e07-8316-8139db0981d4` | parent user id | `11111111-1111-1111-1111-111111111111` | orang_tua | Orang Tua Pertama | parent@test.local |

### 5.3 School

| ID | Name |
|----|------|
| `11111111-1111-1111-1111-111111111111` | SD Peradaban |

### 5.4 Academic Year

| ID | School ID | Name | Start Date | End Date | Active |
|----|-----------|------|------------|----------|--------|
| [uuid] | `11111111-...` | 2026/2027 | 2026-07-01 | 2027-06-30 | true |

### 5.5 Class

| ID | School ID | Academic Year ID | Name | Grade Level |
|----|-----------|-----------------|------|-------------|
| [uuid] | `11111111-...` | [academic year id] | Kelas 1A | 1 |

### 5.6 Student

| ID | School ID | NIS | Full Name | Birth Date | Address | Status |
|----|-----------|-----|-----------|------------|---------|--------|
| `44444444-4444-4444-4444-444444444444` | `11111111-...` | 001 | Siswa Pertama | null | null | active |

### 5.7 Student Enrollment

| ID | School ID | Student ID | Academic Year ID | Class ID |
|----|-----------|------------|-----------------|----------|
| [uuid] | `11111111-...` | `44444444-...` | [academic year id] | [class id] |

### 5.8 Student Guardian

| ID | Student ID | Guardian Profile ID | Relationship |
|----|------------|---------------------|--------------|
| `97d46779-92cd-42be-a9a6-ea308c86007c` | `44444444-...` | `755ad1cf-...` | orang_tua |

### 5.9 Payment Category

| ID | School ID | Name | Recurring |
|----|-----------|------|-----------|
| [uuid] | `11111111-...` | SPP | true |

### 5.10 Payment Methods (seed from migration `20240107`)

The migration seeds 9 payment methods. Verify they exist.

### 5.11 School Payment Methods

| ID | School ID | Payment Method ID | Active |
|----|-----------|-------------------|--------|
| [uuid] | `11111111-...` | [qr method id] | true |
| [uuid] | `11111111-...` | [transfer method id] | true |
| [uuid] | `11111111-...` | [va method id] | true |

### 5.12 Bill Template

| ID | School ID | Student ID | Payment Category ID | Class ID | Amount | Recurring |
|----|-----------|------------|---------------------|----------|--------|-----------|
| [uuid] | `11111111-...` | `44444444-...` | [category id] | [class id] | 100000 | true |

### 5.13 Student Bill

| ID | School ID | Student ID | Payment Category ID | Bill Template ID | Amount | Due Date | Status |
|----|-----------|------------|---------------------|------------------|--------|----------|--------|
| `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | `11111111-...` | `44444444-...` | [category id] | [template id] | 100000 | 2026-09-01 | pending |

---

## 6. Seeding SQL (for Supabase SQL Editor)

Run the following in Supabase Studio SQL Editor after creating auth users and profiles:

```sql
-- School
INSERT INTO public.schools (id, name, address, phone, email)
VALUES ('11111111-1111-1111-1111-111111111111', 'SD Peradaban', null, null, null)
ON CONFLICT (id) DO NOTHING;

-- Academic Year
INSERT INTO public.academic_years (id, school_id, name, start_date, end_date, is_active)
VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2026/2027', '2026-07-01', '2027-06-30', true);

-- Class (use the academic_year_id returned above)
INSERT INTO public.classes (id, school_id, academic_year_id, name, grade_level)
VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (SELECT id FROM academic_years WHERE school_id = '11111111-1111-1111-1111-111111111111' LIMIT 1), 'Kelas 1A', '1');

-- Student
INSERT INTO public.students (id, school_id, nis, full_name, status)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '001', 'Siswa Pertama', 'active')
ON CONFLICT (id) DO NOTHING;

-- Guardian relationship
INSERT INTO public.student_guardians (id, student_id, guardian_profile_id, relationship)
VALUES ('97d46779-92cd-42be-a9a6-ea308c86007c', '44444444-4444-4444-4444-444444444444', '755ad1cf-9801-4e07-8316-8139db0981d4', 'orang_tua')
ON CONFLICT (id) DO NOTHING;

-- Payment category
INSERT INTO public.payment_categories (id, school_id, name, is_recurring)
VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'SPP', true);

-- Bill template
INSERT INTO public.bill_templates (id, school_id, student_id, payment_category_id, class_id, amount, is_recurring)
VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', (SELECT id FROM payment_categories WHERE school_id = '11111111-1111-1111-1111-111111111111' AND name = 'SPP' LIMIT 1), (SELECT id FROM classes WHERE school_id = '11111111-1111-1111-1111-111111111111' LIMIT 1), 100000, true);

-- Student bill
INSERT INTO public.student_bills (id, school_id, student_id, payment_category_id, bill_template_id, amount, due_date, status)
VALUES ('9ab4551f-29c4-4f64-85cd-ec9b77192eb3', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', (SELECT id FROM payment_categories WHERE school_id = '11111111-1111-1111-1111-111111111111' AND name = 'SPP' LIMIT 1), (SELECT id FROM bill_templates WHERE school_id = '11111111-1111-1111-1111-111111111111' LIMIT 1), 100000, '2026-09-01', 'pending')
ON CONFLICT (id) DO NOTHING;
```

---

## 7. Auth User Creation Note

Auth users must be created via Supabase Auth (not directly in `auth.users`). Use one of:
- Supabase Dashboard → Authentication → Users → Create User
- Supabase CLI: `supabase auth users create --email admin@sdperadaban.sch.id --password <password>`
- REST API: `POST /auth/v1/admin/users` (requires `service_role` key)

After creating auth users, insert corresponding rows into `public.profiles` with the correct `school_id` and `role`.

---

## 8. Immediate Next Steps

1. **Create auth users** via Supabase Dashboard or CLI with `service_role` access
2. **Insert profiles** for each auth user
3. **Run the seed SQL** above in Supabase Studio SQL Editor
4. **Verify `/dashboard/admin/students` loads** without `42703` column error
5. **Execute AUTH P0 tests** (AUTH-001 through AUTH-013)
6. **Execute AUTHZ P0 tests** (AUTHZ-001 through AUTHZ-026)
7. **Execute RLS P0 tests** (RLS-001, RLS-007, RLS-003)
8. **Write final checkpoint document** with pass/fail results

---

## 9. Known Limitations

- `gender` column removed from student schema alignment. If business requires gender tracking, a new migration must be added.
- `birth_date` is present in DB but not exposed in student CRUD form yet (can be added back if needed).
- Email confirmation is required for auth users; `mailer_autoconfirm` is `false` in this project.
