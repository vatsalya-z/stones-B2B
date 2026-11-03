# Phase 6A Audit Report — Messaging, Real-Time Notifications & Communication System

**Project:** StoneB2B Marketplace Monorepo  
**Phase:** Phase 6A — Repository, Database, Realtime & Storage Audit  
**Date:** 2026-10-31  
**Status:** Audit Complete (Ready for Phase 6B–6J Implementation)

---

## 1. Executive Summary

A full inspection of the StoneB2B monorepo (`apps/web`, `apps/worker`, `packages/*`, `supabase/migrations/*`, and `docs/*`) confirms that Phases 1–5 provide a mature, strictly typed foundation with row-level security (RLS), column-level grants, `SECURITY DEFINER` state machines, magic-byte file signature validation, and an in-process PostgreSQL test harness (PGlite) running 211 passing tests.

However, **no conversation or messaging system currently exists**, **event-driven notification producers are not yet wired**, and **Supabase Realtime subscriptions are not yet configured in the schema or frontend**. Specifically:

1. **Conversation System:** Does **not** exist yet (`0` conversation/message tables, `0` messaging routes, `0` messaging components).
2. **Notifications Infrastructure:** `public.notifications` **already exists** (`20261030100400_notifications.sql`) and already includes `'message_received'` in its `notification_type` constraint, plus `/buyer/notifications` exists in the Buyer Portal. However, **no database triggers or server actions currently insert notification rows**, and the Seller Portal lacks `/seller/notifications` and a header notification indicator.
3. **Supabase Realtime:** `@stone/database/browser` (`createBrowserClient`) and `@supabase/supabase-js` (`^2.47.10`) are already installed, so **no new npm dependencies are required**. However, no tables are registered in the `supabase_realtime` publication yet, and no client subscription hooks exist.
4. **Chat Attachment Storage:** Private bucket infrastructure and magic-byte validation (`validateUploadBytes` in `@stone/utils`) exist for `enquiry-attachments` (`<enquiry_id>/<file>`), which should **not** be overloaded for chat messages (conversations may exist without an `enquiry_id`). A dedicated private `message-attachments` bucket (`<conversation_id>/<file>`, 10 MB, `PDF/JPEG/PNG/WebP`) is required to preserve strict path-based RLS isolation.

---

## 2. Repository & Package Structure Inventory

### Monorepo Scripts (`package.json` + `turbo.json`)
- `pnpm lint` -> `turbo run lint` (ESLint 9 across 8 packages)
- `pnpm typecheck` -> `turbo run typecheck` (`tsc --noEmit` across 8 packages)
- `pnpm test` -> `turbo run test` (Vitest 2.1 across `@stone/database`, `@stone/web`, `@stone/validation`, `@stone/utils`, `@stone/email`, `@stone/worker`)
- `pnpm build` -> `turbo run build` (`next build` in `@stone/web` + `tsc -p tsconfig.build.json` in `@stone/worker`)

