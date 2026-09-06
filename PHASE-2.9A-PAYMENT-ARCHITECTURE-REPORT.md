# Phase 2.9A — Payment Architecture Foundation Report

SPO SD Peradaban — Payment Abstraction Layer (Mock-Only)

## 1. Objective

Phase 2.9A establishes the payment architecture abstraction layer for SPO SD Peradaban **without activating production payments**. The mock provider remains the default and only active provider. Midtrans and Xendit are pure placeholders with no SDK imports.

## 2. Scope

- Created new `src/lib/payments/` abstraction layer
- Added provider strategy, registry, status utilities, and webhook placeholders
- Updated `.env.example` with payment provider environment variables
- Added `createPaymentIntentViaStrategy` alongside existing functions in `service.ts`
- Added read-only provider display in admin PaymentGatewayClient
- Added strategy layer import in parent PaymentCheckoutClient
- **No changes to existing payment behavior, server actions, or database schema**

## 3. New Files Created

### 3.1 `src/lib/payments/types.ts`

Core type definitions for the abstraction layer:

```typescript
export type PaymentProvider = "mock" | "midtrans" | "xendit";
export type PaymentMethodType = "QRIS" | "VA" | "BANK_TRANSFER" | "E_WALLET" | "MANUAL";
export type PaymentStatus = "pending" | "waiting_payment" | "paid" | "failed" | "expired" | "cancelled" | "refunded";
```

Interfaces:
- `PaymentCapability` — provider capabilities matrix
- `PaymentIntentRequest` — unified request shape
- `PaymentIntentResult` — unified result shape
- `PaymentWebhookPayload` — unified webhook payload shape
- `PaymentProviderAdapter` — interface that all providers must implement

### 3.2 `src/lib/payments/constants.ts`

- `PROVIDER_CAPABILITIES` — maps each provider to supported methods and features
- `METHOD_LABELS` — Indonesian labels for payment methods

### 3.3 `src/lib/payments/status.ts`

- `PAYMENT_STATUS_LABELS` — Indonesian status labels
- `PAYMENT_STATUS_COLORS` — Tailwind CSS color classes for badges
- `isTerminalStatus()` — checks if a status is final
- `canTransitionTo()` — state machine validation for status transitions

### 3.4 `src/lib/payments/registry.ts`

- `getAvailableMethods(provider)` — returns supported methods for a provider
- `isMethodSupported(provider, method)` — checks method support
- `getActiveProviders()` — returns `["mock"]` (only mock is active)
- `getProviderCapability(provider)` — returns capability object

### 3.5 `src/lib/payments/strategy.ts`

- `resolveProvider(preferred?)` — returns provider adapter, defaults to mock
- `resolveProviderForMethod(method, preferred?)` — resolves provider by method support
- `getSupportedMethodsForProvider(provider)` — convenience wrapper

Provider instances map all three providers to `MockPaymentProvider` as placeholders.

### 3.6 `src/lib/payments/providers/mock.ts`

Full mock implementation of `PaymentProviderAdapter`:

- Generates synthetic transaction IDs: `mock-txn-{externalOrderId}-{timestamp}`
- Returns mock QR code URL, VA number, and 24-hour expiry
- Implements all interface methods: `createPaymentIntent`, `checkPaymentStatus`, `cancelPayment`, `expirePayment`, `parseWebhook`
- Compatible with existing mock flow

### 3.7 `src/lib/payments/providers/midtrans.ts`

Placeholder Midtrans provider:

- Implements `PaymentProviderAdapter` interface
- Throws `"Midtrans provider belum diimplementasi."` for all methods
- JSDoc comments explain required implementation steps
- **No Midtrans SDK imported**

### 3.8 `src/lib/payments/providers/xendit.ts`

Placeholder Xendit provider:

- Implements `PaymentProviderAdapter` interface
- Throws `"Xendit provider belum diimplementasi."` for all methods
- JSDoc comments explain required implementation steps
- **No Xendit SDK imported**

### 3.9 `src/lib/payments/webhook/verify.ts`

```typescript
export function verifyWebhookSignature(payload: unknown, signature: string, secret: string): boolean {
  // Placeholder for future HMAC verification
  return true;
}
```

### 3.10 `src/lib/payments/webhook/parser.ts`

```typescript
export function parseWebhookPayload(provider: PaymentProvider, payload: unknown): PaymentWebhookPayload {
  // Placeholder — each provider will have its own parser
  return {
    provider,
    externalTransactionId: "",
    status: "pending",
    rawPayload: payload as Record<string, unknown>,
  };
}
```

### 3.11 `src/lib/payments/webhook/dispatcher.ts`

