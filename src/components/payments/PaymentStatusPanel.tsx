"use client";

import { Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentStatusPanelProps = {
  status: string;
  label?: string;
  description?: string;
  className?: string;
};

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending: { color: "text-warning", icon: Clock, label: "Menunggu Pembayaran" },
  waiting_payment: { color: "text-warning", icon: Clock, label: "Menunggu Pembayaran" },
  processing: { color: "text-primary", icon: Clock, label: "Memproses" },
  paid: { color: "text-success", icon: CheckCircle, label: "Berhasil" },
  success: { color: "text-success", icon: CheckCircle, label: "Berhasil" },
  failed: { color: "text-danger", icon: XCircle, label: "Gagal" },
  cancelled: { color: "text-muted", icon: XCircle, label: "Dibatalkan" },
  expired: { color: "text-muted", icon: XCircle, label: "Kedaluwarsa" },
  refunded: { color: "text-warning", icon: RefreshCw, label: "Dikembalikan" },
};

export function PaymentStatusPanel({ status, label, description, className }: PaymentStatusPanelProps) {
  const config = STATUS_CONFIG[status] || { color: "text-muted", icon: XCircle, label: status };
  const Icon = config.icon;
  const displayLabel = label || config.label;

  return (
    <div
      className={cn("flex items-center gap-2 transition-colors duration-300", config.color, className)}
      aria-label={`Status pembayaran: ${displayLabel}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="text-sm font-medium">{displayLabel}</span>
      {description && <span className="text-xs text-muted">{description}</span>}
    </div>
  );
}
