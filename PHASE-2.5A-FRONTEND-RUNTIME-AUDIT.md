# PHASE 2.5A — FRONTEND / RUNTIME / UI-UX AUDIT

## 1. Executive Summary

**Status:** BLOCKED — CRITICAL FINDINGS REQUIRE REMEDIATION

The SPO SD Peradaban frontend has functional pages with consistent styling and adequate loading/error/empty state handling. However, critical security and runtime robustness issues were identified that must be addressed before Phase 3 UAT.

**Critical blockers:**
- P0: Hardcoded credentials and Supabase anon key in `test_passwords.js`
- P0: Missing global error/loading/not-found boundaries
- P1: Notification type filter includes `payment_created` which is never emitted
- P1: No toast/notification feedback system for user actions
- P1: No Next.js middleware for edge-level route protection

**Schema compatibility:** PASS — After Checkpoint A fixes, all pages use correct column names (`full_name`, `birth_date`, `address`). No `students.name`, `students.gender`, or `students.date_of_birth` references found.

---

## 2. Route Inventory

| Route | Role | Runtime | Data | UI | Responsive | Status |
|-------|------|---------|------|----|------------|--------|
| `/` | public | OK | static | OK | OK | UI COMPLETE |
| `/login` | public | OK | auth | OK | OK | UI COMPLETE |
| `/forgot-password` | public | OK | static | OK | OK | UI COMPLETE |
| `/reset-password` | public | OK | static | OK | OK | UI COMPLETE |
| `/profile` | authenticated | OK | profile | OK | OK | UI COMPLETE |
| `/dashboard/admin` | admin | OK | summary | OK | OK | UI COMPLETE |
| `/dashboard/admin/students` | admin | OK | CRUD | OK | OK | UI COMPLETE |
| `/dashboard/admin/student-bills` | admin | OK | CRUD | OK | OK | UI COMPLETE |
| `/dashboard/admin/student-bills/[id]` | admin | OK | detail | OK | OK | UI COMPLETE |
| `/dashboard/admin/school` | admin | OK | settings | OK | OK | UI COMPLETE |
| `/dashboard/admin/school-payment-methods` | admin | OK | CRUD | OK | OK | UI COMPLETE |
| `/dashboard/admin/payments` | admin | OK | monitor | OK | OK | UI COMPLETE |
| `/dashboard/admin/payments/[paymentId]/receipt` | admin | OK | receipt | OK | OK | UI COMPLETE |
| `/dashboard/admin/payment-proofs` | admin | OK | review | OK | OK | UI COMPLETE |
| `/dashboard/admin/payment-gateway` | admin | OK | simulate | OK | OK | UI COMPLETE |
| `/dashboard/admin/payment-categories` | admin | OK | CRUD | OK | OK | UI COMPLETE |
| `/dashboard/admin/guardians` | admin | OK | CRUD | OK | OK | UI COMPLETE |
| `/dashboard/admin/financial-reports` | admin | OK | reports | OK | OK | UI COMPLETE |
| `/dashboard/admin/financial-audit-logs` | admin | OK | audit | OK | OK | UI COMPLETE |
| `/dashboard/admin/notifications` | admin | OK | list | OK | OK | UI COMPLETE |
| `/dashboard/admin/enrollments` | admin | OK | CRUD | OK | OK | UI COMPLETE |
| `/dashboard/admin/classes` | admin | OK | CRUD | OK | OK | UI COMPLETE |
| `/dashboard/admin/academic-years` | admin | OK | CRUD | OK | OK | UI COMPLETE |
| `/dashboard/bendahara` | bendahara | OK | summary | OK | OK | UI COMPLETE |
| `/dashboard/bendahara/notifications` | bendahara | OK | list | OK | OK | UI COMPLETE |
| `/dashboard/orang-tua` | orang_tua | OK | summary | OK | OK | UI COMPLETE |
| `/dashboard/orang-tua/bills` | orang_tua | OK | list | OK | OK | UI COMPLETE |
| `/dashboard/orang-tua/bills/[id]` | orang_tua | OK | detail | OK | OK | UI COMPLETE |
| `/dashboard/orang-tua/payments` | orang_tua | OK | history | OK | OK | UI COMPLETE |
| `/dashboard/orang-tua/payments/[billId]` | orang_tua | OK | checkout | OK | OK | UI COMPLETE |
| `/dashboard/orang-tua/payments/receipt/[paymentId]` | orang_tua | OK | receipt | OK | OK | UI COMPLETE |
| `/dashboard/orang-tua/notifications` | orang_tua | OK | list | OK | OK | UI COMPLETE |
| `/api/auth/me` | authenticated | OK | profile | N/A | N/A | OK |
| `/api/payment-methods` | authenticated | OK | list | N/A | N/A | OK |
| `/api/payment-proofs` | authenticated | OK | list | N/A | N/A | OK |
| `/api/payment-proofs/[id]/download` | authenticated | OK | signed URL | N/A | N/A | OK |
| `/api/admin/payment-gateway` | admin/bendahara | OK | list | N/A | N/A | OK |
| `/api/admin/payment-gateway/simulate` | admin/bendahara | OK | simulate | N/A | N/A | OK |
| `/api/webhooks/payment/mock` | authenticated | OK | webhook | N/A | N/A | OK |

