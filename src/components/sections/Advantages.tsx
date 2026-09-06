"use client";

import { Zap, CheckCircle2, Search, Puzzle, Smartphone, CreditCard, FileText, Shield } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/animations";

const advantages = [
  { icon: Zap, title: "Modern", description: "Teknologi terkini untuk pengalaman terbaik" },
  { icon: CheckCircle2, title: "Mudah digunakan", description: "Antarmuka intuitif untuk semua kalangan" },
  { icon: Search, title: "Transparan", description: "Semua transaksi tercatat dengan jelas" },
  { icon: Puzzle, title: "Terintegrasi", description: "Satu platform untuk semua kebutuhan" },
  { icon: Smartphone, title: "Responsive", description: "Akses dari perangkat apa pun" },
  { icon: CreditCard, title: "Digital payment support", description: "Mendukung berbagai metode pembayaran digital" },
  { icon: FileText, title: "Structured reporting", description: "Laporan terstruktur dan mudah dibaca" },
  { icon: Shield, title: "Aman", description: "Keamanan data dan transaksi terjamin" },
];

export function Advantages() {
  return (
    <section id="keunggulan" className="py-20 bg-surface border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Keunggulan SPO SD Peradaban
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Mengapa memilih platform pembayaran sekolah kami.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {advantages.map((advantage, index) => (
            <StaggerItem key={index}>
              <div className="group rounded-xl border border-border bg-background p-6 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <advantage.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {advantage.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {advantage.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
