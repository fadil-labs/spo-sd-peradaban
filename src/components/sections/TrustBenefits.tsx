"use client";

import { Shield, Smartphone, CheckCircle2, Monitor } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/animations";

const benefits = [
  {
    icon: Shield,
    title: "Aman",
    description: "Data terenkripsi dan transaksi terlindungi",
  },
  {
    icon: CheckCircle2,
    title: "Pembayaran Mudah",
    description: "Proses pembayaran yang cepat dan sederhana",
  },
  {
    icon: Smartphone,
    title: "Transparan",
    description: "Lacak setiap transaksi secara real-time",
  },
  {
    icon: Monitor,
    title: "Semua Perangkat",
    description: "Akses dari smartphone, tablet, atau laptop",
  },
];

export function TrustBenefits() {
  return (
    <section className="py-20 bg-surface border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Dipercaya oleh Ribuan Sekolah
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Solusi pembayaran sekolah yang aman, mudah, dan transparan untuk seluruh masyarakat Indonesia.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <StaggerItem key={index}>
              <div className="group rounded-xl border border-border bg-background p-6 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
