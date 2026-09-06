"use client";

import { Receipt, History, CreditCard, FileCheck, Bell } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/animations";

const benefits = [
  { icon: Receipt, title: "Melihat tagihan", description: "Akses tagihan sekolah secara real-time" },
  { icon: History, title: "Melihat riwayat pembayaran", description: "Pantau semua transaksi yang pernah dilakukan" },
  { icon: CreditCard, title: "Membayar online", description: "Bayar tagihan kapan saja dan di mana saja" },
  { icon: FileCheck, title: "Mendapat bukti pembayaran", description: "Bukti pembayaran digital yang sah" },
  { icon: Bell, title: "Mengetahui status pembayaran", description: "Notifikasi untuk setiap update status" },
];

export function ParentBenefits() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Manfaat untuk Orang Tua
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Kemudahan dan kenyamanan dalam mengelola pembayaran sekolah untuk putra-putri Anda.
            </p>
          </div>
        </FadeIn>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <StaggerContainer className="space-y-6">
            {benefits.map((benefit, index) => (
              <StaggerItem key={index}>
                <div className="flex gap-4 rounded-xl border border-border bg-surface p-5 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <FadeIn delay={0.2}>
            <div className="relative">
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-primary/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wider">Tagihan Aktif</p>
                    <p className="text-2xl font-bold text-foreground mt-1">Rp 2.500.000</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                    Menunggu
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">SPP Mei 2026</p>
                        <p className="text-xs text-muted">Jatuh tempo: 10 Mei 2026</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">Rp 500.000</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Uang Ospek</p>
                        <p className="text-xs text-muted">Jatuh tempo: 15 Juli 2026</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">Rp 1.500.000</span>
                  </div>
                </div>

                <button className="mt-6 w-full h-12 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  Bayar Sekarang
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function Wallet(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}
