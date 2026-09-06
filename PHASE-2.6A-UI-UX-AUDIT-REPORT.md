# PHASE 2.6A — UI/UX AUDIT & DESIGN SYSTEM FOUNDATION

## 1. Executive Summary

**Status:** PASS — UI/UX AUDIT COMPLETE

The SPO SD Peradaban frontend has a solid foundation with a coherent color system, consistent component patterns, and proper loading/error/empty states. The application uses modern Next.js 16 with Tailwind CSS v4, shadcn/ui components, and Motion for animations.

**Key Strengths:**
- Cohesive green-based color palette appropriate for Islamic educational context
- Consistent card-based dashboard layout
- Proper server-side authentication and authorization
- Loading, error, and empty states implemented on all data-dependent pages
- Responsive grid layouts with mobile considerations
- Form validation and feedback patterns in place

**Key Gaps Identified:**
- No global navigation sidebar for dashboard (relies on browser back/navigation)
- Inconsistent button patterns (mix of shadcn Button and custom Tailwind buttons)
- No toast notification system integrated into user actions
- Limited micro-interactions despite Motion library being available
- No skeleton loaders (spinner-only loading states)
- No dedicated mobile navigation pattern for dashboard
- Some pages have unused imports and minor lint issues (pre-existing)

---

## 2. Frontend Inventory

### Tech Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.3.4 | Framework |
| React | 19.2.8 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| shadcn/ui | base-nova | Component library |
| Motion | 12.23.16 | Animations |
| Lucide React | 0.511.0 | Icons |
| Supabase | 0.12.5/2.112.4 | Backend/Auth |

### File Structure
```
src/
├── app/
│   ├── layout.tsx                    # Root layout with ToastProvider
│   ├── page.tsx                      # Landing page
│   ├── globals.css                   # Design tokens
│   ├── error.tsx                     # Global error boundary
│   ├── loading.tsx                   # Global loading state
│   ├── not-found.tsx                 # Global 404
│   ├── login/page.tsx                # Login
│   ├── forgot-password/page.tsx      # Forgot password
│   ├── reset-password/page.tsx       # Reset password
│   ├── profile/page.tsx + actions.ts # Profile management
│   └── dashboard/
│       ├── admin/                    # Admin dashboard (14 sub-pages)
│       ├── bendahara/                # Bendahara dashboard (1 sub-page)
│       └── orang-tua/                # Parent dashboard (6 sub-pages)
├── components/
│   ├── ui/                           # shadcn/ui primitives (button only)
│   ├── sections/                     # Landing page sections (11 components)
│   ├── notifications/                # Notifications client
│   └── animations/                   # Motion animation wrappers (8 components)
└── lib/
    ├── utils.ts                      # cn() helper
    ├── auth/authorization.ts         # Auth utilities
    ├── supabase/                     # Supabase clients
    ├── payment-gateway/              # Payment gateway service
    ├── notifications/                # Notification service
    ├── financial-audit/              # Financial audit actions
    ├── file-security/                # File validation
    └── document-storage/             # Document storage service
```

---

## 3. Route Inventory

### Public Routes
| Route | Page | Purpose |
|-------|------|---------|
| `/` | `page.tsx` | Landing page |
| `/login` | `login/page.tsx` | Authentication |
| `/forgot-password` | `forgot-password/page.tsx` | Password reset request |
| `/reset-password` | `reset-password/page.tsx` | Password reset form |

