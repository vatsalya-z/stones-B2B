# StoneB2B — Phase B6: Four-App Vercel Deployment Preflight & Production Configuration Audit Report

**Execution Date:** 2026-11-12  
**Architecture:** pnpm Monorepo + Turborepo (4 Apps + 1 Worker + Shared Packages)  
**Database:** Local Docker Supabase (`127.0.0.1:54321` API, `127.0.0.1:54322` PostgreSQL)  
**Production Deployment:** PROHIBITED (Zero external deployments performed)  
**GitHub Push:** PROHIBITED (Zero git mutations performed)  

---

## 1. Executive Summary & Acceptance Criteria Scorecard

Phase B6 was conducted as a rigorous deployment-readiness preflight and production configuration audit for StoneB2B (`StonesDekho`). All four Next.js applications (`marketplace`, `buyer`, `seller`, `admin`), the background worker (`worker`), and all shared packages were audited for independent buildability, production configuration integrity, secret containment, multi-subdomain auth readiness, and dependency isolation.

### Acceptance Criteria Scorecard

| # | Acceptance Criterion | Status | Empirical Evidence / Verification Summary |
| :- | :--- | :--- | :--- |
| **1** | Four apps build independently from monorepo root | **Verified** | `pnpm --filter @stone/<app> build` succeeded for all 4 apps (Exit code 0). |
| **2** | Four apps build independently from their respective subdirectories | **Verified** | `cd apps/<app> && pnpm build` succeeded for all 4 apps (Exit code 0). |
| **3** | Vercel project configuration documented for all 4 apps | **Verified** | Complete guide generated in `VERCEL_FOUR_PROJECT_CONFIGURATION.md`. |
| **4** | Environment variable matrix complete and sanitized | **Verified** | Sanitized matrix and `.env.production` templates in `ENVIRONMENT_VARIABLE_MATRIX.md`. |
| **5** | Zero secrets in client-side bundles verified | **Verified** | Server-only secrets audit confirmed zero exposure in client code or build outputs. |
| **6** | Supabase Auth cross-subdomain configuration documented | **Requires External Account Configuration** | Documented in `SUPABASE_AUTH_DOMAIN_CONFIGURATION.md`. Full cross-subdomain cookie verification requires live HTTPS DNS deployment. |
| **7** | Storage bucket policies and signed URL generation verified | **Verified** | Audited migration `20261030100500_storage.sql` and signed URL generator (300s to 3600s TTLs). |
| **8** | Background worker production deployment plan documented | **Verified** | Full BullMQ / Redis architecture documented in `WORKER_PRODUCTION_DEPLOYMENT_PLAN.md`. |
| **9** | Turborepo selective build behavior verified across 7 test cases | **Verified** | 7-scenario empirical test harness executed; detailed in `SELECTIVE_DEPLOYMENT_VERIFICATION.md`. |
| **10** | Financial consistency verified across database and code | **Verified** | Audited `subscription_plans` table (`free`, `pro`, `enterprise`); Payment Model B preserved. |
| **11** | Whole-monorepo typecheck passes | **Verified** | `pnpm -r typecheck` passed with 0 errors across all 14 workspace packages. |
| **12** | Whole-monorepo lint passes | **Verified** | `pnpm -r lint` passed with 0 errors across all 14 workspace packages. |

---

## 2. Four Applications Independent Build Preflight

All four applications were subjected to two independent build modes:
1. **Root Filtered Build:** `pnpm --filter @stone/<app> build`
2. **Subdirectory Direct Build:** `cd apps/<app> && pnpm build`

### Build Results Matrix

| Application | Workspace Package | Production Target | Routes Compiled | Subdirectory Build Result | Root Filtered Build Result | Build Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Marketplace** | `@stone/marketplace` | `stonesdekho.com` | 30 routes | **PASS (Code 0)** | **PASS (Code 0)** | ~18.6s |
| **Buyer Portal** | `@stone/buyer` | `buyer.stonesdekho.com` | 24 routes | **PASS (Code 0)** | **PASS (Code 0)** | ~15.2s |
| **Seller Portal** | `@stone/seller` | `seller.stonesdekho.com` | 29 routes | **PASS (Code 0)** | **PASS (Code 0)** | ~17.4s |
| **Admin Operations** | `@stone/admin` | `admin.stonesdekho.com` | 26 routes | **PASS (Code 0)** | **PASS (Code 0)** | ~16.8s |

**Concurrent Monorepo Build:**
- Command: `pnpm build:apps`
- Result: **PASS (Code 0)** across all 4 applications in 51.9 seconds.

---

## 3. Vercel Working Directory & Root Directory Finding

### The Critical Finding
Setting Vercel's Root Directory to `apps/<app>` while overriding the build command to `cd ../.. && pnpm --filter ... build` is **NOT recommended**. When Vercel's build runner changes directories to the root, the output collector expects build artifacts at `.next` relative to the configured root (`apps/<app>/.next`), leading to deployment failures or path ambiguities.

### The Recommended Architecture
- **Root Directory:** `apps/<app>` (e.g. `apps/marketplace`)
- **Build Command:** `pnpm build`
- **Output Directory:** `.next`
- **Install Command:** Default (Vercel automatically detects parent `pnpm-lock.yaml`)
- **Ignored Build Step:** `npx turbo-ignore --task=@stone/<app>#build`