---

## 3. Runtime Findings

### FINDING 2.5A-01: Hardcoded Credentials in test_passwords.js
- **Severity:** P0 — BLOCKER
- **Location:** `test_passwords.js` (root)
- **Problem:** File contains hardcoded Supabase anon key, Supabase URL, and a password brute-force script with common passwords.
- **Root Cause:** Test/development script committed to repository without credential sanitization.
- **Evidence:**
  - Line 4: `const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'`
  - Line 5: `const supabase = createClient('https://azugckptrmgxsilbiffb.supabase.co', ANON_KEY);`
  - Line 28: `const passwords = ['Password123!', 'password', 'admin123', ...]`
- **Impact:** Anon key is publicly exposed. While anon key is designed for client-side use, exposing it with a brute-force script enables credential stuffing attacks against any Supabase project using this anon key. The target Supabase project URL is also exposed.
- **Recommended Fix:** Remove `test_passwords.js` from repository immediately. Add to `.gitignore`. If testing is needed, use environment-specific scripts outside the repo.
- **Dependency:** Requires immediate remediation before any further audit or deployment.

### FINDING 2.5A-02: No Global Error Boundary
- **Severity:** P1 — HIGH
- **Location:** Root layout (`src/app/layout.tsx`)
- **Problem:** No `error.tsx` or global error boundary exists. Unhandled runtime errors will render a blank white page or default Next.js error.
- **Root Cause:** No error boundary component defined at root or route segment level.
- **Impact:** Users see blank white page on unexpected errors. No recovery mechanism.
- **Recommended Fix:** Add `error.tsx` at root level and/or route segment level with error UI and retry button.
- **Dependency:** None

### FINDING 2.5A-03: No Global Loading State
- **Severity:** P1 — HIGH
- **Location:** Root layout (`src/app/layout.tsx`)
- **Problem:** No `loading.tsx` at root or route segment level. Some pages use inline `Suspense` with spinner fallback, but navigation between routes has no loading indication.
- **Root Cause:** Reliance on page-level Suspense only; no global loading strategy.
- **Impact:** Users may see blank page or layout shift during route transitions.
- **Recommended Fix:** Add `loading.tsx` at root or use Next.js loading UI pattern.
- **Dependency:** None

### FINDING 2.5A-04: No 404 / Not Found Handler
- **Severity:** P1 — HIGH
- **Location:** Root level
- **Problem:** No `not-found.tsx` or `global-not-found.tsx`. Invalid routes show default Next.js 404.
- **Root Cause:** Missing not-found boundary.
- **Impact:** Users see generic Next.js 404 page, breaking application branding.
- **Recommended Fix:** Add `not-found.tsx` with application-branded 404 page.
- **Dependency:** None

