# Phase 5 Implementation Report — Buyer Portal & RFQ Management

**Project:** StoneB2B Marketplace Monorepo  
**Phase:** Phase 5 — Buyer Portal & RFQ Management  
**Status:** Completed & Verified (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` — all exit `0`)  
**Companion Audit:** `docs/phase-5-buyer-audit.md`

---

## 1. Modules Implemented

1. **Protected Buyer Portal Architecture & Shared `BuyerShell` (`apps/web/app/buyer/`, `apps/web/components/buyer/buyer-shell.tsx`)**
   - Multi-layer protection combining Next.js Edge Middleware (`apps/web/middleware.ts`, preserving full pathname + query string in `?next=`) and authoritative server-side `getBuyerContext()` / `requireBuyer()` verification in `apps/web/app/buyer/layout.tsx`.
   - Shared `BuyerShell` with sticky desktop sidebar, slide-over mobile navigation drawer, top header with dynamic breadcrumbs, unread notifications badge, buyer account summary, dual-role (`buyer` + `seller`) portal switcher, and POST sign-out.
2. **Buyer Dashboard (`apps/web/app/buyer/dashboard/`)**
   - Real-time metrics computed directly from `public.enquiries`, `public.quotations` (`status <> 'draft'`), `public.product_favourites`, and `public.notifications`:
     - Total Enquiries, Active Enquiries, Pending Responses, Received Quotations, Accepted Quotations, Rejected / Closed Enquiries, and Saved Products count.
   - Five structured B2B sections: Overview & Recent Activity, My Recent Enquiries, Recent Quotations, Quick Procurement Actions, and Saved Products.
3. **Buyer Profile Management (`apps/web/app/buyer/profile/`)**
   - Server-validated buyer contact & B2B identity editor (`full_name`, `phone`, `whatsappNumber`, `companyName`, `buyerType`, 2-letter ISO `country`, `state`, `city`, `address`, `pincode`, plus read-only email, roles, and account status).
   - Zero schema drift: strictly updates permitted columns `(full_name, phone, country, state, city, address)` on `public.profiles` while losslessly encoding/decoding optional extended B2B fields (`companyName`, `buyerType`, `whatsappNumber`, `pincode`) in `profiles.address`.
4. **RFQ Creation & Management (`apps/web/app/buyer/rfqs/`, `apps/web/components/buyer/rfq-wizard-form.tsx`)**
   - Complete 6-section B2B stone RFQ creation workflow (`Section A: Requirement`, `Section B: Technical Specifications`, `Section C: Quantity & Budget`, `Section D: Delivery`, `Section E: Private Attachments`, `Section F: Review & Submit`).
   - Supports **Product-Specific RFQs** (`?product=<slug>`) and **General Custom Stone RFQs** (`?supplier=<slug>` or verified supplier selector), `sessionStorage` draft persistence, and UUID `client_request_id` idempotency.
5. **Buyer Enquiries Management (`apps/web/app/buyer/enquiries/`)**
   - Paginated, searchable, status- and date-filtered enquiry & RFQ workspace.
   - Full detail view with product snapshot, verified supplier summary, structured RFQ stone specifications, uploaded private BOQ/CAD attachments, chronological `enquiry_status_history` timeline, linked supplier quotations, and buyer status actions (`Cancel Enquiry` / `Close Enquiry`).
6. **Buyer Quotations Inbox, Detail, Print & PDF Download (`apps/web/app/buyer/quotes/`)**
   - Quotations inbox filtered strictly to buyer-owned non-draft quotations (`sent`, `viewed`, `accepted`, `rejected`, `expired`, `revised`, `cancelled`) with multi-select checkboxes for side-by-side comparison.
   - Detailed commercial quotation view with line-item schedule (`quotation_items`), financial breakdown (`subtotal`, `discount_amount`, `tax_amount`, `shipping_charges`, `total_amount`), parsed payment/delivery/validity terms, print-optimized stylesheet (`window.print()`), and authenticated server-generated `%PDF-1.4` download (`/api/buyer/quotes/[id]/pdf`).
7. **Side-by-Side Quotation Comparison (`apps/web/app/buyer/quotes/compare/page.tsx`)**
   - Compares 2–4 buyer-owned quotations across supplier verification status, unit price, line items, subtotal, discount, tax, freight, final total, currency, validity, payment/delivery terms, and quotation status.
   - Enforces strict commercial comparability checks (`analyzeQuotationComparison`): highlights lowest eligible active total and computes spread/deltas **only** when currencies and quoted quantities/units match; never equates incompatible currencies (e.g., `INR` vs `USD`) and never declares a subjective "best supplier".
8. **Saved Products / Favourites (`apps/web/app/buyer/favourites/`, `apps/web/components/buyer/favourite-button.tsx`)**
   - Real `public.product_favourites` persistence wired into `ProductCard`, `/products`, `/products/[slug]`, `/suppliers/[slug]`, and `/buyer/favourites`, including graceful handling of subsequently archived/unpublished products and `/login?next=...` redirect for anonymous visitors.
9. **Private Enquiry & RFQ Attachments (`apps/web/app/api/buyer/enquiries/[enquiryId]/attachments/route.ts`)**
   - Authenticated buyer upload & 15-minute signed URL preview/download backed by the private `enquiry-attachments` Supabase Storage bucket.
10. **Buyer Notifications & Account Settings (`apps/web/app/buyer/notifications/`, `apps/web/app/buyer/settings/`)**
    - Real `public.notifications` inbox (All / Unread tabs, deep links to `/buyer/quotes/[id]` and `/buyer/enquiries/[id]`, individual & bulk mark-as-read).
    - Account security & password update via Supabase Auth (`supabase.auth.updateUser`), role summary, dual-role portal navigation, and account status notices.
11. **Public Marketplace & Auth Return-URL Integration**
    - Sanitized `?next=` return-URL flow across `/login`, `/register`, `/register/buyer`, `/auth/callback`, `signIn`, and `signUp` (`sanitizeNextPath`).
    - Role-aware `/dashboard` and `/profile` dispatchers routing buyers to `/buyer/dashboard` and `/buyer/profile` while preserving `/seller/dashboard` for sellers and supporting `?portal=buyer|seller` for dual-role accounts.
    - Upgraded public `SiteHeader`, `MobileNav`, `SiteFooter`, `/products`, `/products/[slug]`, `/suppliers/[slug]`, and `EnquiryForm`.

---

## 2. Routes Created & Updated

### New Protected Buyer Portal Pages (`apps/web/app/buyer/`)
- `/buyer` -> Redirects to `/buyer/dashboard`
- `/buyer/dashboard` -> Buyer overview metrics, recent enquiries, recent quotations, quick actions, and saved products
- `/buyer/profile` -> Buyer B2B contact & company profile management
- `/buyer/enquiries` -> Searchable, filterable, paginated buyer enquiries list
- `/buyer/enquiries/[id]` -> Enquiry detail, status history timeline, private attachments, linked quotations, and cancel/close actions
- `/buyer/rfqs` -> Dedicated RFQ list view with quick filters and Create New RFQ CTA
- `/buyer/rfqs/new` -> 6-section Product-Specific & General Custom Stone RFQ wizard (`?product=` / `?supplier=`)
- `/buyer/rfqs/[id]` -> RFQ detail, technical specs, BOQ/CAD attachment uploader, and received quotations
- `/buyer/quotes` -> Received quotations inbox with seller/status/date filters and comparison selector
- `/buyer/quotes/compare` -> Side-by-side 2–4 quotation comparison matrix (`?ids=` / `?enquiry=`)
- `/buyer/quotes/[id]` -> Commercial quotation detail, Accept / Reject / Mark Viewed actions, Print view, and PDF export
- `/buyer/favourites` -> Saved stone products workspace with quick Remove, View, and Request Quote actions
- `/buyer/notifications` -> Buyer notifications centre (All / Unread, mark-as-read)
- `/buyer/settings` -> Password change, session security, and dual-role portal preferences

### New Authenticated Buyer API Endpoints (`apps/web/app/api/buyer/`)
- `POST /api/buyer/enquiries/[enquiryId]/attachments` -> Private BOQ / CAD / reference image upload to `enquiry-attachments`
- `GET /api/buyer/quotes/[id]/pdf` -> Streams authenticated `%PDF-1.4` commercial quotation document

### Updated Public & Auth Routes
- `/dashboard`, `/profile`, `/login`, `/register`, `/register/buyer`, `/auth/callback`
- `/products`, `/products/[slug]`, `/suppliers/[slug]`

---

## 3. Components & Domain Modules Created

- `packages/validation/src/buyer.ts` — Zod schemas (`buyerProfileSchema`, `rfqFormSchema`, `buyerEnquiryTransitionSchema`, `buyerQuotationDecisionSchema`, `buyerPasswordChangeSchema`) and `sanitizeNextPath`.
- `apps/web/features/buyer/buyer-meta.ts` — Metadata encoders/decoders, transition eligibility helpers, commercial terms parser, quotation comparison engine, and pure-TypeScript `%PDF-1.4` generator.
- `apps/web/features/buyer/queries.ts` — Server-only Supabase queries for all Buyer Portal modules and marketplace favourite state.
- `apps/web/features/buyer/actions.ts` — Authenticated Server Actions enforcing Zod validation, session-derived `buyer_id`, verified supplier lookups, and path revalidation.
- `apps/web/components/buyer/buyer-shell.tsx` — Responsive desktop sidebar + mobile drawer shell (`print:hidden` chrome for clean quotation printing).
- `apps/web/components/buyer/favourite-button.tsx` — Optimistic/transactional favourite toggle (`overlay` & `button` variants).
- `apps/web/components/buyer/rfq-wizard-form.tsx` — Multi-section RFQ creation form with `sessionStorage` draft persistence and attachment upload queue.
- `apps/web/components/buyer/enquiry-attachment-uploader.tsx` — Client uploader for `PDF/JPEG/PNG/WebP` (`<= 10 MB`).
- `apps/web/components/buyer/buyer-enquiries-list-view.tsx` — Shared table + mobile card list for `/buyer/enquiries` and `/buyer/rfqs`.
- `apps/web/components/buyer/buyer-enquiry-detail-view.tsx` & `apps/web/components/buyer/buyer-enquiry-status-actions.tsx` — Enquiry/RFQ detail layout, status timeline, and confirmation-guarded transitions.
- `apps/web/app/buyer/profile/buyer-profile-form.tsx`, `apps/web/app/buyer/quotes/[id]/buyer-quote-actions.tsx`, `apps/web/app/buyer/favourites/remove-favourite-button.tsx`, `apps/web/app/buyer/notifications/notification-actions.tsx`, `apps/web/app/buyer/settings/password-form.tsx`.

---

## 4. Database Tables Reused

All Phase 5 features reuse the authoritative Phase 2 PostgreSQL schema without duplicate tables:
- `public.profiles` (buyer identity, contact info, ISO country, location, account status)
- `public.user_roles` (`buyer`, `seller`, `admin`, `super_admin` RBAC)
- `public.public_seller_profiles` (security-safe verified supplier projection — never exposes private seller GST/personal contact columns)
- `public.categories`, `public.products`, `public.product_images`, `public.product_specifications`
- `public.enquiries` (both product enquiries and structured RFQs, with `(buyer_id, client_request_id)` unique idempotency index)
- `public.enquiry_status_history` (immutable audit trail of status transitions)
- `public.quotations` & `public.quotation_items`
- `public.product_favourites`
- `public.notifications`
- `storage.objects` (`enquiry-attachments` private bucket & `product-images` public bucket)

---

## 5. RPCs, Views & Triggers Reused

- **`public.transition_enquiry_status(_enquiry_id, _new_status, _notes)`** (`SECURITY DEFINER` RPC): Used for buyer enquiry cancellation (`('submitted'|'viewed'|'responding'|'quoted') -> 'cancelled'`) and closure (`('accepted'|'rejected') -> 'closed'`), recording audit entries in `public.enquiry_status_history`.
- **`public.quotations_guard` & `public.quotations_after_change`** (triggers on `public.quotations`): Enforces buyer status-only updates (`sent -> viewed | accepted | rejected`, `viewed -> accepted | rejected`), rejects acceptance when `valid_until < now()` (`SQLSTATE 22023`), blocks tampering with financial fields (`SQLSTATE 42501`), and automatically updates parent `enquiries.status` (`accepted -> 'accepted'`, `rejected -> 'responding'`).
- **`public.enquiries_initial_history`** (AFTER INSERT trigger on `public.enquiries`): Automatically logs initial `'submitted'` entry in `public.enquiry_status_history`.
- **`public.can_access_enquiry(_enquiry_id)`**, **`public.is_seller_verified(_seller_id)`**, **`public.product_matches_seller(_product_id, _seller_id)`**, **`public.is_product_public(_product_id)`**, and **`public.current_account_active()`**: Enforce row-level and storage-level ownership boundaries.

---

## 6. New Migrations

**None (`0` new SQL migrations).**  
Zero production schema drift was introduced. Every column constraint, column-level `GRANT`, enum value, trigger, and RLS policy from Phase 2 (`20261030100000`–`20261030100500`) was preserved intact.

---

## 7. RFQ Workflow Details

- **Product-Specific RFQ (`mode = "product"`):**
  - Pre-fills stone specifications from an approved catalog product (`/buyer/rfqs/new?product=<slug>` or product picker).
  - Server action (`submitBuyerRfqAction`) verifies the product is `moderation_status = 'approved'` and derives `seller_id` authoritatively on the server from the product record (never trusting client-submitted `seller_id`).
- **General Custom Stone RFQ (`mode = "general"`):**
  - Sets `product_id = null` and allows the buyer to select a verified manufacturer/exporter from `public_seller_profiles` (or pre-select via `/buyer/rfqs/new?supplier=<slug>`).
  - Server action verifies the target supplier exists in `public_seller_profiles` (verified) and prevents self-enquiries (`seller.user_id === user.id`).
- **Structured Stone Specifications (`encodeRfqDescription` / `decodeRfqDescription`):**
  - Encodes Category, Material Type, Stone Origin, Colour, Finish, Thickness, Length, Width, Surface Requirements, Custom Specifications, and Delivery Destination cleanly at the bottom of `enquiries.description` so sellers see human-readable specs in `/seller/enquiries/[id]` while buyers see structured spec cards in `/buyer/rfqs/[id]` and `/buyer/enquiries/[id]`.
- **Single-Seller Schema Honesty & Future Broadcast Note:**
  - Because `public.enquiries.seller_id` is `NOT NULL` (one enquiry row = one buyer-to-verified-seller thread), Phase 5 does not fake multi-supplier broadcast RFQs. Buyers wishing to solicit competing bids from multiple suppliers can submit RFQs to each shortlisted verified supplier and compare all resulting quotations in `/buyer/quotes/compare`. A future `rfq_campaigns` parent table is recommended if one-click multi-supplier broadcast is desired in a later phase.

---

## 8. Quotation Acceptance & Rejection Implementation

- **Auto-View & Explicit Mark Viewed:** Opening `/buyer/quotes/[id]` when `quotation.status === 'sent'` offers explicit `Mark as Viewed` as well as direct `Accept Quotation` and `Reject Quotation` actions (`sent -> viewed | accepted | rejected`).
- **Confirmation Dialogs:** Both `Accept Quotation` and `Reject Quotation` require explicit buyer confirmation explaining downstream status effects (accepting marks the quotation `accepted` and advances the parent enquiry to `accepted`; rejecting marks the quotation `rejected` and returns the parent enquiry to `responding` so the seller can issue a revised quote).
- **Expiry Guard:** `getBuyerQuotationActionEligibility` disables acceptance in the UI when `valid_until < now()`, while PostgreSQL trigger `quotations_guard` enforces the identical check server-side (`22023: quotation has expired`).
- **Immutability:** `decideBuyerQuotationAction` executes `.update({ status: parsed.data.decision }).eq("id", quotationId).eq("buyer_id", user.id)` — never touching financial or terms columns.

---

## 9. PDF Generation & Print Details

- **Server-Side PDF Endpoint (`GET /api/buyer/quotes/[id]/pdf`):**
  - Authenticates session JWT (`getCurrentUser()`) and `buyer` role (`hasRole("buyer")`), then loads the quotation scoped to `buyer_id = user.id` and `status <> 'draft'`. Returns `401` (anonymous), `403` (non-buyer), or `404` (cross-buyer or draft).
  - Generates a standards-compliant A4 `%PDF-1.4` document (`generateQuotationPdfBytes`) using built-in Type1 Helvetica / Helvetica-Bold fonts with zero heavy native binaries.
  - Includes StoneB2B header, Quote Number, Status, Issue & Validity dates, Enquiry reference, Verified Supplier & Buyer summary, itemized stone schedule (`quantity`, `unit`, `unit_price`, `total_price`), Subtotal / Discount / Tax / Shipping / Final Total breakdown, Commercial Terms, and explicit disclaimer:  
    `"COMMERCIAL QUOTATION ONLY - NOT A TAX INVOICE, PROFORMA RECEIPT, OR PAYMENT CONFIRMATION."`
  - Delivered with `Content-Type: application/pdf` and `Cache-Control: private, no-store, max-age=0`.
- **Browser Print Styles:** `SiteHeader`, `SiteFooter`, `BuyerShell` navigation chrome, and interactive action bars carry `print:hidden` so clicking **Print Quotation** produces a clean A4 commercial document.

---

## 10. Attachment Security

- **Bucket:** Private `enquiry-attachments` bucket (`public = false`, `10 MB` max size, `application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
- **Pre-Storage IDOR Prevention:** `POST /api/buyer/enquiries/[enquiryId]/attachments` validates UUID format, user authentication, `buyer` role, and `enquiries.buyer_id === user.id` (plus active enquiry status and max 8 files cap) **before** reading bytes or calling Supabase Storage.
- **Magic-Byte Inspection:** Uses `validateUploadBytes` (`@stone/utils`) to verify real binary file signatures (`%PDF-`, JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`), blocking spoofed executables/HTML disguised with `.pdf` or `.png` extensions.
- **Path Isolation & Signed URLs:** Object paths strictly follow `<enquiry_id>/<timestamp>-<uuid8>-<sanitized-name>.<ext>`, satisfying `storage.objects` RLS policy `enquiry_att_insert_participant` (`can_access_enquiry`). Downloads use short-lived 15-minute (`900s`) signed URLs (`createSignedUrl` / `createSignedUrls`) and are never exposed via public bucket URLs.

---

## 11. RLS & Security Testing Results

Executed against real PostgreSQL + RLS via PGlite (`packages/database/tests/phase5-buyer-workflows.test.ts` + full Phase 2/4 suite — **137/137 database tests passing**):
- **Buyer Profile:** Buyer reads/updates own permitted columns; cross-buyer profile read returns `[]`; updating `account_status` fails with `permission denied`; invalid 3-letter country fails check constraint (`23514`); self-inserting `admin` in `user_roles` fails with `permission denied`.
- **Enquiries & RFQs:** Product-specific and general (`product_id IS NULL`) RFQs succeed for verified sellers; duplicate `(buyer_id, client_request_id)` fails with `23505`; mismatched `(product_id, seller_id)` blocked by RLS; cross-buyer and anonymous reads blocked; `can_access_enquiry` grants access only to owning buyer, target seller, and admin; buyer attempting seller-only transition `'responding'` fails (`transition submitted -> responding is not allowed`), while buyer `'cancelled'` and `'closed'` transitions succeed.
- **Quotations:** Buyer cannot read `draft` quotations (`[]`); once `sent`, owning buyer reads quotation and items while other buyers see `[]`; buyer tampering with `total_amount` raises `buyers cannot edit quotation terms`; `viewed -> accepted` auto-updates parent enquiry to `'accepted'`; `sent -> rejected` auto-updates parent enquiry to `'responding'`; accepting an expired quotation (`valid_until < now()`) raises `quotation has expired` (`22023`).
- **Favourites & Notifications:** Duplicate `(buyer_id, product_id)` blocked (`23505`); saving unpublished `draft` product blocked by RLS; cross-buyer read/delete/update on `product_favourites` and `notifications` affects `0` rows; direct client `INSERT` into `notifications` blocked (`permission denied`).

---

## 12. Responsive Design Verification

All Buyer Portal routes and components are built mobile-first across `390px`, `430px`, `768px`, `1024px`, and `1440px`:
- **`390px` / `430px` (Mobile):** `BuyerShell` collapses desktop sidebar into a slide-over drawer with `>= 42px` touch targets; `/buyer/enquiries`, `/buyer/rfqs`, and `/buyer/quotes` render dedicated stacked mobile cards (`md:hidden`) instead of cramped tables; `/buyer/quotes/compare` wraps the comparison matrix in `overflow-x-auto` with sticky/min-width columns so zero horizontal page overflow occurs.
- **`768px` (Tablet):** 2-column metric and saved-product grids, stacked-to-inline filter toolbars, and spacious RFQ form sections.
- **`1024px` / `1440px` (Desktop):** Sticky `w-64` left navigation rail, 3–6 column KPI summary cards, full data tables (`hidden md:block`), and 2-column detail layouts (main specification/quotation schedule + right-hand supplier & action rail).
- **Public Navbar:** Preserved approved `h-20 sm:h-[88px]` height and `NAV_LINKS` without visual regression.

---

## 13. Automated Test Results

All quality gates executed and passed with exit code `0`:

| Command | Result | Details |
| :--- | :--- | :--- |
| `pnpm lint` | **PASS (`0`)** | 8/8 packages passed ESLint with 0 errors and 0 warnings |
| `pnpm typecheck` | **PASS (`0`)** | 8/8 packages passed `tsc --noEmit` strict typechecking |
| `pnpm test` | **PASS (`0`)** | **18 test files, 211 tests passed, 0 failed** |
| `pnpm build` | **PASS (`0`)** | Full production Next.js 15.5.28 + worker build succeeded |

### Test Breakdown by Package (`211` total tests)
- `@stone/database`: **137 passed** (8 files, including `tests/phase5-buyer-workflows.test.ts` [4 end-to-end multi-actor RLS suites])
- `@stone/web`: **36 passed** (3 files: `tests/buyer-portal.test.ts` [15], `tests/seller-portal.test.ts` [11], `tests/marketplace.test.ts` [10])
- `@stone/validation`: **23 passed** (3 files: `tests/buyer.test.ts` [9], `tests/seller.test.ts` [8], `tests/validation.test.ts` [6])
- `@stone/utils`: **11 passed** (2 files: `file-signature.test.ts` [5], `utils.test.ts` [6])
- `@stone/email`: **3 passed** (1 file)
- `@stone/worker`: **1 passed** (1 file)

---

## 14. Production Build Result

`pnpm build` (`turbo run build`) completed cleanly in `33.7s` (`next build` compiled in `8.4s`, static + dynamic route generation `52/52` succeeded):
- All 14 `/buyer/*` pages and both `/api/buyer/*` route handlers compiled with lean First Load JS bundles (`103 kB`–`148 kB`).
- Note: `/sitemap.xml` logs an informational catch message during static prerender when reading server cookies and cleanly falls back to dynamic server rendering (`ƒ /sitemap.xml`).

---

## 15. Remaining Bugs and Architectural Limitations

1. **Single-Seller Enquiry/RFQ Cardinality (`enquiries.seller_id NOT NULL`):**
   - Each RFQ targets one verified supplier. Multi-supplier broadcast RFQs (one buyer submission fanning out to N suppliers automatically) would require a parent `rfq_campaigns` table in a future phase.
2. **Attachment Immutability After Upload:**
   - Matching `20261030100500_storage.sql`, `enquiry-attachments` intentionally omits `UPDATE` and `DELETE` storage policies so commercial RFQ attachments remain tamper-evident for both parties once submitted.
3. **Notification Creation Triggering:**
   - Authenticated clients cannot `INSERT` into `public.notifications` directly (by security design). Automated notification insertion relies on database triggers / background worker (`@stone/worker`) using service-role credentials.

---

## 16. Manual Supabase Configuration

No manual SQL changes are required if the Phase 2 migrations (`20261030100000` through `20261030100500`) have already been applied to the Supabase project (`https://rgmasamasslqintssyrh.supabase.co`). Verify in the Supabase Dashboard that:
1. Storage bucket `enquiry-attachments` exists with `Public = false` and `10 MB` file size limit (created by `20261030100500_storage.sql`).
2. Auth Redirect URLs include `http://localhost:3001/auth/callback` (and your production domain `/auth/callback`) so email verification preserves `?next=` redirects.

---

## 17. Recommended Phase 6 Plan (Admin Governance, Moderation & Platform Operations)

1. **Protected Admin Portal (`/admin/*` & `AdminShell`):**
   - Strict server-side `admin` / `super_admin` RBAC guard and operational dashboard.
2. **Seller Verification Review Queue (`/admin/sellers`):**
   - Inspect private `seller-documents` via short-lived signed URLs and invoke `public.admin_review_seller(_seller_id, _decision, _reason)` with audit logging (`admin_audit_logs`).
3. **Product Catalogue Moderation Queue (`/admin/products`):**
   - Review `pending_review` stone listings, images, and technical specs, and invoke `public.admin_moderate_product(_product_id, _decision, _reason)`.
4. **Category & Taxonomy Management (`/admin/categories`) + User Account Governance (`/admin/users`):**
   - Manage stone categories, account suspension/reactivation (`account_status`), and platform-wide enquiry/quotation health metrics.
5. **Transactional Notification & Email Worker Integration (`@stone/worker` + `@stone/email`):**
   - Dispatch in-app `public.notifications` and transactional emails on seller verification, product approval, new RFQ/enquiry receipt, and quotation sent/accepted/rejected events.

