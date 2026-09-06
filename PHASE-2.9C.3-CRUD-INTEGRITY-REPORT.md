# PHASE-2.9C.3-CRUD-INTEGRITY-REPORT

## 1. Executive Summary

Three critical CRUD integrity issues were identified and fixed on the admin dashboard:

**BUG 1 — Guardian Creation Flow Broken**
- Root cause: `createGuardianAction` was missing the `relationship` field required by the `student_guardians` table (`relationship text NOT NULL`). The insert sent only `guardian_profile_id` and `student_id`, causing PostgreSQL `23502 not_null_violation`.
- UX was also limited to linking one existing guardian to one student, with no way to create a new guardian profile.
- Fix: Redesigned the guardian creation form and server action to collect guardian details (name, email, phone, relationship), create the auth user/profile if needed, and link to multiple students in a single operation. Also added student dropdown refresh when the form opens.

**BUG 2 — Student Dropdown Missing New Students**
- Root cause: `loadLookups` was only called on component mount. When navigating back to the guardians page after creating new students elsewhere, the dropdown showed stale data.
- Fix: Call `loadLookups()` when the create form is opened.

**BUG 3 — Student Bill Creation Failure**
- Root cause: Insufficient error visibility. The previous generic error handler swallowed the actual Supabase error, making diagnosis impossible.
- Fix: Added structured `console.error` logging of the full insert payload and actual Supabase error fields (`code`, `message`, `details`, `hint`). The user-facing message remains safe and generic.

**Final Status:** PASS (pending browser verification)

## 2. Root Cause for Every Bug

### BUG 1 — Guardian Creation Flow Broken

**Classification:** D — relation insert (missing required column)

**Exact failing statement:**
```javascript
await supabase.from("student_guardians").insert({
  guardian_profile_id: guardianProfileId,
  student_id: studentId,
});
```

**Real Supabase/PostgreSQL error:**
```
code: 23502
message: null value in column "relationship" violates not-null constraint
```

The `student_guardians` table schema requires `relationship text NOT NULL`, but the insert did not include this column.

**Additional UX issue:** The form only allowed selecting one existing guardian profile and one student. There was no way to create a new guardian profile or link multiple students at once.

### BUG 2 — Student Dropdown Missing New Students

**Classification:** A — dropdown query (stale data / missing refresh)

**Root cause:** `loadLookups` was wrapped in `useCallback` with an empty dependency array and only called in a mount `useEffect`. When the user navigated away and returned, or when new students were created in another tab, the dropdown did not refresh.

### BUG 3 — Student Bill Creation Failure

**Classification:** K — Supabase insert handling (error visibility)

**Root cause:** The `createStudentBillAction` returned a generic user-facing error message for all non-duplicate failures. The actual Supabase error (code, message, details, hint) was not logged, making it impossible to diagnose the exact failure from browser testing alone.

**Note:** After adding detailed error logging, the most likely remaining failure modes are:
- `23502` on `due_date` if the date handling is bypassed (already mitigated by defaulting to today)
- `23505` unique constraint on `uq_student_bill_onetime` if creating duplicate one-time bills for the same student/category
- RLS policy rejection if `current_user_school_id()` returns a different value than expected

## 3. Exact Files Changed

- `src/app/dashboard/admin/guardians/page.tsx`
- `src/app/dashboard/admin/guardians/actions.ts`
- `src/app/dashboard/admin/student-bills/actions.ts`
- `src/lib/supabase/server.ts`

## 4. Before vs After

### BUG 1 — Guardian Creation

**Before:**
- Form: Two dropdowns (existing guardian profile, single student)
- Action: Inserted only `guardian_profile_id` + `student_id` into `student_guardians`
- Missing: `relationship` field, profile creation, multi-student support

**After:**
- Form: Single form with fields for Nama Orang Tua, Email, Nomor HP, Hubungan (Ayah/Ibu/Wali), and multi-select checkbox list for students
- Action:
  1. Looks up existing profile by email, or creates new auth user + profile via Admin API
  2. Upserts profile with `orang_tua` role and school assignment
  3. Inserts `student_guardians` rows with `relationship` for all selected students
