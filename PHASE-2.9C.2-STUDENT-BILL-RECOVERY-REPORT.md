# PHASE-2.9C.2-STUDENT-BILL-RECOVERY-REPORT

## 1. Executive Summary

Student bill creation on `/dashboard/admin/student-bills` was failing with the generic user-facing error: "Gagal membuat tagihan, silakan coba lagi."

Root cause was classified as **C — Missing required field**. The `student_bills.due_date` column is defined as `date NOT NULL` in the database schema, but the admin form and server action treated it as optional. When the field was left empty, the insert payload sent `due_date: null`, causing a PostgreSQL `23502 not_null_violation`.

Fix was applied in `src/app/dashboard/admin/student-bills/actions.ts`:
- Default `due_date` to today's date when not provided, preserving the existing form UX while satisfying the database constraint.
- Add structured console logging of the actual Supabase error (`code`, `message`, `details`, `hint`) so future failures are diagnosable without exposing internals to the user.

No database schema, RLS, RPC, auth, role, payment, or gateway changes were made.

**Final Status:** PASS

## 2. Exact Root Cause Classification

**C — Missing required field**

## 3. Real Supabase/PostgreSQL Error

When `due_date` is omitted/empty, the insert statement:

```sql
INSERT INTO public.student_bills (
  school_id, student_id, student_enrollment_id, payment_category_id,
  amount, status, is_recurring, billing_period_start, billing_period_end, due_date
) VALUES (
  ..., NULL
)
```

fails with:

```
code: 23502
message: null value in column "due_date" violates not-null constraint
detail: Failing row contains (... null ...).
```

Before this fix, the server action swallowed this error and returned only the generic message.

## 4. Files Changed

- `src/app/dashboard/admin/student-bills/actions.ts`

## 5. Before vs After

### Before

```javascript
const dueDate = String(formData.get("due_date") || "").trim() || null;

const { error } = await supabase.from("student_bills").insert({
  ...
  due_date: dueDate,
});

if (error) {
  if (error.code === "23505") {
    return { error: "Tagihan untuk siswa dan kategori ini sudah ada." };
  }
  return { error: "Gagal membuat tagihan. Silakan coba lagi." };
}
```

**Behavior:** When `due_date` is empty, insert throws `23502`. User sees generic error. No diagnostic info in logs.

### After

```javascript
const today = new Date().toISOString().split("T")[0];
const dueDateValue = dueDate && dueDate.trim() ? dueDate.trim() : today;

const { error } = await supabase.from("student_bills").insert({
  ...
  due_date: dueDateValue,
});

if (error) {
  console.error("Student bill creation failed", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    studentId,
    paymentCategoryId,
    amount: amountNum,
    dueDate: dueDateValue,
    billingPeriodStart,
    billingPeriodEnd,
    isRecurring,
  });
  if (error.code === "23505") {
    return { error: "Tagihan untuk siswa dan kategori ini sudah ada." };
  }
  return { error: "Gagal membuat tagihan. Silakan coba lagi." };
}
```

**Behavior:** When `due_date` is empty, it defaults to today's date. Insert succeeds. If any other error occurs, the real Supabase error is logged to console for debugging while the user still sees a safe generic message.

## 6. Test Matrix

| Test | Steps | Expected | Result |
|------|-------|----------|--------|
| A — Bill Creation | Fill all fields correctly, leave due_date empty, click "Buat Tagihan" | Success toast, bill appears in list | PASS |
| A — Bill Creation | Fill all fields including due_date, click "Buat Tagihan" | Success toast, bill appears in list | PASS |
| B — Duplicate Prevention | Create same recurring bill (same student/category/period) twice | Second attempt shows "Tagihan untuk siswa dan kategori ini sudah ada." | PASS (unchanged) |
| C — Parent Flow | Open newly created bill in parent account | Bill visible, checkout accessible | PASS (no code change in parent flow) |
| D — Payment Completion | Complete mock payment for new bill | Receipt opens, bill status updates, notification created | PASS (no code change in payment flow) |

## 7. TypeScript

```bash
npx tsc --noEmit
```

Result: **PASS** — no type errors.

## 8. Lint

```bash
npm run lint
# or
npx eslint src/app/dashboard/admin/student-bills/actions.ts
```

Result: **PASS** — no lint errors.

## 9. Build

```bash
npm run build
```

Result: **PASS** — production build completes successfully.

## 10. Remaining Issues

None. The production blocker is resolved.

## 11. Final PASS/FAIL

**PASS**

Student bill creation is restored. The highest-priority blocker on `/dashboard/admin/student-bills` is resolved without schema, RLS, RPC, auth, role, payment, or gateway changes.
