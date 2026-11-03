# Admin Console — Completion Audit

**Date:** 2026-10-31  
**Scope:** Inspect the repository *before* building the Admin Panel. No application code was changed to produce this audit.  
**Method:** Read all 7 migrations, `docs/*`, `apps/web` routes/middleware/auth, `packages/*` (types, validation, database, ui), and every existing test file that references admin behaviour.

---

## 0. Scope clarification (important)

The brief says *"Phase 6B–6J implementation has NOT been approved to start yet."* In this repository that is **no longer true**:

- Phase 6 (messaging, notifications, attachments, realtime) was requested earlier in this same working session, implemented, tested, and its migration
  `20261031100600_messaging_and_notifications.sql` was **already applied by you to your Supabase project** (you confirmed "database setup ho gya hai"). Its report is `docs/phase-6-report.md`.
- I am **not reverting or modifying** Phase 6, because reverting would break the live database contract. The Admin Console does **not** add, change or depend on any messaging behaviour, and no messaging UI is built for admins in this phase.
- `docs/phase-6-audit.md` is untouched.

---

## 1. What exists today

### 1.1 Fully implemented — database layer (all in migrations, all RLS-enforced)

| Capability | Where | Notes |
|---|---|---|
| Role model (`buyer`, `seller`, `admin`, `super_admin`) | `user_roles`, `has_role`, `is_admin`, `is_super_admin` | Helpers read trusted tables, never JWT metadata. `current_account_active()` is part of every check, so a **suspended admin loses admin power at the DB layer**. |
| No self-privilege-escalation | `handle_new_user` (signup can only choose buyer/seller), `grant_self_role` (buyer/seller only), `admin_grant_role` / `admin_revoke_role` | Granting/revoking `admin`/`super_admin` needs a `super_admin` caller. Cannot revoke own roles. |
| Account suspension | `admin_set_account_status` | Cannot target self; targeting an admin account needs `super_admin`; audited. |
| Seller verification | `admin_review_seller`, `admin_review_document`, `seller_profiles_guard` | State machine: submitted → under_review → verified/rejected; verified ⇄ suspended; reason mandatory for reject/suspend; audited. |
| Product moderation | `admin_moderate_product`, `products_guard` | pending_review → approved/rejected; any → archived; reason mandatory for reject/archive; audited. Seller edits re-queue approved products. |
| Categories | `categories` + admin-only RLS + `categories_audit` trigger | Hierarchy via `parent_id`; `ON DELETE RESTRICT` on parent and on `products.category_id`; slug unique; `is_active`, `display_order`, SEO fields, `image_url`. |
| Audit log | `admin_audit_logs`, `_write_audit_log`, `prevent_mutation` trigger | Append-only (UPDATE/DELETE raise even for privileged roles). Clients have **SELECT only** (admin policy); `_write_audit_log` is not callable by clients. |
| Admin read access | `*_select_admin` policies on profiles, user_roles, seller_profiles, seller docs, products, images, specs, enquiries, quotations, enquiry history (`can_access_enquiry`), quotation items (`can_view_quotation`), conversations | Admin console can read everything through the **user-bound client**; the service-role key is not needed. |
| Private storage | `seller-verification-documents` (owner **or admin** SELECT), `category-images` (admin ALL, image extensions only) | Admin can mint signed URLs with its own session. |
| Server guards | `apps/web/lib/auth.ts` → `requireAdmin()`, `requireSuperAdmin()` | Already exist, but **unused** by any route. |
| Middleware | `/admin` is a protected prefix | Redirects unauthenticated users to `/login?next=`; role check is deferred to pages (documented design). |

### 1.2 Partially implemented

