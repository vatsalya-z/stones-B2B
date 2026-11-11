# StoneB2B — Business Workflows
**Classification:** Read-Only Architecture Audit  
**Date:** 2026-11-11

---

## Overview

This document maps the five core end-to-end business workflows of the StoneB2B platform against actual implemented code. Each step is classified as:
- ✅ **IMPLEMENTED** — Code found and functional
- ⚠️ **PARTIAL** — Step partially handled or incomplete
- ❌ **MISSING** — Step not implemented

---

## Workflow A: Buyer → Product Discovery → Enquiry

```mermaid
sequenceDiagram
    actor Buyer
    participant Public as Public Marketplace
    participant DB as Supabase DB
    participant Seller

    Buyer->>Public: Browse /products or /categories
    Public->>DB: getProducts(filters) [✅]
    DB-->>Public: Approved products from verified sellers
    Public-->>Buyer: Product listing with filter sidebar

    Buyer->>Public: Open product detail /products/[slug]
    Public->>DB: getProductDetail(slug) [✅]
    DB-->>Public: Product + images + specs + seller info
    Public-->>Buyer: Product page with "Contact Supplier" CTA

    alt Authenticated Buyer
        Buyer->>Public: Click "Contact Supplier" or "Send Enquiry"
        Public-->>Buyer: Enquiry form (product pre-filled) [✅]
        Buyer->>Public: Submit enquiry
        Public->>DB: INSERT enquiries (enquiry_type='direct') [✅]
        Public->>DB: get_or_create_conversation() [✅]
    else Guest User
        Buyer->>Public: Click "Request Quote" (public RFQ)
        Public-->>Buyer: Guest RFQ form [✅]
        Buyer->>Public: Submit guest enquiry
        Public->>DB: INSERT enquiries (guest_name, guest_email) [✅]
    end

    DB->>Seller: Notification: enquiry_received [⚠️ Partial]
    DB-->>Buyer: Enquiry confirmation [✅]
```

### A. Workflow Steps Detail

| Step | Route/Action | Status | Gap |
|------|-------------|--------|-----|
| Browse product catalogue | `GET /products` → `getProducts()` | ✅ IMPLEMENTED | — |
| Filter (material, colour, finish, origin, price, sort) | URL params → `ProductFilterParams` | ✅ IMPLEMENTED | — |
| Full-text search | `textSearch()` on `search_vector` | ✅ IMPLEMENTED | — |
| View product detail | `GET /products/[slug]` → `getProductDetail()` | ✅ IMPLEMENTED | — |
| Browse supplier directory | `GET /suppliers` → `getPublicSellers()` | ✅ IMPLEMENTED | — |
| View supplier storefront | `GET /suppliers/[slug]` | ✅ IMPLEMENTED | — |
| Submit direct enquiry (authenticated) | `enquiry/actions.ts` → `enquiries` INSERT | ✅ IMPLEMENTED | — |
| Submit guest RFQ (public) | `rfq/public-rfq-actions.ts` | ✅ IMPLEMENTED | — |
| Idempotency guard | `client_request_id` unique constraint | ✅ IMPLEMENTED | — |
| Notify seller via notification | `notifications` table INSERT | ⚠️ PARTIAL | Trigger not confirmed in source |
| Email seller | Worker email | ⚠️ PARTIAL | Job queue missing |
| Auto-match RFQ to multiple sellers | Supplier matching engine | ❌ MISSING | Not implemented |
| Save product to favourites | `favourites/actions.ts` | ✅ IMPLEMENTED | — |

---

## Workflow B: Seller → Quotation → Order Creation

```mermaid
sequenceDiagram
    actor Seller
    participant SellerPanel as Seller Portal
    participant DB as Supabase DB
    actor Buyer
    participant BuyerPanel as Buyer Portal

    Seller->>SellerPanel: View /seller/enquiries [✅]
    SellerPanel->>DB: getSellerEnquiries() [✅]
    DB-->>SellerPanel: List of received enquiries

    Seller->>SellerPanel: Open enquiry → View details [✅]
    SellerPanel->>DB: transition_enquiry_status('viewed') [✅]

    Seller->>SellerPanel: Create quotation [✅]
    SellerPanel-->>Seller: Quotation form (line items, tax, shipping) [✅]
    Seller->>SellerPanel: Submit quotation
    SellerPanel->>DB: INSERT quotations + quotation_items [✅]
    SellerPanel->>DB: transition_enquiry_status('quoted') [✅]

    DB->>Buyer: Notification: quotation_received [⚠️ Partial]

    Buyer->>BuyerPanel: View /buyer/quotations [✅]
    BuyerPanel->>DB: getBuyerQuotations() [✅]
    DB-->>BuyerPanel: Quotation with line items

    Buyer->>BuyerPanel: Accept quotation [✅]
    BuyerPanel->>DB: accept_quotation_and_create_order() RPC [✅]
    DB-->>BuyerPanel: order_id (atomic transaction)

    DB->>Seller: Notification: order created [⚠️ Partial]
    Buyer->>BuyerPanel: View /buyer/orders/[id] [✅]
    Seller->>SellerPanel: View /seller/orders/[id] [✅]
```

