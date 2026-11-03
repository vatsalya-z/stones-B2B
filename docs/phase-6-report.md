# Phase 6 Report: Messaging, Real-Time Notifications & Communication System

**Project:** StoneB2B Natural Stone Marketplace Monorepo  
**Phase Completed:** Phase 6 — Buyer–Seller Messaging, Real-Time Communication & Transactional Notifications  
**Status:** ✅ Complete, Verified & Production-Ready  
**Quality Gates:** All 4 gates passing with zero errors (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`)  
**Database Migration:** [`supabase/migrations/20261031100600_messaging_and_notifications.sql`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/supabase/migrations/20261031100600_messaging_and_notifications.sql)

---

## 1. Executive Summary & Audit Findings

Following the pre-implementation audit documented in [`docs/phase-6-audit.md`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/docs/phase-6-audit.md), Phase 6 introduces an institutional-grade, real-time communication system for natural stone procurement across India.

### Key Audit Discoveries
1. **Existing Base:** Phases 1–5 established robust foundation tables (`profiles`, `user_roles`, `seller_profiles`, `products`, `enquiries`, `quotations`, `notifications`), storage buckets, and server authorization helpers (`requireBuyer`, `requireSeller`, `getBuyerContext`, `getSellerContext`).
2. **Missing Messaging Engine:** No prior tables existed for buyer–seller conversations, message history, chat attachments, or live read receipts.
3. **Notification Gaps:** Prior notifications were only emitted for seller verification reviews; enquiry creation, status movements, quotation submissions, and chat events lacked database-level triggers.
4. **Seller Visibility Constraint:** `seller_can_see_buyer` was previously restricted to existing enquiry records (`public.enquiries`), which prevented suppliers from viewing buyer names when direct product or trade discussions were initiated prior to an enquiry.

---

## 2. Database Schema & Migration Details

Migration [`20261031100600_messaging_and_notifications.sql`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/supabase/migrations/20261031100600_messaging_and_notifications.sql) was developed, tested against in-process PGlite, and executed on Supabase.

### Schema Architecture
```
                         ┌───────────────────────┐
                         │   public.profiles     │
                         └──────────┬────────────┘
                                    │ buyer_id (references profiles.id)
                                    ▼
┌─────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
│ public.seller_profiles  ├───┤   public.conversations   ├───┤     public.enquiries     │
└─────────────────────────┘   └─────────────┬────────────┘   └──────────────────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │     public.messages      │
                              └─────────────┬────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │   storage.objects        │
                              │ (message-attachments)    │
                              └──────────────────────────┘
```

### 1. `public.conversations`
- **Fields:** `id`, `buyer_id`, `seller_id`, `enquiry_id` (nullable), `product_id` (nullable), `subject`, `last_message_id`, `last_message_preview`, `last_message_sender_id`, `last_message_at`, `buyer_last_read_at`, `seller_last_read_at`, `buyer_unread_count`, `seller_unread_count`, `buyer_archived_at`, `seller_archived_at`, `created_at`, `updated_at`.
- **Deduplication Partial Indexes:**
  - `conversations_unique_enquiry_idx` on `(enquiry_id) WHERE enquiry_id IS NOT NULL`
  - `conversations_unique_product_idx` on `(buyer_id, seller_id, product_id) WHERE enquiry_id IS NULL AND product_id IS NOT NULL`
  - `conversations_unique_general_idx` on `(buyer_id, seller_id) WHERE enquiry_id IS NULL AND product_id IS NULL`
- **Performance Indexes:** `(buyer_id, last_message_at DESC)`, `(seller_id, last_message_at DESC)`, and partial indexes on unread unarchived threads.

### 2. `public.messages`
- **Fields:** `id`, `conversation_id`, `sender_id`, `sender_role` (`buyer` | `seller`), `message_type` (`text` | `attachment` | `system`), `body`, `attachment_path`, `attachment_name`, `attachment_mime`, `attachment_size`, `client_message_id`, `created_at`.
- **Idempotency Key:** `UNIQUE (conversation_id, sender_id, client_message_id)` allows instant, duplicate-free optimistic UI retry recovery (PostgreSQL error `23505`).
- **Immutability:** Guarded by `prevent_mutation()` trigger blocking `UPDATE` and `DELETE` on all messages for compliance.
- **Constraints:** `messages_content_or_attachment_chk` ensures either non-empty body or complete attachment; `messages_attachment_completeness_chk` ensures 4-tuple attachment metadata integrity.

### 3. Stored Functions & RPCs
- `public.get_or_create_conversation(_seller_id, _enquiry_id, _product_id, _subject)`: Idempotently creates or returns conversation; validates buyer eligibility, verifies verified seller status, blocks self-messaging, and applies 10 threads/minute rate limiting.
- `public.mark_conversation_read(_conversation_id)`: Atomically resets caller's unread count to `0`, updates `_last_read_at`, and marks all associated `message_received` notifications `is_read = true`.
- `public.set_conversation_archived(_conversation_id, _archived)`: Archives/unarchives independently per participant.
- `public.seller_can_see_buyer(_buyer_id)`: Extended to allow sellers to view buyer profile in direct conversation threads.

---

## 3. Row-Level Security & Storage Access Policies

| Resource | Grant / Policy | Enforcement |
|---|---|---|
| `public.conversations` | `SELECT` only for `authenticated`; direct `INSERT`/`UPDATE`/`DELETE` **REVOKED** | Thread creation restricted to `get_or_create_conversation()`; status changes restricted to `mark_conversation_read()` and `set_conversation_archived()`. |
| `public.messages` | `SELECT` via `messages_select_participant` | Caller must be verified participant (`c.buyer_id = auth.uid() OR is_seller_owner(c.seller_id)`). |
| `public.messages` | `INSERT` via `messages_insert_participant` + `messages_before_insert_guard()` | `sender_id = auth.uid()`, active account, role validation, system message insertion prevention, and 25 msgs/60s rate limit. |
| `storage.objects` (`message-attachments`) | `SELECT` & `INSERT` via `can_access_conversation(storage_first_folder_uuid(name))` | Private bucket (`public = false`, 10 MB limit). Files must be under `<conversation_id>/...` path. Extensions constrained to `pdf`, `jpg`, `jpeg`, `png`, `webp`. `UPDATE`/`DELETE` prohibited. |

---

## 4. Real-Time Architecture & State Synchronization

The frontend utilizes Supabase Realtime `postgres_changes` on private RLS-filtered channels (never public broadcast):

1. **Active Thread Channel:** Listens to `postgres_changes` on `messages` filtered by `conversation_id=eq.${conversationId}`.
2. **Inbox Badge Channel:** Listens to `postgres_changes` on `conversations` filtered by viewer ID (`buyer_id=eq.${userId}` or `seller_id=eq.${sellerProfileId}`).
3. **Optimistic UI Engine:**
   - On submit, appends optimistic item with temporary ID and `deliveryState: "sending"`.
   - On Server Action success or Realtime arrival, `reconcileIncomingMessage()` matches `clientMessageId` and smoothly updates to confirmed state without layout jumps.
   - On error, `failOrRollbackOptimisticMessage()` transitions to `deliveryState: "failed"` with inline retry/discard buttons.
4. **Cursor-Based Pagination:**
   - Queries older messages chronologically with `(created_at, id) < (cursor_created_at, cursor_id)` in chunks of 30.
   - Maintains exact scroll positioning when prepending older historical batches.
5. **Connection & Reconnection Resilience:**
   - Realtime channel status tracked via `SUBSCRIBED`, `CLOSED`, `CHANNEL_ERROR`.
   - Reconnect handler fetches delta messages created since the latest in-memory timestamp via `syncMissedMessagesAction()`.
   - Complete unmount cleanup calls `supabase.removeChannel(channel)` preventing memory leaks.

---

## 5. Event-Driven Transactional Notifications

All marketplace lifecycle events are driven by PostgreSQL triggers invoking the internal SECURITY DEFINER function `public._emit_notification()` with built-in deduplication:

1. **Enquiry Created (`notify_on_enquiry_created`):**
   - Seller receives: `enquiry_received` ("New Enquiry: [Title]").
   - Buyer receives: `system` ("Enquiry Sent: [Title]").
2. **Enquiry Status Transitions (`notify_on_enquiry_status_change`):**
   - Status `viewed` / `responding` -> Buyer receives `enquiry_viewed`.
   - Status `rejected` -> Buyer receives `system` with seller's note.
   - Status `cancelled` / `closed` -> Counterparty receives `system`.
3. **Quotation Lifecycle (`notify_on_quotation_change`):**
   - Status `sent` -> Buyer receives `quotation_received`.
   - Status `accepted` -> Seller receives `quotation_accepted`.
   - Status `rejected` -> Seller receives `quotation_rejected`.
4. **Chat Message (`messages_after_insert`):**
   - Counterparty receives `message_received` with message preview and conversation deep-link.
5. **Seller Verification & Product Moderation:**
   - Seller verification updates emit `seller_verification`.
   - Product moderation updates emit `product_moderation`.
   - User account status updates emit `account_status`.

---

## 6. Contextual Messaging Entry Points

Contextual **Start Conversation** action buttons have been embedded across all procurement surfaces:

- [`apps/web/app/products/[slug]/page.tsx`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/apps/web/app/products/[slug]/page.tsx): Full-width **"Message [Supplier Name]"** button within B2B Procurement Tools.
- [`apps/web/app/suppliers/[slug]/page.tsx`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/apps/web/app/suppliers/[slug]/page.tsx): **"Message Supplier"** button header action.
- [`apps/web/components/buyer/buyer-enquiry-detail-view.tsx`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/apps/web/components/buyer/buyer-enquiry-detail-view.tsx): **"Message Supplier"** button for `/buyer/enquiries/[id]` and `/buyer/rfqs/[id]`.
- [`apps/web/app/buyer/quotes/[id]/page.tsx`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/apps/web/app/buyer/quotes/[id]/page.tsx): **"Message Supplier about Quote"** header action.
- [`apps/web/app/seller/enquiries/[id]/page.tsx`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/apps/web/app/seller/enquiries/[id]/page.tsx): **"Message Buyer"** header action.
- [`apps/web/app/seller/quotes/[id]/page.tsx`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/apps/web/app/seller/quotes/[id]/page.tsx): **"Message Buyer"** header action in both draft editor and sent proforma views.

---

## 7. Dual-Role Safety Handling

The system supports users holding both `buyer` and `seller` platform roles:
1. `callerContext` parameter explicitly distinguishes whether user is messaging as a buyer or as a supplier.
2. In `messages_before_insert_guard()`, `sender_role = 'buyer'` requires `c.buyer_id = auth.uid()`, while `sender_role = 'seller'` requires `public.is_seller_owner(c.seller_id)`.
3. Notification links automatically route dual-role users to the appropriate portal (`/buyer/messages/[id]` or `/seller/messages/[id]`).

---

## 8. Verification & Quality Gates

### Automated Test Results
- **`@stone/validation`:** 4 test files, 37/37 tests passed.
  - Added [`packages/validation/tests/messaging.test.ts`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/packages/validation/tests/messaging.test.ts) covering all messaging schemas, magic bytes, and traversal prevention.
- **`@stone/database`:** 9 test files, 146/146 tests passed.
  - Added [`packages/database/tests/phase6-messaging-notifications.test.ts`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/packages/database/tests/phase6-messaging-notifications.test.ts) covering RLS isolation, stored procedures, rate limits, private storage RLS, and all 6 notification triggers.
- **`@stone/web`:** 19/19 tests passed.
  - Added [`apps/web/tests/messaging.test.ts`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/apps/web/tests/messaging.test.ts) covering optimistic reconciliation, signed URL generation, attachment security, and middleware redirects.
- **`@stone/utils`:** 2 test files, 11/11 tests passed.
- **`@stone/email`:** 1 test file, 3/3 tests passed.
- **`@stone/worker`:** 1 test file, 1/1 test passed.

### Quality Gates Summary
| Quality Gate | Command | Exit Code | Result |
|---|---|---|---|
| **Gate 1: Linting** | `pnpm lint` | `0` | Clean, 0 warnings/errors |
| **Gate 2: Type Checking** | `pnpm typecheck` | `0` | Clean across all 9 workspaces |
| **Gate 3: Automated Testing** | `pnpm test` | `0` | 217 tests passing |
| **Gate 4: Production Build** | `pnpm build` | `0` | 55/55 static & dynamic routes compiled |

---

## 9. Localhost Test URLs

The dev server is live on `http://localhost:3001`:

- **Buyer Messages Inbox:** `http://localhost:3001/buyer/messages`
- **Buyer Notifications:** `http://localhost:3001/buyer/notifications`
- **Seller Messages Inbox:** `http://localhost:3001/seller/messages`
- **Seller Notifications:** `http://localhost:3001/seller/notifications`
- **Product Procurement Page (with Chat):** `http://localhost:3001/products/makrana-white-marble`
- **Supplier Storefront (with Chat):** `http://localhost:3001/suppliers/royal-makrana-marbles`

