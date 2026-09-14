import { PaymentProvider, PaymentMethodType, PaymentCapability } from './types';

const DB_METHOD_TYPE_TO_ENUM: Record<string, PaymentMethodType> = {
  cash: 'MANUAL',
  transfer: 'BANK_TRANSFER',
  e_wallet: 'E_WALLET',
  virtual_account: 'VA',
};

export function toPaymentMethodType(methodType: string | null | undefined, name?: string | null): PaymentMethodType {
  if (!methodType) {
    return 'MANUAL';
  }

  const normalized = methodType.toLowerCase();

  if (normalized === 'e_wallet') {
    if (name && name.toLowerCase() === 'qris') {
      return 'QRIS';
    }
    return 'E_WALLET';
  }

  return DB_METHOD_TYPE_TO_ENUM[normalized] || 'MANUAL';
}

export const PROVIDER_CAPABILITIES: Record<PaymentProvider, PaymentCapability> = {
  mock: {
    provider: 'mock',
    methods: ['QRIS', 'VA', 'BANK_TRANSFER', 'E_WALLET', 'MANUAL'],
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialPayment: true,
  },
  midtrans: {
    provider: 'midtrans',
    methods: ['QRIS', 'VA', 'BANK_TRANSFER', 'E_WALLET'],
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialPayment: false,
  },
  xendit: {
    provider: 'xendit',
    methods: ['QRIS', 'VA', 'E_WALLET', 'BANK_TRANSFER'],
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialPayment: true,
  },
};

export const METHOD_LABELS: Record<PaymentMethodType, string> = {
  QRIS: 'QRIS',
  VA: 'Virtual Account',
  BANK_TRANSFER: 'Transfer Bank',
  E_WALLET: 'E-Wallet',
  MANUAL: 'Manual',
};

export const METHOD_GROUPS: Record<string, PaymentMethodType[]> = {
  'QRIS': ['QRIS'],
  'Virtual Account': ['VA'],
  'Transfer Bank': ['BANK_TRANSFER'],
  'E-Wallet': ['E_WALLET'],
  'Manual': ['MANUAL'],
};

export const METHOD_BADGES: Record<PaymentMethodType, { label: string; variant: 'success' | 'info' | 'warning' | 'muted' }> = {
  QRIS: { label: 'Instant', variant: 'success' },
  VA: { label: '24 Jam', variant: 'info' },
  BANK_TRANSFER: { label: '1-2 Hari', variant: 'muted' },
  E_WALLET: { label: 'Instant', variant: 'success' },
  MANUAL: { label: 'Upload Bukti', variant: 'warning' },
};
