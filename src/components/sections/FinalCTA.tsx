"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/animations";

export function FinalCTA() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative rounded-3xl bg-primary overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Saatnya Mengelola Pembayaran Sekolah dengan Cara yang Lebih Modern.
              </h2>
              <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
                Bergabung dengan ratusan sekolah yang sudah mempercayai SPO SD Peradaban untuk mengelola pembayaran mereka.
              </p>
              <Link
                href="/login"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-white px-10 text-base font-bold text-primary shadow-lg hover:bg-white/90 transition-all hover:shadow-xl"
              >
                Masuk ke SPO SD Peradaban
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
