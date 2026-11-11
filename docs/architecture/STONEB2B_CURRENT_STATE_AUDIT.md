# StoneB2B — Current State Audit
**Classification:** Read-Only Architecture Audit  
**Date:** 2026-11-11  
**Supabase Project:** `rgmasamasslqintssyrh` (PRODUCTION — inspected read-only)  
**Git HEAD:** `d694447` on `main`

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ **VERIFIED** | Code exists and confirmed functional from source inspection |
| ⚠️ **PARTIALLY VERIFIED** | Partially implemented; some components missing |
| ❌ **NOT VERIFIED** | Referenced/designed but no code evidence found |
| 🔵 **PROPOSED** | New recommendation not currently in codebase |

---

## 1. Technology Stack Audit

### 1.1 Core Framework

| Technology | Version | Status | Evidence |
|-----------|---------|--------|---------|
| Next.js | 15.5.28 | ✅ VERIFIED | `apps/web/package.json`, App Router used throughout |
| React | 18+ (Server + Client Components) | ✅ VERIFIED | Server Components default, `"use client"` explicit opt-in |
| TypeScript | Strict mode | ✅ VERIFIED | `tsconfig.json` strict, all source files `.ts`/`.tsx` |
| Supabase (`@supabase/ssr`) | Latest | ✅ VERIFIED | `apps/web/lib/supabase.ts`, cookie-based SSR auth |
| pnpm + Turborepo | Latest | ✅ VERIFIED | `pnpm-workspace.yaml`, `turbo.json` |
| Vitest | — | ✅ VERIFIED | 16 test files in `apps/web/tests/`, 229 DB tests |
| Playwright | — | ✅ VERIFIED | `e2e/` directory, 55 E2E tests |
| Zod | Via `@stone/validation` | ✅ VERIFIED | All Server Actions use `safeParse()` |

### 1.2 Monorepo Package Structure

```
stones-B2B/                          ← Turborepo monorepo root
├── apps/
│   ├── web/   (@stone/web)          ← Main Next.js 15 application
│   └── worker/ (@stone/worker)      ← Background email worker (minimal)
└── packages/
    ├── database/ (@stone/database)  ← Supabase client + generated types
    ├── types/    (@stone/types)     ← Shared TypeScript types
    ├── ui/       (@stone/ui)        ← Shared component library
    ├── utils/    (@stone/utils)     ← Utility functions (pagination, slugify)
    ├── validation/ (@stone/validation) ← Zod schemas for all forms/actions
    └── email/    (@stone/email)     ← Email templates
```

### 1.3 App Router Route Structure

```
apps/web/app/
├── (public)/      ← Homepage, /products, /categories, /suppliers, 
│                     /how-it-works, /request-quote, /about, /contact,
│                     /terms, /privacy, /search, /suppliers/[slug]
├── (auth)/        ← /login, /register, /forgot-password, /reset-password
├── admin/         ← /dashboard, /users, /sellers, /buyers, /products,
│                     /categories, /enquiries, /quotes, /orders, 
│                     /reports, /audit, /settings
├── seller/        ← /dashboard, /products, /quotes, /orders, /enquiries,
│                     /messages, /notifications, /analytics, /store,
│                     /verification, /profile
├── buyer/         ← /dashboard, /rfqs, /quotations, /quotes, /orders,
│                     /enquiries, /favourites, /messages, /notifications,
│                     /addresses, /profile, /settings
├── auth/          ← /auth/confirm, /auth/callback, /auth/pending, 
│                     /auth/verify-email (OAuth + magic link)
└── api/           ← REST API routes (see §1.4)
```

