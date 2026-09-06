"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted">
            © 2026 SPO SD Peradaban. Seluruh hak cipta dilindungi.
          </p>
          <p className="text-xs text-muted">
            Credit by{" "}
            <Link
              href="https://fadil-labs.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              Fadil Labs
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
