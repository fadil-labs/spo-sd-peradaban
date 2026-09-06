"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

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
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        const target = e.target as HTMLElement;
        const isTextarea = target.tagName === "TEXTAREA";
        const isInput = target.tagName === "INPUT" && (target as HTMLInputElement).type !== "submit" && (target as HTMLInputElement).type !== "button";
        if (!isTextarea && !isInput) {
          e.preventDefault();
          onConfirm();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel, onConfirm]);

  const confirmClass =
    variant === "danger"
      ? "bg-danger text-white hover:bg-danger/90"
      : "bg-primary text-white hover:bg-primary-dark";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
           className="fixed inset-0 z-[70] flex items-center justify-center"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="fixed inset-0 bg-black/50"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm"
            initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <button
              onClick={onCancel}
              className="absolute right-4 top-4 rounded-md p-1 text-muted hover:bg-muted/10 hover:text-foreground transition-colors"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-foreground mb-2">{title}</h3>
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
                {isConfirming && (
                  <motion.div
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