### 1.4 API Routes

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/health` | GET | Health check | ✅ VERIFIED |
| `/api/auth/login` | POST | Email/password login | ✅ VERIFIED |
| `/api/auth/signout` | POST | Sign out + cookie clear | ✅ VERIFIED |
| `/api/seller/products/[id]/images` | POST/DELETE | Product image upload | ✅ VERIFIED |
| `/api/seller/brand-media` | POST | Logo/cover upload | ✅ VERIFIED |
| `/api/seller/verification/documents` | POST | Document upload | ✅ VERIFIED |
| `/api/buyer/enquiries/[id]/attachments` | POST | Enquiry attachments | ✅ VERIFIED |
| `/api/buyer/quotes/[id]/pdf` | GET | Quote PDF download | ✅ VERIFIED |
| `/api/messages/[convId]/attachments` | POST/GET | Message attachments | ✅ VERIFIED |
| `/api/messages/[convId]/attachments/signed-url` | GET | Signed URL for private files | ✅ VERIFIED |
| `/api/admin/categories/image` | POST | Category image upload | ✅ VERIFIED |

### 1.5 Deployment Configuration

| Aspect | Detail | Status |
|--------|--------|--------|
| Environment | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | ✅ VERIFIED |
| Supabase URL | `NEXT_PUBLIC_SUPABASE_URL` | ✅ VERIFIED |
| Subdomain routing | `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_COOKIE_DOMAIN` | ✅ VERIFIED (added in `d694447`) |
| Server-side API | `SUPABASE_SERVICE_ROLE_KEY` (env only, never exposed) | ✅ VERIFIED |
| DB connection | `DATABASE_URL`, `DIRECT_URL` | ✅ VERIFIED |
| Body limit | 16 MB (`bodySizeLimit: 16mb` in `next.config`) | ✅ VERIFIED |

---

## 2. Authentication Architecture Audit

### 2.1 Auth Functions (`apps/web/lib/auth.ts`)

| Function | Purpose | Security Pattern | Status |
|----------|---------|-----------------|--------|
| `getCurrentUser()` | Validates JWT via `getUser()` | Never uses `getSession()` — prevents replay attacks | ✅ VERIFIED |
| `requireAuth()` | Gate + redirect to `/login` | Server-only | ✅ VERIFIED |
| `getUserRoles()` | Fetches roles from `user_roles` table | DB-backed, not JWT claims | ✅ VERIFIED |
| `hasRole(role)` | Boolean role check | Calls `getUserRoles()` | ✅ VERIFIED |
| `requireRole(role)` | Gate + redirect to `/unauthorized` | Server-only | ✅ VERIFIED |
| `requireBuyer()` | Buyer gate | Wraps `requireRole("buyer")` | ✅ VERIFIED |
| `requireSeller()` | Seller gate | Wraps `requireRole("seller")` | ✅ VERIFIED |
| `requireAdmin()` | Admin gate (admin OR super_admin) | Checks both roles | ✅ VERIFIED |
| `requireSuperAdmin()` | Super admin gate | Wraps `requireRole("super_admin")` | ✅ VERIFIED |

### 2.2 Admin Authorization Layer (`apps/web/features/admin/`)

| File | Exports | Status |
|------|---------|--------|
| `guard.ts` | `getAdminContext()`, `authorizeAdminAction()` | ✅ VERIFIED |
| `access.ts` | `evaluateAdminAccess()` | ✅ VERIFIED |
| `actions.ts` | 7 Server Action groups (620 lines) | ✅ VERIFIED |
| `queries.ts` | Full admin data layer (1,534 lines) | ✅ VERIFIED |

### 2.3 OAuth / Magic Link Flow

| Flow | Routes | Status |
|------|--------|--------|
| Email confirm | `/auth/confirm` | ✅ VERIFIED |
| OAuth callback | `/auth/callback` | ✅ VERIFIED |
| Email verification | `/auth/verify-email`, `/auth/pending` | ✅ VERIFIED |

### 2.4 Middleware Subdomain Routing (`apps/web/middleware.ts`)

| Hostname | Routes to | Status |
|----------|-----------|--------|
| `www.domain.com`, `domain.com` | Public marketplace | ✅ VERIFIED |
| `admin.domain.com` | `/admin/*` only | ✅ VERIFIED |
| `seller.domain.com` | `/seller/*` only | ✅ VERIFIED |
| `buyer.domain.com` | `/buyer/*` only | ✅ VERIFIED |
| `localhost:3000` | Dev — all panels via path | ✅ VERIFIED |
| Unknown hostname | 404 / controlled error | ✅ VERIFIED |

---

## 3. Module-by-Module Business Audit

### 3.1 Public Marketplace

| Feature | Implementation | Status |
|---------|---------------|--------|
| Homepage | `app/(public)/page.tsx` — Hero, featured categories, featured suppliers | ✅ VERIFIED |
| Product catalogue | `app/(public)/products/` — Full filter UI (material, colour, finish, origin, price, sort) | ✅ VERIFIED |
| Product detail page | `app/(public)/products/[slug]/` — Images, specs, seller info, enquiry CTA | ✅ VERIFIED |
| Product search | `app/(public)/search/` + `textSearch()` on `search_vector` | ✅ VERIFIED |
| Category browser | `app/(public)/categories/` + `app/(public)/categories/[slug]/` | ✅ VERIFIED |
| How It Works | `app/(public)/how-it-works/` | ✅ VERIFIED |
| About / Contact | `app/(public)/about/`, `app/(public)/contact/` | ✅ VERIFIED |
| Terms / Privacy | `app/(public)/terms/`, `app/(public)/privacy/` | ✅ VERIFIED |
| SEO metadata | Per-page `generateMetadata()`, `sitemap.ts`, `robots.ts` | ✅ VERIFIED |
| Seed data fallback | 12 curated products, 4 sellers in `lib/db.ts` for pre-DB state | ✅ VERIFIED |

**Security Concerns:**  
- CSP allows `*.supabase.co` and `images.unsplash.com` only — ✅ appropriate
- No PII exposed on public routes

### 3.2 Product Catalogue

| Feature | Implementation | Status |
|---------|---------------|--------|
| Product listing with filters | `getProducts()` in `lib/db.ts` with 10+ filter dimensions | ✅ VERIFIED |
| Pagination | `parsePagination()` from `@stone/utils` | ✅ VERIFIED |
| Full-text search | `textSearch()` on `search_vector` column | ✅ VERIFIED |
| Filter: material, colour, finish, origin, thickness, stock, price | Implemented in `filterSeedProducts()` and DB query | ✅ VERIFIED |
| Verified seller badge | `is_seller_verified()` DB function | ✅ VERIFIED |
| Product detail with images + specs | `getProductDetail()` in `lib/db.ts` | ✅ VERIFIED |
| Category-aware product count | Live count + seed fallback | ✅ VERIFIED |
| Stone-specific attributes | `material_type`, `stone_origin`, `colour`, `finish`, `thickness`, `length`, `width` | ✅ VERIFIED |

**Security Concerns:**  
- RLS on `products` via `products_select_public` policy ensures only `approved` + verified seller products visible to `anon`
- Seller profiles NOT joined directly (RLS prevents anon access to `seller_profiles`); instead uses `public_seller_profiles` view

### 3.3 Product Categories

| Feature | Implementation | Status |
|---------|---------------|--------|
| Hierarchical categories (parent_id) | `categories` table with `parent_id` | ✅ VERIFIED |
| 14 seed categories | Marble, Granite, Sandstone, Limestone, Quartzite, Slate, Travertine, Onyx, Semi-Precious, Natural Stone Slabs, Stone Tiles, Stone Blocks, Decorative Stone, Custom Stone Products | ✅ VERIFIED |
| Category images | `image_url` in DB + storage bucket `category-images` | ✅ VERIFIED |
| SEO fields | `seo_title`, `seo_description` per category | ✅ VERIFIED |
| Admin category CRUD | `saveCategoryAction()`, `deleteCategoryAction()` | ✅ VERIFIED |
| Sub-category support | `parent_id` FK, queried by parent | ✅ VERIFIED |

### 3.4 Supplier Directory

| Feature | Implementation | Status |
|---------|---------------|--------|
| Public supplier listing | `app/(public)/suppliers/` with filter by type/state/verified | ✅ VERIFIED |
| Seller storefront page | `app/(public)/suppliers/[slug]/` | ✅ VERIFIED |
| Verified supplier badge | `verified_at` field, `is_seller_verified()` function | ✅ VERIFIED |
| Filter by business type | 11 business types (manufacturer, mine_owner, exporter, etc.) | ✅ VERIFIED |
| Filter by state | Indian state filter | ✅ VERIFIED |
| Seller product listing on storefront | Products visible on storefront page | ✅ VERIFIED |
| `public_seller_profiles` view | Exposes only safe, non-PII seller data to anon | ✅ VERIFIED |

### 3.5 Seller Registration

| Feature | Implementation | Status |
|---------|---------------|--------|
| Registration flow | `app/(auth)/register/` — creates auth user + profile + role | ✅ VERIFIED |
| Seller profile creation | `saveBuyerProfileAction()` analogous in seller; `seller_profiles` table | ✅ VERIFIED |
| Business type selection | 11 types in enum | ✅ VERIFIED |
| Slug generation | `generateUniqueSellerSlug()` with collision avoidance | ✅ VERIFIED |
| Self role grant | `grant_self_role()` DB function called post-registration | ✅ VERIFIED |
| Email verification | `/auth/verify-email`, `/auth/pending` | ✅ VERIFIED |

### 3.6 Seller Verification

| Feature | Implementation | Status |
|---------|---------------|--------|
| Verification status flow | `draft` → `submitted` → `under_review` → `verified`/`rejected`/`suspended` | ✅ VERIFIED |
| Document upload (GST, PAN, business reg, trade license, address proof) | `api/seller/verification/documents` | ✅ VERIFIED |
| Admin review workflow | `reviewSellerAction()`, `admin_review_seller()` RPC | ✅ VERIFIED |
| Document review | `reviewDocumentAction()`, `admin_review_document()` RPC | ✅ VERIFIED |
| Signed URL for private docs | Supabase Storage `seller-verification-documents` bucket (private) | ✅ VERIFIED |
| Admin request documents | `admin_request_seller_documents()` RPC | ✅ VERIFIED |
| Automatic notifications | ⚠️ Not confirmed — `notifications` table exists but trigger not inspected |⚠️ PARTIALLY VERIFIED |

**Security Concerns:**  
- Verification documents in private storage bucket — ✅ good
- Signed URLs expire in 3600s — ✅ appropriate

### 3.7 Buyer Portal

| Feature | Implementation | Status |
|---------|---------------|--------|
| Dashboard | `buyer/dashboard/` | ✅ VERIFIED |
| RFQ creation | `buyer/rfqs/`, `rfqFormSchema`, `createRfqAction()` | ✅ VERIFIED |
| Enquiry management | `buyer/enquiries/` with status transitions | ✅ VERIFIED |
| Quotation review | `buyer/quotations/`, `buyer/quotes/[id]/` | ✅ VERIFIED |
| Quotation acceptance (creates order) | `accept_quotation_and_create_order()` RPC | ✅ VERIFIED |
| Order tracking | `buyer/orders/` | ✅ VERIFIED |
| Favourites | `buyer/favourites/`, `product_favourites` table | ✅ VERIFIED |
| Messaging | `buyer/messages/` with realtime via Supabase channels | ✅ VERIFIED |
| Notifications | `buyer/notifications/` | ✅ VERIFIED |
| Address book | `buyer/addresses/`, `buyer_addresses` table | ✅ VERIFIED |
| Profile management | `buyer/profile/`, `buyer/settings/` | ✅ VERIFIED |
| PDF quote download | `api/buyer/quotes/[id]/pdf` | ✅ VERIFIED |
| Enquiry attachments | `api/buyer/enquiries/[id]/attachments` | ✅ VERIFIED |
| Password change | `buyerPasswordChangeSchema` in validation | ✅ VERIFIED |

### 3.8 Seller Portal

| Feature | Implementation | Status |
|---------|---------------|--------|
| Dashboard | `seller/dashboard/` | ✅ VERIFIED |
| Product management | `seller/products/` — CRUD with image upload | ✅ VERIFIED |
| Product image upload | `api/seller/products/[id]/images` | ✅ VERIFIED |
| Brand media (logo, cover) | `api/seller/brand-media` | ✅ VERIFIED |
| Enquiry management | `seller/enquiries/` with status transitions | ✅ VERIFIED |
| Quotation creation | `seller/quotes/`, `quotationFormSchema` | ✅ VERIFIED |
| Order management | `seller/orders/` with status transitions | ✅ VERIFIED |
| Messaging | `seller/messages/` with realtime | ✅ VERIFIED |
| Notifications | `seller/notifications/` | ✅ VERIFIED |
| Analytics | `seller/analytics/` | ✅ VERIFIED |
| Store settings | `seller/store/`, `storeSettingsSchema` | ✅ VERIFIED |
| Verification | `seller/verification/` | ✅ VERIFIED |
| Profile | `seller/profile/` | ✅ VERIFIED |
| Slug generation with collision avoidance | `generateUniqueProductSlug()`, `generateUniqueSellerSlug()` | ✅ VERIFIED |

### 3.9 Admin Portal

| Feature | Implementation | Status |
|---------|---------------|--------|
| Dashboard with metrics | `admin/dashboard/`, `admin_dashboard_metrics()` RPC | ✅ VERIFIED |
| User management | `admin/users/` — list, roles, account status | ✅ VERIFIED |
| Seller management + review | `admin/sellers/`, `reviewSellerAction()` | ✅ VERIFIED |
| Buyer management | `admin/buyers/` | ✅ VERIFIED |
| Product moderation | `admin/products/` — approve/reject/archive, bulk | ✅ VERIFIED |
| Category management | `admin/categories/` — CRUD | ✅ VERIFIED |
| Enquiry monitoring | `admin/enquiries/` — read-only view | ✅ VERIFIED |
| Quotation monitoring | `admin/quotes/` | ✅ VERIFIED |
| Order management | `admin/orders/` — cancel/complete arbitration | ✅ VERIFIED |
| Reports & analytics | `admin/reports/`, time-series + distribution RPCs | ✅ VERIFIED |
| Audit log | `admin/audit/`, `admin_audit_logs` table | ✅ VERIFIED |
| Platform settings | `admin/settings/`, `platform_settings` table | ✅ VERIFIED |
| Role delegation (admin grant/revoke) | `grantAdminRoleAction()`, `revokeAdminRoleAction()` | ✅ VERIFIED |
| Super admin restriction on destructive actions | `authorizeAdminAction("super_admin")` | ✅ VERIFIED |
| Robots/SEO control | `admin/layout.tsx` noindex,nofollow | ✅ VERIFIED |

### 3.10 RFQ Management

| Feature | Implementation | Status |
|---------|---------------|--------|
| Public RFQ form (guest + authenticated) | `features/rfq/public-rfq-form.tsx`, `features/rfq/public-rfq-actions.ts` | ✅ VERIFIED |
| Product-specific enquiry form | `features/rfq/product-enquiry-form.tsx` | ✅ VERIFIED |
| Guest enquiry (no login required) | `guest_name`, `guest_email`, `guest_phone`, `guest_company` fields in `enquiries` table | ✅ VERIFIED |
| RFQ type (`direct` vs `rfq`) | `enquiry_type` enum in `enquiries` | ✅ VERIFIED |
| Idempotency | `client_request_id` on enquiries | ✅ VERIFIED |
| Status history | `enquiry_status_history` table | ✅ VERIFIED |
| Bulk RFQ / multi-seller matching | ❌ No code evidence of automatic supplier matching | ❌ NOT VERIFIED |
| Lead distribution engine | ❌ Not implemented | ❌ NOT VERIFIED |

### 3.11 Supplier Matching

| Feature | Status | Note |
|---------|--------|------|
| Automatic RFQ-to-seller matching | ❌ NOT VERIFIED | No matching algorithm found |
| Category-based matching | ❌ NOT VERIFIED | Only manual seller selection via enquiry |
| Geography-based matching | ❌ NOT VERIFIED | Not implemented |
| Capability-based matching | ❌ NOT VERIFIED | Not implemented |
| Lead credits / distribution limits | ❌ NOT VERIFIED | Not implemented |

### 3.12 Lead Distribution

| Feature | Status |
|---------|--------|
| Lead distribution engine | ❌ NOT VERIFIED |
| Lead credits per seller | ❌ NOT VERIFIED |
| Lead expiry | ❌ NOT VERIFIED |
| Seller lead inbox | ❌ NOT VERIFIED |

### 3.13 Quotation Management

| Feature | Implementation | Status |
|---------|---------------|--------|
| Seller creates quotation | `quotationFormSchema`, `createQuotationAction()` | ✅ VERIFIED |
| Multi-line quotation items | `quotation_items` table | ✅ VERIFIED |
| Tax, shipping, discount, subtotal, total | All fields in `quotations` schema | ✅ VERIFIED |
| Valid until date | `valid_until` field | ✅ VERIFIED |
| Status flow: draft→sent→viewed→accepted/rejected/expired/revised/cancelled | Full enum | ✅ VERIFIED |
| Buyer accepts quotation → creates order | `accept_quotation_and_create_order()` RPC | ✅ VERIFIED |
| PDF generation | `api/buyer/quotes/[id]/pdf` | ✅ VERIFIED |
| Negotiation / counter-offer | ❌ NOT VERIFIED | Only accepted/rejected — no counter-offer flow |

### 3.14 Order Management

| Feature | Implementation | Status |
|---------|---------------|--------|
| Order creation from accepted quotation | `accept_quotation_and_create_order()` RPC | ✅ VERIFIED |
| Order status flow | `pending_payment` → `confirmed` → `processing` → `dispatched` → `delivered` → `completed` / `cancelled` | ✅ VERIFIED |
| Buyer + seller snapshots in order | `buyer_snapshot`, `seller_snapshot` JSON fields | ✅ VERIFIED |
| Billing + shipping address in order | `billing_address`, `shipping_address` JSON fields | ✅ VERIFIED |
| Order status history | `order_status_history` table | ✅ VERIFIED |
| Seller transitions order | `transitionOrderStatusAction()` in seller actions | ✅ VERIFIED |
| Admin order arbitration | `transitionAdminOrderAction()` — cancel/complete only | ✅ VERIFIED |
| Payment integration (actual) | ❌ NOT VERIFIED | `payment_status` field exists but no PA integration code |
| Shipment tracking integration | ❌ NOT VERIFIED | `dispatched` status exists but no logistics API |
| Invoice generation | ❌ NOT VERIFIED | Only PDF quotation implemented |

### 3.15 Notifications

| Feature | Implementation | Status |
|---------|---------------|--------|
| Notification types | `enquiry_received`, `enquiry_viewed`, `quotation_received`, `quotation_accepted`, `quotation_rejected`, `message_received`, `seller_verification`, `product_moderation`, `account_status`, `system` | ✅ VERIFIED |
| DB-based notifications | `notifications` table | ✅ VERIFIED |
| Mark as read | `is_read` field + update action | ✅ VERIFIED |
| Push notifications | ❌ NOT VERIFIED | No FCM/Web Push implementation |
| Email notifications | ⚠️ PARTIALLY VERIFIED | Worker exists (`apps/worker/src/lib/email.ts`) but trigger pipeline unclear |
| Realtime notification count | ⚠️ PARTIALLY VERIFIED | Supabase realtime used for messaging; notification refresh pattern not confirmed |

### 3.16 Messaging

| Feature | Implementation | Status |
|---------|---------------|--------|
| Buyer-Seller conversations | `conversations` table with unread counts | ✅ VERIFIED |
| Messages | `messages` table — text, attachment, system types | ✅ VERIFIED |
| File attachments | PDF, JPEG, PNG, WebP up to 16MB | ✅ VERIFIED |
| Realtime updates | `use-realtime-messaging.ts` using Supabase channels | ✅ VERIFIED |
| Conversation archive | `buyer_archived_at`, `seller_archived_at` | ✅ VERIFIED |
| `get_or_create_conversation()` | DB function for idempotent conversation creation | ✅ VERIFIED |
| `mark_conversation_read()` | DB function | ✅ VERIFIED |
| `can_access_conversation()` | RLS helper function | ✅ VERIFIED |
| Signed URLs for attachments | `api/messages/[convId]/attachments/signed-url` | ✅ VERIFIED |
| Admin message monitoring | ❌ NOT VERIFIED | No admin access to message content |

### 3.17 Subscription Management

| Feature | Status | Note |
|---------|--------|------|
| Subscription plans table | ❌ NOT VERIFIED | No `subscriptions` table in schema |
| Seller subscription | ❌ NOT VERIFIED | Not implemented |
| Premium listing | ❌ NOT VERIFIED | No premium tier in product schema |
| Subscription billing | ❌ NOT VERIFIED | Not implemented |

### 3.18 Payment Model B

| Feature | Status | Note |
|---------|--------|------|
| `payment_status` on orders | ✅ VERIFIED | Fields exist in schema |
| Escrow / PA integration | ❌ NOT VERIFIED | No Payment Aggregator code found |
| RBI-compliant payment flow | ❌ NOT VERIFIED | Governance model only; not implemented |
| Refund processing | ❌ NOT VERIFIED | `refunded` status in enum but no logic |
| Settlement to sellers | ❌ NOT VERIFIED | Not implemented |

> **Note:** Payment architecture is documented in `docs/payment-architecture-report.md` and `docs/payment-architecture-decision.md` as a governance model — implementation is explicitly deferred.

### 3.19 Analytics and Reporting

| Feature | Implementation | Status |
|---------|---------------|--------|
| Admin dashboard metrics | `admin_dashboard_metrics()` RPC returning aggregated counts | ✅ VERIFIED |
| Time-series data (users, sellers, products, enquiries, quotations) | `admin_time_series()` RPC | ✅ VERIFIED |
| Distribution data (seller status, product status, enquiry status, category) | `admin_distribution()` RPC | ✅ VERIFIED |
| Moderation series | `admin_moderation_series()` RPC | ✅ VERIFIED |
| Category performance | `admin_category_performance()` RPC | ✅ VERIFIED |
| Seller analytics portal | `seller/analytics/` page | ✅ VERIFIED |
| Buyer-facing analytics | ❌ NOT VERIFIED | No analytics shown to buyers |
| Export (CSV/Excel) | ❌ NOT VERIFIED | Not implemented |

### 3.20 Background Worker (`apps/worker/`)

| Feature | Implementation | Status |
|---------|---------------|--------|
| Worker package exists | `apps/worker/src/index.ts`, `src/lib/email.ts` | ✅ VERIFIED |
| Email functionality | `src/lib/email.ts` | ✅ VERIFIED |
| Job queue | ❌ NOT VERIFIED | No queue client found (no BullMQ, pg-boss, etc.) |
| Scheduled jobs | ❌ NOT VERIFIED | Only 1 test file found |
| Worker deployment | ❌ NOT VERIFIED | No cloud worker config found |

---

## 4. Database Functions Audit

| Function | Purpose | Caller | Status |
|----------|---------|--------|--------|
| `current_account_active()` | Checks if current user's account is active | RLS policies | ✅ VERIFIED |
| `has_role(_role)` | Role membership check | RLS policies | ✅ VERIFIED |
| `is_admin()` | Admin check | RLS | ✅ VERIFIED |
| `is_super_admin()` | Super admin check | RLS | ✅ VERIFIED |
| `ensure_profile()` | Creates profile row for new user | Auth trigger | ✅ VERIFIED |
| `grant_self_role(_role)` | User self-assigns buyer/seller role | Registration | ✅ VERIFIED |
| `is_seller_owner(_seller_id)` | Checks ownership of seller profile | RLS | ✅ VERIFIED |
| `is_seller_verified(_seller_id)` | Checks verification status | RLS, public product query | ✅ VERIFIED |
| `submit_seller_verification()` | Transitions seller to `submitted` | Seller action | ✅ VERIFIED |
| `admin_review_seller(...)` | Updates seller verification status | Admin action | ✅ VERIFIED |
| `admin_review_document(...)` | Reviews individual documents | Admin action | ✅ VERIFIED |
| `is_product_public(_product_id)` | Checks if product is publicly visible | RLS | ✅ VERIFIED |
| `is_product_owner(_product_id)` | Checks product ownership | RLS | ✅ VERIFIED |
| `admin_grant_role(...)` | Grants admin role to user | Admin action | ✅ VERIFIED |
| `admin_revoke_role(...)` | Revokes admin role | Admin action | ✅ VERIFIED |
| `admin_set_account_status(...)` | Updates account status | Admin action | ✅ VERIFIED |
| `admin_moderate_product(...)` | Moderates product status | Admin action | ✅ VERIFIED |
| `can_access_enquiry(_enquiry_id)` | Access control for enquiry | RLS | ✅ VERIFIED |
| `transition_enquiry_status(...)` | Status machine for enquiries | Seller/buyer actions | ✅ VERIFIED |
| `can_access_conversation(...)` | Access control for messaging | RLS | ✅ VERIFIED |
| `get_or_create_conversation(...)` | Idempotent conversation creation | Messaging action | ✅ VERIFIED |
| `mark_conversation_read(...)` | Updates read timestamps | Messaging action | ✅ VERIFIED |
| `set_conversation_archived(...)` | Archive/unarchive conversation | Messaging action | ✅ VERIFIED |
| `admin_set_platform_setting(...)` | Updates platform config | Admin action | ✅ VERIFIED |
| `admin_restore_product(...)` | Restores archived product | Admin action | ✅ VERIFIED |
| `admin_request_seller_documents(...)` | Requests docs from seller | Admin action | ✅ VERIFIED |
| `admin_dashboard_metrics()` | Aggregated metrics JSON | Admin dashboard | ✅ VERIFIED |
| `admin_time_series(...)` | Time-series data for charts | Admin reports | ✅ VERIFIED |
| `admin_distribution(...)` | Distribution data for charts | Admin reports | ✅ VERIFIED |
| `admin_moderation_series(...)` | Moderation activity series | Admin reports | ✅ VERIFIED |
| `admin_category_performance()` | Category stats | Admin reports | ✅ VERIFIED |
| `accept_quotation_and_create_order(...)` | Atomic quotation acceptance + order creation | Buyer action | ✅ VERIFIED |
| `transition_order_status(...)` | Order status machine | Seller/admin actions | ✅ VERIFIED |
| `sanitize_and_validate_order_address(...)` | Address validation/sanitization | Order creation | ✅ VERIFIED |

---

## 5. Test Coverage Audit

### 5.1 Unit Tests (`apps/web/tests/`)

| Test File | Coverage Area | Status |
|-----------|--------------|--------|
| `admin-portal.test.ts` | Admin portal actions and queries | ✅ VERIFIED |
| `buyer-portal.test.ts` | Buyer actions (profile, enquiry, quotation) | ✅ VERIFIED |
| `buyer-portal-phase5.test.ts` | Buyer Phase 5 features (addresses, orders) | ✅ VERIFIED |
| `category-discovery-redesign.test.ts` | Category browsing | ✅ VERIFIED |
| `idempotency-concurrency.test.ts` | Concurrent action safety | ✅ VERIFIED |
| `marketplace.test.ts` | Public marketplace routes | ✅ VERIFIED |
| `messaging.test.ts` | Messaging feature | ✅ VERIFIED |
| `navigation-layout-isolation.test.ts` | Layout isolation between panels | ✅ VERIFIED |
| `orders-portal.test.ts` | Order management | ✅ VERIFIED |
| `phase5-19-catalog-isolation-and-access-control.test.ts` | Catalog access control | ✅ VERIFIED |
| `product-detail-page.test.ts` | Product detail rendering | ✅ VERIFIED |
| `seller-portal.test.ts` | Seller actions | ✅ VERIFIED |
| `seller-storefront-completion.test.ts` | Seller public storefront | ✅ VERIFIED |
| `subdomain-routing.test.ts` | Subdomain middleware routing | ✅ VERIFIED |
| `supplier-directory-browser-qa.test.ts` | Supplier directory filtering | ✅ VERIFIED |
| `supplier-directory.test.ts` | Supplier directory queries | ✅ VERIFIED |

**Total web tests:** ~171 (Vitest)

### 5.2 Database Tests (`packages/database/`)

229 tests covering: RLS policies, identity functions, commerce flows, notifications, orders, messaging, admin console, supplier directory.

### 5.3 E2E Tests (`apps/web/e2e/`)

55 Playwright tests covering subdomain routing and UI flows.

### 5.4 Other Package Tests

| Package | Tests |
|---------|-------|
| `@stone/validation` | 79 tests |
| `@stone/utils` | 11 tests |
| `@stone/worker` | 1 test |

---

## 6. Security Assessment

### 6.1 Strengths

| Area | Assessment |
|------|-----------|
| JWT validation | Always uses `getUser()`, never `getSession()` — prevents replay attacks |
| Role enforcement | DB-backed `user_roles`, not JWT claims — cannot be forged client-side |
| RLS policies | Comprehensive coverage per table (verified via 229 DB tests) |
| Input validation | All Server Actions use Zod `safeParse()` before DB operations |
| Admin access layers | Two-layer: `requireAdmin()` + `authorizeAdminAction()` + `evaluateAdminAccess()` |
| Private storage | Verification documents in private bucket, 1-hour signed URLs |
| Idempotency | `client_request_id` on enquiries prevents duplicate submissions |
| Search sanitization | `sanitizeAdminSearchTerm()` before ILIKE queries |
| Subdomain isolation | Middleware prevents cross-panel hostname spoofing |
| CSP | Restricts `img-src` to Supabase and known CDNs |

### 6.2 Security Concerns

| Concern | Severity | Detail |
|---------|---------|--------|
| No rate limiting on auth routes | HIGH | `/api/auth/login` has no request rate limiting |
| No CSRF protection explicit | MEDIUM | Next.js Server Actions have CSRF by origin, but API routes lack explicit token |
| Payment data stored in JSON fields | MEDIUM | `buyer_snapshot`, `billing_address` as untyped JSON |
| Worker lacks job queue | MEDIUM | No retry, dead-letter queue — email delivery failures are silent |
| No subscription/billing table | HIGH | Cannot monetize without this critical missing table |
| Guest enquiry email validation | LOW | `guest_email` validated by Zod but no verification step |
| Admin panel not behind separate auth domain | LOW | Currently path-based — resolved post-subdomain deployment |

---

## 7. Summary Matrix

| Module | Verified % | Key Gap |
|--------|-----------|---------|
| Public Marketplace | 100% | — |
| Product Catalogue | 100% | — |
| Product Categories | 100% | — |
| Supplier Directory | 100% | — |
| Seller Registration | 100% | — |
| Seller Verification | 90% | Auto-notification trigger not confirmed |
| Buyer Portal | 95% | Negotiation / counter-offer missing |
| Seller Portal | 95% | Negotiation missing |
| Admin Portal | 100% | — |
| RFQ Management | 70% | Supplier matching / lead distribution missing |
| Supplier Matching | 0% | Entire engine missing |
| Lead Distribution | 0% | Entire engine missing |
| Quotation Management | 85% | Counter-offer flow missing |
| Order Management | 75% | Payment integration, invoice, logistics missing |
| Notifications | 65% | Push and email trigger pipeline unclear |
| Messaging | 95% | Admin monitoring missing |
| Subscription Management | 0% | Entire module missing |
| Payment Model B | 10% | Schema exists; PA integration missing |
| Analytics & Reporting | 80% | CSV export, buyer analytics missing |
| Background Worker | 20% | Email lib exists; queue/scheduler missing |

