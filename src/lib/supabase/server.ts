import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createBrowserLikeClient } from "@supabase/supabase-js";

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
            // Server Components tidak dapat mengubah cookies.
            // Session refresh ditangani oleh middleware.
          }
        },
      },
    }
  );
}

export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");

    if (process.env.NODE_ENV !== "production") {
      console.error("[createAdminClient] Missing required environment variables:", missing);
      console.error("[createAdminClient] Ensure .env.local contains:", missing.join(", "));
    }

    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return createBrowserLikeClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}