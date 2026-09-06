"use client";

import { Eye, Building2, BookOpen, Wallet, Users, Car, Shirt, MoreHorizontal } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/animations";

const features = [
  { icon: Eye, label: "Observasi", description: "Pantau perkembangan siswa" },
  { icon: Building2, label: "Sarana Prasarana", description: "Pembayaran fasilitas sekolah" },
  { icon: BookOpen, label: "Pembelajaran", description: "Biaya pendidikan dan kursus" },
  { icon: Wallet, label: "SPP", description: "Sumbangan Pembinaan Pendidikan" },
  { icon: Users, label: "Komite", description: "Iuran komite sekolah" },
  { icon: Car, label: "Jemputan", description: "Biaya transportasi antar jemput" },
  { icon: Shirt, label: "Kaos Olahraga", description: "Seragam dan atribut olahraga" },
  { icon: MoreHorizontal, label: "Lainnya", description: "Tagihan lainnya" },
];

export function PaymentFeatures() {
  return (
    <section id="fitur" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Berbagai Tagihan yang Dapat Dikelola
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Kelola semua jenis tagihan sekolah dalam satu platform terpadu.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <StaggerItem key={index}>
              <div className="group rounded-xl border border-border bg-surface p-6 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-default">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.label}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