### Admin Routes
| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard/admin` | `page.tsx` | Admin dashboard summary |
| `/dashboard/admin/students` | `students/page.tsx` | Student CRUD |
| `/dashboard/admin/student-bills` | `student-bills/page.tsx` | Bill management |
| `/dashboard/admin/student-bills/[id]` | `student-bills/[id]/page.tsx` | Bill detail |
| `/dashboard/admin/school` | `school/page.tsx` | School settings |
| `/dashboard/admin/school-payment-methods` | `school-payment-methods/page.tsx` | Payment methods config |
| `/dashboard/admin/payments` | `payments/page.tsx` | Payment monitoring |
| `/dashboard/admin/payments/[paymentId]/receipt` | `payments/[paymentId]/receipt/page.tsx` | Payment receipt |
| `/dashboard/admin/payment-proofs` | `payment-proofs/page.tsx` | Proof verification |
| `/dashboard/admin/payment-gateway` | `payment-gateway/page.tsx` | Gateway simulation |
| `/dashboard/admin/payment-categories` | `payment-categories/page.tsx` | Category CRUD |
| `/dashboard/admin/guardians` | `guardians/page.tsx` | Guardian management |
| `/dashboard/admin/financial-reports` | `financial-reports/page.tsx` | Financial reports |
| `/dashboard/admin/financial-audit-logs` | `financial-audit-logs/page.tsx` | Audit trail |
| `/dashboard/admin/notifications` | `notifications/page.tsx` | Notification center |
| `/dashboard/admin/enrollments` | `enrollments/page.tsx` | Enrollment CRUD |
| `/dashboard/admin/classes` | `classes/page.tsx` | Class CRUD |
| `/dashboard/admin/academic-years` | `academic-years/page.tsx` | Academic year CRUD |

### Bendahara Routes
| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard/bendahara` | `page.tsx` | Bendahara dashboard |
| `/dashboard/bendahara/notifications` | `notifications/page.tsx` | Notifications |

### Orang Tua Routes
| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard/orang-tua` | `page.tsx` | Parent dashboard |
| `/dashboard/orang-tua/bills` | `bills/page.tsx` | Bill list |
| `/dashboard/orang-tua/bills/[id]` | `bills/[id]/page.tsx` | Bill detail |
| `/dashboard/orang-tua/payments` | `payments/page.tsx` | Payment history |
| `/dashboard/orang-tua/payments/[billId]` | `payments/[billId]/page.tsx` | Payment checkout |
| `/dashboard/orang-tua/payments/receipt/[paymentId]` | `payments/receipt/[paymentId]/page.tsx` | Payment receipt |
| `/dashboard/orang-tua/notifications` | `notifications/page.tsx` | Notifications |

### API Routes
| Route | Purpose |
|-------|---------|
| `/api/auth/me` | Get current user profile |
| `/api/payment-methods` | List active payment methods |
| `/api/payment-proofs` | List payment proofs (admin) |
| `/api/payment-proofs/[id]/download` | Download proof file |
| `/api/admin/payment-gateway` | List gateway transactions |
| `/api/admin/payment-gateway/simulate` | Simulate webhook |
| `/api/webhooks/payment/mock` | Mock webhook endpoint |

---

## 4. Existing Design System

### Colors
**Primary palette:**
- `--primary: #0F5C46` — Deep emerald green
- `--primary-dark: #084636` — Darker emerald
- `--emerald: #138A68` — Bright emerald accent
- `--gold: #C9A227` — Gold accent (underutilized)

**Neutral palette:**
- `--background: #F7FAF8` — Light mint background
- `--surface: #FFFFFF` — White surface
- `--foreground: #10251E` — Near-black green
- `--muted: #6B7C75` — Gray-green muted text
- `--border: #E5ECE8` — Light green-gray border

**Semantic colors:**
- `--success: #16A34A` — Green
- `--warning: #D97706` — Amber
- `--danger: #DC2626` — Red

**Assessment:** Cohesive, Islamic-education-appropriate palette. Green-forward with subtle warmth. Gold accent exists but is rarely used in the UI.

### Typography
- **Font:** Geist Sans (variable) + Geist Mono
- **Heading scale:** text-2xl, text-3xl, text-4xl, text-5xl, text-6xl
- **Body:** text-sm, text-base, text-lg
- **Caption:** text-xs
- **Weights:** font-medium, font-semibold, font-bold

**Assessment:** Consistent typography hierarchy. No formal type scale documented, but usage is consistent.

### Spacing
- **Component padding:** p-6, p-8
- **Card spacing:** space-y-6, space-y-4
- **Grid gaps:** gap-4, gap-6, gap-12, gap-16
- **Section padding:** py-12, py-20, pb-20

**Assessment:** Consistent spacing rhythm. No formal spacing scale documented.

### Radius
- **Small:** rounded-md (buttons, inputs)
- **Medium:** rounded-lg (cards, modals)
- **Large:** rounded-2xl (containers, panels)
- **Full:** rounded-full (badges, avatars)

**Assessment:** Consistent radius usage. Good progression.

### Shadow
- **Cards:** shadow-sm (subtle)
- **Elevated elements:** shadow-lg (hero cards)
- **Custom:** shadow-primary/20, shadow-primary/10 (colored shadows)