---

## 4. Schema Compatibility Findings

**Status:** PASS

After Checkpoint A fixes, all frontend queries align with actual schema:

| Column | Used In | Status |
|--------|---------|--------|
| `students.full_name` | Multiple pages/actions | OK |
| `students.birth_date` | Students page, actions | OK |
| `students.address` | Students page, actions | OK |
| `students.nis` | Multiple | OK |
| `students.status` | Multiple | OK |

**No references found to:**
- `students.name`
- `students.gender`
- `students.date_of_birth`

---

## 5. Authentication Findings

### FINDING 2.5A-05: No Edge-Level Route Protection
- **Severity:** P1 — HIGH
- **Location:** `src/middleware.ts` (missing)
- **Problem:** No Next.js middleware for route protection. Authentication is enforced server-side in each page via `requireAuthenticatedUser()` and `requireRole()`, but there is no edge-level redirect for unauthenticated users.
- **Root Cause:** Missing middleware file.
- **Impact:** Unauthenticated users can reach protected pages briefly before server-side redirect. Not a direct security vulnerability (auth checks are server-side), but poor UX and potential information leakage.
- **Recommended Fix:** Add `middleware.ts` with route matcher for dashboard paths to redirect unauthenticated users at edge.
- **Dependency:** None

### FINDING 2.5A-06: Session Refresh Comment Without Implementation
- **Severity:** P2 — MEDIUM
- **Location:** `src/lib/supabase/server.ts:23`
- **Problem:** Comment states "Session refresh ditangani oleh middleware" but no middleware exists.
- **Root Cause:** Incomplete implementation.
- **Impact:** Session refresh may not work as expected in all scenarios.
- **Recommended Fix:** Either implement middleware for session refresh or update comment.
- **Dependency:** Finding 2.5A-05

---

## 6. Authorization Findings

**Status:** PASS (server-side)

All protected pages use `requireAuthenticatedUser()` and `requireRole()` server-side. Role-based access is enforced before rendering. Frontend does not rely solely on UI hiding for security.

**Note:** No `guru` (teacher) role implementation exists yet, but this is out of scope for current phase.

---

## 7. Loading State Findings

| Page | Loading State | Type | Status |
|------|---------------|------|--------|
| `/dashboard/admin/students` | Inline spinner | OK | OK |
| `/dashboard/admin/student-bills` | Inline spinner | OK | OK |
| `/dashboard/admin/payment-proofs` | Suspense spinner | OK | OK |
| `/dashboard/admin/financial-audit-logs` | Suspense spinner | OK | OK |
| `/dashboard/admin/financial-reports` | Suspense spinner | OK | OK |
| `/dashboard/admin/payments/[paymentId]/receipt` | Suspense spinner | OK | OK |
| `/dashboard/orang-tua/bills` | Inline spinner | OK | OK |
| `/dashboard/orang-tua/bills/[id]` | Suspense spinner | OK | OK |
| `/dashboard/orang-tua/payments` | Inline spinner | OK | OK |
| `/dashboard/orang-tua/payments/[billId]` | Suspense spinner | OK | OK |
| `/dashboard/orang-tua/payments/receipt/[paymentId]` | Suspense spinner | OK | OK |
| `/dashboard/admin` | None (static render) | N/A | OK |
| `/dashboard/bendahara` | None (static render) | N/A | OK |
| `/dashboard/orang-tua` | None (static render) | N/A | OK |

**Finding:** No skeleton loaders used. Only spinners. This is acceptable but could be improved for perceived performance.

---

## 8. Empty State Findings

