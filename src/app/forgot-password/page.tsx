"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError("Terjadi kesalahan. Silakan coba lagi.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white mb-4">
            <span className="text-lg font-bold">SPO</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Lupa Password
          </h1>
          <p className="text-sm text-muted">
            Masukkan email akun Anda. Jika email terdaftar, kami akan mengirimkan
            instruksi untuk mengatur ulang password.
          </p>
        </div>

         <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {!success ? (
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
                {isLoading ? "Mengirim..." : "Kirim Link Reset Password"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3">
                <p className="text-sm text-success">
                  Jika email terdaftar, kami telah mengirimkan instruksi untuk
                  mengatur ulang password.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Login
              </Link>
            </div>
          )}
        </div>

        {!success && (
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