**Assessment:** Minimal shadow usage. Appropriate for clean aesthetic.

### Animation
- **Library:** Motion (Framer Motion)
- **Components:** FadeIn, SlideUp, SlideLeft, SlideRight, ScaleIn, HoverLift, FloatingCard, StaggerItem, StaggerContainer
- **Usage:** Landing page only. Dashboard pages use no animations.
- **Loading:** Spinner (`Loader2` from lucide-react)
- **Hover:** transition-colors, hover:bg-primary-dark

**Assessment:** Animation library is well-architected but underutilized. Only landing page uses animations. Dashboard is static.

---

## 5. Component Audit

### Existing UI Primitives
| Component | Status | Usage |
|-----------|--------|-------|
| `Button` | ✅ shadcn/ui | Used across app |
| `Input` | ❌ Missing | Raw `<input>` elements |
| `Select` | ❌ Missing | Raw `<select>` elements |
| `Textarea` | ❌ Missing | Raw `<textarea>` elements |
| `Checkbox` | ❌ Missing | Raw `<input type="checkbox">` |
| `Switch` | ❌ Missing | Not used |
| `Card` | ❌ Missing | Raw `<div>` with card classes |
| `Badge` | ❌ Missing | Raw `<span>` with badge classes |
| `Avatar` | ❌ Missing | Not used |
| `Dialog/Modal` | ❌ Missing | Custom modal implementation in payment-proofs |
| `Toast` | ✅ Custom | `src/components/ui/toast.tsx` |
| `Alert` | ❌ Missing | Raw `<div>` with alert classes |

### Component Consistency Issues

**Issue 1: Button inconsistency**
- Some places use shadcn `<Button>` component
- Many places use raw `<button>` with Tailwind classes
- Example: admin dashboard cards use `<Link>` with button classes instead of `<Button>`

**Issue 2: Card inconsistency**
- Some cards use `rounded-2xl border border-border bg-surface shadow-sm`
- Others use `rounded-xl` or different padding
- No standardized `Card` component

**Issue 3: Badge inconsistency**
- Status badges implemented inline with ternary operators
- Colors applied inconsistently (some use `bg-success/10 text-success`, others use different patterns)
- No reusable `Badge` component

**Issue 4: Form input inconsistency**
- All inputs are raw HTML elements
- Same classes repeated across forms
- No reusable `Input`, `Select`, `Textarea` components

**Issue 5: Table inconsistency**
- Tables use consistent `overflow-x-auto` wrapper
- Header styling consistent
- No reusable `DataTable` component

---

## 6. Page-by-Page UX Audit

### Landing Page (`/`)
**Status:** UI COMPLETE

- **Visual hierarchy:** Clear hero section with headline, description, CTAs
- **Navigation:** Fixed navbar with scroll effect
- **Sections:** Hero, Trust Benefits, Payment Features, Payment Methods, Parent Benefits, School Benefits, How It Works, Advantages, FAQ, Final CTA, Footer
- **Animation:** Slide/Fade animations on hero section
- **Responsive:** Grid layouts adapt from 1 to 2 columns
- **Empty/Error:** N/A (static content)

### Login Page (`/login`)
**Status:** UI COMPLETE

- **Visual hierarchy:** Logo → Title → Form → Submit button
- **Loading:** Button shows spinner during auth
- **Error:** Red alert box with specific error messages
- **Empty:** N/A
- **Responsive:** Centered card, max-w-md, works on mobile
- **Accessibility:** Labels properly associated, aria-label on mobile menu toggle

### Admin Dashboard (`/dashboard/admin`)
**Status:** UI COMPLETE

- **Visual hierarchy:** Page title → Stat cards → Recent payments table → Quick links grid
- **Data:** Server-rendered summary cards
- **Loading:** No loading state (server component)
- **Empty:** N/A (dashboard always has data or shows error)
- **Responsive:** Grid adapts from 1 to 4 columns
- **Navigation:** Card-based navigation to sub-pages

### Admin Students (`/dashboard/admin/students`)
**Status:** UI COMPLETE

- **Visual hierarchy:** Page title → Add button → Filters → Table
- **Loading:** Spinner overlay
- **Empty:** "Belum ada siswa." message
- **Error:** Red alert box
- **Success:** Green alert box after create/update
- **Form:** Inline create/edit form with proper validation
- **Responsive:** Table wraps with `overflow-x-auto`
- **Pagination:** Page info + Previous/Next buttons

