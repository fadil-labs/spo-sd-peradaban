"use client";

import { Landmark, QrCode, Upload } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/animations";

const methods = [
  {
    icon: Landmark,
    title: "Transfer Bank / Virtual Account",
    description: "Pembayaran melalui transfer bank atau virtual account dengan konfirmasi otomatis.",
  },
  {
    icon: QrCode,
    title: "QRIS",
    description: "Bayar cepat dengan scan QRIS menggunakan aplikasi e-wallet atau mobile banking.",
  },
  {
    icon: Upload,
    title: "Manual / Upload Bukti Transfer",
    description: "Upload bukti transfer untuk diverifikasi oleh admin sekolah secara manual.",
  },
];

export function PaymentMethods() {
  return (
    <section className="py-20 bg-surface border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Metode Pembayaran yang Didukung
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Berbagai pilihan pembayaran untuk memudahkan transaksi Anda.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-3 gap-8">
          {methods.map((method, index) => (
            <StaggerItem key={index}>
              <div className="rounded-xl border border-border bg-background p-8 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <method.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {method.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {method.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
