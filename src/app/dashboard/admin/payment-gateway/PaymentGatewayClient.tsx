"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CreditCard, Loader2, Server, QrCode } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { StatusBadge } from "@/components/operational/StatusBadge";
import { DataTable } from "@/components/operational/data-table";
import { useToast } from "@/components/ui/toast";
import { getActiveProviders, PROVIDER_CAPABILITIES, METHOD_LABELS, METHOD_GROUPS } from "@/lib/payments";
import type { PaymentMethodType } from "@/lib/payments/types";

type GatewayTransaction = {
  id: string;
  school_id: string;
  payment_id: string | null;
  provider: string;
  external_order_id: string;
  external_transaction_id: string | null;
  provider_status: string;
  payment_method_type: string | null;
  qr_code_url: string | null;
  expires_at: string | null;
  raw_payload: Record<string, unknown>;
  webhook_received_at: string | null;
  created_at: string;
  updated_at: string;
  payments: {
    id: string;
    amount: number;
    status: string;
    students: { id: string; nis: string; full_name: string } | null;
    student_bills: { id: string; amount: number; status: string } | null;
  } | null;
};

export default function PaymentGatewayClient() {
  const [transactions, setTransactions] = useState<GatewayTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const didMountRef = useRef(false);
  const toast = useToast();

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await fetch("/api/admin/payment-gateway");
    if (!res.ok) {
      setError("Gagal memuat data transaksi gateway.");
      setIsLoading(false);
      return;
    }
    const data = await res.json();
    setTransactions(data.transactions || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      loadTransactions();
    }
  }, [loadTransactions]);

  const handleSimulateSuccess = async (externalOrderId: string) => {
    setSimulatingId(externalOrderId);
    setSubmitError(null);
    setSubmitSuccess(null);

    const res = await fetch("/api/admin/payment-gateway/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalOrderId }),
    });

    const data = await res.json();

    if (!res.ok || data?.error) {
      setSubmitError(data?.error || "Gagal mensimulasikan webhook.");
      toast.addToast("error", data?.error || "Gagal mensimulasikan webhook.");
    } else {
      setSubmitSuccess("Simulasi webhook berhasil.");
      toast.addToast("success", "Simulasi webhook berhasil.");
      await loadTransactions();
      window.dispatchEvent(new Event("notification:refresh"));
    }

    setSimulatingId(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString("id-ID") : "-");

  const columns = [
    {
      key: "provider",
      header: "Provider",
      render: (tx: GatewayTransaction) => (
        <div className="flex flex-col gap-1">
          <span className="text-foreground">{tx.provider}</span>
          {tx.payment_method_type === "QRIS" && (
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary w-fit">
              QRIS
            </span>
          )}
        </div>
      ),
    },
    {
      key: "external_order_id",
      header: "External Order",
      render: (tx: GatewayTransaction) => <span className="text-foreground">{tx.external_order_id}</span>,
      mobileHide: true,
    },
    {
      key: "external_transaction_id",
      header: "External Txn",
      render: (tx: GatewayTransaction) => <span className="text-muted">{tx.external_transaction_id || "-"}</span>,
      mobileHide: true,
    },
    {
      key: "provider_status",
      header: "Status",
      render: (tx: GatewayTransaction) => {
        const isQRIS = tx.payment_method_type === "QRIS";
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge status={tx.provider_status} />
            {isQRIS && tx.provider_status === "pending" && (
              <span className="inline-flex items-center gap-1 text-xs text-warning">
                <QrCode className="h-3 w-3" />
                Menunggu pembayaran
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "payment_method_type",
      header: "Metode",
      render: (tx: GatewayTransaction) => {
        if (!tx.payment_method_type) return <span className="text-muted">-</span>;
        const label = tx.payment_method_type.replace(/_/g, " ");
        return (
          <span className="inline-flex items-center rounded-full border border-border bg-muted/10 px-2 py-0.5 text-xs font-medium text-foreground capitalize">
            {label}
          </span>
        );
      },
    },
    {
      key: "payments.amount",
      header: "Payment",
      render: (tx: GatewayTransaction) => {
        if (tx.payments) {
          return (
            <div>
              <p className="text-muted">{formatCurrency(tx.payments.amount)}</p>
              <p className="text-xs text-muted">{tx.payments.students?.full_name || "-"} / {tx.payments.student_bills?.status || "-"}</p>
            </div>
          );
        }
        return <span className="text-muted">-</span>;
      },
    },
    {
      key: "expires_at",
      header: "Expires",
      render: (tx: GatewayTransaction) => {
        if (!tx.expires_at) return <span className="text-muted">-</span>;
        const expires = new Date(tx.expires_at);
        const now = new Date();
        const isQRIS = tx.payment_method_type === "QRIS";
        const isExpired = expires < now;
        const remainingMs = expires.getTime() - now.getTime();
        const remainingMins = Math.max(0, Math.floor(remainingMs / 60000));

        return (
          <div className="flex flex-col gap-0.5">
            <span className={`text-xs ${isExpired ? "text-danger" : isQRIS ? "text-warning font-medium" : "text-muted"}`}>
              {isExpired ? "Kedaluwarsa" : isQRIS ? `Sisa ${remainingMins} menit` : formatDate(tx.expires_at)}
            </span>
            {isQRIS && !isExpired && remainingMins <= 5 && (
              <span className="text-xs text-danger">Segera kedaluwarsa</span>
            )}
          </div>
        );
      },
      mobileHide: true,
    },
    {
      key: "created_at",
      header: "Created",
      render: (tx: GatewayTransaction) => <span className="text-muted">{formatDate(tx.created_at)}</span>,
      mobileHide: true,
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "text-right",
      render: (tx: GatewayTransaction) => (
        tx.provider_status === "pending" && (
          <button
            onClick={() => handleSimulateSuccess(tx.external_order_id)}
            disabled={simulatingId === tx.external_order_id}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-success text-white text-xs font-semibold hover:bg-success/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {simulatingId === tx.external_order_id && <Loader2 className="h-3 w-3 animate-spin" />}
            Simulasi Success
          </button>
        )
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Payment Gateway"
          description="Monitor transaksi gateway dan simulasi webhook"
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
            <p className="text-sm text-success">{submitSuccess}</p>
          </div>
        )}

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-semibold text-foreground">Konfigurasi Payment Architecture (Phase 2.9A-2.9B)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted mb-1">Provider Aktif</p>
              <p className="text-sm font-medium text-foreground">{getActiveProviders().join(', ') || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Provider Tersedia</p>
              <p className="text-sm font-medium text-foreground">{Object.keys(PROVIDER_CAPABILITIES).join(', ')}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Metode Aktif (Sekolah)</p>
              <div className="space-y-1">
                {Object.entries(METHOD_GROUPS).map(([groupName, methodKeys]) => {
                  const hasActive = (methodKeys as PaymentMethodType[]).some(() => {
                    return true; // all methods potentially available
                  });
                  return hasActive ? (
                    <p key={groupName} className="text-xs text-foreground">
                      <span className="font-medium">{groupName}:</span> aktif
                    </p>
                  ) : null;
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Metode per Provider</p>
              <div className="space-y-1">
                {Object.entries(PROVIDER_CAPABILITIES).map(([provider, capability]) => (
                  <p key={provider} className="text-xs text-foreground">
                    <span className="font-medium">{provider}:</span> {capability.methods.map(m => METHOD_LABELS[m]).join(', ')}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <DataTable
            columns={columns}
            data={transactions}
            keyExtractor={(tx) => tx.id}
            isLoading={isLoading}
            emptyTitle="Belum ada transaksi gateway."
            emptyDescription="Transaksi gateway akan muncul di sini saat ada pembayaran masuk."
            emptyIcon={<CreditCard className="h-6 w-6" />}
          />
        </Card>
      </div>
    </PageContainer>
  );
}