### B. Workflow Steps Detail

| Step | Route/Action | Status | Gap |
|------|-------------|--------|-----|
| Seller views enquiry list | `seller/enquiries/` → `getSellerEnquiries()` | ✅ IMPLEMENTED | — |
| Mark enquiry as viewed | `transition_enquiry_status('viewed')` | ✅ IMPLEMENTED | — |
| Seller creates quotation | `createQuotationAction()` | ✅ IMPLEMENTED | — |
| Multi-line quotation items | `quotation_items` table | ✅ IMPLEMENTED | — |
| Tax, discount, shipping calculation | Server-side `computeQuotationTotals()` | ✅ IMPLEMENTED | — |
| Quote number generation | DB-generated | ✅ IMPLEMENTED | — |
| Buyer views quotation | `buyer/quotations/` | ✅ IMPLEMENTED | — |
| Buyer downloads PDF quote | `GET /api/buyer/quotes/[id]/pdf` | ✅ IMPLEMENTED | — |
| Buyer accepts quotation | `acceptQuotationAction()` → `accept_quotation_and_create_order()` | ✅ IMPLEMENTED | — |
| Order created atomically | RPC wraps quotation update + order insert | ✅ IMPLEMENTED | — |
| Buyer/seller snapshots in order | JSON snapshots at time of order | ✅ IMPLEMENTED | — |
| Notify buyer of quote | `notifications` table | ⚠️ PARTIAL | Trigger not confirmed |
| Counter-offer / negotiation | No counter-offer flow | ❌ MISSING | Not implemented |
| Quotation revision flow | `revised` status exists; no UI flow confirmed | ⚠️ PARTIAL | — |

---

## Workflow C: Order Fulfilment

```mermaid
stateDiagram-v2
    [*] --> pending_payment : accept_quotation_and_create_order() ✅

    pending_payment --> confirmed : Seller confirms ✅
    pending_payment --> cancelled : Seller/Admin cancels ✅

    confirmed --> processing : Seller starts processing ✅
    confirmed --> cancelled : Admin arbitration ✅

    processing --> dispatched : Seller dispatches ✅
    processing --> cancelled : Admin arbitration ✅

    dispatched --> delivered : Seller marks delivered ✅
    dispatched --> cancelled : Admin arbitration ✅

    delivered --> completed : Buyer/auto completes ⚠️
    delivered --> cancelled : Admin arbitration ✅

    completed --> [*]
    cancelled --> [*]
```

### C. Workflow Steps Detail

| Step | Route/Action | Status | Gap |
|------|-------------|--------|-----|
| Order created (`pending_payment`) | `accept_quotation_and_create_order()` | ✅ IMPLEMENTED | — |
| Seller confirms order | `transitionOrderStatusAction('confirmed')` | ✅ IMPLEMENTED | — |
| Seller processes order | `transitionOrderStatusAction('processing')` | ✅ IMPLEMENTED | — |
| Seller dispatches | `transitionOrderStatusAction('dispatched')` | ✅ IMPLEMENTED | — |
| Seller marks delivered | `transitionOrderStatusAction('delivered')` | ✅ IMPLEMENTED | — |
| Buyer confirms receipt → completed | `transitionOrderStatusAction('completed')` | ⚠️ PARTIAL | Buyer-initiated completion not confirmed |
| Admin order arbitration | `transitionAdminOrderAction()` — cancel or complete only | ✅ IMPLEMENTED | — |
| Order status history | `order_status_history` table | ✅ IMPLEMENTED | — |
| Payment processing | `payment_status` field exists | ❌ MISSING | No PA integration |
| Auto-escalation on stale orders | — | ❌ MISSING | Not implemented |
| Shipment tracking | — | ❌ MISSING | No logistics API |
| Invoice generation | — | ❌ MISSING | Only quotation PDF |
| Seller settlement | — | ❌ MISSING | No escrow / PA integration |

