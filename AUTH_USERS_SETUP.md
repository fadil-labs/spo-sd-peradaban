# AUTH USERS SETUP

## Purpose

This document provides step-by-step instructions for creating the three operational test accounts required for Phase 3 UAT.

**Important:** Auth users must be created BEFORE running SEED-B of `supabase/seeds/20240117_operational_seed.sql`.

---

## Accounts to Create

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| Admin | `admin@sdperadaban.sch.id` | *(choose a strong password)* | `/dashboard/admin` |
| Bendahara | `bendahara@sdperadaban.sch.id` | *(choose a strong password)* | `/dashboard/bendahara` |
| Orang Tua | `parent@test.local` | *(choose a strong password)* | `/dashboard/orang-tua` |

---

## Method 1: Supabase Dashboard (Recommended for UAT)

1. Open your Supabase project dashboard.
2. Navigate to **Authentication** → **Users**.
3. Click **Create user**.
4. Enter the email and password for the user.
5. Ensure **Email Confirm** is toggled ON (or confirm the email manually).
6. Click **Create user**.
7. After creation, copy the **User UUID** (displayed in the user list).
8. Repeat for all three users.
9. Record the UUIDs in the table below.

### Recorded UUIDs

| Email | Auth UUID |
|-------|-----------|
| admin@sdperadaban.sch.id | `{{ADMIN_AUTH_UUID}}` |
| bendahara@sdperadaban.sch.id | `{{BENDAHARA_AUTH_UUID}}` |
| parent@test.local | `{{PARENT_AUTH_UUID}}` |

---

## Method 2: Supabase CLI (Alternative)

If you have the Supabase CLI configured with `service_role` access:

```bash
supabase auth users create --email admin@sdperadaban.sch.id --password <password>
supabase auth users create --email bendahara@sdperadaban.sch.id --password <password>
supabase auth users create --email parent@test.local --password <password>
```

Record the returned UUIDs.

---

## Method 3: Admin API (If Exact UUIDs Are Required)

If you need the parent profile to use the exact UUID `755ad1cf-9801-4e07-8316-8139db0981d4` as documented in the UAT Matrix, you must create the auth user via the Admin API with a specific ID:

```bash
curl -X POST 'https://<your-project>.supabase.co/auth/v1/admin/users' \
  -H 'apikey: <service_role_key>' \
  -H 'Authorization: Bearer <service_role_key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "parent@test.local",
    "password": "<password>",
    "id": "755ad1cf-9801-4e07-8316-8139db0981d4",
    "email_confirm": true
  }'
```

**Warning:** This method requires `service_role` key access. Do NOT expose the `service_role` key in client-side code or public repositories.

---

## Next Steps After Creating Auth Users

1. Replace the placeholder UUIDs in `supabase/seeds/20240117_operational_seed.sql` (SEED-B section) with the actual Auth UUIDs.
2. Run SEED-B in Supabase Studio SQL Editor.
3. Run `ENVIRONMENT-VERIFICATION.sql` to confirm the environment is ready.
4. Proceed with Phase 3 UAT.

---

## Notes

- Passwords are not stored in the seed SQL. Choose passwords that meet your security requirements.
- If email confirmation is required, ensure users confirm their emails before running UAT, or use the Admin API to create users with `email_confirm: true`.
- The `profiles` records are inserted in SEED-B and must reference the actual Auth UUIDs.