| Item | State | Gap |
|---|---|---|
| Audit log detail | `metadata` jsonb holds `from`/`to`/`reason`/`role`/`status` | No request metadata (IP / UA) captured. Category audit only stores `name` (no before/after). |
| Seller "request additional documents" | No status or function exists | Needs a function (below). |
| Product "request changes" | `rejected` + `rejection_reason` is the only feedback path; seller edit moves it back to `draft` | No separate status. Documented as the supported mechanism. |
| Product "restore" | `archived` is terminal in `admin_moderate_product` | Needs a restore function. |
| Notifications | Per-user table; migration 7 emits seller_verification / product_moderation / account_status events to the *affected user* | Nothing for *admins*; admin views must be computed from live queues. |
| Category delete | Admin may delete via RLS; FK `RESTRICT` blocks when children/products exist | Raw FK error is unfriendly; no super-admin requirement for a destructive taxonomy action. |
| `docs/security.md` / `database-schema.md` | Accurate in spirit | Drift: says `admin_set_account_status` supports `deactivated` (DB: `active|pending|suspended`); lists bucket `seller-documents` (real: `seller-verification-documents`); schema doc says `admin_id` (real: `admin_user_id`). |

### 1.3 Missing

* **No admin UI at all**: no `/admin` route, layout, shell, loading/error states, or admin-specific queries/actions.
* `/dashboard` router sends an admin-only user to `/` (dead end); admins have no entry point.
* No platform settings storage (no table, no key/value store, no banner table).
* No aggregate/time-series SQL: PostgREST cannot `GROUP BY`, and client-side aggregation would be silently wrong past the 1,000-row response cap. Needs SQL functions.
* No admin validation schemas, no admin tests (only DB-level role/RPC tests inside `identity`, `sellers`, `catalogue`, `commerce`).

### 1.4 Broken / risky items found

1. **Dead admin entry** — `/dashboard` never routes to an admin console.
2. **Guard gap** — `requireAdmin()` checks `user_roles` but **not `account_status`**. At DB level a suspended admin is powerless, but the UI would still render an (empty/erroring) console. The new guard also checks `account_status = 'active'`.
3. **Layout-only auth is not a boundary** in the App Router. Every admin page and every server action must independently authorize. (Design rule for this phase.)
4. **Type drift** — `packages/types` `PRODUCT_STATUSES` contains `published/out_of_stock`, but the DB `moderation_status` uses `approved` and has no `published/out_of_stock`. Admin code uses the **DB** values.
5. **Doc drift** listed in 1.2.
6. **Admin can grant `buyer`/`seller` roles to any user** (`admin_grant_role` only restricts admin/super_admin). Judged acceptable (audited), flagged for review.
7. **No last-super-admin lockout risk**: a super_admin cannot revoke or suspend *themself*, so at least one active super_admin always remains unless suspended by another. Verified by reading the functions.
8. **RFQs are not a table**: an RFQ is an `enquiries` row whose `description` contains the marker `--- RFQ Technical & Delivery Specifications ---` or whose `product_id` is null (same predicate the buyer portal uses via `decodeRfqDescription`). Admin reporting uses the identical predicate.

### 1.5 UI consistency notes

Buyer and Seller portals share a pattern: `layout.tsx` + client `*Shell` (sidebar, mobile drawer, `top-[88px]` sticky under the public navbar), `loading.tsx` skeleton, `error.tsx` boundary, `@stone/ui` primitives (`Card`, `Badge`, `Button`, `EmptyState`, `ErrorState`, `Breadcrumb`, `Skeleton`), stone/amber palette, server components + server actions returning `ActionResult`. The Admin Console reuses all of this and adds only: `AdminShell`, table/pagination/filters primitives, SVG chart components (no new dependency).

### 1.6 Test coverage today

* DB (PGlite): role escalation, audit immutability, seller review, product moderation, category RLS — covered.
* Web: nothing for admin guards, server-action authorization, or `/admin` middleware behaviour.
* Missing: admin settings, analytics functions, restore/request-docs, super-admin-only rules, action-level authorization tests.

---

## 2. Unsupported metrics (documented, not invented)

| Requested | Status |
|---|---|
| Revenue / GMV / payments | **Not supported** — no payment or order table. Not shown anywhere. |
| Product approval turnaround (submit → decision) | **Not supported accurately** — no submit timestamp is stored. Reports show decision *counts* from the audit log and current queue age instead. |
| Seller/Buyer "activity timeline" beyond DB facts | Built from `created_at`, document upload/review times, audit log rows, `verified_at`. |
| Category image/attribute *definitions* | No attribute-definition table exists. Specifications are free-form per product → admin gets read-only specs. |
| Banner management | No banner table → stored as a JSON setting key (`homepage`) only. |
| Admin *invitation* by email | Needs Auth admin API/service role; **not** introduced. Super-admins promote an **existing registered user** by email. |
| CSV export | Not implemented (no export policy defined; avoids bulk PII egress). |