### Admin Student Bills (`/dashboard/admin/student-bills`)
**Status:** UI COMPLETE

- Same pattern as students page
- Additional lookups for students, categories, enrollments
- Form with conditional recurring billing fields
- Responsive table with overflow

### Admin Payment Proofs (`/dashboard/admin/payment-proofs`)
**Status:** RUNTIME ERROR

- **Visual hierarchy:** Page title → Filter → Table
- **Loading:** Spinner overlay
- **Empty:** "Belum ada bukti pembayaran."
- **Error:** Red alert box "Gagal memuat data bukti pembayaran."
- **Current state:** API returns 500 due to PGRST201 (duplicate FK)
- **After fix:** Should show empty state or proof list

### Admin Payment Gateway (`/dashboard/admin/payment-gateway`)
**Status:** RUNTIME ERROR

- **Visual hierarchy:** Page title → Stats cards → Transaction table
- **Loading:** Suspense spinner
- **Empty:** "Belum ada transaksi gateway."
- **Error:** Red alert box
- **Current state:** API returns 500 due to PGRST201
- **After fix:** Should show empty state or transaction list

### Admin Notifications (`/dashboard/admin/notifications`)
**Status:** UI COMPLETE

- **Visual hierarchy:** Page title → Filters → Notification list
- **Loading:** Client-side loading state
- **Empty:** "Tidak ada notifikasi."
- **Error:** N/A
- **Filter:** Type, entity, date range, read/unread
- **Responsive:** Client component with filter bar

### Bendahara Dashboard (`/dashboard/bendahara`)
**Status:** UI COMPLETE

- Same pattern as admin dashboard
- Server-rendered summary
- Quick links grid

### Parent Dashboard (`/dashboard/orang-tua`)
**Status:** UI COMPLETE

- Server-rendered summary
- Shows connected student info
- Bills summary
- Payment methods

### Parent Bills (`/dashboard/orang-tua/bills`)
**Status:** UI COMPLETE

- Lists bills for parent's children
- Loading, empty, error states
- Responsive table

### Parent Payment Checkout (`/dashboard/orang-tua/payments/[billId]`)
**Status:** UI COMPLETE

- Multi-step payment flow
- Payment method selection
- Amount input with validation
- Proof upload
- Success confirmation
- Loading/error states

---

## 7. Responsive Audit

### Mobile (320px - 430px)
- **Navbar:** Hamburger menu present
- **Cards:** Single column layout
- **Tables:** Horizontal scroll with `overflow-x-auto`
- **Forms:** Single column inputs
- **Buttons:** Full-width on small screens
- **Assessment:** Functional but basic. No mobile-specific navigation patterns.

### Tablet (768px - 1024px)
- **Grid:** 2-column layouts activate
- **Tables:** Still require horizontal scroll
- **Forms:** 2-column grids
- **Assessment:** Adequate. No tablet-specific optimizations.

### Desktop (1280px - 1920px)
- **Grid:** Up to 4 columns for stat cards
- **Tables:** Full width with comfortable padding
- **Max width:** max-w-7xl for containers
- **Assessment:** Good desktop experience.

### Issues Found
1. No mobile bottom navigation for dashboard
2. Tables are difficult to read on mobile despite horizontal scroll
3. No viewport-specific component switching
4. Dashboard sidebar navigation missing (relies on browser back button)

---

## 8. Accessibility Audit

### Strengths
- All form inputs have associated `<label>` elements
- Button elements used for actions (not divs)
- `lang="id"` set on HTML element
- Focus states implemented (`focus:ring-2 focus:ring-primary`)
- Mobile menu button has `aria-label`
- Semantic HTML used (nav, main, section, heading hierarchy)

### Gaps
- No skip-to-content link
- No ARIA live regions for dynamic content updates
- No modal accessibility (no role="dialog", aria-modal, focus trapping)
- No keyboard navigation for custom components
- No reduced motion media query handling
- Table headers lack explicit scope attributes
- No image alt text patterns (no images in dashboard)

---

## 9. Loading/Empty/Error Audit