### Relevant Workspace Packages & Apps
| Package / App | Existing Reusable Capabilities | Phase 6 Relevance |
| :--- | :--- | :--- |
| `@stone/database` | `./browser` (`createBrowserClient`), `./server` (`createServerClient`), `./admin` (`createAdminClient` with `server-only`), `database.types.ts`, PGlite test harness (`tools/pglite.ts`) | Browser client powers RLS-enforced Realtime subscriptions; PGlite tests verify new SQL migrations, triggers, RPCs, and RLS policies. |
| `@stone/types` | Shared const enums (`USER_ROLES`, `ENQUIRY_STATUSES`, `QUOTATION_STATUSES`, etc.) | Extend with `MESSAGE_TYPES` and `NOTIFICATION_TYPES` const tuples. |
| `@stone/validation` | Shared Zod schemas (`auth.ts`, `seller.ts`, `buyer.ts`, `env.ts`) | Add `messaging.ts` (`startConversationSchema`, `sendMessageSchema`, `conversationListFilterSchema`, `messagePaginationSchema`, `archiveConversationSchema`). |
| `@stone/utils` | `validateUploadBytes` (magic-byte sniffing for `PDF/JPEG/PNG/WebP`), `parsePagination`, `slugify`, `money` | Reuse `validateUploadBytes` directly for chat attachment upload security. |
| `@stone/ui` | `Button`, `Badge`, `Card`, `EmptyState`, `ErrorState`, `Breadcrumb`, `SectionHeading`, `VerifiedBadge`, `cn` | Reuse directly to preserve approved warm-stone (`stone-50`/`stone-900`/`amber-600`) visual design language. |
| `@stone/email` & `@stone/worker` | Provider-agnostic `EmailProvider` (`createResendProvider` via REST + `createConsoleProvider` dev fallback; zero external paid SDK required) | Reuse optional non-blocking email dispatch helper when `RESEND_API_KEY` + `EMAIL_FROM` are configured, defaulting safely to console/no-op. |
| `@stone/web` | Next.js 15 App Router, `middleware.ts`, `lib/auth.ts` (`getCurrentUser`, `requireBuyer`, `requireSeller`, `hasRole`), `BuyerShell`, `SellerShell`, buyer & seller portals | Host `/buyer/messages`, `/buyer/messages/[conversationId]`, `/seller/messages`, `/seller/messages/[conversationId]`, `/seller/notifications`, and secure attachment/message APIs & Server Actions. |

---

## 3. Existing Database, RLS, Notifications & Storage Audit

### 3.1 Existing Migrations (`supabase/migrations/`)
Currently 6 migrations exist creating **15 base tables** and **1 security view**:
1. `20261030100000_foundation_identity.sql`: `profiles`, `user_roles`, `admin_audit_logs`, `current_account_active()`, `has_role()`, `is_admin()`, `is_super_admin()`, `prevent_mutation()`, `set_updated_at()`.
2. `20261030100100_sellers.sql`: `seller_profiles`, `seller_verification_documents`, `public_seller_profiles` (view of `verification_status = 'verified'` sellers excluding private GST/email/phone/address), `is_seller_owner()`, `is_seller_verified()`.
3. `20261030100200_catalogue.sql`: `categories`, `products`, `product_images`, `product_specifications`, `product_favourites`, `is_product_public()`, `is_product_owner()`.
4. `20261030100300_commerce.sql`: `enquiries`, `enquiry_status_history`, `quotations`, `quotation_items`, `can_access_enquiry()`, `product_matches_seller()`, `seller_can_see_buyer()`, `transition_enquiry_status()`, `quotations_guard()`, `quotations_after_change()`.
5. `20261030100400_notifications.sql`: `notifications`.
6. `20261030100500_storage.sql`: 6 storage buckets (`product-images`, `seller-logos`, `seller-cover-images`, `category-images`, `seller-verification-documents`, `enquiry-attachments`) + `storage_first_folder_uuid()`.

### 3.2 Critical Database Findings & Gaps

1. **No Messaging Tables Exist:**
   - Neither `conversations` nor `messages` (nor read-tracking columns/tables) exist in `supabase/migrations/` or `database.types.ts`.
   - A new migration (`supabase/migrations/20261031100600_messaging_and_notifications.sql`) is genuinely necessary.

2. **`public.notifications` Exists — Producers Are Missing:**
   - Schema (`20261030100400_notifications.sql`):
     - `notification_type` allows: `'enquiry_received'`, `'enquiry_viewed'`, `'quotation_received'`, `'quotation_accepted'`, `'quotation_rejected'`, `'message_received'`, `'seller_verification'`, `'product_moderation'`, `'account_status'`, `'system'`.
     - Grants: `authenticated` has `SELECT`, `DELETE`, and `UPDATE (is_read)` **only** (`INSERT` is revoked from clients so users can never spoof notifications).
   - **Gap:** Zero triggers or server services currently insert rows into `public.notifications`. When an enquiry is created, status changes, a quotation is sent/accepted/rejected, or a message is sent, no notification rows are emitted yet.

