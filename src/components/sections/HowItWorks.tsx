"use client";

import { User, FileText, CreditCard, CheckCircle2 } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/animations";

const steps = [
  { step: "01", icon: User, title: "Login", description: "Masuk ke aplikasi menggunakan akun sekolah atau orang tua" },
  { step: "02", icon: FileText, title: "Pilih Tagihan", description: "Pilih tagihan yang ingin dibayar dari daftar yang tersedia" },
  { step: "03", icon: CreditCard, title: "Lakukan Pembayaran", description: "Pilih metode pembayaran dan selesaikan transaksi" },
  { step: "04", icon: CheckCircle2, title: "Pembayaran Terkonfirmasi", description: "Terima konfirmasi dan bukti pembayaran secara otomatis" },
];

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Cara Kerja
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Empat langkah mudah untuk mulai mengelola pembayaran sekolah.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <StaggerItem key={index}>
              <div className="relative text-center group">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-xs font-bold text-primary/40 mb-2 tracking-wider">
                  STEP {item.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>

                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px border-t-2 border-dashed border-border" />
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
