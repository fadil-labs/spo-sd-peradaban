"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FormState = "checking" | "form" | "success" | "invalid";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("checking");

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setFormState("invalid");
        return;
      }

      setFormState("form");
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password.length < 8) {
      setError("Password harus minimal 8 karakter.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setFormState("success");
    setIsLoading(false);
  };

  if (formState === "checking") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (formState === "invalid") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Atur Ulang Password
          </h1>
          <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3 mb-6">
            <p className="text-sm text-danger">
              Link reset password tidak valid atau sudah kedaluwarsa.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Lupa Password
          </Link>
        </div>
      </div>
    );
  }

  if (formState === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Atur Ulang Password
          </h1>
          <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3 mb-6">
            <p className="text-sm text-success">
              Password berhasil diperbarui. Silakan masuk dengan password baru.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white mb-4">
            <span className="text-lg font-bold">SPO</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Atur Ulang Password
          </h1>
          <p className="text-sm text-muted">
            Masukkan password baru Anda.
          </p>
        </div>

         <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password Baru
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                Konfirmasi Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}