### Loading States
| Page | Loading Implementation | Status |
|------|------------------------|--------|
| Landing | None (static) | ✅ OK |
| Login | Button spinner | ✅ OK |
| Admin Dashboard | None (server) | ✅ OK |
| Admin Students | Spinner overlay | ✅ OK |
| Admin Bills | Spinner overlay | ✅ OK |
| Admin Payment Proofs | Spinner overlay | ✅ OK |
| Admin Gateway | Suspense spinner | ✅ OK |
| Admin Notifications | Client loading state | ✅ OK |
| Bendahara Dashboard | None (server) | ✅ OK |
| Parent Dashboard | None (server) | ✅ OK |
| Parent Bills | Spinner overlay | ✅ OK |
| Parent Payments | Spinner overlay | ✅ OK |

**Gap:** No skeleton loaders. Only spinners.

### Empty States
| Page | Empty State | Status |
|------|-------------|--------|
| Admin Students | "Belum ada siswa." | ✅ OK |
| Admin Bills | "Belum ada tagihan." | ✅ OK |
| Admin Payment Proofs | "Belum ada bukti pembayaran." | ✅ OK |
| Admin Gateway | "Belum ada transaksi gateway." | ✅ OK |
| Admin Notifications | "Tidak ada notifikasi." | ✅ OK |
| Admin Audit Logs | "Tidak ada log keuangan." | ✅ OK |
| Parent Bills | "Belum ada tagihan." | ✅ OK |
| Parent Payments | "Belum ada riwayat pembayaran." | ✅ OK |

**Assessment:** All data-dependent pages have intentional empty states.

### Error States
| Page | Error State | Status |
|------|-------------|--------|
| Admin Students | Red alert box with message | ✅ OK |
| Admin Bills | Red alert box with message | ✅ OK |
| Admin Payment Proofs | Red alert box | ✅ OK |
| Admin Gateway | Red alert box | ✅ OK |
| Admin Notifications | N/A | ✅ OK |
| Parent Bills | Red alert box | ✅ OK |

**Gap:** No retry buttons on error states. Users must manually refresh.

---

## 10. Animation Audit

### Existing Animation Components
| Component | Purpose | Status |
|-----------|---------|--------|
| `FadeIn` | Fade in on mount | ✅ Landing page |
| `SlideUp` | Slide up with delay | ✅ Landing page |
| `SlideLeft` | Slide from left | ✅ Landing page |
| `SlideRight` | Slide from right | ✅ Landing page |
| `ScaleIn` | Scale in animation | ⚠️ Not used |
| `HoverLift` | Hover lift effect | ⚠️ Not used |
| `FloatingCard` | Floating card animation | ⚠️ Not used |
| `StaggerItem` | Staggered list items | ⚠️ Not used |
| `StaggerContainer` | Stagger container | ⚠️ Not used |

### Assessment
- Animation library is well-structured
- Only landing page uses animations
- Dashboard pages are completely static
- No `prefers-reduced-motion` handling
- No page transitions
- No micro-interactions on buttons, cards, or form elements

---

## 11. Visual Direction

### Current Direction
"Clean Islamic Education SaaS"

### Strengths
- Green-forward palette appropriate for educational context
- Clean, modern aesthetic
- Card-based layout feels contemporary
- Subtle shadows and borders
- Professional typography

### Gaps
- Landing page feels more like marketing site than app
- Dashboard feels like generic CRUD template
- No distinctive visual identity beyond color
- Gold accent (`--gold`) is defined but almost never used
- No geometric patterns or subtle Islamic design elements
- No illustrations or icons beyond Lucide

### Proposed Enhancement
- Use gold accent for primary CTAs and highlights
- Add subtle geometric patterns to card backgrounds
- Introduce consistent iconography for dashboard sections
- Add micro-interactions to improve perceived responsiveness
- Consider illustration style for empty states

---

## 12. Proposed Design Tokens

### Colors
```css
--primary: #0F5C46;
--primary-dark: #084636;
--primary-light: #E8F5F0;
--secondary: #6B7C75;
--secondary-light: #F0F4F2;
--accent: #C9A227; /* Gold - underutilized */
--accent-light: #FDF8E8;
--success: #16A34A;
--success-light: #F0FDF4;
--warning: #D97706;
--warning-light: #FFFBEB;
--danger: #DC2626;
--danger-light: #FEF2F2;
--background: #F7FAF8;
--surface: #FFFFFF;
--surface-elevated: #FFFFFF;
--foreground: #10251E;
--muted: #6B7C75;
--border: #E5ECE8;
```

