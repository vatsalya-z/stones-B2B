# Phase 5 — Buyer Portal & RFQ Management Audit

## 1. Repository & Git Status Audit

- **Monorepo Packages**: `@stone/web` (Next.js 15 App Router), `@stone/worker`, `@stone/database` (Supabase SSR/Admin clients + TypeScript definitions + PGlite test suite), `@stone/validation` (Zod schemas), `@stone/utils` (pagination, money, slug, magic-byte file signature sniffing), `@stone/types`, `@stone/ui` (design system primitives), `@stone/email`, `@stone/config`.
- **Completed Phases**:
  - Phase 1: Monorepo foundation & CI scripts.
  - Phase 2: 6 PostgreSQL migrations (`20261030100000`–`100500`), RBAC, RLS, Storage policies, Auth flows, 130 PGlite DB tests.
  - Phase 3: Public marketplace (`/`, `/products`, `/products/[slug]`, `/products/[slug]/enquiry`, `/categories`, `/categories/[slug]`, `/suppliers`, `/suppliers/[slug]`, `/search`).
  - Phase 4: Seller Portal (`/seller/*`), product catalogue CRUD, Ultra-HD media uploads, seller enquiry inbox, quotation builder, storefront settings, seller analytics, + 3 PGlite end-to-end seller workflow tests.
- **Git Status**: Clean Phase 4 modifications and untracked seller modules on branch `vatsalya`; all existing user and Phase 1–4 changes preserved.

---

## 2. Authoritative Database Schema, Grants, RLS & RPC Verification

Verified directly against `supabase/migrations/20261030100000_foundation_identity.sql` through `20261030100500_storage.sql`:

### A. Identity & Buyer Profile (`public.profiles`, `public.user_roles`)
- **`public.profiles` columns**:
  - `id` (`uuid`, PK -> `auth.users.id`)
  - `full_name` (`text`, `<= 120` chars)
  - `email` (`text`, synced via `on_auth_user_email_changed` trigger; read-only to clients)
  - `phone` (`text`, nullable)
  - `avatar_url` (`text`, nullable)
  - `country` (`text`, `NOT NULL`, default `'IN'`, constraint `country ~ '^[A-Z]{2}$'` — **2-letter ISO code required**)
  - `state` (`text`, nullable)
  - `city` (`text`, nullable)
  - `address` (`text`, nullable)
  - `account_status` (`'active' | 'pending' | 'suspended'`, read-only to clients)
  - `created_at`, `updated_at` (`timestamptz`)
- **Column-level privilege**: `grant update (full_name, phone, avatar_url, country, state, city, address) on public.profiles to authenticated;`
- **RLS**: `profiles_select_own` (`id = auth.uid()`), `profiles_update_own` (`id = auth.uid() and public.current_account_active()`).
- **Schema gap note**: Separate columns for `whatsapp_number`, `pincode`, `company_name`, `buyer_business_type`, and a `buyer-avatars` storage bucket do not exist in Phase 2 migrations. To avoid unapproved production schema drift against the connected Supabase instance, extended buyer contact metadata (WhatsApp, PIN code, company name, buyer business type) can be stored losslessly within `profiles.address` via a clean encoder/decoder (`encodeBuyerAddress` / `decodeBuyerAddress`) while respecting column grants and RLS.
- **`public.user_roles`**: Many-to-many `(user_id, role)` where `role in ('buyer', 'seller', 'admin', 'super_admin')`. Direct client writes are revoked. Users may hold both `buyer` and `seller` roles simultaneously.

### B. Enquiries & RFQ Workflow (`public.enquiries`, `public.enquiry_status_history`)
- **`public.enquiries` columns**:
  - `id` (`uuid`, PK)
  - `buyer_id` (`uuid`, `NOT NULL` -> `profiles.id`)
  - `seller_id` (`uuid`, `NOT NULL` -> `seller_profiles.id`)
  - `product_id` (`uuid`, **NULLABLE** -> `products.id`)
  - `enquiry_title` (`text`, `3..200` chars)
  - `description` (`text`, `1..5000` chars)
  - `quantity` (`numeric(14,3)`, `> 0`)
  - `unit` (`'sq_ft' | 'sq_m' | 'piece' | 'ton' | 'metric_ton' | 'slab' | 'box' | 'custom'`)
  - `expected_budget` (`numeric(14,2)`, nullable, `>= 0`)
  - `currency` (`text`, default `'INR'`, `^[A-Z]{3}$`)
  - `delivery_location` (`text`, nullable)
  - `required_delivery_date` (`date`, nullable)
  - `status` (`'submitted' | 'viewed' | 'responding' | 'quoted' | 'accepted' | 'rejected' | 'closed' | 'cancelled'`, default `'submitted'`)
  - `client_request_id` (`uuid`, nullable, unique `(buyer_id, client_request_id)`)
  - `created_at`, `updated_at` (`timestamptz`)