---

## Workflow D: Seller Onboarding & Verification

```mermaid
sequenceDiagram
    actor Seller
    participant Auth as Auth System
    participant DB as Supabase DB
    actor Admin

    Seller->>Auth: Register at /register [✅]
    Auth->>DB: Create auth.users + ensure_profile() trigger [✅]
    DB-->>Seller: Email verification required [✅]

    Seller->>Auth: Verify email via /auth/verify-email [✅]
    Seller->>DB: grant_self_role('seller') [✅]

    Seller->>DB: Create seller profile (business details) [✅]
    DB-->>Seller: verification_status = 'draft'

    Seller->>DB: Upload verification documents [✅]
    Note over DB: GST, PAN, business registration

    Seller->>DB: submit_seller_verification() [✅]
    DB-->>Seller: verification_status = 'submitted'

    Admin->>DB: Review seller (admin portal) [✅]
    Admin->>DB: admin_review_seller('under_review') [✅]

    alt Documents OK
        Admin->>DB: admin_review_seller('verified') [✅]
        DB-->>Seller: Notification: seller_verification [⚠️ Partial]
    else Need More Docs
        Admin->>DB: admin_request_seller_documents(message) [✅]
        DB-->>Seller: Notification: request more docs [⚠️ Partial]
    else Rejected
        Admin->>DB: admin_review_seller('rejected', reason) [✅]
        DB-->>Seller: Notification: seller_verification [⚠️ Partial]
    end

    Seller->>DB: List first product [✅]
    Admin->>DB: Moderate product: approve [✅]
    DB-->>Public: Product visible on marketplace [✅]
```

### D. Workflow Steps Detail

| Step | Action | Status | Gap |
|------|--------|--------|-----|
| User registration | `/register` → auth signup | ✅ IMPLEMENTED | — |
| Profile auto-creation | `ensure_profile()` trigger | ✅ IMPLEMENTED | — |
| Email verification | `/auth/verify-email` | ✅ IMPLEMENTED | — |
| Self-assign seller role | `grant_self_role('seller')` | ✅ IMPLEMENTED | — |
| Create seller profile | `seller_profiles` INSERT | ✅ IMPLEMENTED | — |
| Upload verification documents | `api/seller/verification/documents` | ✅ IMPLEMENTED | — |
| Submit for verification | `submit_seller_verification()` | ✅ IMPLEMENTED | — |
| Admin reviews + approves | `admin_review_seller()` | ✅ IMPLEMENTED | — |
| Email notifications on status change | Worker email lib | ⚠️ PARTIAL | Queue not confirmed |
| Seller dashboard access | `seller/dashboard/` | ✅ IMPLEMENTED | — |
| List products | `seller/products/` CRUD | ✅ IMPLEMENTED | — |
| Product moderation by admin | `admin_moderate_product()` | ✅ IMPLEMENTED | — |
| Product appears on marketplace | RLS: approved + verified | ✅ IMPLEMENTED | — |
| Subscription gating | No subscription check | ❌ MISSING | Not implemented |

---

## Workflow E: Payment Model B — Governance Architecture

> **Status:** ❌ NOT IMPLEMENTED — This is a governance design document only. The schema has `payment_status` fields but no Payment Aggregator integration code exists.

```mermaid
sequenceDiagram
    actor Buyer
    participant Platform as StoneB2B Platform
    participant PA as RBI-Authorized PA
    participant Escrow as Escrow Account
    actor Seller

    Note over Platform,Escrow: ❌ NOT IMPLEMENTED — Design Only

    Buyer->>Platform: Accept quotation (order created) ✅
    Platform-->>Buyer: payment_status = 'pending' ✅
    
    Buyer->>PA: Initiate payment [❌ MISSING]
    PA->>Escrow: Hold funds in escrow [❌ MISSING]
    PA-->>Platform: Payment confirmed webhook [❌ MISSING]
    Platform->>DB: payment_status = 'paid' [❌ MISSING]
    
    Platform->>Seller: Order confirmed [⚠️ Partial — via notification]
    Seller->>Platform: Mark dispatched [✅]
    Seller->>Platform: Mark delivered [✅]
    Buyer->>Platform: Confirm receipt [⚠️ Partial]

    Platform->>PA: Release funds instruction [❌ MISSING]
    PA->>Escrow: Release funds [❌ MISSING]
    PA->>Seller: Settle minus platform commission [❌ MISSING]
    PA-->>Platform: Settlement confirmation [❌ MISSING]
    Platform->>DB: order status = 'completed' [⚠️ Partial]
```

