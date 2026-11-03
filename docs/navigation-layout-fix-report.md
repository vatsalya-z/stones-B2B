# StoneB2B — Navigation & Layout Fix Report

> Report Date: 2026-10-31 | Status: IMPLEMENTED & VERIFIED

---

## 1. Executive Summary

This report documents the resolution of the **Global Navbar Leakage** problem where the Public Marketplace navigation (`SiteHeader` / `MobileNav`) and footer (`SiteFooter`) were incorrectly appearing across authenticated dashboards (Buyer Portal, Seller Portal, and Admin Console).

The application layout architecture has been refactored into **four strictly isolated layout tiers** using Next.js App Router route groups. As a result:
1. Authenticated dashboards render their respective portal shells (`BuyerShell`, `SellerShell`, `AdminShell`) with zero public navbar or footer leakage.
2. The public marketplace retains its complete navigation, hero, search, categories, suppliers, and footer.
3. All public route paths (`/`, `/products`, `/categories`, `/suppliers`, `/about`, `/contact`, `/terms`, `/privacy`) remain 100% unchanged.
4. Comprehensive regression tests have been added in `apps/web/tests/navigation-layout-isolation.test.ts` (9/9 tests passing).
5. All automated quality gates (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) pass cleanly.

---

## 2. Root Cause Analysis

In `apps/web/app/layout.tsx` (the root layout), `<SiteHeader />` and `<SiteFooter />` were hardcoded into the global `body` tag:

```tsx
// BEFORE (Buggy Root Layout)
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className="h-full">
      <body className={cn("flex h-full flex-col bg-stone-50 text-stone-900 antialiased")}>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
```

Because Next.js App Router renders the root layout for all routes in the application, nested layouts (such as `app/buyer/layout.tsx`, `app/seller/layout.tsx`, and `app/admin/layout.tsx`) were rendered inside the `<main>` tag between `<SiteHeader />` and `<SiteFooter />`.

---

## 3. Four-Tier Layout Architecture (After Fix)

### Tier 0: Root Layout (`apps/web/app/layout.tsx`)
Contains strictly global DOM infrastructure with **zero navigation**:
- `<html>` and `<body>` tags
- Global Tailwind styles (`globals.css`)
- Root metadata configuration
- Clean passthrough `{children}`

### Tier 1: Public Marketplace Layout (`apps/web/app/(public)/layout.tsx`)
Dedicated layout for all public marketplace routes:
- `<SiteHeader />` with logo, navigation links, search, and login/register CTAs
- `<main className="flex-1">{children}</main>`
- `<SiteFooter />`
- Routes in this tier:
  - `/` (Homepage)
  - `/products` & `/products/[slug]` & `/products/[slug]/enquiry`
  - `/categories` & `/categories/[slug]`
  - `/suppliers` & `/suppliers/[slug]`
  - `/about`, `/contact`, `/privacy`, `/terms`
  - `/search`, `/unauthorized`

### Tier 2: Buyer Portal Layout (`apps/web/app/buyer/layout.tsx`)
- Strictly wraps child pages in `<BuyerShell>`
- Displays Buyer sidebar, top bar, identity, notifications counter, and mobile drawer
- **Zero** `SiteHeader` or `SiteFooter`

### Tier 3: Seller Portal Layout (`apps/web/app/seller/layout.tsx`)
- Strictly wraps child pages in `<SellerShell>`
- Displays Seller sidebar, business identity, KYC verification banner, and mobile drawer
- **Zero** `SiteHeader` or `SiteFooter`

### Tier 4: Admin Console Layout (`apps/web/app/admin/layout.tsx`)
- Strictly wraps child pages in `<AdminShell>`
- Displays dark architectural sidebar, Super Admin badge, governance controls, and top bar
- Includes explicit "View Marketplace" outbound link returning to Tier 1
- **Zero** `SiteHeader` or `SiteFooter`

---

## 4. Files Modified and Created