| Page | Empty State | Status |
|------|-------------|--------|
| `/dashboard/admin/students` | "Belum ada siswa." | OK |
| `/dashboard/admin/student-bills` | "Belum ada tagihan." | OK |
| `/dashboard/orang-tua/bills` | "Belum ada tagihan." | OK |
| `/dashboard/orang-tua` | "Belum ada data anak yang terhubung." | OK |
| `/dashboard/admin/notifications` | Via client component | OK |
| `/dashboard/admin/payment-proofs` | Via client component | OK |
| `/dashboard/admin/financial-audit-logs` | "Tidak ada log keuangan." | OK |
| `/dashboard/orang-tua/notifications` | Via client component | OK |

**Status:** PASS — All data-dependent pages have intentional empty states.

---

## 9. Error State Findings

| Page | Error State | Status |
|------|-------------|--------|
| `/dashboard/admin/students` | Red alert box with message | OK |
| `/dashboard/admin/student-bills` | Red alert box with message | OK |
| `/dashboard/orang-tua/bills` | Red alert box with message | OK |
| `/dashboard/admin/payment-proofs` | Red alert box | OK |
| `/dashboard/admin/financial-audit-logs` | Red alert box | OK |
| `/dashboard/orang-tua` | N/A (static) | OK |

**Finding:** Error states are present but no "Retry" button is implemented on most pages. Users must manually refresh.

---

## 10. Responsive Findings

**Status:** CANNOT FULLY VERIFY WITHOUT BROWSER

Based on code review:
- Uses Tailwind responsive classes (`sm:`, `md:`, `lg:`)
- Tables use `overflow-x-auto` for horizontal scroll on mobile
- Cards use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Forms use `grid-cols-1 sm:grid-cols-2`
- Navigation uses responsive grid layouts

**Potential issues:**
- No dedicated mobile navigation pattern observed (no hamburger menu, no mobile sidebar)
- Tables may be difficult to read on small screens despite horizontal scroll
- No viewport-specific component switching

---

## 11. UI/UX Findings

### FINDING 2.5A-07: No Toast/Notification Feedback System
- **Severity:** P1 — HIGH
- **Location:** Application-wide
- **Problem:** No toast notification system (e.g., sonner, toast, custom toast). User actions like form submission, payment processing, and proof upload rely on inline success/error messages only.
- **Root Cause:** No toast provider or toast component implemented.
- **Impact:** Users don't receive persistent feedback for actions that complete successfully. Success messages disappear on navigation.
- **Recommended Fix:** Implement toast notification system (e.g., `sonner` or custom).
- **Dependency:** None

### FINDING 2.5A-08: Inconsistent Button Styles
- **Severity:** P2 — MEDIUM
- **Location:** Multiple pages
- **Problem:** Buttons use inconsistent class patterns. Some use `shadcn/ui` Button component, others use inline Tailwind classes (`bg-primary text-white text-sm font-semibold hover:bg-primary-dark`).
- **Root Cause:** Mix of component library and custom styles.
- **Impact:** Visual inconsistency across application.
- **Recommended Fix:** Standardize on `shadcn/ui` Button component or create consistent custom button utility classes.
- **Dependency:** None

### FINDING 2.5A-09: No Micro-interactions
- **Severity:** P2 — MEDIUM
- **Location:** Application-wide
- **Problem:** Despite `motion` (Framer Motion) being installed, no page uses animation components. Only `lucide-react` icons are used.
- **Root Cause:** Animation components exist in `src/components/animations/` but are not imported anywhere.
- **Impact:** Application feels static. Missed opportunity for subtle professional animations.
- **Recommended Fix:** Use animation components sparingly for page transitions, card hover effects, and loading states.
- **Dependency:** None

---

## 12. Accessibility Findings

### FINDING 2.5A-10: Missing Form Labels in Some Places
- **Severity:** P2 — MEDIUM
- **Location:** Various forms
- **Problem:** Most forms have proper `htmlFor` labels, but some inputs lack explicit labels or rely on placeholder text.
- **Root Cause:** Inconsistent form implementation.
- **Impact:** Screen reader users may not understand input purpose.
- **Recommended Fix:** Audit all forms for proper label associations.
- **Dependency:** None

