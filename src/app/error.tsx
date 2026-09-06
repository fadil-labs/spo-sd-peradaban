"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
          <span className="text-lg font-bold">!</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Terjadi Kesalahan
          </h1>
          <p className="text-sm text-muted">
            Aplikasi mengalami masalah yang tidak terduga. Silakan coba lagi.
          </p>
        </div>
        <Button
          onClick={reset}
          className="w-full h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Coba Lagi
        </Button>
      </div>
    </div>
  );
}