3. **Seller-to-Buyer Profile Visibility (`public.seller_can_see_buyer`):**
   - In `20261030100300_commerce.sql`, policy `profiles_select_enquiry_buyer` allows sellers to read a buyer's `profiles` row **only** if an `enquiries` row links them (`seller_can_see_buyer`).
   - **Gap:** If a buyer starts a direct product or supplier conversation with a verified seller *before* creating a formal `enquiries` row (`enquiry_id IS NULL`), the seller would not see the buyer's name/location unless `seller_can_see_buyer` (or a companion policy `profiles_select_conversation_buyer`) also authorizes sellers who share a `conversations` row with that buyer.

4. **Dual-Role Account Disambiguation (`buyer` + `seller` on Same User):**
   - StoneB2B explicitly supports users holding both `buyer` and `seller` roles (`grant_self_role`).
   - Self-messaging must be blocked at the database level (`not public.is_seller_owner(seller_id)` on `conversations`, matching `enquiries_insert_buyer`).
   - Each message must record `sender_role text check (sender_role in ('buyer', 'seller'))` verified against the conversation (`sender_id = c.buyer_id` when `'buyer'`; `is_seller_owner(c.seller_id)` when `'seller'`), and Buyer Portal queries (`/buyer/messages`) must strictly filter `conversations.buyer_id = user.id` while Seller Portal queries (`/seller/messages`) strictly filter `conversations.seller_id = sellerProfile.id`. This guarantees role switching never mixes or leaks inbox threads.

5. **Existing Schema Test Coupling (`packages/database/tests/schema.test.ts`):**
   - Line 14 of `packages/database/tests/schema.test.ts` checks `select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'` and currently expects `15`.
   - Adding `public.conversations` and `public.messages` increases the base table count from `15` to `17` (or `18` if a separate rate-limit/outbox table were added; keeping read/archive state directly on `conversations` keeps the footprint minimal at `17` tables). Updating that schema inventory assertion (or noting it during review) must be handled cleanly without touching any Phase 1–5 functional behavior.

---

## 4. Proposed Phase 6 Architecture & Technical Design

### 4.1 Database Schema (`supabase/migrations/20261031100600_messaging_and_notifications.sql`)

Following Phase 2 conventions (`UUID` PKs, `ON DELETE RESTRICT` on commercial records, `set search_path = ''` on all functions, `REVOKE ALL` followed by minimal column grants, strict RLS):

#### Table 1: `public.conversations`
Represents a 2-party commercial communication thread between one Buyer (`profiles.id`) and one Verified Seller (`seller_profiles.id`), optionally tied to an Enquiry/RFQ and/or Product.

| Column | Type | Constraints | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK `default gen_random_uuid()` | Conversation ID |
| `buyer_id` | `uuid` | `NOT NULL references public.profiles(id) on delete restrict` | Buyer participant |
| `seller_id` | `uuid` | `NOT NULL references public.seller_profiles(id) on delete restrict` | Seller participant |
| `enquiry_id` | `uuid` | `NULL references public.enquiries(id) on delete restrict` | Linked Enquiry / RFQ (optional) |
| `product_id` | `uuid` | `NULL references public.products(id) on delete restrict` | Linked Product context (optional) |
| `subject` | `text` | `NOT NULL check (char_length(trim(subject)) between 1 and 200)` | Thread title / stone requirement subject |
| `last_message_id` | `uuid` | `NULL` | Pointer to latest `messages.id` |
| `last_message_preview` | `text` | `NULL check (char_length(last_message_preview) <= 300)` | Denormalized preview avoiding N+1 inbox queries |
| `last_message_sender_id` | `uuid` | `NULL references public.profiles(id) on delete restrict` | Latest sender for "You:" / unread indicators |
| `last_message_at` | `timestamptz` | `NOT NULL default now()` | Inbox sort key |
| `buyer_last_read_at` | `timestamptz` | `NULL` | Buyer read-receipt watermark |
| `seller_last_read_at` | `timestamptz` | `NULL` | Seller read-receipt watermark |
| `buyer_unread_count` | `integer` | `NOT NULL default 0 check (buyer_unread_count >= 0)` | O(1) unread counter for Buyer |
| `seller_unread_count` | `integer` | `NOT NULL default 0 check (seller_unread_count >= 0)` | O(1) unread counter for Seller |
| `buyer_archived_at` | `timestamptz` | `NULL` | Buyer-side inbox archive timestamp |
| `seller_archived_at` | `timestamptz` | `NULL` | Seller-side inbox archive timestamp |
| `created_at` | `timestamptz` | `NOT NULL default now()` | Created timestamp |
| `updated_at` | `timestamptz` | `NOT NULL default now()` | Updated timestamp |

