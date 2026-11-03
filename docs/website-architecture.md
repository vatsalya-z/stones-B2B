# StoneB2B — Website Architecture

> Last Updated: 2026-10-31

---

## 1. Monorepo Structure

```
Stone_B2B/
├── apps/
│   ├── web/          # Next.js 15 App Router (primary frontend)
│   └── worker/       # Background job worker (email dispatch, notifications)
├── packages/
│   ├── config/       # Shared ESLint, TypeScript, Tailwind configs
│   ├── database/     # Supabase client, type definitions, RLS test suites
│   ├── email/        # Transactional email templates (React Email)
│   ├── types/        # Shared TypeScript type definitions
│   ├── ui/           # Shared React UI component library (@stone/ui)
│   ├── utils/        # Shared utility functions (pagination, formatting)
│   ├── validation/   # Shared Zod schemas for forms and API inputs
│   └── worker/       # Background worker types
├── supabase/
│   ├── migrations/   # Ordered SQL migration files (8 migrations)
│   └── seed.sql      # Development seed data
└── docs/             # Architecture, audit, and completion reports
```

---

## 2. Application Architecture (`apps/web`)

### 2.1 Directory Layout

```
apps/web/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth route group (no shared layout)
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── admin/                  # Admin portal (requires admin/super_admin role)
│   ├── api/                    # Route Handlers
│   │   ├── auth/               # Login + Signout handlers
│   │   ├── admin/              # Admin image upload
│   │   ├── buyer/              # Buyer PDF/attachment endpoints
│   │   ├── seller/             # Seller image upload
│   │   └── messages/           # Phase 6 messaging attachment (stub)
│   ├── auth/                   # Email verification callback pages
│   ├── buyer/                  # Buyer portal (requires buyer role)
│   ├── seller/                 # Seller portal (requires seller role)
│   ├── about/                  # Public: About Us
│   ├── categories/             # Public: Category listing + detail
│   ├── contact/                # Public: Contact Us
│   ├── dashboard/              # Role-based redirect dispatcher
│   ├── privacy/                # Public: Privacy Policy
│   ├── products/               # Public: Product listing + detail + enquiry
│   ├── profile/                # Role-based redirect dispatcher
│   ├── search/                 # Redirect to /products with query params
│   ├── suppliers/              # Public: Supplier directory + storefront
│   ├── terms/                  # Public: Terms of Service
│   ├── unauthorized/           # 403 page
│   ├── layout.tsx              # Root layout (site header + footer)
│   ├── loading.tsx             # Global loading state
│   ├── robots.ts               # Robots.txt generator
│   └── sitemap.ts              # Dynamic sitemap generator
├── components/
│   ├── admin/                  # Admin-specific UI components
│   ├── buyer/                  # Buyer portal UI components
│   ├── layout/                 # Header, footer, mobile nav
│   ├── messaging/              # Phase 6 messaging UI (stub)
│   ├── seller/                 # Seller portal UI + status badges
│   └── ui/                    # Public marketplace UI components
├── features/
│   ├── admin/                  # Admin guard, access control, queries, actions
│   ├── auth/                   # Auth Server Actions (signIn, signUp, signOut)
│   ├── buyer/                  # Buyer queries, actions, metadata helpers
│   ├── enquiry/                # Enquiry form + actions (buyer-initiated)
│   ├── favourites/             # Favourite toggle Server Action
│   ├── messaging/              # Phase 6 messaging queries + actions (stub)
│   └── seller/                 # Seller queries, actions, metadata helpers
└── lib/
    ├── auth.ts                 # requireAuth(), getUserRoles(), getCurrentUser()
    ├── db.ts                   # Public marketplace DB queries (products, sellers, categories)
    ├── email-notifications.ts  # Email trigger helpers
    ├── images.ts               # Hero image constants + fallback image resolvers
    └── supabase.ts             # Supabase SSR client factory
```

---

## 3. Server / Client Component Boundaries

