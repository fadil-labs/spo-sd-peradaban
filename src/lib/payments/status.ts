import { PaymentStatus } from './types';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Menunggu',
  waiting_payment: 'Menunggu Pembayaran',
  paid: 'Berhasil',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
  refunded: 'Dikembalikan',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-primary/10 text-primary',
  waiting_payment: 'bg-primary/10 text-primary',
  paid: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
  expired: 'bg-muted/20 text-muted',
  cancelled: 'bg-muted/20 text-muted',
  refunded: 'bg-warning/10 text-warning',
};

export function isTerminalStatus(status: PaymentStatus): boolean {
  return ['paid', 'failed', 'expired', 'cancelled', 'refunded'].includes(status);
}

export function canTransitionTo(current: PaymentStatus, next: PaymentStatus): boolean {
  const transitions: Record<PaymentStatus, PaymentStatus[]> = {
    pending: ['waiting_payment', 'cancelled', 'expired'],
    waiting_payment: ['paid', 'failed', 'expired', 'cancelled'],
    paid: ['refunded'],
    failed: [],
    expired: [],
    cancelled: [],
    refunded: [],
  };
  return transitions[current]?.includes(next) ?? false;
}