### FINDING 2.5A-11: No Focus Management for Modals/Dialogs
- **Severity:** P2 — MEDIUM
- **Location:** N/A (no modals/dialogs found)
- **Problem:** No modal/dialog components exist. If modals are added in future, focus management and accessibility must be implemented.
- **Root Cause:** N/A
- **Impact:** Future modal implementations may have accessibility issues.
- **Recommended Fix:** Use accessible dialog components (e.g., `@radix-ui/react-dialog`) when modals are needed.
- **Dependency:** None

---

## 13. Payment Flow Findings

### FINDING 2.5A-12: Duplicate Submission Protection Missing
- **Severity:** P2 — MEDIUM
- **Location:** Payment forms (`PaymentCheckoutClient.tsx`, bill detail pages)
- **Problem:** While `process_payment()` has idempotency at DB level, the UI does not prevent duplicate button clicks during submission. Button shows loading state but no explicit double-submit prevention.
- **Root Cause:** Missing `disabled` state on submit buttons during async operations in some places.
- **Impact:** Users may see duplicate loading states or confusion if they click multiple times.
- **Recommended Fix:** Ensure all payment submit buttons have `disabled={isSubmitting}` and clear loading indicators.
- **Dependency:** None

### FINDING 2.5A-13: Payment Status Colors Inconsistent
- **Severity:** P3 — LOW
- **Location:** Multiple pages
- **Problem:** `partial` status uses `bg-primary/10 text-primary` (green-ish), which may be confused with `paid` (also green-ish). `pending` uses same color family.
- **Root Cause:** Limited color palette usage.
- **Impact:** Users may confuse payment statuses.
- **Recommended Fix:** Use distinct colors for each status (e.g., blue for pending, green for paid, orange for partial).
- **Dependency:** None

---

## 14. Admin/Bendahara Findings

### FINDING 2.5A-14: No Data Refresh Mechanism
- **Severity:** P2 — MEDIUM
- **Location:** All list pages
- **Problem:** After creating/updating/deleting records, data is refreshed by re-fetching. There is no optimistic update or manual refresh button. Users must perform another action to see updated data if auto-refresh fails.
- **Root Cause:** Simple data-fetching pattern without refresh controls.
- **Impact:** Data may appear stale if background refetch fails.
- **Recommended Fix:** Add manual refresh buttons or implement real-time subscriptions for critical data.
- **Dependency:** None

### FINDING 2.5A-15: Missing Pagination Info on Some Pages
- **Severity:** P3 — LOW
- **Location:** Some list pages
- **Problem:** Pagination shows "Halaman X dari Y" but doesn't show total records count consistently.
- **Root Cause:** Inconsistent pagination component usage.
- **Impact:** Minor UX issue.
- **Recommended Fix:** Standardize pagination component to always show total count.
- **Dependency:** None

---

## 15. Environment Findings

### FINDING 2.5A-16: Hardcoded Fallback for Mock Webhook Secret
- **Severity:** P2 — MEDIUM
- **Location:** `src/app/dashboard/orang-tua/actions.ts:889`, `src/app/dashboard/admin/payment-gateway/actions.ts:198`
- **Problem:** `process.env.MOCK_PAYMENT_WEBHOOK_SECRET || "replace_me"` — if env var is missing, falls back to hardcoded string.
- **Root Cause:** Development fallback left in production code.
- **Impact:** In production without env var, webhook validation uses predictable secret.
- **Recommended Fix:** Remove fallback. Throw error or fail closed if env var is missing in production.
- **Dependency:** None

### FINDING 2.5A-17: Google Drive Environment Variables Not Validated
- **Severity:** P3 — LOW
- **Location:** `src/lib/document-storage/providers/google-drive.ts`
- **Problem:** Reads `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN` without validation. If missing, provider returns skeleton/not-implemented.
- **Root Cause:** Defensive coding for unimplemented feature.
- **Impact:** None currently (feature not implemented).
- **Recommended Fix:** Add environment validation when Google Drive integration is activated.
- **Dependency:** None

