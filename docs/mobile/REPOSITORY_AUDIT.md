# StonesDekho Mobile App — Repository Audit Report

**Audit Date:** 2026-11-25  
**Target Workspace:** `/Users/vatsalyabhardwaj/Desktop/Website Codes Zoom Digital/stones-B2B`  
**Mobile Target Path:** `apps/mobile` (`@stone/mobile`)

---

## 1. Monorepo Architecture & Tooling Audit

- **Package Manager:** `pnpm@11.27.0` (`pnpm-workspace.yaml`: `apps/*`, `packages/*`, `allowBuilds: esbuild, unrs-resolver`)
- **Task Orchestrator:** `turbo@^2.3.3` (`turbo.json`)
- **Runtime & Language:** Node `v24.22.0`, TypeScript `^5.7.2`, React `19.0.0`
- **Existing Apps (Preserved Untouched):**
  - `apps/marketplace` (`@stone/marketplace`) — Next.js 15 public marketplace & buyer/auth portal
  - `apps/seller` (`@stone/seller`) — Next.js 15 supplier & quarry workspace
  - `apps/web` (`@stone/web`) — Unified Next.js 15 workspace + Playwright E2E suite
  - `apps/admin` (`@stone/admin`) — Next.js 15 admin console
  - `apps/worker` — Background worker

### Local Native Toolchain Status
- `xcode-select -p`: `/Library/Developer/CommandLineTools` (full Xcode IDE + `pod` CocoaPods not installed locally)
- `java`: JDK 21 (`/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home/bin/java`)
- `ANDROID_HOME`: unset (Android Studio / Android SDK not installed locally)
- **Implication:** Metro bundler Android/iOS JavaScript + asset bundle exports (`npx expo export --platform android --platform ios`), Expo config introspection, TypeScript strict checks, and Vitest test suites run natively on this machine; native `.aab`/`.ipa` compilation must run via EAS Build (`eas.json`) or after installing Xcode/Android Studio.

---

## 2. Shared Packages React Native Compatibility Matrix

| Package | Exports Audited | RN Compatibility | Integration Strategy in `apps/mobile` |
|---|---|---|---|
| `@stone/types` | `USER_ROLES`, `ACCOUNT_STATUSES`, `BUSINESS_TYPES`, `VERIFICATION_STATUSES`, `PRODUCT_STATUSES`, `PRICE_TYPES`, `ENQUIRY_STATUSES`, `QUOTATION_STATUSES`, `ORDER_STATUSES`, `PAYMENT_STATUSES`, `ADDRESS_TYPES`, `MESSAGE_SENDER_ROLES`, `MESSAGE_TYPES`, `NOTIFICATION_TYPES`, `CHAT_ATTACHMENT_MIMES`, currency/locale defaults | **100% Compatible** | Direct workspace import |
| `@stone/utils` | `slugify`, `toMinor`, `fromMinor`, `formatMoney`, `calculateQuoteTotals`, `parsePagination`, file signature helpers | **100% Compatible** | Direct workspace import |
| `@stone/validation` | `loginSchema`, `registerSchema`, `passwordSchema`, `buyerProfileSchema`, `rfqFormSchema`, `buyerEnquiryTransitionSchema`, `buyerQuotationDecisionSchema`, `buyerAddressSchema`, `buyerQuotationAcceptanceSchema`, `orderStatusTransitionSchema`, `sellerProfileSchema`, `storeSettingsSchema`, `productFormSchema`, `quotationFormSchema`, `startConversationSchema`, `sendMessageSchema`, `resolvePublicSupabaseUrl`, `resolvePublicSupabaseAnonKey` | **100% Compatible** | Direct workspace import (`zod ^3.24.1`) |
| `@stone/database` | Root `.` exports `type { Database, Json }`. Subpaths `./server`, `./admin`, `./pg` import `server-only`, `@supabase/ssr`, `pg` | **Types Only** (`import type { Database, Json } from "@stone/database"`) | Never import `./server`, `./admin`, `./pg`, or `./browser` in RN; Metro blocks `server-only`, `pg`, `next/*` |
| `@stone/auth` | Root `.` exports `AppRole`, `AuthUserIdentity`, `SessionValidationResult`. Subpath `./server` imports `server-only` + `next/headers` | **Types Only** (`import type { AppRole } from "@stone/auth"`) | Created dedicated RN auth store + chunked `expo-secure-store` Supabase adapter |
| `@stone/ui` | Web Tailwind / Next.js UI primitives | **Web Only** | Not imported in RN; dedicated Nature Luxe native UI kit created in `apps/mobile/src/components/` |

---

