"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import {
  getSchoolPaymentMethodsAction,
  toggleSchoolPaymentMethodAction,
} from "./actions";
import {
  CreditCard,
  CheckCircle2,
  Power,
  Wallet,
  Landmark,
  Banknote,
  QrCode,
  HelpCircle,
} from "lucide-react";

type PaymentMethod = {
  id: string;
  name: string;
  method_type: string | null;
  is_active: boolean;
};

type SchoolPaymentMethod = {
  id: string;
  payment_method_id: string;
  is_active: boolean;
  payment_methods: PaymentMethod;
};

const METHOD_TYPE_LABELS: Record<string, string> = {
  cash: "Tunai / Kasir",
  transfer: "Transfer Bank Direct",
  e_wallet: "E-Wallet / Qris",
  virtual_account: "Virtual Account",
  other: "Lainnya",
};

export default function SchoolPaymentMethodsPage() {
  const [schoolMethods, setSchoolMethods] = useState<SchoolPaymentMethod[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getSchoolPaymentMethodsAction();
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setSchoolMethods(result.schoolMethods);
      setAllMethods(result.allMethods);
      setEnabledIds(new Set(result.enabledIds));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    loadData();
  }, [loadData]);

  const handleToggle = async (paymentMethodId: string, currentStatus: boolean) => {
    setIsSubmitting(true);
    setSubmitError(null);
    const result = await toggleSchoolPaymentMethodAction(paymentMethodId, currentStatus);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast(
        "success",
        currentStatus ? "Metode pembayaran dinonaktifkan." : "Metode pembayaran berhasil diaktifkan."
      );
      loadData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notification:refresh"));
      }
    }
    setIsSubmitting(false);
  };

  const disabledMethods = allMethods.filter((m) => !enabledIds.has(m.id));

  const formatMethodType = (methodType: string | null) => {
    if (!methodType) return "Lainnya";
    return METHOD_TYPE_LABELS[methodType] || methodType;
  };

  const getMethodIcon = (methodType: string | null) => {
    switch (methodType) {
      case "cash":
        return <Banknote className="h-5 w-5 text-[#0C3B2E]" />;
      case "transfer":
        return <Landmark className="h-5 w-5 text-[#2563EB]" />;
      case "e_wallet":
        return <QrCode className="h-5 w-5 text-[#C28E38]" />;
      case "virtual_account":
        return <Wallet className="h-5 w-5 text-[#0C3B2E]" />;
      default:
        return <CreditCard className="h-5 w-5 text-[#7A7A7A]" />;
    }
  };

  return (
    <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
      <div className="flex flex-col gap-5 sm:gap-6 max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
            Metode Pembayaran Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
            Aktifkan kanal pembayaran yang dapat digunakan oleh orang tua siswa saat melunasi tagihan.
          </p>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{error}</p>
          </div>
        )}

        {submitError && (
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{submitError}</p>
          </div>
        )}

        {/* TWO COLUMN CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* METODE AKTIF */}
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE6DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Metode Pembayaran Aktif</h3>
                <p className="text-xs text-[#7A7A7A]">Kanal yang muncul pada opsi portal pembayaran orang tua</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
                {schoolMethods.length} Aktif
              </span>
            </div>

            {isLoading ? (
              <TableSkeleton rows={3} columns={2} />
            ) : schoolMethods.length === 0 ? (
              <div className="p-8 text-center bg-[#F5F3EC] rounded-2xl border border-[#E5E0D8] space-y-2">
                <HelpCircle className="h-8 w-8 text-[#8A8A8A] mx-auto" />
                <p className="text-xs font-bold text-[#1A1A1A]">Belum Ada Metode Pembayaran Aktif</p>
                <p className="text-[11px] text-[#7A7A7A]">
                  Pilih dan aktifkan dari daftar opsi yang tersedia di sebelah kanan.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {schoolMethods.map((sm) => (
                  <div
                    key={sm.id}
                    className="p-4 bg-[#F5F3EC] rounded-2xl border border-[#E5E0D8] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white rounded-xl border border-[#E5E0D8]">
                        {getMethodIcon(sm.payment_methods.method_type)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1A1A1A]">
                          {sm.payment_methods.name}
                        </p>
                        <p className="text-[11px] font-semibold text-[#7A7A7A]">
                          Tipe: {formatMethodType(sm.payment_methods.method_type)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle(sm.payment_method_id, true)}
                      disabled={isSubmitting}
                      className="px-3.5 py-2 bg-[#A83A32]/10 border border-[#A83A32]/30 text-[#A83A32] text-xs font-bold rounded-xl hover:bg-[#A83A32] hover:text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Power className="h-3.5 w-3.5" />
                      Nonaktifkan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TERSEDIA UNTUK DIAKTIFKAN */}
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE6DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Tersedia untuk Diaktifkan</h3>
                <p className="text-xs text-[#7A7A7A]">Metode umum yang dapat Anda tambahkan ke sekolah</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#7A7A7A]/10 text-[#7A7A7A]">
                {disabledMethods.length} Tersedia
              </span>
            </div>

            {isLoading ? (
              <TableSkeleton rows={3} columns={2} />
            ) : disabledMethods.length === 0 ? (
              <div className="p-8 text-center bg-[#F5F3EC] rounded-2xl border border-[#E5E0D8] space-y-2">
                <CheckCircle2 className="h-8 w-8 text-[#0C3B2E] mx-auto" />
                <p className="text-xs font-bold text-[#1A1A1A]">Semua Metode Telah Diaktifkan</p>
                <p className="text-[11px] text-[#7A7A7A]">
                  Seluruh kanal pembayaran sistem sudah siap digunakan oleh sekolah Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {disabledMethods.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 bg-[#F5F3EC] rounded-2xl border border-[#E5E0D8] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white rounded-xl border border-[#E5E0D8]">
                        {getMethodIcon(m.method_type)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1A1A1A]">{m.name}</p>
                        <p className="text-[11px] font-semibold text-[#7A7A7A]">
                          Tipe: {formatMethodType(m.method_type)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle(m.id, false)}
                      disabled={isSubmitting}
                      className="px-3.5 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aktifkan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}