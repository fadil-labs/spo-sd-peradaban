"use client";

import { X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: "default" | "danger";
  isConfirming?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  onConfirm,
  onCancel,
  variant = "default",
  isConfirming = false,
  children,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-danger text-white hover:bg-danger/90"
      : "bg-primary text-white hover:bg-primary-dark";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-md p-1 text-muted hover:bg-muted/10 hover:text-foreground"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
        {description && <p className="text-sm text-muted mb-4">{description}</p>}
        {children}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="h-9 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`h-9 px-4 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-2 ${confirmClass}`}
          >
            {isConfirming && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