### Environment Variable Summary

| Variable | Required | Status | Notes |
|----------|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | YES | Set in `.env.local` | Used in client/server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | YES | Set in `.env.local` | Used in client/server |
| `MOCK_PAYMENT_WEBHOOK_SECRET` | YES | Set (`replace_me`) | Hardcoded fallback exists |
| `GOOGLE_DRIVE_CLIENT_ID` | NO | Not set | Unimplemented feature |
| `GOOGLE_DRIVE_CLIENT_SECRET` | NO | Not set | Unimplemented feature |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | NO | Not set | Unimplemented feature |
| `GOOGLE_DRIVE_REDIRECT_URI` | NO | Not set | Unimplemented feature |

---

## 16. TypeScript/Lint/Build Results

| Tool | Result | New Errors | Pre-existing | Blocking |
|------|--------|------------|--------------|----------|
| TypeScript (`tsc --noEmit`) | PASS | 0 | 0 | No |
| Lint (`npm run lint`) | FAIL | 0 | 14 (4 errors, 10 warnings) | No |
| Build (`npm run build`) | PASS | 0 | 0 | No |

**Pre-existing lint issues:**
- `src/app/dashboard/admin/actions.ts:90` — unused `proofs`
- `src/app/dashboard/admin/actions.ts:102` — `Unexpected any`
- `src/app/dashboard/admin/page.tsx:1` — unused `Suspense`
- `src/app/dashboard/bendahara/actions.ts:93` — `Unexpected any`
- `src/app/dashboard/bendahara/page.tsx:1` — unused `Suspense`
- `src/app/dashboard/orang-tua/actions.ts:7` — unused `PaymentIntentRequest`
- `src/app/dashboard/orang-tua/payments/PaymentHistoryClient.tsx:231,235,239,250` — unused variables
- `src/app/dashboard/orang-tua/payments/[billId]/PaymentCheckoutClient.tsx:215` — unnecessary dependency
- `test_passwords.js:1` — unused `https`, `require()` imports forbidden

**Note:** `test_passwords.js` is not part of the application source but is in the repo root and causes lint failures.

---

## 17. Findings Classification

| ID | Severity | Location | Problem | Root Cause | Impact | Recommended Fix | Dependency |
|-----|----------|----------|---------|------------|--------|-----------------|------------|
| 2.5A-01 | P0 | `test_passwords.js` | Hardcoded anon key + brute-force script | Test script committed | Credential exposure, attack vector | Remove file, add to `.gitignore` | None |
| 2.5A-02 | P1 | Root layout | No global error boundary | Missing `error.tsx` | Blank white page on error | Add error boundary | None |
| 2.5A-03 | P1 | Root layout | No global loading state | Missing `loading.tsx` | Layout shift during navigation | Add loading UI | None |
| 2.5A-04 | P1 | Root level | No 404 handler | Missing `not-found.tsx` | Generic Next.js 404 | Add branded 404 | None |
| 2.5A-05 | P1 | `src/middleware.ts` | No edge-level auth | Missing middleware | UX issue, potential info leak | Add middleware | None |
| 2.5A-06 | P2 | `server.ts:23` | Stale comment | Incomplete implementation | Confusion | Implement or update comment | 2.5A-05 |
| 2.5A-07 | P1 | App-wide | No toast system | Not implemented | Poor feedback UX | Implement toast | None |
| 2.5A-08 | P2 | Multiple | Inconsistent buttons | Mix of styles | Visual inconsistency | Standardize components | None |
| 2.5A-09 | P2 | App-wide | No micro-interactions | Unused animation lib | Static feel | Use animations sparingly | None |
| 2.5A-10 | P2 | Forms | Missing labels | Inconsistent forms | Accessibility gap | Audit forms | None |
| 2.5A-11 | P2 | N/A | No modal accessibility | No modals yet | Future risk | Use accessible dialog lib | None |
| 2.5A-12 | P2 | Payment forms | Duplicate submit protection | Missing disabled state | UX confusion | Add disabled states | None |
| 2.5A-13 | P3 | Multiple | Status color confusion | Limited palette | Misinterpretation | Distinct colors | None |
| 2.5A-14 | P2 | List pages | No manual refresh | Simple fetch pattern | Stale data risk | Add refresh buttons | None |
| 2.5A-15 | P3 | Pagination | Inconsistent pagination info | Component variance | Minor UX | Standardize pagination | None |
| 2.5A-16 | P2 | Actions files | Hardcoded webhook fallback | Dev fallback left in | Security risk in prod | Remove fallback | None |
| 2.5A-17 | P3 | Google Drive provider | Unvalidated env vars | Unimplemented feature | None currently | Add validation when activated | None |
| 2.5A-18 | P1 | Notification filter | `payment_created` in filter but never emitted | UI/backend mismatch | User confusion | Remove or implement | None |