### E. Payment Model B Gap Analysis

| Component | Status | Priority |
|-----------|--------|---------|
| `payment_status` field on orders | ✅ IMPLEMENTED | — |
| Payment Aggregator selection (Razorpay/PayU/CCAvenue) | ❌ MISSING | 🔴 CRITICAL |
| Payment initiation API | ❌ MISSING | 🔴 CRITICAL |
| Payment webhook handler | ❌ MISSING | 🔴 CRITICAL |
| Escrow / PA integration | ❌ MISSING | 🔴 CRITICAL |
| Fund release to seller | ❌ MISSING | 🔴 CRITICAL |
| Platform commission deduction | ❌ MISSING | 🔴 CRITICAL |
| Payment reconciliation | ❌ MISSING | 🟡 HIGH |
| Refund processing | ❌ MISSING | 🟡 HIGH |
| GST on platform fee | ❌ MISSING | 🟡 HIGH |
| `payment_transactions` table | ❌ MISSING | 🔴 CRITICAL |

---

## Workflow F: Messaging Between Buyer and Seller

```mermaid
sequenceDiagram
    actor Buyer
    participant BuyerPanel as Buyer Portal
    participant DB as Supabase DB (Realtime)
    participant SellerPanel as Seller Portal
    actor Seller

    Buyer->>BuyerPanel: Open conversation from enquiry [✅]
    BuyerPanel->>DB: get_or_create_conversation() [✅]
    DB-->>BuyerPanel: conversation_id

    Buyer->>BuyerPanel: Type message [✅]
    BuyerPanel->>DB: INSERT messages (sender_role='buyer') [✅]
    DB->>SellerPanel: Realtime broadcast [✅]
    DB->>Seller: Notification: message_received [⚠️ Partial]

    SellerPanel->>DB: mark_conversation_read() [✅]

    Seller->>SellerPanel: Reply with message or attachment [✅]
    SellerPanel->>DB: INSERT messages (sender_role='seller') [✅]
    DB->>BuyerPanel: Realtime broadcast [✅]

    alt Attachment Upload
        Buyer->>BuyerPanel: Attach PDF/image [✅]
        BuyerPanel->>API: POST /api/messages/[convId]/attachments [✅]
        API->>Storage: Upload to private bucket [✅]
        API-->>BuyerPanel: attachment_path
        BuyerPanel->>DB: INSERT messages (message_type='attachment') [✅]
        SellerPanel->>API: GET signed-url for attachment [✅]
    end
```

---

## Workflow G: Admin Content Moderation

```mermaid
sequenceDiagram
    actor Admin
    participant AdminPanel as Admin Portal
    participant DB as Supabase DB
    actor Seller
    participant Public as Public Marketplace

    Seller->>DB: Create product (moderation_status='draft') [✅]
    Seller->>DB: Submit product for review (pending_review) [✅]
    DB->>Admin: Notification in dashboard [✅]

    Admin->>AdminPanel: /admin/products (pending queue) [✅]
    AdminPanel->>DB: getAdminProducts(status='pending_review') [✅]
    DB-->>AdminPanel: Product list with seller info + images

    Admin->>AdminPanel: Review product detail [✅]

    alt Approve
        Admin->>DB: admin_moderate_product('approved') [✅]
        DB-->>Public: Product visible to buyers [✅]
        DB-->>Seller: Notification: product_moderation [⚠️ Partial]
    else Reject with Reason
        Admin->>DB: admin_moderate_product('rejected', reason) [✅]
        DB-->>Seller: Notification: product_moderation [⚠️ Partial]
    else Bulk Action
        Admin->>DB: bulkModerateProductsAction([ids], action) [✅]
    end

    Admin->>DB: admin_audit_logs INSERT (immutable) [✅]
```

---

## Critical Workflow Gaps Summary

| Workflow | Critical Missing Steps |
|----------|----------------------|
| A — Discovery → Enquiry | Automatic RFQ-to-seller matching; lead distribution; email notification |
| B — Quotation → Order | Counter-offer/negotiation; email notification on quote |
| C — Order Fulfilment | Payment processing; shipment tracking; invoice generation; seller settlement |
| D — Seller Onboarding | Subscription gating on product listing; email notification on verification |
| E — Payment Model B | Entire Payment Aggregator integration; escrow; settlement; reconciliation |
| F — Messaging | Email notification on new messages (worker queue) |
| G — Moderation | Email notification to seller on moderation decision |

