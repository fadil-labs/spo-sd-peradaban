# PHASE 2.5A.1 — BLANK PAGE / GAGAL MEMUAT DATA ROOT-CAUSE REPORT

## 1. Executive Summary

**Status:** BLOCKED — RUNTIME EVIDENCE UNAVAILABLE WITHOUT BROWSER/DEV SERVER

This report identifies the most likely root causes of blank white pages and "Gagal Memuat Data" errors based on static code analysis. Because the development server was not running during this audit, exact runtime errors could not be captured from browser console or Next.js terminal output. However, the code contains clear application defects that would produce these symptoms.

**Primary finding:** `PaymentProofsClient.tsx` has a critical client-side state bug where data fetched from the API is discarded, and the API routes contain field name mismatches (`name` vs `full_name`). Combined with missing global error boundaries and an empty database environment, these defects explain the reported symptoms.

---

## 2. Environment State

| Component | Status |
|-----------|--------|
| Development server | NOT RUNNING during audit |
| Browser | NOT AVAILABLE |
| Database | EMPTY — no operational data |
| Auth users | EMPTY — no auth.users records |
| Migrations applied | 20240100 through 20240116 |
| RLS enabled | YES |
| Application build | PASS |
| TypeScript | PASS |

---

## 3. `/dashboard/admin/payment-proofs`

### Route
`/dashboard/admin/payment-proofs`

### Page
`src/app/dashboard/admin/payment-proofs/page.tsx`

### Component
`PaymentProofsClient` (`src/app/dashboard/admin/payment-proofs/PaymentProofsClient.tsx`)

### Data Loader
**Server:** `getPaymentProofsAction()` in `actions.ts`
**Client:** `loadProofs()` in `PaymentProofsClient.tsx`

### Server Action / API
- Server Action: `getPaymentProofsAction()` — queries `payment_proofs` with joins
- API Route: `GET /api/payment-proofs` — same query, returns JSON

### Supabase Query
```sql
SELECT id, school_id, payment_id, file_path, file_name, mime_type, file_size, status, created_at, updated_at, uploaded_by,
  payments (id, amount, payment_date, reference_number, status,
    payment_methods (id, name, method_type),
    students (id, nis, full_name),
    student_bills (id, amount, due_date, status))
FROM payment_proofs
WHERE school_id = <profile.school_id>
ORDER BY created_at DESC
```

### Database Table
`payment_proofs` — exists, RLS enabled

### Auth
- Server action: checks `auth.getUser()`, then `profiles` lookup
- API route: same checks
- Both redirect/return 401 if unauthenticated

### RLS
- `payment_proofs_select_admin_school`: admin/bendahara can SELECT where `school_id = auth.uid() school`
- If DB is empty, query returns `[]` with no error

### Actual Result
**Cannot be determined without running dev server.** Based on code analysis:

**Scenario A — Empty database, authenticated user with profile:**
- Server action returns `{proofs: []}`
- Client renders empty state: "Belum ada bukti pembayaran."
- Client `loadProofs()` runs, fetches `/api/payment-proofs`
- API returns 200 with `{proofs: []}`
- `res.ok` is true, no error
- `proofs` state is NEVER updated (bug), but server props show empty state
- **User sees:** Empty state. No error.

**Scenario B — Empty database, authenticated user WITHOUT profile:**
- Server action: `profileError || !profile` → `redirect("/login")`
- **User sees:** Login page. No "Gagal Memuat Data".

**Scenario C — API returns error (e.g., 500):**
- Server action might succeed, but client fetch fails
- API could return 500 if:
  - Supabase query error (RLS, missing column, etc.)
  - Unhandled exception in API route
- Client throws "Gagal memuat data bukti pembayaran."
- **User sees:** Red error box with "Gagal memuat data bukti pembayaran."

**Scenario D — Unhandled runtime error:**
- If any component throws, Next.js shows blank page (no error boundary)
- **User sees:** Blank white page

### Exact Error
Cannot be determined without browser/terminal evidence.

### Root Cause
**Application defect + Environment dependency combination:**

1. **Client state bug:** `PaymentProofsClient.loadProofs()` fetches data but never updates `proofs` state. This is a definite bug that prevents client-side filtering from working.

2. **API field mismatch:** `/api/payment-proofs` returns `name` instead of `full_name` for student data (line 112). The client expects `full_name`.

3. **Missing error boundary:** Any unhandled runtime error results in blank white page.

4. **Environment dependency:** Empty database means most data-dependent pages show empty states. Auth users must exist for protected pages.

---

## 4. Other Affected Pages