**Context Deduplication (Partial Unique Indexes):**
- `conversations_unique_enquiry_idx`: `UNIQUE (enquiry_id) WHERE enquiry_id IS NOT NULL` (one canonical thread per enquiry/RFQ).
- `conversations_unique_product_idx`: `UNIQUE (buyer_id, seller_id, product_id) WHERE enquiry_id IS NULL AND product_id IS NOT NULL` (one canonical direct product thread per buyer + seller + product).
- `conversations_unique_general_idx`: `UNIQUE (buyer_id, seller_id) WHERE enquiry_id IS NULL AND product_id IS NULL` (one general direct supplier thread per buyer + seller).

**Performance Indexes:**
- `conversations_buyer_inbox_idx`: `(buyer_id, last_message_at desc)`
- `conversations_seller_inbox_idx`: `(seller_id, last_message_at desc)`
- `conversations_buyer_unread_idx`: `(buyer_id) WHERE buyer_unread_count > 0 AND buyer_archived_at IS NULL`
- `conversations_seller_unread_idx`: `(seller_id) WHERE seller_unread_count > 0 AND seller_archived_at IS NULL`

#### Table 2: `public.messages`
Append-only message ledger inside a conversation.

| Column | Type | Constraints | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK `default gen_random_uuid()` | Message ID |
| `conversation_id` | `uuid` | `NOT NULL references public.conversations(id) on delete restrict` | Parent thread |
| `sender_id` | `uuid` | `NOT NULL references public.profiles(id) on delete restrict` | Author `profiles.id` |
| `sender_role` | `text` | `NOT NULL check (sender_role in ('buyer', 'seller'))` | Participant role in this conversation |
| `message_type` | `text` | `NOT NULL default 'text' check (message_type in ('text', 'attachment', 'system'))` | Message kind |
| `body` | `text` | `NOT NULL default '' check (char_length(body) <= 4000)` | Text content |
| `attachment_path` | `text` | `NULL check (attachment_path is null or attachment_path like conversation_id::text || '/%')` | Private storage path in `message-attachments` |
| `attachment_name` | `text` | `NULL check (attachment_name is null or char_length(attachment_name) <= 255)` | Sanitized display filename |
| `attachment_mime` | `text` | `NULL check (attachment_mime is null or attachment_mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'))` | Verified MIME type |
| `attachment_size` | `integer` | `NULL check (attachment_size is null or (attachment_size > 0 and attachment_size <= 10485760))` | File size in bytes (`<= 10 MB`) |
| `client_message_id` | `uuid` | `NULL` | Client idempotency UUID |
| `created_at` | `timestamptz` | `NOT NULL default now()` | Server message timestamp |

**Constraints & Indexes:**
- `messages_content_Or_attachment_chk`: `check (char_length(trim(body)) > 0 or attachment_path is not null)`
- `messages_attachment_completeness_chk`: `check ((attachment_path is null and attachment_mime is null and attachment_size is null) or (attachment_path is not null and attachment_mime is not null and attachment_size is not null))`
- `messages_idempotency_key`: `UNIQUE (conversation_id, sender_id, client_message_id)`
- `messages_conversation_cursor_idx`: `(conversation_id, created_at desc, id desc)` (supports fast cursor-based backward pagination without `OFFSET` degradation)
- Immutability trigger: `messages_immutable` (`BEFORE UPDATE OR DELETE EXECUTE FUNCTION public.prevent_mutation()`).

### 4.2 RLS Policies, Helper Functions & Abuse Protection

