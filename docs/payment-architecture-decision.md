# StoneB2B / StonesDekho — Confirmed Payment Architecture Decision

## Status: CONFIRMED
**Model Selected:** Model B — Payment Through StonesDekho (Platform Escrow & Settlement)

---

## 1. Core Business Flow

```
[Buyer] 
   │
   ▼ (Pays 100% of order value via integrated gateway)
[StonesDekho Platform Escrow / Holding Account]
   │
   ├─► Platform Commission Deducted & Logged to Platform Revenue
   ├─► Tax (TCS / GST) Tracked
   │
   ▼ (Post-delivery / milestone verification release)
[Seller Settlement / Payout]
```

---

## 2. Architecture Principles & Hard Rules

1. **Server-Side Financial Authority:**
   - Product prices, slab square-foot conversions, tax amounts, shipping charges, and platform commission rates are ALWAYS calculated and verified server-side.
   - Client-submitted totals, prices, or statuses are never trusted.

2. **Webhook & Signature Verification:**
   - Orders are marked as `paid` ONLY after cryptographically verifying incoming payment gateway webhook signatures (e.g. Razorpay/Stripe HMAC SHA256) server-side.
   - Frontend success redirects only display an optimistic "Payment verifying..." polling state, never updating order status directly.

3. **Idempotency & Replay Protection:**
   - All payment attempts and webhook processing events must enforce unique idempotency keys (`payment_events` table with unique constraint on gateway event IDs).
   - Duplicate webhook deliveries must result in a safe 200 OK without double-crediting balances or re-triggering payout allocations.

4. **Immutable Transaction & Audit Ledger:**
   - Financial transactions are append-only. No UPDATE or DELETE allowed on financial transaction logs (`prevent_mutation()` trigger).
   - Balance changes must reference an underlying transaction record (e.g., `order_payment`, `platform_commission`, `seller_payout`, `refund`).

5. **Data Isolation & Row-Level Security (RLS):**
   - Sellers can only view payouts, commissions, and order financial details relating to their own seller profile (`is_seller_owner(seller_id)`).
   - Buyers can only view payment receipts and invoices for orders they placed (`buyer_id = auth.uid()`).
   - Admin Trade Desk and Finance roles can view platform-wide ledger, audit logs, and reconciliation status.

6. **Secure Secret Management:**
   - Gateway API keys, webhook secrets, and payout API credentials remain strictly server-side (`process.env`), never exposed to browser bundles.

---

## 3. Candidate Database Entities (Future Commerce Schema)

```
┌─────────────────────────┐         ┌─────────────────────────┐
│          orders         │ 1     * │       order_items       │
│ - id (UUID)             ├─────────┤ - id (UUID)             │
│ - quote_id / enquiry_id │         │ - product_id (UUID)     │
│ - buyer_id (UUID)       │         │ - unit_price, quantity  │
│ - seller_id (UUID)      │         └─────────────────────────┘
│ - order_status          │
│ - payment_status        │
└────────────┬────────────┘
             │ 1
             │
             ▼ *
┌─────────────────────────┐         ┌─────────────────────────┐
│        payments         │ 1     * │     payment_events      │
│ - id (UUID)             ├─────────┤ - id (UUID)             │
│ - gateway_order_id      │         │ - gateway_event_id (UQ) │
│ - gateway_payment_id    │         │ - raw_payload (JSONB)   │
│ - gross_amount          │         │ - processed_at          │
│ - status                │         └─────────────────────────┘
└────────────┬────────────┘
             │
             ├─────────────────────────────────┐
             ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│   platform_commissions  │       │     seller_payouts      │
│ - order_id (UUID)       │       │ - seller_id (UUID)      │
│ - commission_rate (%)   │       │ - gross_payable         │
│ - commission_amount     │       │ - commission_deducted   │
│ - tax_deducted          │       │ - net_payout_amount     │
│ - status                │       │ - payout_status         │
└─────────────────────────┘       └─────────────────────────┘
```

---

## 4. Unfinalized Parameters (Deferred Configuration)

The following parameters must be configured dynamically via `platform_settings` / environment variables rather than hardcoded in schema or business logic:
- **Commission Percentage:** Configurable per stone category or seller tier (stored in `platform_settings`).
- **Payout Release Trigger:** Configurable (e.g., dispatch vs delivery confirmation vs FOB bill of lading verification).
- **Refund & Cancellation Policy:** Configurable per order type (custom gangsaw cuts vs standard stock tiles).
- **GST / Tax Responsibility:** Documented per legal entity review.
- **Payment Gateway Selection:** Subject to regulatory requirements for high-ticket B2B escrow/marketplace settlements in India (e.g. Razorpay Route / Cashfree / Stripe Connect).

---

## 5. Scope Boundary

- **Current Phase:** Guest Enquiry & RFQ Persistence (Phase 1).
- **Future Phase:** Cart, Checkout, Gateway Integration, and Escrow Settlement will be implemented strictly according to this document upon completion of lead-generation phases.