| Layer | Pattern | Reasoning |
|:---|:---|:---|
| Page components (`page.tsx`) | **Server Components** | Data fetching at request time, no hydration cost |
| Layout components (`layout.tsx`) | **Server Components** | Context providers are server-side (auth, profile) |
| Interactive forms | **Client Components** | `useState`, `useTransition`, form events |
| Portal shells (`buyer-shell.tsx`, `seller-shell.tsx`, `admin-shell.tsx`) | **Client Components** | Sidebar state, mobile drawer, navigation active states |
| Status badges, cards without events | **Server Components** | Pure rendering, no state |
| Charts (`simple-charts.tsx`) | **Client Components** | SVG animation, hover tooltips |
| Search bar (`search-bar.tsx`) | **Client Component** | `useSearchParams()` |
| Favourite button | **Client Component** | Toggle state, Server Action call |
| File uploaders | **Client Components** | File API, drag-and-drop |

---

## 4. Authentication & Authorization Architecture

### 4.1 Session Flow

```
Request → Middleware (session refresh via @supabase/ssr)
         → Check PROTECTED_PREFIXES → Redirect if unauthenticated
         → Page/Route Handler
         → requireAuth() / getAdminContext() / getBuyerContext() / getSellerContext()
         → Data fetch with RLS-enforced Supabase client
```

### 4.2 Authorization Layers

| Layer | Mechanism | Purpose |
|:---|:---|:---|
| **1. Middleware** | `supabase.auth.getUser()` + path matching | UX guard — redirect unauthenticated users |
| **2. Context Guards** | `requireAuth()`, `getAdminContext()`, `getBuyerContext()`, `getSellerContext()` | Server-side role verification per request |
| **3. Server Actions** | `authorizeAdminAction()` at action entry | Explicit permission check for mutations |
| **4. Row Level Security** | PostgreSQL RLS policies via Supabase | Data isolation — last line of defense |

### 4.3 Role System

```
auth.users (Supabase)
    ↕
user_roles table (id, user_id, role)
    roles: "buyer" | "seller" | "admin" | "super_admin"
```

A single user can hold multiple roles simultaneously. `getUserRoles()` returns the full set.

### 4.4 Auth Route Handlers

- **`POST /api/auth/login`** — Validates credentials via Supabase, sets auth cookies, returns `{ redirectTo }` JSON
- **`POST /api/auth/signout`** — Signs out via Supabase, 303 redirect to `/`
- **`GET /api/auth/callback`** — Exchanges Supabase PKCE/OTP code for session after email verification

---

## 5. Database Architecture

### 5.1 Migration History

| Migration | File | Contents |
|:---|:---|:---|
| 1 | `20261024000001_core_schema.sql` | Core schema: users, roles, seller/buyer profiles, products, categories |
| 2 | `20261024000002_rls_policies.sql` | Row Level Security policies for all tables |
| 3 | `20261025000001_enquiries.sql` | Enquiries, enquiry_status_history tables |
| 4 | `20261026000001_quotations.sql` | Quotations, quotation_items tables |
| 5 | `20261027000001_seller_verification.sql` | Seller verification documents, verification workflow |
| 6 | `20261028000001_storage_policies.sql` | Supabase Storage bucket policies |
| 7 | `20261029000001_phase6_notifications.sql` | Notifications, conversations, messages tables |
| 8 | `20261031110000_admin_console.sql` | platform_settings, admin_audit_logs enhancements, category image bucket |

### 5.2 Key Table Relationships

```
auth.users (Supabase)
  ├── user_roles (role assignments)
  ├── buyer_profiles (one buyer per user)
  └── seller_profiles (one seller per user)
       ├── products (seller owns products)
       │    └── product_images
       └── seller_verification_documents

enquiries (buyer → seller, optionally product-linked)
  ├── enquiry_status_history (immutable status log)
  ├── quotations (seller responds to enquiry)
  │    └── quotation_items
  └── enquiry_attachments (private buyer docs)

notifications (per-user inbox)
conversations (buyer ↔ seller)
  └── messages

categories (hierarchical: parent → children)
admin_audit_logs (immutable admin action history)
platform_settings (key-value config, super_admin only writes)
```