1. **`public.can_access_conversation(_conversation_id uuid)` (`SECURITY DEFINER`, `set search_path = ''`):**
   - Returns `true` iff `current_account_active()` and `exists (select 1 from public.conversations c where c.id = _conversation_id and (c.buyer_id = auth.uid() or public.is_seller_owner(c.seller_id) or public.is_admin()))`.
   - Note: If `is_admin()` accesses messaging via any future admin moderation tool, audit logging via `_write_audit_log` applies; Phase 6 exposes UI strictly to the owning Buyer and owning Seller.
2. **Conversation Creation RPC (`public.get_or_create_conversation(_seller_id uuid, _enquiry_id uuid default null, _product_id uuid default null, _subject text default null)`):**
   - Enforces `auth.uid() is not null`, `current_account_active()`, and `has_role('buyer')` (or allows an owning seller to open a conversation on **an existing enquiry** belonging to that seller!).
   - Verifies `is_seller_verified(_seller_id)` (for new non-enquiry threads so unverified/draft sellers cannot be contacted arbitrarily), `not is_seller_owner(_seller_id)` (prevents self-chat), enquiry ownership consistency (`e.buyer_id` & `e.seller_id`), and product-seller consistency (`product_matches_seller`).
   - Atomically returns the existing conversation ID if a matching thread already exists (`ON CONFLICT` / `SELECT ... FOR UPDATE`), preventing race-condition duplicates!
3. **Message Insertion & Rate-Limiting Guard (`messages_before_insert_guard` + RLS `messages_insert_participant`):**
   - Verifies `sender_id = auth.uid()`, `current_account_active()`, and exact `sender_role` match (`sender_role = 'buyer' AND c.buyer_id = auth.uid()` OR `sender_role = 'seller' AND public.is_seller_owner(c.seller_id)`).
   - **Database-Enforced Rate Limit:** Rejects insert with `SQLSTATE 42501` (`rate limit exceeded`) if `sender_id` has sent `>= 20` messages in the last `60 seconds` or `>= 5` new conversations in `60 seconds` — protecting against scripted flooding even if an attacker calls PostgREST directly!
   - **After-Insert Trigger (`messages_after_insert_trg`):**
     - Atomically updates `conversations`: sets `last_message_id`, `last_message_preview`, `last_message_sender_id`, `last_message_at = new.created_at`, unarchives the conversation for both participants (`buyer_archived_at = null, seller_archived_at = null`) so new replies always surface in the inbox, updates sender's `*_last_read_at = new.created_at`, and increments the **recipient's** `*_unread_count = *_unread_count + 1`.
4. **Read Receipt & Archive RPCs (`public.mark_conversation_read(_conversation_id uuid)` & `public.set_conversation_archived(_conversation_id uuid, _archived boolean)`):**
   - Clients have **no direct `UPDATE` or `DELETE` grant** on `conversations` or `messages`.
   - `mark_conversation_read` resets only the caller's unread counter (`buyer_unread_count = 0, buyer_last_read_at = now()` or `seller_unread_count = 0, seller_last_read_at = now()`) and also marks related unread `'message_received'` notifications for `_conversation_id` as `is_read = true`.
   - `set_conversation_archived` sets or clears only the caller's `buyer_archived_at` or `seller_archived_at`.

### 4.3 Secure Real-Time Architecture (Phase 6C)

1. **Publication Setup (Migration-Safe for Both Supabase & PGlite):**
   - Guarded `DO $$ ... $$` block adds `public.messages`, `public.conversations`, and `public.notifications` to `supabase_realtime` publication if `pg_publication` contains `supabase_realtime`.
2. **RLS-Authorized `postgres_changes` Subscriptions (Zero Public Broadcasts):**
   - Authenticated browser client (`createClient()` from `@stone/database/browser`) subscribes only when mounted:
     - Active thread view: `postgres_changes` on `public.messages` (`event: 'INSERT'`, `filter: conversation_id=eq.<id>`) + `public.conversations` (`event: 'UPDATE'`, `filter: id=eq.<id>`) for live incoming messages and live read-receipt watermark updates!
     - Inbox & Shell badge indicator: `postgres_changes` on `public.notifications` (`event: 'INSERT'`, `filter: user_id=eq.<uid>`) and `public.conversations` (`filter: buyer_id=eq.<uid>` or `filter: seller_id=eq.<sellerId>`).
   - Private messages are **never** pushed over public Realtime `broadcast` channels. Supabase Realtime checks PostgreSQL `SELECT` RLS policies against the user's JWT before emitting any row event.