---

## 3. Proposed schema change (single additive migration)

`supabase/migrations/20261031110000_admin_console.sql` — nothing historical is modified; every object is `create ... if not exists` / `create or replace`.

| Object | Purpose | Rollback implication |
|---|---|---|
| `platform_settings` table (key, value jsonb, is_public, updated_by, updated_at) + RLS | Marketplace / contact / homepage / SEO settings. Public read only for `is_public` rows; **no write grants** | `drop table` (settings only; no other table depends on it) |
| `admin_set_platform_setting(key, value, is_public)` | **super_admin only**, key whitelist, object-only JSON ≤ 16 KB, audited with before/after | drop function |
| `admin_restore_product(id, reason)` | archived → `pending_review` (never straight to approved), audited | drop function |
| `admin_request_seller_documents(id, message)` | submitted/under_review only; moves submitted → under_review, stores the message in `verification_reason`, notifies seller, audited | drop function |
| `admin_dashboard_metrics()` | Single-round-trip counts (jsonb) | drop function |
| `admin_time_series(metric, days)` | Zero-filled daily buckets in **Asia/Kolkata** day boundaries | drop function |
| `admin_distribution(kind)` | Verification / product-status / category / enquiry-status distributions | drop function |
| `admin_moderation_series(kind, days)` | Approve/reject counts per day from the audit log | drop function |
| `admin_category_performance()` | Products, approved products, enquiries per category | drop function |
| `categories_delete_guard` trigger | Deleting a category requires `super_admin` (destructive taxonomy change); keeps FK `RESTRICT` as backstop | drop trigger |

All new functions are `SECURITY DEFINER`, `search_path = ''`, start with an `is_admin()` (or `is_super_admin()`) check, and have `EXECUTE` granted to `authenticated` only (revoked from `public`/`anon`).

---

## 4. Permission matrix (design)

| Capability | `admin` | `super_admin` | Enforced at |
|---|:-:|:-:|---|
| View admin console / read all admin data | ✅ | ✅ | RLS `is_admin()` + page guard |
| Review sellers (start review, approve, reject, request docs, suspend, reactivate) | ✅ | ✅ | DB RPC + action guard |
| Review verification documents | ✅ | ✅ | DB RPC |
| Moderate products (approve/reject/request changes/archive/restore, bulk) | ✅ | ✅ | DB RPC (per item) |
| Suspend / reactivate **buyer or seller** accounts | ✅ | ✅ | DB RPC |
| Create / edit categories, upload category image | ✅ | ✅ | RLS + storage policy |
| **Delete category** | ❌ | ✅ | **DB trigger (new)** + action guard |
| View audit logs / reports | ✅ | ✅ | RLS / RPC |
| Suspend / reactivate an **admin** account | ❌ | ✅ | DB RPC (existing) |
| Grant / revoke `admin` / `super_admin` | ❌ | ✅ | DB RPC (existing) |
| **Edit platform settings** | ❌ | ✅ | **DB RPC (new)** + action guard |
| Edit / delete audit logs | ❌ | ❌ | Trigger `prevent_mutation` (nobody) |
| Self-grant any role / change own status | ❌ | ❌ | DB RPC |
| Impersonate buyer/seller or edit quotation terms | ❌ | ❌ | No RPC / no UPDATE policy exists; none added |

---

## 5. Implementation plan (follows the strict order)

1. ✔ This audit.  
2. Migration + DB tests → shared admin foundation (guard, validation, queries, shell).  
3. Dashboard.  
4. Sellers.  
5. Products + bulk moderation.  
6. Buyers.  
7. Enquiries/RFQs + quotations (read-only monitoring).  
8. Categories.  
9. Admin users + audit logs.  
10. Reports, notifications, settings.  
11. Security tests + `lint`, `typecheck`, `test`, `build`.  
12. `docs/admin-completion-report.md`.

**Blockers requiring your decision:** none. The only judgment calls are the ones above (super-admin-only category delete & settings; request-changes = reject-with-feedback; no CSV export; no invitation emails). Say so if you want any changed.