- **Grants & RLS**:
  - `INSERT` granted on `(buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit, expected_budget, currency, delivery_location, required_delivery_date, client_request_id)` — omitting `status` (uses default `'submitted'`).
  - **No direct `UPDATE` grant** on `public.enquiries`.
  - `enquiries_insert_buyer` policy requires:
    1. `buyer_id = auth.uid()`
    2. `public.current_account_active()`
    3. `status = 'submitted'`
    4. `public.is_seller_verified(seller_id)`
    5. `not public.is_seller_owner(seller_id)` (a dual-role user cannot send enquiries to their own seller business)
    6. `(product_id is null or public.product_matches_seller(product_id, seller_id))`
- **Single-Seller RFQ Architecture Finding**:
  - Because `seller_id` is `NOT NULL`, each enquiry/RFQ targets **one verified seller**.
  - Both **Product-Specific RFQs** (`product_id` set, `seller_id` derived server-side from `products.seller_id`) and **General RFQs** (`product_id IS NULL`, `seller_id` selected from verified `public_seller_profiles` and validated server-side) are natively supported without schema modifications.
  - Multi-supplier broadcast RFQs are **not** supported by the current schema and will be documented as a future Phase enhancement rather than faked.
- **Buyer Enquiry Transitions (`public.transition_enquiry_status(_enquiry_id, _new_status, _notes)`)**:
  - Buyers may transition `('submitted', 'viewed', 'responding', 'quoted') -> 'cancelled'`
  - Buyers may transition `('accepted', 'rejected') -> 'closed'`
  - All other transitions are strictly forbidden to buyers (`42501`).

### C. Quotations & Comparison (`public.quotations`, `public.quotation_items`)
- **Visibility (`quotations_select`)**: Buyers can read `quotations` where `buyer_id = auth.uid() and status <> 'draft'`. `quotation_items` are readable via `public.can_view_quotation(quotation_id)`.
- **Buyer Quotation Actions (`quotations_update` + `quotations_guard` + `quotations_after_change`)**:
  - Direct `UPDATE` of `status` on `public.quotations` is the authoritative database mechanism for buyer actions (guarded by `quotations_guard_trg`).
  - Buyers cannot alter financial columns, currency, `valid_until`, `terms`, `quote_number`, or participant IDs.
  - Allowed buyer transitions:
    - `'sent' -> 'viewed' | 'accepted' | 'rejected'`
    - `'viewed' -> 'accepted' | 'rejected'`
  - Expiry enforcement: Accepting a quotation where `valid_until < now()` raises `22023` (`quotation has expired`).
  - Automatic parent enquiry sync (`quotations_after_change_trg`):
    - `'accepted'` -> sets parent enquiry to `'accepted'` and logs history.
    - `'rejected'` -> sets parent enquiry to `'responding'` and logs history so the seller may issue a revised/new quotation.
- **Multiple Quotations per Enquiry**: `quotations.enquiry_id` is non-unique (`quotations_enquiry_idx`), allowing multiple quotation versions/offers on the same enquiry as well as comparison across buyer quotations.

### D. Saved Products (`public.product_favourites`)
- Columns: `id`, `buyer_id`, `product_id`, `created_at` (`UNIQUE (buyer_id, product_id)`).
- RLS: `buyer_id = auth.uid()` for `SELECT` and `DELETE`; `INSERT` also requires `public.current_account_active() and public.is_product_public(product_id)`.
- If a previously saved product is later archived or unpublished, `products_select_public` hides the `products` row while the `product_favourites` row remains — requiring a two-step fetch so unavailable items can still be displayed safely as unavailable and removed by the buyer.

### E. Private Attachments (`enquiry-attachments` Storage Bucket)
- Private bucket (`public = false`), `10 MB` (`10,485,760` bytes) limit, allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- **Mandatory Path Rule**: `<enquiry_id>/<filename>` (`public.can_access_enquiry(public.storage_first_folder_uuid(name))`).
- Participants have `SELECT` and `INSERT` policies only (no `UPDATE` or `DELETE` — attachments are immutable commercial evidence).

