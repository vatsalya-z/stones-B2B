# StoneB2B — Phase 1: Guest Enquiry & RFQ Persistence Implementation Plan & Completion Evidence

**Status:** IMPLEMENTED & VERIFIED IN PGLITE  
**Branch:** `vatsalya`  
**Brand Identity:** StoneB2B  
**Payment Model Baseline:** Model B (Buyer → StoneB2B Platform → Verified Seller Settlement)  

---

## 1. Executive Summary & Objective

In Phase 1, guest procurement inquiries (submitted via the Seller Storefront modal) and public custom quotation requests (submitted via `/request-quote`) have been converted from transient console logs into permanent, secure PostgreSQL records in `public.enquiries`.

All requirements of the strict StoneB2B architecture baseline have been satisfied:
- Zero loss of buyer, seller, or admin visibility.
- RLS policies prevent anonymous users from selecting lead records.
- Database check constraint `enquiries_requester_identity_check` prevents anonymous spam without requester identity.
- Partial unique index `enquiries_guest_idempotency_idx` prevents duplicate guest submissions.
- Event-driven notifications cleanly format guest names for suppliers.

---

## 2. Database Schema & Migration Evidence

### Migration File: `supabase/migrations/20261031120000_guest_enquiries_and_rfqs.sql`

```sql
-- 1. Safe additive column modifications
alter table public.enquiries alter column buyer_id drop not null;
alter table public.enquiries alter column seller_id drop not null;

alter table public.enquiries add column if not exists guest_name text;
alter table public.enquiries add column if not exists guest_email text;
alter table public.enquiries add column if not exists guest_phone text;
alter table public.enquiries add column if not exists guest_company text;
alter table public.enquiries add column if not exists enquiry_type text not null default 'direct';
alter table public.enquiries add column if not exists specifications jsonb not null default '{}'::jsonb;

-- 2. Requester identity check constraint
alter table public.enquiries add constraint enquiries_requester_identity_check
  check (
    buyer_id is not null
    or (
      guest_name is not null
      and (guest_email is not null or guest_phone is not null)
    )
  );

-- 3. Partial unique index for guest idempotency
create unique index if not exists enquiries_guest_idempotency_idx
  on public.enquiries (client_request_id)
  where buyer_id is null and client_request_id is not null;

-- 4. RLS helper function update
create or replace function public.can_access_enquiry(_enquiry_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enquiries e
    where e.id = _enquiry_id
      and (
        (e.buyer_id is not null and e.buyer_id = auth.uid())
        or (e.seller_id is not null and public.is_seller_owner(e.seller_id))
        or public.is_admin()
      )
  );
$$;

-- 5. Trigger notification update for guest names
create or replace function public.notify_on_enquiry_created() ...
```

---

## 3. Server Actions & Security Architecture

1. **`submitSupplierEnquiry` (`apps/web/features/enquiry/supplier-enquiry-actions.ts`):**
   - Sliding-window in-memory rate limiter (5 requests / 60 seconds per IP + Email).
   - Server-side Zod validation with honeypot rejection.
   - Idempotency check via `client_request_id`.
   - Supplier resolution via UUID or verified slug (`resolveSellerUuid`).
   - Privileged server-side insert via `createAdminClient()`.
   - Notification dispatch to seller via PostgreSQL database trigger and optional transactional email.
   - Sanitized structured audit logging without plaintext PII.

2. **`submitPublicRfq` (`apps/web/features/rfq/public-rfq-actions.ts`):**
   - In-memory rate limiting.
   - Full architectural stone specification persistence in `specifications` JSONB column.
   - Handles general broadcast RFQs (`seller_id: null`) and targeted supplier RFQs.
   - Idempotency check on `client_request_id`.

3. **Portal Queries Hydration:**
   - `SellerEnquiryListItem` & `SellerEnquiryDetail` extract `guest_name`, `guest_email`, `guest_phone`, `guest_company`, and `isGuest`.
   - `getAdminEnquiries` and `getAdminEnquiryDetail` safely filter nullable buyer/seller IDs and display guest leads cleanly to the StoneB2B Trade Desk.

---

## 4. Test Verification Evidence

- **Database Test Suite (`@stone/database`):**
  - **11 test files passed, 186/186 tests passing (100%)**
  - Dedicated test suite [`packages/database/tests/guest-enquiries.test.ts`](file:///Users/vatsalyabhardwaj/Desktop/Website%20Codes%20Zoom%20Digital/Stone_B2B/packages/database/tests/guest-enquiries.test.ts):
    1. Guest enquiry persistence with nullable `buyer_id` and valid guest identity.
    2. Guest broadcast RFQ with nullable `seller_id` and JSONB specifications.
    3. `enquiries_requester_identity_check` failing when contact info is absent.
    4. `enquiries_guest_idempotency_idx` preventing duplicate `client_request_id`.
    5. `anon` permission denied on `public.enquiries`.
    6. Assigned seller viewing guest lead details.
    7. Unassigned sellers blocked from other sellers' guest leads.
    8. Admin viewing all guest and broadcast leads.
    9. `notify_on_enquiry_created` emitting notification with guest name.

- **Web Test Suite (`@stone/web`):**
  - **7 test files passed, 75/75 tests passing (100%)**
  - All storefront, buyer portal, seller portal, and admin portal tests pass.

- **Typecheck (`turbo run typecheck`):**
  - **8 packages in scope, 8 successful (100%)**

---

## 5. Governance & Production Boundaries

- **No live payment gateway is connected.**
- **No real financial transactions or seller payouts have been initiated.**
- **No production migrations have been executed.**
- **The migration `20261031120000_guest_enquiries_and_rfqs.sql` is ready for review and requires explicit user approval before execution against Supabase production.**

