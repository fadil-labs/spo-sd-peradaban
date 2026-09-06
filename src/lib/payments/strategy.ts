import { PaymentProvider, PaymentMethodType, PaymentProviderAdapter } from './types';
import { getProviderCapability, isMethodSupported, getActiveProviders } from './registry';
import { MockPaymentProvider } from './providers/mock';

const providerInstances: Record<PaymentProvider, PaymentProviderAdapter> = {
  mock: new MockPaymentProvider(),
  midtrans: new MockPaymentProvider(),
  xendit: new MockPaymentProvider(),
};

export function resolveProvider(preferred?: PaymentProvider): PaymentProviderAdapter {
  const activeProviders = getActiveProviders();
  if (!preferred || !activeProviders.includes(preferred)) {
    return providerInstances.mock;
  }
  return providerInstances[preferred];
}

export function resolveProviderForMethod(method: PaymentMethodType, preferred?: PaymentProvider): PaymentProviderAdapter {
  if (preferred && isMethodSupported(preferred, method)) {
    return resolveProvider(preferred);
  }
  for (const provider of getActiveProviders()) {
    if (isMethodSupported(provider, method)) {
      return resolveProvider(provider);
    }
  }
  return resolveProvider('mock');
}

export function getSupportedMethodsForProvider(provider: PaymentProvider): PaymentMethodType[] {
  return getProviderCapability(provider)?.methods ?? [];
}