| File | Action | Description |
| :--- | :---: | :--- |
| `apps/web/app/layout.tsx` | Modified | Stripped out `<SiteHeader />` and `<SiteFooter />`; now clean global infrastructure only |
| `apps/web/app/(public)/layout.tsx` | **Created** | Dedicated layout rendering `<SiteHeader />`, `<main>`, `<SiteFooter />` for public routes |
| `apps/web/app/(public)/page.tsx` | Moved | Moved from `app/page.tsx` via `git mv` (URL remains `/`) |
| `apps/web/app/(public)/products/` | Moved | Moved from `app/products/` via `git mv` (URLs remain `/products/...`) |
| `apps/web/app/(public)/categories/` | Moved | Moved from `app/categories/` via `git mv` (URLs remain `/categories/...`) |
| `apps/web/app/(public)/suppliers/` | Moved | Moved from `app/suppliers/` via `git mv` (URLs remain `/suppliers/...`) |
| `apps/web/app/(public)/about/` | Moved | Moved from `app/about/` via `git mv` (URL remains `/about`) |
| `apps/web/app/(public)/contact/` | Moved | Moved from `app/contact/` via `git mv` (URL remains `/contact`) |
| `apps/web/app/(public)/privacy/` | Moved | Moved from `app/privacy/` via `git mv` (URL remains `/privacy`) |
| `apps/web/app/(public)/terms/` | Moved | Moved from `app/terms/` via `git mv` (URL remains `/terms`) |
| `apps/web/app/(public)/search/` | Moved | Moved from `app/search/` via `git mv` (URL remains `/search`) |
| `apps/web/app/(public)/unauthorized/` | Moved | Moved from `app/unauthorized/` via `git mv` (URL remains `/unauthorized`) |
| `apps/web/tests/navigation-layout-isolation.test.ts` | **Created** | Comprehensive regression test suite covering all 4 tiers and dual-role routing |
| `docs/navigation-layout-audit.md` | **Created** | In-depth audit document detailing layout leakage and root cause |
| `docs/navigation-layout-fix-report.md` | **Created** | This completion report |

---

## 5. Regression Testing & Verification

A dedicated Vitest test suite was implemented at `apps/web/tests/navigation-layout-isolation.test.ts`:

1. **Root Layout Test:** Verifies that `RootLayout` renders only `html` and `body` with no header or footer.
2. **Public Layout Test:** Verifies that `PublicMarketplaceLayout` renders `SiteHeader` and `SiteFooter` around children.
3. **Buyer Layout Isolation Test:** Verifies that `BuyerPortalLayout` renders `BuyerShell` exclusively and does NOT render `SiteHeader` or `SiteFooter`.
4. **Seller Layout Isolation Test:** Verifies that `SellerLayout` renders `SellerShell` exclusively and does NOT render `SiteHeader` or `SiteFooter`.
5. **Admin Layout Isolation Test:** Verifies that `AdminLayout` renders `AdminShell` exclusively and does NOT render `SiteHeader` or `SiteFooter`.
6. **Role-Based Routing Tests (`/dashboard`):**
   - User requesting `portal=admin` with admin role -> `/admin/dashboard`
   - User requesting `portal=buyer` for dual-role user -> `/buyer/dashboard`
   - User requesting `portal=seller` for dual-role user -> `/seller/dashboard`
   - Default role routing without portal query -> prioritized by role permissions (`admin` -> `/admin/dashboard`)

All 9/9 layout isolation tests passed on the first run.

---

## 6. Quality Gate Results

| Quality Gate | Command | Result | Details |
| :--- | :--- | :---: | :--- |
| **Lint** | `pnpm lint` | ✅ **PASS** | 8/8 packages passed; 0 errors, 0 warnings |
| **Typecheck** | `pnpm typecheck` | ✅ **PASS** | 8/8 packages passed; 0 TypeScript errors |
| **Tests** | `pnpm test` | ✅ **PASS** | 6/6 test suites passed; 318/318 tests passing |
| **Build** | `pnpm build` | ✅ **PASS** | 56/56 static & dynamic pages successfully compiled |