---

## 6. Validation Architecture

All form data is validated using **Zod** schemas from `@stone/validation` package.

| Schema File | Covers |
|:---|:---|
| `validation/src/index.ts` | Auth schemas (signIn, signUp, password reset) |
| `validation/src/admin.ts` | Admin action schemas (seller review, product moderation, role delegation) |
| `validation/src/buyer.ts` | Buyer profile, RFQ creation, enquiry submission |
| `validation/src/seller.ts` | Seller profile, product creation/editing, quotation creation |
| `validation/src/messaging.ts` | Message composition, conversation creation |

**Principle:** Every Server Action validates input with Zod before any database operation. Client-side validation is a UX aid only — server-side is the security boundary.

---

## 7. Storage Architecture

| Bucket | Visibility | Allowed Uploads | Policy |
|:---|:---|:---|:---|
| `product-images` | Public read | Sellers (own products) | Authenticated seller, product owner check |
| `seller-logos` | Public read | Sellers (own profile) | Authenticated seller |
| `seller-cover-images` | Public read | Sellers (own profile) | Authenticated seller |
| `seller-verification-docs` | **Private** | Sellers (own documents) | Seller owner; admin read via signed URL |
| `enquiry-attachments` | **Private** | Buyers (own enquiries) | Buyer owner; seller recipient via signed URL |
| `message-attachments` | **Private** | Authenticated participants | Conversation participant only |
| `category-images` | Public read | Admin only | `is_admin()` check |

---

## 8. SEO Architecture

### 8.1 Metadata Strategy

| Route Type | Metadata | Dynamic |
|:---|:---|:---|
| Public listing pages | Static `metadata` export | No |
| Product detail pages | `generateMetadata()` async | Yes — uses product title/description |
| Supplier storefront | `generateMetadata()` async | Yes — uses business name/description |
| Category pages | `generateMetadata()` async | Yes — uses category seo_title |
| Portal pages | Robots `{ index: false }` | No |

### 8.2 Sitemap

- `/sitemap.xml` — Dynamically generated; includes public products, categories, suppliers
- `/robots.txt` — Disallows `/buyer`, `/seller`, `/admin`, `/api`

---

## 9. Performance Patterns

| Pattern | Where Applied |
|:---|:---|
| Server Components for data fetching | All page components |
| `Promise.all()` for parallel queries | Dashboard pages, product detail |
| Seed fallback for unconfigured DB | `lib/db.ts` — categories, products return seeds |
| `next/image` with `fill` + `sizes` | All hero, product, supplier images |
| `unoptimized` for non-Supabase images | Generated/local images bypass Next.js optimizer |
| Pagination on all listings | Products, suppliers, enquiries, quotations |
| Suspense boundaries for client components | SearchBar, Pagination |

---

## 10. Error Handling

| Layer | Mechanism |
|:---|:---|
| Page-level errors | `error.tsx` files per portal segment |
| Not Found | `notFound()` + Next.js 404 handling |
| Auth errors | Redirect to `/login?next=...` |
| Server Action errors | `{ error: string }` return type convention |
| Database errors | Try/catch with fallback data or empty arrays |
| API Route errors | HTTP status codes + JSON `{ error }` body |
| Empty states | `<EmptyState>` component from `@stone/ui` |

---

## 11. Design System

| Token | Value | Usage |
|:---|:---|:---|
| `bg-stone-50` | Warm off-white | Page backgrounds |
| `bg-stone-900/950` | Deep charcoal | Dark sections, admin bg |
| `text-amber-500/600` | Gold amber | Brand accents, CTAs |
| `border-stone-200` | Light grey | Card borders |
| `btn-accent` | Amber button | Primary CTAs |
| `btn-primary` | Dark stone button | Secondary actions |
| `btn-secondary` | White/light button | Tertiary actions |
| `input-base` | Consistent input | All form inputs |
| `container-wide` | Max-width content | Standard page container |
| `container-narrow` | Narrower content | Legal/about pages |
| `section-pad` | Vertical padding | Page sections |