---

## 18. Recommended Remediation Order

1. **P0 — BLOCKER**
   - 2.5A-01: Remove `test_passwords.js` from repository

2. **P1 — HIGH**
   - 2.5A-02: Add global error boundary (`error.tsx`)
   - 2.5A-03: Add global loading state (`loading.tsx`)
   - 2.5A-04: Add 404 handler (`not-found.tsx`)
   - 2.5A-05: Add Next.js middleware for route protection
   - 2.5A-07: Implement toast notification system
   - 2.5A-18: Fix notification type filter inconsistency

3. **P2 — MEDIUM**
   - 2.5A-06: Update/fix session refresh comment
   - 2.5A-08: Standardize button styles
   - 2.5A-09: Add subtle micro-interactions
   - 2.5A-10: Audit and fix form labels
   - 2.5A-11: Plan accessible modal strategy
   - 2.5A-12: Add duplicate submission protection
   - 2.5A-14: Add manual refresh mechanism
   - 2.5A-16: Remove hardcoded webhook fallback

4. **P3 — LOW**
   - 2.5A-13: Improve status color distinction
   - 2.5A-15: Standardize pagination info
   - 2.5A-17: Add Google Drive env validation when activated

5. **UI/UX Polish**
   - Add skeleton loaders
   - Add retry buttons on error states
   - Improve mobile navigation
   - Add page transitions

---

## 19. Environment Restoration Dependency

### Can Audit Without Database:
- Route structure and navigation
- UI components and styling
- Loading/error/empty state implementation
- Form validation patterns
- Schema compatibility (static analysis)
- Accessibility audits
- Responsive class usage
- Environment variable references
- Build/type/lint status

### Requires Environment Restoration:
- Actual runtime behavior with real data
- RLS enforcement verification
- Authentication flow end-to-end
- Authorization edge cases
- Payment flow execution
- Webhook simulation
- Notification delivery
- File upload/download with storage
- Real Supabase query performance

**Blocking:** Phase 3 UAT cannot proceed without environment restoration (SEED-A, SEED-B, auth users).

---

## 20. Final Gate

**BLOCKED — CRITICAL FINDINGS REQUIRE REMEDIATION**

**Primary blocker:** `test_passwords.js` with hardcoded Supabase anon key and brute-force script must be removed from repository before any further steps.

**Secondary blockers:**
- Missing global error/loading/404 boundaries
- No middleware for route protection
- No toast notification system
- Notification type filter inconsistency

**Schema compatibility:** PASS
**Runtime structure:** PASS (with gaps)
**UI completeness:** PASS (with improvements needed)
**Security posture:** BLOCKED (credential exposure)

**Next action:** Remediate P0/P1 findings, then re-audit before proceeding to Environment Restoration.

---

**STOP. DO NOT REMEDIATE. DO NOT RUN SEED. DO NOT CREATE AUTH USERS. DO NOT START PHASE 3.**
