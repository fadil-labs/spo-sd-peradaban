# ENVIRONMENT RESTORATION REPORT

## 1. OBJECTIVE

Prepare the operational seed data and verification package required to unblock Phase 3 UAT execution for SPO SD Peradaban.

**Scope:** Environment restoration only. No application source code changes. No deployment. No Supabase project creation.

---

## 2. CURRENT STATE

| Component | Status |
|-----------|--------|
| Migrations applied | 20240100 through 20240116 |
| Database tables | Created, RLS enabled |
| Seed data | **EMPTY** — no operational records exist |
| Auth users | **EMPTY** — no auth.users records exist |
| Application | Running at localhost:3000 |
| Mock webhook secret | Set (`replace_me`) |

**Blocker:** Phase 3 UAT cannot execute AUTH/AUTHZ/RLS tests until school, profiles, student, bill, and auth users exist.

---

## 3. SEED STRATEGY

Because `auth.users` records cannot be safely created via SQL (they require Supabase Auth or Admin API), the seed is split into two phases:

### SEED-A: Non-Auth-Dependent Operational Data
- School
- Academic Year
- Class
- Student
- Student Enrollment
- Payment Categories
- School Payment Methods
- Bill Template
- Student Bill

### SEED-B: Auth-Dependent Data
- Profiles (3 profiles)
- Student Guardian Relationship

**SEED-A** can be executed immediately.
**SEED-B** must be executed AFTER auth users are created via Supabase Dashboard.

---

## 4. UUID INVENTORY

### Fixed Operational UUIDs (from UAT Matrix Section 3.1)

| Entity | UUID | Source |
|--------|------|--------|
| School | `11111111-1111-1111-1111-111111111111` | UAT Matrix Section 3.1 |
| Student | `44444444-4444-4444-4444-444444444444` | UAT Matrix Section 3.1 |
| Student Bill | `9ab4551f-29c4-4f64-85cd-ec9b77192eb3` | UAT Matrix Section 3.1 |
| Guardian Relationship | `97d46779-92cd-42be-a9a6-ea308c86007c` | UAT Matrix Section 3.1 |

### Generated UUIDs (created at seed time)

| Entity | UUID | Notes |
|--------|------|-------|
| Academic Year 2026/2027 | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | Fixed for this seed |
| Kelas 1A | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | Fixed for this seed |
| Student Enrollment | `cccccccc-cccc-cccc-cccc-cccccccccccc` | Fixed for this seed |
| SPP Payment Category | `dddddddd-dddd-dddd-dddd-dddddddddddd` | Fixed for this seed |
| School Payment Methods | `gen_random_uuid()` | 3 records, IDs generated at runtime |
| Bill Template | `gen_random_uuid()` | Generated at runtime |

### Variable Auth UUIDs (created by Supabase Dashboard/API)

| Entity | UUID | How to Obtain |
|--------|------|---------------|
| Admin Auth UUID | `{{ADMIN_AUTH_UUID}}` | Create user in Supabase Dashboard |
| Bendahara Auth UUID | `{{BENDAHARA_AUTH_UUID}}` | Create user in Supabase Dashboard |
| Parent Auth UUID | `{{PARENT_AUTH_UUID}}` | Create user in Supabase Dashboard |

**Important:** The parent profile ID in the UAT Matrix is documented as `755ad1cf-9801-4e07-8316-8139db0981d4`. This exact ID can only be used if the auth user is created with that specific ID via the Admin API. If users are created via Supabase Dashboard, the actual UUIDs will differ, and test references must be updated accordingly.

---

## 5. FK RELATIONSHIPS

```
schools (id) 1---* academic_years (school_id)
schools (id) 1---* classes (school_id)
schools (id) 1---* students (school_id)
schools (id) 1---* payment_categories (school_id)
schools (id) 1---* school_payment_methods (school_id)
schools (id) 1---* bill_templates (school_id)
schools (id) 1---* student_bills (school_id)
schools (id) 1---* profiles (school_id)

academic_years (id) 1---* classes (academic_year_id)

classes (id) 1---* student_enrollments (class_id)
classes (id) 1---* bill_templates (class_id)

students (id) 1---* student_enrollments (student_id)
students (id) 1---* student_guardians (student_id)
students (id) 1---* bill_templates (student_id)
students (id) 1---* student_bills (student_id)

payment_categories (id) 1---* bill_templates (payment_category_id)
payment_categories (id) 1---* student_bills (payment_category_id)

payment_methods (id) 1---* school_payment_methods (payment_method_id)

profiles (id) 1---* student_guardians (guardian_profile_id)
profiles (id) 1---* financial_audit_logs (actor_profile_id)
profiles (id) 1---* notifications (recipient_profile_id)

student_enrollments (id) 1---* student_bills (student_enrollment_id)

bill_templates (id) 1---* student_bills (bill_template_id)
```

