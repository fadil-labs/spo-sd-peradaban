"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SlideLeft, SlideRight, SlideUp, FadeIn } from "@/components/animations";

export function Hero() {
  return (
    <section id="beranda" className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Platform Pembayaran Sekolah Modern
              </div>
            </FadeIn>

            <SlideLeft>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                Kelola Pembayaran Sekolah{" "}
                <span className="text-primary">Lebih Mudah,</span>
                <br />
                Transparan, dan Terintegrasi.
              </h1>
            </SlideLeft>

            <SlideUp delay={0.1}>
              <p className="text-lg text-muted max-w-lg leading-relaxed">
                Satu platform untuk membantu sekolah dan orang tua mengelola pembayaran secara modern.
              </p>
            </SlideUp>

            <FadeIn delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-primary/30 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Masuk ke Aplikasi
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#cara-kerja"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-8 text-base font-semibold text-foreground hover:bg-background active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Lihat Cara Kerja
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-surface bg-primary/10 flex items-center justify-center text-xs font-medium text-primary"
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">50+ Sekolah</p>
                  <p className="text-xs text-muted">Sudah bergabung</p>
                </div>
              </div>
            </FadeIn>
          </div>

          <SlideRight delay={0.2}>
            <div className="relative">
              <div className="relative rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-primary/10">
                <div className="rounded-xl bg-background p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider">Total Tagihan</p>
                      <p className="text-3xl font-bold text-foreground mt-1">Rp 2.500.000</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-xs font-bold">SPP</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {[
                      { label: "SPP Bulan Mei", amount: "Rp 500.000", status: "Lunas" },
                      { label: "Uang Ospek", amount: "Rp 1.500.000", status: "Menunggu" },
                      { label: "Praktek Kerja", amount: "Rp 500.000", status: "Lunas" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-muted mt-0.5">Tagihan aktif</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{item.amount}</p>
                          <p
                            className={`text-xs mt-0.5 ${
                              item.status === "Lunas" ? "text-success" : "text-warning"
                            }`}
                          >
                            {item.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                  </div>
                  <p className="text-xs text-muted mt-2">2 dari 3 tagihan sudah dibayar</p>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 rounded-xl border border-border bg-surface p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                    <span className="text-success text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Pembayaran Berhasil</p>
                    <p className="text-[10px] text-muted">Baru saja</p>
                  </div>
                </div>
              </div>
            </div>
          </SlideRight>
        </div>
      </div>
    </section>
  );
}
