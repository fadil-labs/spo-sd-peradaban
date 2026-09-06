"use client";

import { HelpCircle, CreditCard, QrCode, Upload, Smartphone } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/animations";

const faqs = [
  {
    question: "Apa itu SPO SD Peradaban?",
    answer:
      "SPO SD Peradaban adalah platform pembayaran sekolah modern yang memudahkan sekolah dan orang tua dalam mengelola pembayaran secara transparan dan terintegrasi.",
    icon: HelpCircle,
  },
  {
    question: "Metode pembayaran apa saja yang didukung?",
    answer:
      "Kami mendukung pembayaran melalui Transfer Bank / Virtual Account, QRIS, dan Manual / Upload Bukti Transfer untuk fleksibilitas maksimal.",
    icon: CreditCard,
  },
  {
    question: "Apakah bisa menggunakan QRIS?",
    answer:
      "Ya, platform kami mendukung pembayaran melalui QRIS yang dapat discan menggunakan aplikasi e-wallet atau mobile banking apapun.",
    icon: QrCode,
  },
  {
    question: "Bagaimana pembayaran manual diverifikasi?",
    answer:
      "Setelah Anda mengupload bukti transfer, admin sekolah akan memverifikasi dan mengonfirmasi status pembayaran Anda secara manual.",
    icon: Upload,
  },
  {
    question: "Apakah aplikasi bisa digunakan dari smartphone?",
    answer:
      "Ya, platform kami sepenuhnya responsif dan dapat diakses dari smartphone, tablet, atau laptop dengan koneksi internet.",
    icon: Smartphone,
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-lg text-muted">
              Temukan jawaban untuk pertanyaan umum tentang SPO SD Peradaban.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="space-y-4">
          {faqs.map((faq, index) => (
            <StaggerItem key={index}>
              <details className="group rounded-xl border border-border bg-surface overflow-hidden">
                <summary className="flex items-center gap-4 p-6 cursor-pointer list-none hover:bg-background transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <faq.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-base font-semibold text-foreground flex-1 text-left">
                    {faq.question}
                  </span>
                  <span className="text-muted transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-sm text-muted leading-relaxed pl-14">
                    {faq.answer}
                  </p>
                </div>
              </details>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