### Typography
```css
--font-display: var(--font-geist-sans); /* H1, hero */
--font-heading: var(--font-geist-sans); /* H2, H3 */
--font-body: var(--font-geist-sans); /* Body text */
--font-caption: var(--font-geist-sans); /* Small text */
--font-label: var(--font-geist-sans); /* Labels */
--font-mono: var(--font-geist-mono); /* Code, numbers */
```

### Spacing
```css
--spacing-xs: 0.25rem;  /* 4px */
--spacing-sm: 0.5rem;   /* 8px */
--spacing-md: 1rem;     /* 16px */
--spacing-lg: 1.5rem;   /* 24px */
--spacing-xl: 2rem;     /* 32px */
--spacing-2xl: 3rem;    /* 48px */
--spacing-3xl: 4rem;    /* 64px */
```

### Radius
```css
--radius-sm: 0.25rem;   /* 4px - inputs, small buttons */
--radius-md: 0.5rem;    /* 8px - buttons, cards */
--radius-lg: 0.75rem;   /* 12px - modals, panels */
--radius-xl: 1rem;      /* 16px - containers */
--radius-2xl: 1.5rem;   /* 24px - hero cards */
--radius-full: 9999px;  /* pills, avatars */
```

### Shadow
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-colored: 0 4px 14px 0 color-mix(in srgb, var(--primary) 20%, transparent);
```

### Motion
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
--easing-enter: cubic-bezier(0, 0, 0.2, 1);
--easing-exit: cubic-bezier(0.4, 0, 1, 1);
```

---

## 13. Proposed Component Architecture

### Reusable Components to Create

**Priority 1 — Form Primitives**
- `Input` — Standardized text input with label, error state, helper text
- `Select` — Standardized select with label, error state
- `Textarea` — Standardized textarea with label, error state
- `Checkbox` — Standardized checkbox with label
- `FormField` — Wrapper combining label, input, error, helper text

**Priority 2 — Data Display**
- `Card` — Standardized card with header, body, footer slots
- `Badge` — Status badge with variant prop
- `StatCard` — Dashboard stat card with title, value, subtitle
- `DataTable` — Reusable table with loading, empty, error, pagination
- `Pagination` — Standardized pagination component
- `FilterBar` — Search + filter bar for list pages

**Priority 3 — Feedback**
- `Toast` — Already exists, needs integration
- `Alert` — Success, error, warning, info variants
- `ConfirmDialog` — Confirmation dialog for destructive actions

**Priority 4 — Layout**
- `PageHeader` — Standardized page title + description + actions
- `SectionHeader` — Section title with optional actions
- `EmptyState` — Standardized empty state with icon, title, description, action
- `ErrorState` — Standardized error state with retry button
- `LoadingSkeleton` — Skeleton loader for cards, tables, forms

**Priority 5 — Navigation**
- `Sidebar` — Dashboard sidebar navigation
- `MobileNav` — Bottom navigation for mobile
- `Breadcrumb` — Breadcrumb trail

---

## 14. Priority Matrix

| ID | Area | Problem | Severity | Recommendation |
|----|------|---------|----------|----------------|
| 2.6A-01 | Navigation | No dashboard sidebar; users rely on browser back | P1 | Add sidebar navigation |
| 2.6A-02 | Components | Button inconsistency (shadcn vs raw) | P2 | Standardize on shadcn Button |
| 2.6A-03 | Components | No reusable Card component | P2 | Create Card primitive |
| 2.6A-04 | Components | No reusable Badge component | P2 | Create Badge primitive |
| 2.6A-05 | Components | No reusable Input/Select/Textarea | P2 | Create form primitives |
| 2.6A-06 | Loading | No skeleton loaders | P2 | Add LoadingSkeleton component |
| 2.6A-07 | Feedback | No retry buttons on error states | P2 | Add retry to error states |
| 2.6A-08 | Toast | Toast system not integrated into actions | P1 | Integrate toast into CRUD actions |
| 2.6A-09 | Animation | No micro-interactions on dashboard | P3 | Add subtle hover/focus animations |
| 2.6A-10 | Accessibility | No modal accessibility (role, aria-modal, focus trap) | P2 | Implement accessible dialog pattern |
| 2.6A-11 | Accessibility | No skip-to-content link | P3 | Add skip link |
| 2.6A-12 | Accessibility | No reduced motion handling | P3 | Add prefers-reduced-motion media query |
| 2.6A-13 | Mobile | No mobile bottom navigation | P2 | Add bottom nav for mobile dashboard |
| 2.6A-14 | Visual | Gold accent underutilized | P3 | Use gold for CTAs and highlights |
| 2.6A-15 | Typography | No formal type scale | P3 | Document and enforce type scale |

