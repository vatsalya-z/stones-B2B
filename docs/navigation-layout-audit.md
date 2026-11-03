# Navigation & Layout Architecture Audit: Root Layout Navbar Leakage

## 1. Executive Summary

During testing of authenticated dashboards (Buyer Portal, Seller Portal, and Admin Console), the Public Marketplace navigation bar (`SiteHeader` / `MobileNav`) and Public Marketplace footer (`SiteFooter`) were observed leaking into authenticated dashboards.

Specifically:
1. **Buyer Dashboard (`/buyer/dashboard`):** Displayed public navigation links (*Home, Products, Suppliers, Categories, Search, Saved, Buyer Portal*) directly above the `BuyerShell` sidebar and topbar.
2. **Seller Dashboard (`/seller/dashboard`):** Displayed public navigation links directly above the `SellerShell` sidebar and topbar.
3. **Admin Console (`/admin/dashboard`):** Displayed public navigation links directly above the dedicated dark `AdminShell`.

This audit documents the root cause, audits all layout files across the Next.js App Router hierarchy, and details the architectural separation required to isolate the 4 distinct layout experiences.

---

## 2. Root Cause Analysis

### 2.1 The Culprit: `apps/web/app/layout.tsx`

Inspection of `apps/web/app/layout.tsx` (the Next.js App Router Root Layout) revealed:

```tsx
// apps/web/app/layout.tsx (BEFORE FIX)
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

In Next.js App Router:
- The Root Layout (`app/layout.tsx`) wraps **every single route** in the entire application subtree unless bypassed via parallel root route groups.
- Nested layouts (such as `app/buyer/layout.tsx`, `app/seller/layout.tsx`, and `app/admin/layout.tsx`) receive their parent layout's rendered output as their container.
- Consequently, when `SiteHeader` and `SiteFooter` are rendered inside `app/layout.tsx`, every child route — including `/buyer/...`, `/seller/...`, `/admin/...`, and `/(auth)/...` — inevitably inherits the public header and footer.

### 2.2 Nested Layout Audit

| Layout File | Shell / Component | Current Behavior | Target Behavior |
| :--- | :--- | :--- | :--- |
| `apps/web/app/layout.tsx` | Root Layout | Renders `<SiteHeader />` + `<SiteFooter />` globally | **Global infrastructure only** (`html`, `body`, CSS, metadata). Zero public nav. |
| `apps/web/app/buyer/layout.tsx` | `BuyerShell` | Renders `BuyerShell` inside Root Layout (inheriting public nav) | **Isolated Buyer Portal** with `BuyerShell` only. |
| `apps/web/app/seller/layout.tsx` | `SellerShell` | Renders `SellerShell` inside Root Layout (inheriting public nav) | **Isolated Seller Portal** with `SellerShell` only. |
| `apps/web/app/admin/layout.tsx` | `AdminShell` | Renders `AdminShell` inside Root Layout (inheriting public nav) | **Isolated Admin Console** with dark `AdminShell` only. |
| `apps/web/app/(auth)/layout.tsx` | `AuthLayout` | Renders centered auth card inside Root Layout (inheriting public nav) | **Isolated Auth Flow** or dedicated auth experience. |

---

## 3. Four-Tier Layout Architecture Design

To achieve strict isolation, we implement the Next.js Route Group pattern:

```
apps/web/app/
├── layout.tsx                      # TIER 0: Root Layout (Global HTML, CSS, Fonts, Metadata only)
│
├── (public)/                       # TIER 1: Public Marketplace Route Group
│   ├── layout.tsx                  # Public Layout: <SiteHeader /> + <main> + <SiteFooter />
│   ├── page.tsx                    # / (Home)
│   ├── products/                   # /products & /products/[slug]
│   ├── categories/                 # /categories & /categories/[slug]
│   ├── suppliers/                  # /suppliers & /suppliers/[slug]
│   ├── about/                      # /about
│   ├── contact/                    # /contact
│   ├── privacy/                    # /privacy
│   ├── terms/                      # /terms
│   ├── search/                     # /search
│   └── unauthorized/              # /unauthorized
│
├── buyer/                          # TIER 2: Buyer Portal
│   ├── layout.tsx                  # Buyer Layout: <BuyerShell>{children}</BuyerShell>
│   ├── dashboard/                  # /buyer/dashboard
│   ├── enquiries/                  # /buyer/enquiries
│   ├── rfqs/                       # /buyer/rfqs
│   ├── quotes/                     # /buyer/quotes
│   ├── favourites/                 # /buyer/favourites
│   ├── notifications/              # /buyer/notifications
│   ├── profile/                    # /buyer/profile
│   └── settings/                   # /buyer/settings
│
├── seller/                         # TIER 3: Seller Portal
│   ├── layout.tsx                  # Seller Layout: <SellerShell>{children}</SellerShell>
│   ├── dashboard/                  # /seller/dashboard
│   ├── products/                   # /seller/products
│   ├── enquiries/                  # /seller/enquiries
│   ├── quotes/                     # /seller/quotes
│   ├── store/                      # /seller/store
│   ├── verification/               # /seller/verification
│   ├── analytics/                  # /seller/analytics
│   └── notifications/              # /seller/notifications
│
├── admin/                          # TIER 4: Admin Console
│   ├── layout.tsx                  # Admin Layout: <AdminShell>{children}</AdminShell>
│   ├── dashboard/                  # /admin/dashboard
│   ├── sellers/                    # /admin/sellers
│   ├── products/                   # /admin/products
│   ├── buyers/                     # /admin/buyers
│   ├── enquiries/                  # /admin/enquiries
│   ├── quotes/                     # /admin/quotes
│   ├── categories/                 # /admin/categories
│   ├── users/                      # /admin/users
│   ├── audit/                      # /admin/audit
│   ├── reports/                    # /admin/reports
│   └── settings/                   # /admin/settings
│
├── (auth)/                         # Auth Route Group
│   ├── layout.tsx                  # Auth Layout: Centered Brand Card
│   ├── login/                      # /login
│   ├── register/                   # /register
│   ├── forgot-password/            # /forgot-password
│   └── reset-password/             # /reset-password
│
├── dashboard/                      # /dashboard (Role Router Redirector)
└── profile/                        # /profile (Role Router Redirector)
```

---

## 4. Key Guarantees
1. **Zero Route Path Changes:** Next.js route groups `(name)` do not add any segment to the URL path. All existing public URLs (`/`, `/products`, `/suppliers`, etc.) remain 100% unchanged.
2. **Zero Leakage:** Because `app/layout.tsx` contains only global DOM structure, no portal can ever inherit another portal's header or footer.
3. **Preserved Role Switching:** Role switching via `/dashboard?portal=buyer`, `/dashboard?portal=seller`, or `/dashboard?portal=admin` navigates directly to the respective portal without cross-contamination.
4. **Preserved Public Marketplace Access:** Public marketplace links inside portal shells (e.g. "View Storefront" in Seller, "Browse Products" in Buyer, "Marketplace Front" in Admin) route cleanly back to `(public)` routes.

