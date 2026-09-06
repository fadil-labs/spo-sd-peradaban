"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LoginError = {
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profileResponse = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          const roleRoutes: Record<string, string> = {
            admin: "/dashboard/admin",
            bendahara: "/dashboard/bendahara",
            orang_tua: "/dashboard/orang-tua",
          };
          const route = roleRoutes[profile.role];
          if (route) {
            router.push(route);
          }
        }
      }
    };

    checkSession();
  }, [router]);

  const getErrorMessage = (error: unknown): string => {
    if (!error) return "Login gagal. Silakan coba lagi.";

    const errorMessage = typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: string }).message)
      : String(error);

    switch (errorMessage) {
      case "Invalid login credentials":
      case "invalid_credentials":
        return "Email atau password salah.";
      case "Email not confirmed":
      case "email_not_confirmed":
        return "Email belum diverifikasi. Hubungi administrator sekolah.";
      case "Too many requests":
      case "too_many_requests":
        return "Terlalu banyak percobaan. Silakan coba lagi nanti.";
      default:
        return "Login gagal. Silakan coba lagi.";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.user) {
        setError({ message: getErrorMessage(authError) });
        setIsLoading(false);
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        await supabase.auth.signOut();
        setError({
          message: "Gagal memulai sesi autentikasi. Silakan coba lagi.",
        });
        setIsLoading(false);
        return;
      }

      const profileResponse = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });

      if (!profileResponse.ok) {
        await supabase.auth.signOut();
        setError({
          message: "Akun berhasil diautentikasi, tetapi profil aplikasi belum tersedia. Hubungi administrator sekolah.",
        });
        setIsLoading(false);
        return;
      }

      const profile = await profileResponse.json();

      const allowedRoles = ["admin", "bendahara", "orang_tua"];
      if (!allowedRoles.includes(profile.role)) {
        await supabase.auth.signOut();
        setError({
          message: "Akun belum dikonfigurasi dengan benar. Hubungi administrator.",
        });
        setIsLoading(false);
        return;
      }

      const roleRoutes: Record<string, string> = {
        admin: "/dashboard/admin",
        bendahara: "/dashboard/bendahara",
        orang_tua: "/dashboard/orang-tua",
      };

      const route = roleRoutes[profile.role];
      if (route) {
        router.push(route);
      } else {
        await supabase.auth.signOut();
        setError({
          message: "Akun belum dikonfigurasi dengan benar. Hubungi administrator.",
        });
        setIsLoading(false);
      }
    } catch {
      setError({ message: "Login gagal. Silakan coba lagi." });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/5" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/3" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0F5C46" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white mb-4">
            <span className="text-lg font-bold">SPO</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            SPO SD Peradaban Login
          </h1>
          <p className="text-sm text-muted">
            Masuk untuk mengakses aplikasi
          </p>
        </div>

         <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="nama@sekolah.id"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
                <p className="text-sm text-danger">{error.message}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                <span className="text-sm text-muted">Ingat saya</span>
              </label>
               <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                Lupa password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Masuk..." : "Masuk"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