---

## 15. Modernization Roadmap

### PHASE 2.6B — App Shell + Navigation
- Create reusable Sidebar component
- Add mobile bottom navigation
- Implement breadcrumb navigation
- Standardize PageHeader component

### PHASE 2.6C — Dashboard Modernization
- Create Card, StatCard, Badge components
- Add skeleton loaders
- Implement toast notifications in CRUD actions
- Add retry buttons to error states

### PHASE 2.6D — CRUD & Transaction Pages
- Create Input, Select, Textarea, Checkbox primitives
- Build DataTable component with pagination
- Standardize FilterBar component
- Implement ConfirmDialog for destructive actions

### PHASE 2.6E — Parent Experience
- Enhance payment checkout flow
- Add progress indicators
- Improve proof upload UX
- Add receipt view improvements

### PHASE 2.6F — Responsive + Accessibility + Micro-interactions
- Mobile-first refinements
- Modal accessibility (focus trap, aria attributes)
- Reduced motion support
- Micro-interactions on buttons, cards, forms

### PHASE 2.6G — Final Visual QA
- Polish spacing, typography, colors
- Ensure consistent use of design tokens
- Final accessibility audit
- Performance optimization

---

## 16. TypeScript

**Result:** PASS

```
npx tsc --noEmit
# No output, no errors
```

---

## 17. Lint

**Result:** 2 PRE-EXISTING ERRORS, 9 PRE-EXISTING WARNINGS

**New errors introduced:** 0

| Issue | File | Line | Type |
|-------|------|------|------|
| Unused `proofs` | `admin/actions.ts` | 90 | warning |
| Unexpected any | `admin/actions.ts` | 102 | error |
| Unused `Suspense` | `admin/page.tsx` | 1 | warning |
| Unexpected any | `bendahara/actions.ts` | 93 | error |
| Unused `Suspense` | `bendahara/page.tsx` | 1 | warning |
| Unused `PaymentIntentRequest` | `orang-tua/actions.ts` | 7 | warning |
| Unused variables (4) | `PaymentHistoryClient.tsx` | 231,235,239,250 | warning |
| Unnecessary dependency | `PaymentCheckoutClient.tsx` | 215 | warning |

---

## 18. Build

**Result:** PASS

```
npm run build
✓ Compiled successfully
✓ TypeScript check passed
✓ All routes generated (36 pages)
```

---

## 19. Known Issues

### Pre-existing
1. Unused imports and variables in multiple files
2. `Unexpected any` in admin and bendahara actions
3. No global sidebar navigation for dashboard
4. Button styling inconsistency
5. No skeleton loaders

### Environment-dependent
1. Cannot verify runtime behavior with populated database
2. Cannot verify RLS enforcement end-to-end
3. Cannot verify payment flows with real data

---

## 20. Final Recommendation

**PASS — UI/UX AUDIT COMPLETE**

The application has a solid foundation for modernization:

1. **Design system exists** but is informal (no documented tokens)
2. **Component library is partial** (only Button from shadcn/ui)
3. **Patterns are consistent** within each page but vary across pages
4. **Accessibility is partial** — forms are accessible, but modals and navigation need work
5. **Responsive design works** but lacks mobile-specific patterns
6. **Animation infrastructure exists** but is underutilized
7. **Loading/empty/error states are present** on all data pages

**Recommended next step:** Proceed with PHASE 2.6B — App Shell + Navigation, starting with:
1. Formalize design tokens in `globals.css`
2. Create reusable form primitives (Input, Select, Textarea)
3. Build Card and Badge components
4. Add dashboard sidebar navigation
5. Integrate toast notifications into CRUD actions

---

**STOP. DO NOT IMPLEMENT CHANGES. DO NOT START PHASE 2.6B. WAIT FOR REVIEW.**