3. **Reliability, Deduplication & Reconnection:**
   - Maintain a client `Map<string, MessageItem>` keyed by `id` and secondary lookup by `client_message_id` so optimistic messages reconcile seamlessly with the server response / Realtime `INSERT` event without duplicate bubbles.
   - Track channel status (`SUBSCRIBED`, `TIMED_OUT`, `CHANNEL_ERROR`, `CLOSED`) to display a subtle connection badge ("Live" / "Reconnecting...") and automatically fetch missed messages since `latestMessageCreatedAt` on reconnect or `visibilitychange`, plus clean `supabase.removeChannel(channel)` teardown on unmount.

### 4.4 Private Chat Attachments (Phase 6D)

- **Dedicated Bucket:** `message-attachments` (`public = false`, `file_size_limit = 10485760` [10 MB], `allowed_mime_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']`).
- **Storage RLS Policies on `storage.objects`:**
  - `SELECT` & `INSERT` restricted to `authenticated` where `bucket_id = 'message-attachments'`, `public.can_access_conversation(public.storage_first_folder_uuid(name))`, and extension in `('pdf', 'jpg', 'jpeg', 'png', 'webp')`. No `UPDATE`/`DELETE` (immutable commercial record).
- **Upload & Signed-URL Route Handlers:**
  - `POST /api/messages/[conversationId]/attachments`:
    1. Authenticates user via `getCurrentUser()`.
    2. Verifies conversation participation (`buyer_id === user.id` or `sellerProfile.id === conversation.seller_id`) **before** reading file bytes.
    3. Enforces `<= 10 MB` and validates real binary file signatures via `validateUploadBytes` (`@stone/utils`), rejecting spoofed MIME/extensions.
    4. Uploads to `${conversationId}/${timestamp}-${uuid8}-${safeName}.${ext}` and returns metadata + short-lived 15-minute (`900s`) signed URL.
  - `GET /api/messages/[conversationId]/attachments/signed-url?path=...`:
    1. Verifies session + conversation participation + `path.startsWith(`${conversationId}/`)`.
    2. Generates a fresh short-lived (`300s`–`900s`) signed URL on demand so expired previews/downloads in long-lived chat sessions can be refreshed securely without ever exposing permanent URLs.

### 4.5 Event-Driven Notifications (Phase 6F)

Reuse `public.notifications` with transactional PostgreSQL triggers calling internal `SECURITY DEFINER` helper `public._emit_notification(_user_id, _title, _message, _type, _reference_id, _dedupe_seconds)`:

| Event | Trigger Source | Recipient | `notification_type` | `reference_id` | Target Navigation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 & 2. Buyer sends new enquiry / Seller receives enquiry | `AFTER INSERT ON public.enquiries` | Seller (`seller_profiles.user_id`) + Buyer confirmation (`'system'`) | `'enquiry_received'` (Seller), `'system'` (Buyer) | `enquiries.id` | Seller -> `/seller/enquiries/[id]`, Buyer -> `/buyer/enquiries/[id]` |
| 3 & 4. Buyer or Seller sends chat message | `AFTER INSERT ON public.messages` | Counterparty (`seller_user_id` or `buyer_id`) | `'message_received'` | `conversations.id` | `/seller/messages/[id]` or `/buyer/messages/[id]` |
| 5 & 6. Seller sends (or revises) quotation | `AFTER UPDATE ON public.quotations` (`status -> 'sent'`) | Buyer (`quotations.buyer_id`) | `'quotation_received'` | `quotations.id` | `/buyer/quotes/[id]` |
| 7. Buyer accepts quotation | `AFTER UPDATE ON public.quotations` (`status -> 'accepted'`) | Seller (`seller_profiles.user_id`) | `'quotation_accepted'` | `quotations.id` | `/seller/quotes/[id]` |
| 8. Buyer rejects quotation | `AFTER UPDATE ON public.quotations` (`status -> 'rejected'`) | Seller (`seller_profiles.user_id`) | `'quotation_rejected'` | `quotations.id` | `/seller/quotes/[id]` |
| 9. Enquiry status changes (`viewed`, `responding`, `rejected`, `cancelled`, `closed`) | `AFTER INSERT ON public.enquiry_status_history` (excluding initial `'submitted'` and quote-driven `'quoted'`/`'accepted'` to prevent double-notifying!) | Counterparty | `'enquiry_viewed'` (when `viewed`/`responding`) or `'system'` | `enquiries.id` | `/buyer/enquiries/[id]` or `/seller/enquiries/[id]` |
| 10. Seller verification / Product moderation | `AFTER UPDATE ON seller_profiles` / `products` | Seller (`seller_profiles.user_id`) | `'seller_verification'` / `'product_moderation'` | `seller.id` / `product.id` | `/seller/verification` / `/seller/products` |