---

## 6. IDEMPOTENCY

All INSERT statements in the seed use `ON CONFLICT DO NOTHING` or `ON CONFLICT (id) DO NOTHING`. This means:

- Running the seed multiple times will NOT create duplicate records.
- Existing records will not be modified.
- Safe to re-run if verification fails after partial execution.

**Exception:** SEED-B uses variable UUIDs (`{{ADMIN_AUTH_UUID}}`, etc.). If the placeholder values change between runs, new records may be inserted. Always use the actual Auth UUIDs.

---

## 7. DATA MUTATION SAFETY

| Operation | Risk | Mitigation |
|-----------|------|------------|
| Re-run SEED-A | None | `ON CONFLICT DO NOTHING` on all inserts |
| Re-run SEED-B with same UUIDs | None | `ON CONFLICT DO NOTHING` on all inserts |
| Delete seed records | HIGH | Would break UAT tests; only do if full reset is intended |
| Modify fixed UUID records | MEDIUM | UAT tests reference specific IDs; changes require test updates |

**No existing data will be modified or deleted by this seed.**

---

## 8. EXPECTED ROW COUNTS AFTER SEED

| Table | Expected Row Count | Notes |
|-------|-------------------|-------|
| schools | 1 | SD Peradaban |
| academic_years | 1 | 2026/2027 |
| classes | 1 | Kelas 1A |
| students | 1 | Siswa Pertama |
| student_enrollments | 1 | Siswa Pertama in Kelas 1A |
| student_guardians | 1 | Orang Tua Pertama → Siswa Pertama |
| payment_categories | >= 1 | SPP + any existing seeded categories |
| payment_methods | >= 9 | Seeded by migration 20240107 |
| school_payment_methods | >= 3 | QRIS, Transfer Bank, Virtual Account |
| bill_templates | >= 1 | SPP template for Siswa Pertama |
| student_bills | >= 1 | Operational bill pending Rp 100.000 |
| profiles | 3 | admin, bendahara, orang_tua |
| financial_audit_logs | 0 | Populated during UAT |
| notifications | 0 | Populated during UAT |
| payment_gateway_transactions | 0 | Populated during UAT |

---

## 9. VERIFICATION

Run `ENVIRONMENT-VERIFICATION.sql` after completing SEED-A and SEED-B.

Replace the placeholders with actual Auth UUIDs:
- `{{ADMIN_AUTH_UUID}}`
- `{{BENDAHARA_AUTH_UUID}}`
- `{{PARENT_AUTH_UUID}}`

Expected result: All V-01 through V-13 checks PASS.

---

## 10. FILES IN THIS PACKAGE

| File | Purpose |
|------|---------|
| `supabase/seeds/20240117_operational_seed.sql` | SEED-A + SEED-B |
| `AUTH_USERS_SETUP.md` | Instructions for creating auth users |
| `ENVIRONMENT-VERIFICATION.sql` | Post-seed verification assertions |
| `ENVIRONMENT-RESTORATION-REPORT.md` | This document |

---

## 11. EXECUTION ORDER

1. Run SEED-A in Supabase Studio SQL Editor.
2. Create auth users via Supabase Dashboard (see `AUTH_USERS_SETUP.md`).
3. Record the Auth UUIDs.
4. Replace placeholders in SEED-B with actual Auth UUIDs.
5. Run SEED-B in Supabase Studio SQL Editor.
6. Replace placeholders in `ENVIRONMENT-VERIFICATION.sql` with actual Auth UUIDs.
7. Run `ENVIRONMENT-VERIFICATION.sql`.
8. Confirm all checks PASS.
9. Proceed with Phase 3 UAT.

---

## 12. KNOWN LIMITATIONS

- The parent profile UUID from the UAT Matrix (`755ad1cf-9801-4e07-8316-8139db0981d4`) can only be used if the auth user is created with that specific ID via Admin API. Dashboard-created users will have different UUIDs.
- If actual UUIDs differ from the UAT Matrix, test references in `5P-UAT-MATRIX.md` may need updating.
- `bill_templates` and `student_bills` use `gen_random_uuid()` for some IDs in SEED-A to avoid conflicts. The fixed operational IDs (school, student, bill) are preserved from the UAT Matrix.

---

## 13. FINAL STATUS

**ENVIRONMENT RESTORATION PACKAGE READY**

All required files have been prepared. No application source code was modified. No deployment was performed. No Supabase project was created.

**Next action:** Execute SEED-A, create auth users, execute SEED-B, run verification.
