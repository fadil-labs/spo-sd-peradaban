"use client";

import { BarChart3, AlertTriangle, LayoutDashboard, FileText, CheckSquare } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/animations";

const benefits = [
  { icon: BarChart3, title: "Rekap pembayaran", description: "Laporan pembayaran lengkap dan terstruktur" },
  { icon: AlertTriangle, title: "Monitoring tunggakan", description: "Pantau siswa dengan tagihan tertunda" },
  { icon: LayoutDashboard, title: "Dashboard keuangan", description: "Ringkasan finansial sekolah secara visual" },
  { icon: FileText, title: "Laporan", description: "Generate laporan pembayaran dengan mudah" },
  { icon: CheckSquare, title: "Verifikasi pembayaran manual", description: "Konfirmasi pembayaran yang diupload manual" },
];

export function SchoolBenefits() {
  return (
    <section className="py-20 bg-surface border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Manfaat untuk Sekolah
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Alat yang powerful untuk mengelola keuangan sekolah dengan lebih efisien.
            </p>
          </div>
        </FadeIn>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn delay={0.2} className="order-2 lg:order-1">
            <div className="relative">
              <div className="rounded-2xl border border-border bg-background p-6 shadow-xl shadow-primary/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Dashboard Keuangan</h3>
                  <span className="text-xs text-muted">Mei 2026</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted mb-1">Total Pemasukan</p>
                    <p className="text-lg font-bold text-success">Rp 45M</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted mb-1">Tunggakan</p>
                    <p className="text-lg font-bold text-warning">Rp 8M</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted mb-1">Siswa Aktif</p>
                    <p className="text-lg font-bold text-primary">1.250</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">SPP</span>
                    <span className="text-sm font-medium text-foreground">92%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border">
                    <div className="h-2 w-[92%] rounded-full bg-primary" />
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted">Komite</span>
                    <span className="text-sm font-medium text-foreground">78%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border">
                    <div className="h-2 w-[78%] rounded-full bg-emerald" />
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <StaggerContainer className="space-y-6 order-1 lg:order-2">
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
        </div>
      </div>
    </section>
  );
}