| Route | Symptom | Query | Result | Category | Root Cause |
|-------|---------|-------|--------|----------|------------|
| `/dashboard/admin/payment-proofs` | "Gagal Memuat Data" or blank | `payment_proofs` with joins | Depends on auth/DB | C/D | Client state bug + API mismatch + no error boundary |
| `/dashboard/admin/payment-gateway` | "Gagal Memuat Data" | `payment_gateway_transactions` | Empty if no data | C | No server auth, client API dependency |
| `/dashboard/admin/students` | "Gagal Memuat Data" | `students` | Empty if no data | B | Empty DB (correct empty state) |
| `/dashboard/admin/student-bills` | "Gagal Memuat Data" | `student_bills` with joins | Empty if no data | B | Empty DB (correct empty state) |
| `/dashboard/admin/payments` | "Gagal Memuat Data" | `payments` with joins | Empty if no data | B | Empty DB (correct empty state) |
| `/dashboard/admin/notifications` | "Gagal Memuat Data" | `notifications` | Empty if no data | B | Empty DB (correct empty state) |
| `/dashboard/admin/financial-audit-logs` | "Gagal Memuat Data" | `financial_audit_logs` | Empty if no data | B | Empty DB (correct empty state) |
| `/dashboard/orang-tua/bills` | "Gagal Memuat Data" | `student_bills` via guardian | Empty if no data | B | Empty DB (correct empty state) |
| `/dashboard/orang-tua/payments` | "Gagal Memuat Data" | `payments` via guardian | Empty if no data | B | Empty DB (correct empty state) |
| `/dashboard/orang-tua/notifications` | "Gagal Memuat Data" | `notifications` via guardian | Empty if no data | B | Empty DB (correct empty state) |

### Category Definitions
- **A — Runtime works:** N/A (cannot verify without dev server)
- **B — Query succeeds but data empty:** Pages that properly handle empty DB and show empty state
- **C — Query fails:** Pages where API/auth failure would show error message
- **D — Rendering/component fails:** Pages with client bugs or missing error boundaries

---

## 5. Error Classification

| Category | Count | Routes |
|----------|-------|--------|
| Application defect | 3 | payment-proofs (state bug), payment-proofs API (field mismatch), payment-gateway API (field mismatch) |
| Environment dependency | Many | All data-dependent pages require DB + auth |
| Auth | Some | Pages redirect to login if no profile |
| RLS | None identified | RLS policies appear correct |
| Database | Empty | All tables empty |
| Rendering | Possible | No error boundaries |
| Network | N/A | Same-origin API calls |
| Other | 1 | `test_passwords.js` credential exposure |

---

## 6. P0/P1/P2/P3 Findings

### 2.5A.1-01: PaymentProofsClient Fetches But Never Updates State
- **Severity:** P1 — HIGH
- **Location:** `src/app/dashboard/admin/payment-proofs/PaymentProofsClient.tsx:48-63`
- **Problem:** `loadProofs()` fetches from `/api/payment-proofs` but discards the response. `proofs` state is never updated from client-side fetch.
- **Root Cause:** `await res.json()` result is not assigned to `setProofs()`.
- **Evidence:**
  ```typescript
  const res = await fetch(`/api/payment-proofs?status=${statusFilter}`);
  if (!res.ok) { throw new Error("Gagal memuat data bukti pembayaran."); }
  await res.json(); // <-- result discarded, proofs state never updated
  ```
- **Impact:** Client-side status filter does not work. If API returns error, user sees "Gagal memuat data bukti pembayaran." even if server props contain valid data.
- **Recommended Fix:** Update `proofs` state with fetched data: `setProofs(normalized)`.
- **Dependency:** None

### 2.5A.1-02: API Routes Return `name` Instead of `full_name`
- **Severity:** P2 — MEDIUM
- **Location:** 
  - `src/app/api/payment-proofs/route.ts:112`
  - `src/app/api/admin/payment-gateway/route.ts:107`
- **Problem:** API response maps `student.full_name` to `name` instead of `full_name`. Client components expect `full_name`.
- **Root Cause:** Copy-paste error in API route normalization.
- **Evidence:**
  ```typescript
  // payment-proofs API route line 112
  name: student.full_name as string,  // should be full_name: student.full_name as string
  
  // payment-gateway API route line 107
  name: student.full_name as string,  // should be full_name: student.full_name as string
  ```
- **Impact:** Client components accessing `student.full_name` will get `undefined`. This causes blank cells in tables (`|| "-"`) or potential runtime errors if not guarded.
- **Recommended Fix:** Change `name:` to `full_name:` in both API routes.
- **Dependency:** None

### 2.5A.1-03: PaymentGatewayPage Lacks Server-Side Auth
- **Severity:** P1 — HIGH
- **Location:** `src/app/dashboard/admin/payment-gateway/page.tsx`
- **Problem:** Page directly renders `PaymentGatewayClient` without server-side auth check. Auth is only enforced in the API route.
- **Root Cause:** Missing `requireAuthenticatedUser()` / `requireRole()` in page component.
- **Evidence:**
  ```typescript
  export default function PaymentGatewayPage() {
    return <PaymentGatewayClient />;
  }
  ```
