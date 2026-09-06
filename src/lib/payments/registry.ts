import { PaymentProvider, PaymentMethodType, PaymentCapability } from './types';
import { PROVIDER_CAPABILITIES } from './constants';

export function getAvailableMethods(provider: PaymentProvider): PaymentMethodType[] {
  return PROVIDER_CAPABILITIES[provider]?.methods ?? [];
}

export function isMethodSupported(provider: PaymentProvider, method: PaymentMethodType): boolean {
  return getAvailableMethods(provider).includes(method);
}

export function getActiveProviders(): PaymentProvider[] {
  return ['mock'];
}

export function getProviderCapability(provider: PaymentProvider): PaymentCapability | undefined {
  return PROVIDER_CAPABILITIES[provider];
}