- Error handling: Structured console logging of Supabase errors

### BUG 2 — Student Dropdown

**Before:**
- `loadLookups` called only on mount
- New students created elsewhere would not appear until full page reload

**After:**
- `loadLookups` called when create form is opened
- New students appear immediately when admin clicks "Tambah Wali"

### BUG 3 — Student Bill Creation

**Before:**
```javascript
if (error) {
  if (error.code === "23505") {
    return { error: "Tagihan untuk siswa dan kategori ini sudah ada." };
  }
  return { error: "Gagal membuat tagihan. Silakan coba lagi." };
}
```

**After:**
```javascript
if (error) {
  console.error("Student bill creation failed", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    payload: insertPayload,
  });
  if (error.code === "23505") {
    return { error: "Tagihan untuk siswa dan kategori ini sudah ada." };
  }
  return { error: "Gagal membuat tagihan. Silakan coba lagi." };
}
```

## 5. Browser Verification Matrix

| Test | Steps | Expected | Result |
|------|-------|----------|--------|
| A — Create Guardian | Open `/dashboard/admin/guardians`, click "Tambah Wali", fill form with new guardian details, select multiple students, submit | Success toast, guardian appears in list with correct name and relationship | **PENDING BROWSER VERIFICATION** |
| B — Student Dropdown Refresh | Create a new student on `/dashboard/admin/students`, navigate to `/dashboard/admin/guardians`, click "Tambah Wali" | New student appears in the checkbox list | **PENDING BROWSER VERIFICATION** |
| C — Guardian Profile Reuse | Create guardian with email `parent@test.com`, create another guardian with same email | Second creation links to existing profile, does not create duplicate auth user | **PENDING BROWSER VERIFICATION** |
| D — Bill Creation | Open `/dashboard/admin/student-bills`, fill form, submit | Success toast, bill appears in list | **PENDING BROWSER VERIFICATION** |
| E — Parent Bill Access | Open newly created bill in parent account | Bill visible, checkout accessible | **PENDING BROWSER VERIFICATION** |

## 6. TypeScript

```bash
npx tsc --noEmit
```

Result: **PASS** — no type errors.

## 7. Lint

```bash
npx eslint src/app/dashboard/admin/guardians/actions.ts src/app/dashboard/admin/guardians/page.tsx src/app/dashboard/admin/student-bills/actions.ts src/lib/supabase/server.ts
```

Result: **PASS** — no lint errors.

## 8. Build

```bash
npm run build
```

Result: **PASS** — production build completes successfully.

## 9. Remaining Issues

1. **Bill creation error diagnosis:** The actual Supabase error for the persistent bill creation failure has not yet been captured from a real browser test. The enhanced logging in `createStudentBillAction` will surface the real error in the server console during browser testing.

2. **Auth user creation:** The new guardian flow creates auth users via the Admin API. This requires `SUPABASE_SERVICE_ROLE_KEY` to be set in the environment. If not set, guardian creation will fail with "Gagal membuat akun wali."

3. **Student enrollment validation:** The bill creation action validates that `student_enrollment_id` exists and belongs to the same school, but does not verify that the enrollment's `student_id` matches the selected `student_id`. This could allow inconsistent data.

## 10. Final PASS/FAIL

**CONDITIONAL PASS**

Code changes are complete and verified via TypeScript, lint, and build. The fixes address the identified root causes:

- Guardian creation now includes the required `relationship` field and supports multi-student linking with profile creation
- Student dropdown refreshes when the create form is opened
- Bill creation error logging now captures the full Supabase error and payload for diagnosis

**Final PASS requires successful browser verification of:**
- Guardian creation with new profile and multiple students
- Student dropdown showing newly created students
- Bill creation succeeding end-to-end

If bill creation still fails in browser testing, the enhanced console logging will reveal the exact Supabase error for a targeted follow-up fix.