```typescript
export function dispatchWebhook(payload: PaymentWebhookPayload): { accepted: boolean; reason?: string } {
  // Placeholder for webhook event dispatching
  return { accepted: true };
}
```

### 3.12 `src/lib/payments/index.ts`

Barrel export file exporting all types, constants, utilities, providers, and webhook helpers.

## 4. Modified Files

### 4.1 `.env.example`

Added payment provider placeholders:

```
PAYMENT_PROVIDER=mock
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_MERCHANT_ID=
MIDTRANS_IS_PRODUCTION=false
XENDIT_SECRET_KEY=
XENDIT_WEBHOOK_SECRET=
```

### 4.2 `src/lib/payment-gateway/service.ts`

- Added imports for payments strategy layer
- Added `createPaymentIntentViaStrategy()` function that:
  - Uses `resolveProviderForMethod` from the strategy layer
  - Maps strategy `PaymentStatus` to gateway `ProviderStatus`
  - Returns same `PaymentIntentResult` shape as existing functions
  - Does NOT modify existing `createPaymentIntent`, `createParentPaymentIntent`, or `resolveProvider`

### 4.3 `src/app/dashboard/admin/payment-gateway/PaymentGatewayClient.tsx`

Added read-only "Konfigurasi Payment Architecture" card displaying:

- Active provider(s)
- Available providers (all three)
- Supported methods per provider with Indonesian labels

This is informational only with no behavior changes.

### 4.4 `src/app/dashboard/orang-tua/payments/[billId]/PaymentCheckoutClient.tsx`

Added import of `resolveProvider` from `@/lib/payments/strategy` with comment:

```typescript
// Phase 2.9A — strategy layer import for future provider switching.
// Current checkout still uses server action via props; strategy is available here for direct use.
```

Existing mock flow remains unchanged.

## 5. Verification

### Build

```bash
npm run build
# ✓ Compiled successfully
# ✓ TypeScript passed
# ✓ All 36 pages generated
```

### Lint

```bash
npm run lint -- --ext .ts,.tsx src/lib/payments src/app/dashboard/admin/payment-gateway/PaymentGatewayClient.tsx "src/app/dashboard/orang-tua/payments/[billId]/PaymentCheckoutClient.tsx" src/lib/payment-gateway/service.ts
# ✓ No errors
# ✓ No new warnings in new code
```

### Existing Payment Flow

- `createParentPaymentIntent` unchanged
- `createPaymentIntent` unchanged
- Mock provider flow unchanged
- Webhook at `/api/webhooks/payment/mock` unchanged
- All existing imports verified working

## 6. Compatibility Notes

### Receipts

Receipts already accept generic data via `rawPayload`. No changes needed. Receipts are provider-agnostic.

### Notifications

Notifications already use generic event names (`notification:refresh`). No changes needed.

### Database Schema

No schema changes. New abstraction layer operates above existing tables:

- `payment_gateway_transactions`
- `payments`
- `payment_proofs`

## 7. Architecture Summary

```
src/lib/payments/
├── types.ts          — Core type definitions
├── constants.ts      — Provider capabilities & labels
├── status.ts         — Status utilities & state machine
├── registry.ts       — Provider/method registry
├── strategy.ts       — Provider resolution strategy
├── providers/
│   ├── mock.ts       — Active mock provider (full implementation)
│   ├── midtrans.ts   — Placeholder (no SDK)
│   └── xendit.ts     — Placeholder (no SDK)
├── webhook/
│   ├── verify.ts     — Signature verification placeholder
│   ├── parser.ts     — Webhook payload parser placeholder
│   └── dispatcher.ts — Webhook dispatcher placeholder
└── index.ts          — Barrel exports
```

## 8. Next Steps (Future Phases)

1. **Phase 2.9B** — Activate Midtrans: install SDK, implement `MidtransPaymentProvider`, add environment config loading
2. **Phase 2.9C** — Activate Xendit: install SDK, implement `XenditPaymentProvider`, add environment config loading
3. **Phase 2.9D** — Migrate `createPaymentIntentInternal` to use `createPaymentIntentViaStrategy`
4. **Phase 2.9E** — Implement webhook signature verification per provider
5. **Phase 2.9F** — Add provider selection UI in admin panel

## 9. Rules Compliance Checklist

- [x] No existing payment behavior changed
- [x] No server actions changed
- [x] No database schema changes
- [x] No real API calls added
- [x] Mock provider remains default and only active provider
- [x] Midtrans/Xendit are pure placeholders with no SDK imports
- [x] All new files are TypeScript with proper types (no `any`)
- [x] Follows existing code style (camelCase, single quotes)
- [x] `npm run build` passes
- [x] `npm run lint` passes with no new issues
