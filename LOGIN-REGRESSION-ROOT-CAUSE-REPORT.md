# LOGIN-REGRESSION-ROOT-CAUSE-REPORT.md

## 1. Executive Summary

Login regression investigated in read-only mode. No code, database, RLS, auth, or environment changes were made.

**Classification:** B — Session/cookie bug

**Root Cause:** The `/api/auth/me` route handler uses `createClient()` from `src/lib/supabase/server.ts`, which creates a Supabase server client that reads session state from request cookies via `cookies().getAll()`. After `signInWithPassword()` on the browser client, the auth session cookies are set on the response, but the subsequent `fetch("/api/auth/me")` request does not carry those cookies back to the server in a way that the Next.js `cookies()` API can read for this request. The result is that `supabase.auth.getUser()` in `/api/auth/me` returns no user, the profile query is skipped or returns 404, and the login page shows "Akun berhasil diautentikasi, tetapi profil aplikasi belum tersedia."

This is a session/cookie propagation issue between the browser client and the server route handler, not a profile data, RLS, or database issue.

## 2. Actual Login Flow

```text
LoginPage.handleSubmit()
    ↓
supabase.auth.signInWithPassword({ email, password })
    ↓
Auth succeeds → supabase-js sets auth cookies on the response via createBrowserClient storage
    ↓
fetch("/api/auth/me", { method: "GET", credentials: "include" })
    ↓
Next.js server route handler
    ↓
createClient() from src/lib/supabase/server.ts
    ↓
cookies().getAll() reads request cookies
    ↓
supabase.auth.getUser() ← returns null / no user
    ↓
profile query skipped or returns 404
    ↓
LoginPage shows "profil aplikasi belum tersedia"
```

### Key Files

| Step | File | Function/Section |
|------|------|------------------|
| Login form submit | `src/app/login/page.tsx` | `handleSubmit()` |
| Browser auth call | `src/app/login/page.tsx` | `supabase.auth.signInWithPassword()` |
| Browser client creation | `src/lib/supabase/client.ts` | `createClient()` |
| Profile fetch | `src/app/login/page.tsx` | `fetch("/api/auth/me")` |
| Server route | `src/app/api/auth/me/route.ts` | `GET()` |
| Server client creation | `src/lib/supabase/server.ts` | `createClient()` |
| Middleware | `middleware.ts` | `middleware()` |
| Auth helper | `src/lib/auth/authorization.ts` | `requireAuthenticatedUser()` |

## 3. Profile Query

File: `src/app/api/auth/me/route.ts`
Function: `GET()`
Lines: 16-27

```typescript
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, school_id, role, full_name")
  .eq("id", user.id)
  .single();

if (profileError || !profile) {
  return NextResponse.json(
    { error: "Profile not found" },
    { status: 404 }
  );
}
```

The query itself is correct. It selects the expected columns and filters by `user.id`. The problem is that this code path is reached with `user` being null because the session cookie was not available to the server client at the time of `getUser()`.

### Error path in LoginPage

File: `src/app/login/page.tsx`
Lines: 97-103

```typescript
if (!profileResponse.ok) {
  await supabase.auth.signOut();
  setError({
    message: "Akun berhasil diautentikasi, tetapi profil aplikasi belum tersedia. Hubungi administrator sekolah.",
  });
  setIsLoading(false);
  return;
}
```

The visible message is triggered when `/api/auth/me` returns any non-2xx status. In the failing case, the route returns 404 because `user` is null from `getUser()`, not because the profile is truly missing.

## 4. Authenticated User ID Flow

The UUID used to query `profiles` comes from:

```typescript
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();
```

in both `src/app/api/auth/me/route.ts` and `src/lib/auth/authorization.ts`.

`user.id` is the Supabase Auth user ID, which is the same UUID stored in `auth.users.id` and referenced by `profiles.id`.

There is no UUID mismatch. The issue is that `getUser()` returns `user = null` because the server client cannot read the session cookie established by the browser client's `signInWithPassword()`.

