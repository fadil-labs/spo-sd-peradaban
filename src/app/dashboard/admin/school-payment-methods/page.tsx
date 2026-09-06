"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { getSchoolPaymentMethodsAction, toggleSchoolPaymentMethodAction } from "./actions";

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
  cash: "Tunai",
  transfer: "Transfer",
  e_wallet: "E-Wallet",
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
  const [submitSuccess, setSubmitSuccess] = useState(false);
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
      setEnabledIds(result.enabledIds);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleToggle = async (paymentMethodId: string, currentStatus: boolean) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    const result = await toggleSchoolPaymentMethodAction(paymentMethodId, currentStatus);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      setSubmitSuccess(true);
      toast.addToast("success", currentStatus ? "Metode pembayaran dinonaktifkan." : "Metode pembayaran diaktifkan.");
      loadData();
      window.dispatchEvent(new Event("notification:refresh"));
    }
    setIsSubmitting(false);
  };

  const disabledMethods = allMethods.filter((m) => !enabledIds.has(m.id));

  const formatMethodType = (methodType: string | null) => {
    if (!methodType) return "Lainnya";
    return METHOD_TYPE_LABELS[methodType] || methodType;
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Metode Pembayaran Sekolah"
          description="Aktifkan atau nonaktifkan metode pembayaran untuk sekolah ini"
        />

        {error && (
          <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {submitError && (
          <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{submitError}</p>
          </div>
        )}

        {submitSuccess && (
          <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3">
            <p className="text-sm text-success">Metode pembayaran berhasil diperbarui.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Metode Aktif</h3>
            {isLoading ? (
              <ListSkeleton items={4} />
            ) : schoolMethods.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-6 w-6" />}
                title="Belum ada metode pembayaran aktif."
                description="Aktifkan metode pembayaran dari daftar yang tersedia."
              />
            ) : (
              <div className="divide-y divide-border">
                {schoolMethods.map((sm) => (
                  <div key={sm.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{sm.payment_methods.name}</p>
                      <p className="text-xs text-muted">{formatMethodType(sm.payment_methods.method_type)}</p>
                    </div>
                    <button
                      onClick={() => handleToggle(sm.payment_method_id, true)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-warning text-warning text-xs font-semibold hover:bg-warning/10 transition-colors min-h-[44px]"
                    >
                      Nonaktifkan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Tersedia untuk Diaktifkan</h3>
            {isLoading ? (
              <ListSkeleton items={4} />
            ) : disabledMethods.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-6 w-6" />}
                title="Semua metode sudah diaktifkan."
                description="Tidak ada metode pembayaran yang perlu diaktifkan saat ini."
              />
            ) : (
              <div className="divide-y divide-border">
                {disabledMethods.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted">{formatMethodType(m.method_type)}</p>
                    </div>
                    <button
                      onClick={() => handleToggle(m.id, false)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-success text-white text-xs font-semibold hover:bg-success/90 transition-colors min-h-[44px]"
                    >
                      Aktifkan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