Each application's `next.config.mjs` configures `transpilePackages` covering all shared packages (`@stone/auth`, `@stone/database`, `@stone/types`, `@stone/ui`, `@stone/utils`, `@stone/validation`), ensuring seamless just-in-time compilation during `pnpm build`.

---

## 4. Environment Variables & Secret Hygiene

### Secret Separation
- **Public Variables (`NEXT_PUBLIC_*`):** Confined strictly to URLs and the Supabase public anon key.
- **Server-Only Secrets:** `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `RAZORPAY_KEY_SECRET`.
- **Zero Client Bundle Leakage:** Audited client components for unwanted imports. Service keys are restricted exclusively to `@stone/auth/server`, `@stone/database`, and server route handlers. Next.js automatically purges non-`NEXT_PUBLIC_` variables from browser JavaScript chunks.

---

## 5. Storage Buckets & File Upload Security

Inspection of `supabase/migrations/20261030100500_storage.sql` and storage helpers confirmed:
1. **Public Buckets (Direct CDN Delivery):**
   - `product-images` (Max size: 5MB; MIME: `image/jpeg`, `image/png`, `image/webp`)
   - `seller-logos` (Max size: 2MB; MIME: `image/jpeg`, `image/png`, `image/webp`)
   - `seller-cover-images` (Max size: 5MB; MIME: `image/jpeg`, `image/png`, `image/webp`)
   - `category-images` (Max size: 2MB; MIME: `image/jpeg`, `image/png`, `image/webp`)
2. **Private Buckets (Access via Authenticated / Signed URLs Only):**
   - `seller-verification-documents`: `public: false` (Max size: 10MB; MIME: `image/*`, `application/pdf`). RLS strictly allows access only to the owning seller and platform administrators.
   - `enquiry-attachments`: `public: false` (Max size: 10MB; MIME: `image/*`, `application/pdf`). RLS strictly allows access only to the inquiry buyer and matched sellers.
3. **Signed URL Expiration Lifetimes:**
   - Temporary customer attachments: 300 to 900 seconds (5 to 15 minutes).
   - Admin KYC verification review: 3600 seconds (1 hour).

---

## 6. Financial & Subscription Consistency Audit

Inspection of the PostgreSQL database and application code verified complete consistency:
1. **Database Subscription Plans (`public.subscription_plans`):**
   - `free`: ₹0 / month — 5 listings, 5 monthly leads.
   - `pro`: ₹2,999 / month — 100 listings, 50 monthly leads.
   - `enterprise`: ₹9,999 / month — Unlimited listings, unlimited leads.
2. **Frontend UI Alignment:**
   - `apps/seller/components/seller/subscription/plan-comparison.tsx` and all pricing screens strictly reference `"free" | "pro" | "enterprise"`. Zero occurrences of deprecated plan labels ("starter", "growth").
3. **Payment Model B Preservation:**
   - Buyer and seller interfaces treat `payment_status` as strictly read-only.
   - Financial state changes occur exclusively through PostgreSQL stored procedures (`transition_order_status`) upon verified payment gateway webhook settlement.

---

## 7. Turborepo Selective Build Verification

The 7-scenario selective build simulation proved:
1. Changing `apps/marketplace` only triggers `@stone/marketplace`.
2. Changing `apps/buyer` only triggers `@stone/buyer`.
3. Changing `apps/seller` only triggers `@stone/seller`.
4. Changing `apps/admin` only triggers `@stone/admin`.
5. Changing `packages/auth` invalidates all 4 applications + `@stone/web`.
6. Changing `packages/ui` invalidates all 4 applications + `@stone/web`.
7. Changing `packages/database` invalidates all 4 applications + `@stone/web`.

This guarantees that a commit affecting only the Buyer portal will cancel builds for Marketplace, Seller, and Admin within 2 seconds on Vercel, conserving build quotas.

---

## 8. Whole-Monorepo Code Quality

- **Typecheck (`pnpm -r typecheck`):** Succeeded with **0 errors** across all 14 workspace packages:
  - `apps/marketplace`, `apps/buyer`, `apps/seller`, `apps/admin`, `apps/worker`, `apps/web`
  - `packages/auth`, `packages/config`, `packages/database`, `packages/email`, `packages/types`, `packages/ui`, `packages/utils`, `packages/validation`
- **Lint (`pnpm -r lint`):** Succeeded with **0 errors** across all 14 workspace packages.

---

## 9. Rollback Baseline Integrity

The original unified application `apps/web` remains **100% intact and untouched**:
- Contains the complete historical implementation.
- Builds and typechecks cleanly against workspace packages.
- Serves as an immediate rollback baseline if any issues arise during progressive production cutover.

---

## 10. Safety Affirmations (Actions NOT Performed)

In strict compliance with Phase B6 safety rules:
- **NO** deployment to Vercel was initiated.
- **NO** DNS records were created or modified.
- **NO** code was pushed to GitHub.
- **NO** git commits or branch merges were performed.
- **NO** database schema migrations were executed.
- **NO** mutations were made to hosted Supabase (`rgmasamasslqintssyrh`).
- **NO** secrets were exposed in logs or documentation.