## 3. Supabase Backend Schema, RLS & RPC Audit

Active hosted project: `https://rgmasamasslqintssyrh.supabase.co`

### Core Tables & Views Used by Mobile
- **Identity & Roles:** `profiles`, `user_roles` (`buyer`, `seller`, `admin`, `super_admin`)
- **Suppliers & KYC:** `seller_profiles`, `public_seller_profiles` (view of verified sellers), `seller_verification_documents`
- **Catalogue:** `categories` (hierarchical via `parent_id`), `products`, `product_images`, `product_specifications`, `product_favourites`
- **Enquiries & Lead Routing:** `enquiries`, `enquiry_status_history`, `lead_assignments`, `search_leads`
- **Quotations:** `quotations`, `quotation_items`
- **Orders & Addresses (Payment Model B):** `orders`, `order_items`, `order_status_history`, `buyer_addresses`
- **Messaging & Notifications:** `conversations`, `messages`, `notifications`
- **Subscriptions & Entitlements:** `subscription_plans`, `seller_subscriptions`, `subscription_events`, `seller_lead_usage`

### Client-Callable `SECURITY DEFINER` RPCs
- `transition_enquiry_status(_enquiry_id, _new_status, _notes)`
- `accept_quotation_and_create_order(_quotation_id, _billing_address, _shipping_address, _same_as_billing, _notes)`
- `transition_order_status(_order_id, _new_status, _notes)`
- `set_default_buyer_address(_address_id)`
- `get_or_create_conversation(_seller_id, _enquiry_id, _product_id, _subject)`
- `mark_conversation_read(_conversation_id)`
- `set_conversation_archived(_conversation_id, _archived)`
- `submit_seller_verification()`
- `get_seller_subscription_entitlements(_seller_id)`
- `grant_self_role(_role)` (strictly constrained to `'buyer'` / `'seller'` on server)

### Storage Buckets & Path Conventions
- Public CDN Buckets:
  - `product-images`: `<seller_id>/<product_id>/<file>` (5 MB max, jpg/png/webp)
  - `seller-logos`: `<seller_id>/<file>` (2 MB max, jpg/png/webp)
  - `seller-cover-images`: `<seller_id>/<file>` (5 MB max, jpg/png/webp)
  - `category-images`: `<file>` (admin managed)
- Private Signed-URL Buckets:
  - `seller-verification-documents`: `<seller_id>/<file>` (10 MB max, pdf/jpg/png; owner or admin read via `createSignedUrl`)
  - `enquiry-attachments`: `<enquiry_id>/<file>` (10 MB max, pdf/jpg/png/webp; enquiry participants only)
  - `message-attachments`: `<conversation_id>/<file>` (10 MB max, pdf/jpg/png/webp; conversation participants only)

### Critical DB Constraints Observed
1. **`public.quotations` INSERT grant:** Column-level grants forbid supplying `status` or `quote_number` on INSERT. Rows must be inserted as default `'draft'` and subsequently `.update({ status: 'sent' })` when sending immediately.
2. **`public.profiles` UPDATE grant:** Only `(full_name, phone, avatar_url, country, state, city, address)` are updatable by authenticated users (`email`, `account_status`, and roles are protected).
3. **`public.orders` Immutability Guard (`orders_immutability_guard`):** Pricing, snapshots, addresses, and `payment_status` are strictly immutable to client roles. Buyers may only transition `pending_payment -> cancelled` and `dispatched -> delivered`; sellers may only transition `confirmed -> processing -> dispatched`.

---

## 4. Authentication & Payment Model B Audit

### Authentication Findings
- Hosted Supabase `/auth/v1/settings` returns `email: true`, `phone: false`, `mailer_autoconfirm: true`, `disable_signup: false`.
- Web `apps/marketplace/app/api/auth/mobile/route.ts` is a local demo stub (hardcoded OTP `1234` logging into a demo buyer account) and is **excluded** from the production mobile app.
- `apps/mobile` integrates directly with Supabase Auth (`signInWithPassword`, `signUp` passing `{ full_name, account_type }`, `resetPasswordForEmail`, `verifyOtp` for email OTP/recovery), persisting tokens safely across chunks in `expo-secure-store`, and clearly discloses that Phone SMS OTP awaits backend SMS provider activation.

### Payment Model B Governance (`docs/payment-architecture-decision.md`)
- Confirmed architecture: **Buyer → StonesDekho Platform Escrow (RBI-authorized Payment Aggregator) → Verified Seller Settlement**.
- Mobile client keeps `order.status` and `order.payment_status` strictly separate, displays server-side verification notices, never simulates online payments, and never lets buyers or sellers mutate `payment_status`.