- **Impact:** If API route returns 401/403/404, client shows "Gagal memuat data transaksi gateway." Server component provides no fallback or redirect. Brief flash of loading then error.
- **Recommended Fix:** Add server-side auth in page component or redirect unauthenticated users.
- **Dependency:** None

### 2.5A.1-04: No Global Error Boundary
- **Severity:** P1 — HIGH
- **Location:** Root layout (`src/app/layout.tsx`)
- **Problem:** No `error.tsx` exists at root or route segment level. Unhandled runtime errors render blank white page.
- **Root Cause:** Missing error boundary implementation.
- **Evidence:** No `error.tsx` found in any route segment.
- **Impact:** Users see blank white page on unexpected errors. No recovery mechanism.
- **Recommended Fix:** Add `error.tsx` at root and/or route segment level.
- **Dependency:** None

### 2.5A.1-05: Empty Database Shows Empty States (Correct Behavior)
- **Severity:** P3 — LOW
- **Location:** All data-dependent pages
- **Problem:** When database is empty, queries return empty arrays. Pages show empty state messages like "Belum ada siswa.", "Belum ada tagihan.", etc.
- **Root Cause:** Expected behavior with empty database.
- **Evidence:** All list pages check `data.length === 0` and show intentional empty state.
- **Impact:** None — this is correct behavior.
- **Recommended Fix:** None. This is expected until seed data is loaded.
- **Dependency:** Environment restoration

### 2.5A.1-06: test_passwords.js Credential Exposure
- **Severity:** P0 — BLOCKER
- **Location:** `test_passwords.js` (repository root)
- **Problem:** File contains hardcoded Supabase anon key, project URL, and brute-force password script.
- **Root Cause:** Test script committed to repository without sanitization.
- **Evidence:** Lines 4-5 contain hardcoded anon key and URL. Line 28 contains password list.
- **Impact:** Credential exposure. Anon key is publicly accessible with attack script.
- **Recommended Fix:** Remove file from repository, add to `.gitignore`.
- **Dependency:** None

---

## 7. Recommended Remediation

### P0 — BLOCKER
1. **2.5A.1-06:** Remove `test_passwords.js` from repository immediately

### P1 — HIGH
2. **2.5A.1-01:** Fix `PaymentProofsClient.loadProofs()` to update `proofs` state
3. **2.5A.1-03:** Add server-side auth to `PaymentGatewayPage`
4. **2.5A.1-04:** Add global `error.tsx` boundary
5. **2.5A-02:** Add global `loading.tsx`
6. **2.5A-04:** Add `not-found.tsx`
7. **2.5A-05:** Add Next.js middleware for route protection

### P2 — MEDIUM
8. **2.5A.1-02:** Fix API field name mismatch (`name` → `full_name`) in payment-proofs and payment-gateway API routes
9. **2.5A-07:** Implement toast notification system
10. **2.5A-08:** Standardize button styles
11. **2.5A-12:** Add duplicate submission protection
12. **2.5A-16:** Remove hardcoded webhook fallback

### P3 — LOW
13. **2.5A.1-05:** Empty state messages are correct — no action needed
14. **2.5A-13:** Improve status color distinction
15. **2.5A-15:** Standardize pagination info

---

## 8. Environment Restoration Dependency

### Can Be Fixed Before Restoration:
- 2.5A.1-06: Remove `test_passwords.js`
- 2.5A.1-01: Fix client state bug in PaymentProofsClient
- 2.5A.1-02: Fix API field name mismatch
- 2.5A.1-03: Add server-side auth to PaymentGatewayPage
- 2.5A.1-04: Add global error boundary
- 2.5A-05: Add Next.js middleware
- All lint/type issues

### Requires Populated Database/Auth:
- Verifying runtime behavior with real data
- Testing RLS enforcement
- Testing auth flows end-to-end
- Testing payment flows
- Verifying empty state vs error state differentiation

---

## 9. Final Gate

**BLOCKED — ENVIRONMENT REQUIRED FOR COMPLETE DIAGNOSIS**

**Confirmed application defects:**
- `PaymentProofsClient` state bug (P1)
- API field name mismatches (P2)
- Missing server auth on PaymentGatewayPage (P1)
- Missing global error boundaries (P1)
- Hardcoded credentials in `test_passwords.js` (P0)

**Cannot be confirmed without runtime:**
- Exact error messages from Supabase
- Browser console errors
- Next.js terminal errors
- Actual HTTP status codes
- Hydration errors
- RLS denial specifics

**Next action:** Remediate P0/P1 findings, then run application with populated database to capture exact runtime errors.

---

**STOP. DO NOT REMEDIATE. DO NOT RUN SEED. DO NOT CREATE AUTH USERS. DO NOT START PHASE 3.**