### F. Notifications (`public.notifications`)
- Columns: `id`, `user_id`, `title`, `message`, `notification_type`, `reference_id`, `is_read`, `created_at`.
- Clients have `SELECT`, `UPDATE (is_read)`, and `DELETE` on own rows (`user_id = auth.uid()`). No client `INSERT` grant exists; automated event generation belongs to Phase 6.

---

## 3. Reusable Modules vs Missing Implementation

### Existing & Reusable
- `apps/web/lib/auth.ts`: `getCurrentUser`, `requireAuth`, `getUserRoles`, `hasRole`, `requireBuyer`.
- `apps/web/middleware.ts`: Protects `/buyer/*` prefix and redirects unauthenticated users to `/login?next=<pathname>`.
- `packages/utils/src/file-signature.ts`: `validateUploadBytes` sniffs real `PDF`, `JPEG`, `PNG`, and `WebP` binary headers.
- `apps/web/components/seller/status-badges.tsx`: `EnquiryStatusBadge`, `QuotationStatusBadge`, `VerificationStatusBadge`, `formatShortDate`, `formatDateTime`.
- `@stone/ui`: `Button`, `Badge`, `Card`, `EmptyState`, `ErrorState`, `Skeleton`, `Breadcrumb`, `SectionHeading`, `VerifiedBadge`.

### Missing Functionality to Implement in Phase 5
1. **Safe Return-URL (`?next=`) Flow in Auth**: `LoginPage`, `RegisterPage`, `RegisterBuyerPage`, and `signIn` currently ignore `?next=` and always redirect to `/dashboard`. Additionally `/dashboard` and `/profile` redirect non-sellers to `/` instead of `/buyer/dashboard` and `/buyer/profile`.
2. **Buyer Validation Schemas (`@stone/validation`)**: Zod schemas for buyer profile updates, product-specific & general RFQs (Sections A–F), enquiry status transitions (`cancelled`, `closed`), quotation decision actions (`viewed`, `accepted`, `rejected`), and password change.
3. **Buyer Feature Layer (`apps/web/features/buyer/`)**:
   - `buyer-meta.ts`: RFQ structured specification encoder/decoder, buyer address/metadata encoder/decoder, quotation comparison compatibility engine (currency/unit/quantity/expiry checks), pure-TypeScript PDF document generator (`%PDF-1.4`) for real quotation PDF downloads.
   - `queries.ts`: Server-only RLS-respecting queries for buyer context, dashboard metrics & activity, enquiries, RFQs, quotations, comparison sets, saved products (handling archived items), private attachment signed URLs, and notifications.
   - `actions.ts`: Server Actions for profile update, RFQ/enquiry creation with `client_request_id` idempotency, buyer enquiry cancellation/closing via `transition_enquiry_status`, quotation mark-viewed/accept/reject, favourite toggle/remove, notification mark-read/mark-all-read, and password change.
4. **Secure API Route Handlers**:
   - `POST /api/buyer/enquiries/[enquiryId]/attachments` (ownership check + 10 MB limit + magic-byte sniffing + `<enquiry_id>/<unique-file>` upload).
   - `GET /api/buyer/quotes/[id]/pdf` (authenticated buyer ownership check + downloadable `application/pdf` quotation document).
5. **Buyer Portal UI & Routes (`apps/web/components/buyer/`, `apps/web/app/buyer/*`)**:
   - `BuyerShell` + `/buyer`, `/buyer/dashboard`, `/buyer/profile`, `/buyer/enquiries`, `/buyer/enquiries/[id]`, `/buyer/rfqs`, `/buyer/rfqs/new`, `/buyer/rfqs/[id]`, `/buyer/quotes`, `/buyer/quotes/compare`, `/buyer/quotes/[id]`, `/buyer/favourites`, `/buyer/notifications`, `/buyer/settings`.
6. **Public Marketplace Buyer Integration**:
   - Save/Favourite button (`FavouriteButton`) on `/products/[slug]` and `/products` cards with safe `?next=` login redirect for anonymous visitors.
   - Direct *Request Quotation (Full RFQ)* + *Send Quick Enquiry* actions on `/products/[slug]` and `/suppliers/[slug]`, plus Buyer Portal links in `SiteHeader` / `MobileNav`.
7. **Automated Tests**:
   - Unit/integration tests for Zod schemas, RFQ/buyer metadata helpers, quotation comparison rules, attachment upload security, PDF generation, safe redirect sanitization, and PGlite PostgreSQL + RLS end-to-end buyer workflow tests.