**Deduplication Guarantee:**
- `_emit_notification` checks for an identical `(user_id, notification_type, reference_id, title)` created within a configurable deduplication window (e.g., `5 seconds` for state transitions) AND skips self-notifications (`_user_id = auth.uid()` except explicit buyer enquiry submission confirmation if desired, or strictly counterparty-only so users aren't spammed by their own clicks — note: for Event 1 & 2, notifying the Seller with `'enquiry_received'` and recording the Buyer's confirmation cleanly without cluttering unread badges, or notifying both distinctly, will be verified in tests).

### 4.6 Conversation UI & Routes (Phase 6E)

Preserving the approved StoneB2B warm-stone palette (`bg-stone-50`, `border-stone-200`, `text-stone-900`, `amber-600` accents) and responsive shell layouts:

- **Buyer Routes:**
  - `/buyer/messages` — Split-pane desktop inbox / mobile thread list with debounced search, Active / Archived filter tabs, unread badges, last-message preview, and related product/enquiry chips.
  - `/buyer/messages/[conversationId]` — Paginated message thread ("Load older messages" cursor pagination), sticky context bar (Supplier verification badge, linked Enquiry/RFQ & Quotation status, or linked Product card), drag-and-drop / button attachment uploader with progress & retry, optimistic message composer with rollback on failure, and live "Read" receipts.
- **Seller Routes:**
  - `/seller/messages` — Seller conversation inbox scoped strictly to `sellerProfile.id`, displaying Buyer name/company/location, related Product/Enquiry context, unread counts, search, and archive toggle.
  - `/seller/messages/[conversationId]` — Seller conversation detail with Buyer summary card, quick action to "Create Quotation" (when linked to an open enquiry), attachment sharing, and live read receipts.
  - `/seller/notifications` — Seller notifications inbox (matching `/buyer/notifications`) with All / Unread filter, deep-link routing (`message_received` -> `/seller/messages/[id]`, `enquiry_received` -> `/seller/enquiries/[id]`, `quotation_accepted`/`quotation_rejected` -> `/seller/quotes/[id]`), and Mark Read / Mark All Read actions.
- **Contextual "Message Supplier / Message Buyer" Entry Points:**
  - Product Detail (`/products/[slug]`) & Supplier Storefront (`/suppliers/[slug]`): "Message Supplier" button (authenticates buyer via `?next=` if anonymous, calls `startOrOpenConversationAction`, and routes to `/buyer/messages/[conversationId]`).
  - Buyer Enquiry / RFQ / Quotation Detail (`/buyer/enquiries/[id]`, `/buyer/rfqs/[id]`, `/buyer/quotes/[id]`): "Message Supplier about this Enquiry/Quote" button linking the conversation directly to `enquiry_id`.
  - Seller Enquiry / Quotation Detail (`/seller/enquiries/[id]`, `/seller/quotes/[id]`): "Message Buyer" button opening the enquiry-linked conversation in `/seller/messages/[conversationId]`.
  - `BuyerShell` & `SellerShell`: Add **Messages** nav item with unread conversation/message badge count, plus notification bell indicator in `SellerShell`.

