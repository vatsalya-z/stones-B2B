# StoneB2B — Vercel Four-Application Deployment & Infrastructure Guide

This guide documents the architecture, configuration, environment variables, and deployment settings required to deploy StoneB2B as **four independent applications** from this single monorepo to Vercel.

---

## 1. Project Overview & Production Domains

| Application | Monorepo Directory | Package Name | Vercel Project Name | Production Domain | Port (Local Dev) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Public Marketplace** | `apps/marketplace` | `@stone/marketplace` | `stoneb2b-marketplace` | `https://stonesdekho.com` | `3000` |
| **Buyer Portal** | `apps/buyer` | `@stone/buyer` | `stoneb2b-buyer` | `https://buyer.stonesdekho.com` | `3001` |
| **Seller Portal** | `apps/seller` | `@stone/seller` | `stoneb2b-seller` | `https://seller.stonesdekho.com` | `3002` |
| **Admin Operations** | `apps/admin` | `@stone/admin` | `stoneb2b-admin` | `https://admin.stonesdekho.com` | `3003` |

---

## 2. Vercel Project Settings (Per Project)

Create **four separate projects** in the Vercel Dashboard connected to the same GitHub repository:

### A. Project 1: `stoneb2b-marketplace`
- **Root Directory:** `apps/marketplace`
- **Framework Preset:** Next.js
- **Build Command:** `next build` (or default)
- **Output Directory:** `.next` (default)
- **Install Command:** `pnpm install`
- **Domains:**
  - `stonesdekho.com` (Production, Canonical)
  - `www.stonesdekho.com` (Redirects to `stonesdekho.com`)
- **Ignored Build Step Command:**
  ```bash
  npx turbo-ignore
  ```

### B. Project 2: `stoneb2b-buyer`
- **Root Directory:** `apps/buyer`
- **Framework Preset:** Next.js
- **Build Command:** `next build` (or default)
- **Output Directory:** `.next` (default)
- **Install Command:** `pnpm install`
- **Domains:**
  - `buyer.stonesdekho.com`
- **Ignored Build Step Command:**
  ```bash
  npx turbo-ignore
  ```

### C. Project 3: `stoneb2b-seller`
- **Root Directory:** `apps/seller`
- **Framework Preset:** Next.js
- **Build Command:** `next build` (or default)
- **Output Directory:** `.next` (default)
- **Install Command:** `pnpm install`
- **Domains:**
  - `seller.stonesdekho.com`
- **Ignored Build Step Command:**
  ```bash
  npx turbo-ignore
  ```

### D. Project 4: `stoneb2b-admin`
- **Root Directory:** `apps/admin`
- **Framework Preset:** Next.js
- **Build Command:** `next build` (or default)
- **Output Directory:** `.next` (default)
- **Install Command:** `pnpm install`
- **Domains:**
  - `admin.stonesdekho.com`
- **Ignored Build Step Command:**
  ```bash
  npx turbo-ignore
  ```

---

## 3. Selective Deployment & Build Caching (Turborepo)

With `npx turbo-ignore` configured in the **Ignored Build Step** for each Vercel project:

1. **Marketplace-only change:**
   - Git push triggers Vercel.
   - Vercel checks `stoneb2b-marketplace`: changes detected -> **BUILDS & DEPLOYS**.
   - Vercel checks `stoneb2b-buyer`: no changes -> **SKIPS BUILD** (0 build minutes consumed).
   - Vercel checks `stoneb2b-seller`: no changes -> **SKIPS BUILD**.
   - Vercel checks `stoneb2b-admin`: no changes -> **SKIPS BUILD**.

2. **Shared package change (e.g. `packages/auth` or `packages/ui`):**
   - Turborepo dependency graph detects that `packages/auth` is a dependency of all four apps.
   - All four applications build and deploy automatically to stay synchronized.

---

## 4. Environment Variables Matrix

All four applications connect to the same Supabase database and authentication infrastructure.

| Variable Name | Required Scope | Value in Production | Value in Local Dev |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | All 4 Projects | `https://rgmasamasslqintssyrh.supabase.co` | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All 4 Projects | `<prod-anon-key>` | `<local-anon-key>` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (Admin & Cron) | `<prod-service-role-key>` | `<local-service-role-key>` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | All 4 Projects | `stonesdekho.com` | `localhost` |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | All 4 Projects | `.stonesdekho.com` | `undefined` (Host-only) |
| `NEXT_PUBLIC_MARKETPLACE_URL` | All 4 Projects | `https://stonesdekho.com` | `http://localhost:3000` |
| `NEXT_PUBLIC_BUYER_URL` | All 4 Projects | `https://buyer.stonesdekho.com` | `http://localhost:3001` |
| `NEXT_PUBLIC_SELLER_URL` | All 4 Projects | `https://seller.stonesdekho.com` | `http://localhost:3002` |
| `NEXT_PUBLIC_ADMIN_URL` | All 4 Projects | `https://admin.stonesdekho.com` | `http://localhost:3003` |
| `CRON_SECRET` | Marketplace / Worker | `<secure-random-secret>` | `<dev-secret>` |

---

## 5. Cross-Subdomain Single Sign-On (SSO)

Cross-subdomain SSO is powered by `@stone/auth/server`:

1. When a user logs in on `stonesdekho.com/login`, Supabase session cookies (`sb-<project>-auth-token`) are written with:
   - `domain: ".stonesdekho.com"`
   - `sameSite: "lax"`
   - `secure: true`
   - `path: "/"`
2. Because the cookie domain is `.stonesdekho.com`, modern browsers automatically transmit the session cookies to:
   - `buyer.stonesdekho.com`
   - `seller.stonesdekho.com`
   - `admin.stonesdekho.com`
3. Each portal validates the session JWT cryptographically via `supabase.auth.getUser()` and verifies roles in `public.user_roles`.
4. In local development (`localhost`), cookie domains remain `undefined` (host-only) so all ports share authentication without domain conflicts.

