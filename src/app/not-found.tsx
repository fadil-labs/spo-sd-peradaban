"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="text-lg font-bold">404</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-muted">
            Halaman yang Anda cari tidak ada atau telah dipindahkan.
          </p>
        </div>
        <Button asChild className="w-full h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2">
          <Link href="/dashboard/admin">
            Kembali ke Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