---

## 5. Risks, Constraints & Mitigations

| Risk / Constraint | Impact | Mitigation |
| :--- | :--- | :--- |
| **Live Supabase Project in `.env.local`** | Local `supabase/migrations/20261031100600_*.sql` runs automatically in PGlite tests, but **must not** be pushed to production without explicit user approval (Rule 10 & Section 14). | Keep migration strictly in version-controlled `supabase/migrations/`; never execute `supabase db push` or modify remote schema without explicit approval. Handle missing remote table gracefully in UI error states with clear setup instructions if remote DB hasn't run Migration 7 yet. |
| **Private Attachment URL Expiry in Open Chat Tabs** | A 15-minute signed URL expires if a user keeps a chat tab open for 30 minutes. | Store only `attachment_path` in `public.messages` and resolve short-lived signed URLs via server query + on-demand `/api/messages/[conversationId]/attachments/signed-url` refresh endpoint. |
| **Dual-Role User Context Confusion** | A user with both `buyer` and `seller` roles could confuse which persona is viewing/sending messages. | `/buyer/messages/*` authorizes `buyer_id = user.id` and sends `sender_role = 'buyer'`; `/seller/messages/*` authorizes `seller_id = sellerProfile.id` and sends `sender_role = 'seller'`; self-conversations (`buyer_id` owning `seller_id`) are blocked by RLS & RPC. |
| **N+1 Queries on Inbox & Message History** | Fetching seller/buyer/product/enquiry per row degrades inbox performance. | Denormalize `last_message_preview`, `last_message_at`, and `*_unread_count` onto `conversations`, batch-load participant & enquiry/product summaries via `.in("id", uniqueIds)`, and paginate messages (`pageSize = 30`) via `(conversation_id, created_at desc, id desc)` index. |

---

## 6. Step-by-Step Implementation Plan (Phases 6B – 6J)

1. **Step 1 (Phase 6B, 6D, 6F — Database Migration & Types):**
   - Author `supabase/migrations/20261031100600_messaging_and_notifications.sql` (`conversations`, `messages`, `message-attachments` bucket + storage RLS, `can_access_conversation`, `get_or_create_conversation`, `mark_conversation_read`, `set_conversation_archived`, rate-limiting guard, `seller_can_see_buyer` extension, transactional notification triggers, and guarded `supabase_realtime` publication).
   - Update `packages/database/src/database.types.ts` and `packages/types/src/index.ts`.
2. **Step 2 (Phase 6G & 6H — Validation Schemas & Server Services):**
   - Create `packages/validation/src/messaging.ts` and unit tests (`packages/validation/tests/messaging.test.ts`).
   - Build server-only messaging queries & actions (`apps/web/features/messaging/queries.ts`, `apps/web/features/messaging/actions.ts`) and secure attachment Route Handlers (`apps/web/app/api/messages/[conversationId]/attachments/route.ts` & `signed-url/route.ts`).
3. **Step 3 (Phase 6C & 6E — Realtime Hook, Shared Messaging UI, Buyer & Seller Portals):**
   - Implement `useRealtimeConversation` & `useRealtimeInbox` client hooks using `@stone/database/browser` with deduplication, reconnection resync, and unmount cleanup.
   - Build responsive inbox & chat workspace components (`apps/web/components/messaging/*`).
   - Create `/buyer/messages`, `/buyer/messages/[conversationId]`, `/seller/messages`, `/seller/messages/[conversationId]`, and `/seller/notifications`.
   - Wire `BuyerShell`, `SellerShell`, Product/Supplier pages, and Buyer/Seller Enquiry & Quote detail pages.
4. **Step 4 (Phase 6I & 6J — Comprehensive Testing, Quality Gates & Final Report):**
   - Add PGlite PostgreSQL + RLS + trigger tests (`packages/database/tests/phase6-messaging-notifications.test.ts`) and web unit/API/Realtime deduplication tests (`apps/web/tests/messaging.test.ts`).
   - Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` until all pass with `0` errors.
   - Write `docs/phase-6-report.md` covering all 15 required sections.