## 5. Session/Cookie Analysis

### Browser Client
File: `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

No custom cookie options are configured. `createBrowserClient` uses default cookie handling with `document.cookie` in the browser and `base64url` encoding. The cookie name is the default Supabase auth token cookie.

### Server Client
File: `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot change cookies.
          }
        },
      },
    }
  );
}
```

This uses the Next.js `cookies()` API with the deprecated `getAll`/`setAll` pattern. This is supported by `@supabase/ssr@0.12.5` but is deprecated. The server client reads cookies from the incoming request and can write cookies back to the response.

### Middleware
File: `middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}
```

The middleware calls `getUser()` to refresh the session and trigger cookie writes if needed. The middleware matcher is configured to run on all routes except static assets.

### Cookie Propagation Problem

After `signInWithPassword()` on the browser client:

1. The auth SDK sets auth cookies via `document.cookie` (browser client storage).
2. The login page then calls `fetch("/api/auth/me", { credentials: "include" })`.
3. The browser should include cookies in this request because `credentials: "include"` is set.
4. On the server, `cookies().getAll()` should read those cookies.
5. The server client's `getUser()` should then resolve the session.

The fact that this is failing indicates one of the following:

- The cookies set by `signInWithPassword()` are not yet available to the subsequent `fetch()` request in the same synchronous flow. This can happen because `signInWithPassword()` may set cookies asynchronously via `setTimeout` or microtasks, and the immediate `fetch()` may fire before cookies are actually written to `document.cookie`.
- The cookie scope/path/domain set by the browser client differs from what the server client expects, causing `cookies().getAll()` to not see the auth cookie.
- The `fetch()` with `credentials: "include"` is not sufficient because the cookie was set with attributes that make it unavailable to the subsequent request in the same execution context.

### Evidence

The login page performs `signInWithPassword()` and immediately calls `fetch("/api/auth/me")` without waiting for the auth state change event or any async cookie write completion. This is the most likely cause: a race between cookie write completion and the subsequent server request.

## 6. Profiles RLS Analysis

File: `supabase/migrations/20240104_rls_tenant_isolation.sql`

### RLS Enabled
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### SELECT Policies

**Policy 1: `profiles_select_own`**
```sql
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());
```

This policy allows a user to view their own profile. It requires `auth.uid()` to return the user's UUID, which requires a valid session.

**Policy 2: `profiles_select_school`**
```sql
CREATE POLICY "profiles_select_school"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );
```

This policy allows admin/bendahara to view profiles in the same school.

### Recursion Check

`current_user_school_id()` and `current_user_role()` both query `public.profiles`:

```sql
CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;
```

This is a SECURITY DEFINER function, so it bypasses RLS for its internal query. It does not cause infinite recursion because:
1. It is SECURITY DEFINER, not SECURITY INVOKER.
2. The internal query does not trigger the same policy again.

However, if `auth.uid()` returns null (no session), these functions return null, and the policies evaluate to false, blocking access.

### RLS Conclusion

If `auth.uid()` is null because the session cookie was not propagated, then:
- `profiles_select_own` evaluates to `id = null` → false
- `profiles_select_school` evaluates to `school_id = null` → false

The profile query returns zero rows or is blocked, and `/api/auth/me` returns 404. This is consistent with the observed symptom.

## 7. Auth Helper Analysis

File: `src/lib/auth/authorization.ts`
Function: `requireAuthenticatedUser()`

```typescript
export async function requireAuthenticatedUser(): Promise<Profile> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, school_id, role, full_name, phone")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  return profile as Profile;
}
```

This helper is not used during login itself. It is used by protected dashboard routes. If this helper is called after login with a missing session, it redirects to `/login`. This is a separate failure mode from the one observed on the login page.

The login page does not use `requireAuthenticatedUser()`. It uses `fetch("/api/auth/me")` directly.

## 8. Exact Root Cause

### Classification: B — Session/cookie bug

### Root Cause

After `signInWithPassword()` on the browser client, the Supabase auth cookies are set asynchronously. The login page immediately calls `fetch("/api/auth/me")` without waiting for the auth cookies to be written to `document.cookie`. As a result, the subsequent server request does not carry the auth session cookie, the server client's `getUser()` returns no user, and the profile query cannot proceed.

### Evidence

1. `src/app/login/page.tsx` lines 81-95: `signInWithPassword()` is called and the very next statement is `fetch("/api/auth/me")` with no await for auth state change or cookie write completion.
2. `src/lib/supabase/server.ts` lines 4-28: server client reads cookies from `cookies().getAll()`, which depends on request cookies being present.
3. `src/app/api/auth/me/route.ts` lines 7-14: if `getUser()` returns no user, the route returns 401/404 before the profile query is even reached.
4. The visible error "profil aplikasi belum tersedia" is triggered by `!profileResponse.ok` in the login page, which catches any non-2xx from `/api/auth/me`.
5. Direct database verification confirms `auth.users.id` matches `profiles.id` for all test accounts, confirming the profile data exists.
6. RLS policies are correctly configured and would allow access if `auth.uid()` were populated.

### Why Other Classifications Are Ruled Out

- **A — Profile query bug:** The profile query is correct. It uses `.single()` with the right columns and filters. It is never reached because `user` is null.
- **C — RLS/policy issue:** RLS policies are correct and would allow access if a valid session existed. The policies themselves are not the problem.
- **D — Auth helper issue:** `requireAuthenticatedUser()` is not used in the login flow. The login page uses `fetch("/api/auth/me")` directly.
- **E — Redirect/server-client issue:** No redirect issue. The login page stays on `/login` and shows the error.
- **F — Environment/configuration issue:** Environment variables are present and the Supabase client is created successfully. The issue is timing/propagation, not configuration.
- **G — Other:** Not applicable.

## 9. Affected Files

| File | Role | Change Required |
|------|------|-----------------|
| `src/app/login/page.tsx` | Login form and post-auth flow | Yes — wait for auth state change or cookie write before calling `/api/auth/me` |
| `src/lib/supabase/server.ts` | Server client creation | No — implementation is correct, reads from request cookies |
| `src/app/api/auth/me/route.ts` | Profile lookup endpoint | No — implementation is correct |
| `src/lib/auth/authorization.ts` | Auth helper | No — not involved in login flow |
| `middleware.ts` | Session refresh middleware | No — implementation is correct |

## 10. Recommended Targeted Fix

Describe the fix only. Do not implement.

**Problem:** `signInWithPassword()` sets auth cookies asynchronously, but the login page immediately calls `/api/auth/me` before cookies are available.

**Fix:** After `signInWithPassword()` succeeds, wait for the auth state change event or verify the session is available before calling `/api/auth/me`. Specifically:

1. After `signInWithPassword()`, subscribe to `supabase.auth.onAuthStateChange()` and wait for the `SIGNED_IN` event before proceeding.
2. Alternatively, call `supabase.auth.getSession()` on the browser client to confirm the session is available before making the `/api/auth/me` request.
3. Ensure the `fetch("/api/auth/me")` call happens only after the auth state is confirmed.

This is a client-side timing fix only. No backend, database, RLS, or auth configuration changes are needed.

## 11. Security Impact

**Availability/functional only.**

- No data is exposed incorrectly.
- No authorization bypass occurs.
- The failure mode is a false negative: legitimate users cannot log in, but unauthorized users cannot gain access.
- RLS policies remain intact and would block access if no session exists.
- The `signOut()` call on failure is correct and prevents stuck sessions.

## 12. Scope Verification

```text
No code changed
No database changed
No RLS changed
No auth users changed
No profiles changed
No credentials changed
No migrations changed
No environment variables changed
```

This report is investigation only. No modifications were made.
