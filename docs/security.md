# Security Architecture & Controls

## Core Security Principles

1. **Authorization in Postgres RLS and Server Code**: The browser is untrusted. All database access via the client SDK runs under Row-Level Security with default-deny policies.
2. **Least Privilege**: Browser and SSR session clients operate strictly using `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Privileged administrative operations are restricted to `server-only` modules using the Supabase Service Role key.
3. **No Self-Assigned Privileges**: Roles live in the `user_roles` table, populated via the database trigger `handle_new_user()` based on registration intent (`buyer` or `seller`). The `admin` and `super_admin` roles cannot be granted by normal users or self-assigned via metadata. Only `super_admin` can grant or revoke `admin` status.
4. **Search Path Hardening**: All `SECURITY DEFINER` functions explicitly declare `set search_path = ''` to prevent search_path manipulation and privilege escalation vulnerabilities.
5. **Session Validation**: Server-side user identity verification always uses `supabase.auth.getUser()` (validating the JWT against Supabase Auth) rather than `getSession()`, mitigating session replay and cookie tampering.
6. **Immutable Audit Trails**: Critical lifecycle events (`admin_audit_logs`, `enquiry_status_history`) are protected by the `prevent_mutation()` trigger which denies all `UPDATE` and `DELETE` queries.

---

## SECURITY DEFINER Function Registry

Every privileged function in the schema has `EXECUTE` revoked from `public`, `anon`, and `authenticated` unless explicitly authorized.

| Function | Schema / Signature | Purpose & Access Boundary |
| -------- | ------------------ | ------------------------- |
| `public.has_role(_role text)` | Stable, returns `boolean` | Checks if `auth.uid()` has `_role` assigned in `user_roles`. |
| `public.is_admin()` | Stable, returns `boolean` | Checks if `auth.uid()` holds `admin` or `super_admin`. |
| `public.is_super_admin()` | Stable, returns `boolean` | Checks if `auth.uid()` holds `super_admin`. |
| `public.current_account_active()` | Stable, returns `boolean` | Verifies `profiles.account_status = 'active'` for `auth.uid()`. |
| `public.is_seller_owner(_seller_id uuid)` | Stable, returns `boolean` | Verifies `auth.uid()` owns the designated `seller_profiles` record. |
| `public.is_seller_verified(_seller_id uuid)` | Stable, returns `boolean` | Checks if the given seller has status `'verified'`. |
| `public.is_product_public(_product_id uuid)` | Stable, returns `boolean` | Verifies product is `'approved'`, not archived, and owned by a verified seller. |
| `public.is_product_owner(_product_id uuid)` | Stable, returns `boolean` | Verifies `auth.uid()` owns the product via seller relationship. |
| `public.can_access_enquiry(_enquiry_id uuid)` | Stable, returns `boolean` | Checks if `auth.uid()` is buyer, assigned seller, or admin. |
| `public.seller_can_see_buyer(_buyer_id uuid)` | Stable, returns `boolean` | Authorizes seller to read buyer profile data only if an active enquiry connects them. |
| `public.can_quote_enquiry(...)` | Stable, returns `boolean` | Validates quotation issuance eligibility for a given enquiry. |
| `public.can_view_quotation(...)` | Stable, returns `boolean` | Authorizes quotation access (drafts visible only to seller owner; sent quotes visible to buyer). |
| `public.is_draft_quotation_owner(...)` | Stable, returns `boolean` | Authorizes quotation item manipulation only on active draft quotes. |
| `public.grant_self_role(_role text)` | Volatile, returns `void` | User self-initialization strictly limited to `'buyer'` or `'seller'`. |
| `public.admin_grant_role(_user_id uuid, _role text)` | Volatile, returns `void` | Admin role delegation; granting `'admin'` requires `is_super_admin()`. Writes audit log. |
| `public.admin_revoke_role(_user_id uuid, _role text)` | Volatile, returns `void` | Revokes assigned role; revoking `'admin'` requires `is_super_admin()`. Writes audit log. |
| `public.admin_set_account_status(_user_id uuid, _status text)` | Volatile, returns `void` | Sets `active`, `suspended`, or `deactivated` status. Writes audit log. |
| `public.submit_seller_verification(_seller_id uuid)` | Volatile, returns `void` | Moves seller verification status from `'unsubmitted'` to `'submitted'`. |
| `public.admin_review_seller(...)` | Volatile, returns `void` | Admin moderation of seller verification. Mandatory reason if rejected. Writes audit log. |
| `public.admin_review_document(...)` | Volatile, returns `void` | Admin moderation of individual verification documents. Writes audit log. |
| `public.admin_moderate_product(...)` | Volatile, returns `void` | Admin approval, rejection, or archival of product listings. Mandatory reason on reject. Writes audit log. |
| `public.transition_enquiry_status(...)` | Volatile, returns `void` | State machine governing permitted lifecycle transitions for buyers and sellers. |

---

## Storage Security & Policies

Storage buckets are initialized with size constraints, MIME type restrictions, and RLS policies in `supabase/migrations/20261030100500_storage.sql`.

| Bucket Name | Public Access | Allowed MIME Types | Max Size | Path & Authorization Rule |
| ----------- | ------------- | ------------------ | -------- | ------------------------- |
| `seller-logos` | Public | JPEG, PNG, WebP, SVG | 5 MB | Key must start with `<seller_id>/`. Writes restricted to seller owner or admin. |
| `seller-cover-images` | Public | JPEG, PNG, WebP | 10 MB | Key must start with `<seller_id>/`. Writes restricted to seller owner or admin. |
| `product-images` | Public | JPEG, PNG, WebP | 15 MB | Key must start with `<seller_id>/<product_id>/`. Writes restricted to product owner. |
| `category-images` | Public | JPEG, PNG, WebP, SVG | 5 MB | Admin write only. Public read. |
| `seller-documents` | **Private** | PDF, JPEG, PNG | 20 MB | Key must start with `<seller_id>/`. Read/write restricted to seller owner or admin. |
| `enquiry-attachments`| **Private** | PDF, JPEG, PNG, DWG, DXF | 25 MB | Read restricted to participants in the associated enquiry. |

---

## Next.js Application Security

### Authentication Helpers (`apps/web/lib/auth.ts`)
- `getCurrentUser()`: Safely retrieves the authenticated user via `supabase.auth.getUser()`. Never uses cached session data without re-validation.
- `requireAuth()`: Enforces authentication; redirects unauthenticated visitors to `/login`.
- `requireBuyer()`: Enforces `buyer` role membership.
- `requireSeller()`: Enforces `seller` role membership.
- `requireAdmin()`: Enforces `admin` or `super_admin` role membership.
- `requireSuperAdmin()`: Enforces `super_admin` role membership.

### Middleware Route Protection (`apps/web/middleware.ts`)
- Automatically refreshes session tokens via cookie synchronization.
- Route prefixes `/dashboard`, `/seller`, `/buyer`, and `/admin` redirect unauthenticated visitors to `/login?next=<path>`.
- Logged-in users attempting to access `/login` or `/register` are redirected to `/dashboard`.
