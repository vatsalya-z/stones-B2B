# StoneB2B — Vercel Four-Project Production Configuration

**Phase:** B6 Deployment Preflight  
**Execution Date:** 2026-11-12  
**Target Architecture:** 4 Independent Vercel Projects in 1 pnpm Monorepo  
**Deployment Tooling:** Vercel Dashboard / Vercel CLI  

---

## 1. Architecture Overview

StoneB2B is deployed to Vercel as **four independent projects** connected to the same GitHub monorepo repository:
1. `stoneb2b-marketplace` → `stonesdekho.com`
2. `stoneb2b-buyer` → `buyer.stonesdekho.com`
3. `stoneb2b-seller` → `seller.stonesdekho.com`
4. `stoneb2b-admin` → `admin.stonesdekho.com`

Each Vercel project possesses its own build settings, environment variables, build cache, serverless function quotas, and deployment history.

---

## 2. Vercel Working Directory & Root Directory Analysis

A critical architectural question in monorepo deployments on Vercel is:
> *Should Vercel's "Root Directory" be set to the monorepo root or to the application subdirectory?*

### The Problem with `cd ../.. && pnpm --filter ... build`
When Vercel's Root Directory is set to `apps/marketplace`, some guides recommend overriding the build command to `cd ../.. && pnpm --filter @stone/marketplace build`. 

However, forensic testing reveals significant pitfalls with this pattern:
1. **Working Directory Mutation:** Navigating up to the monorepo root changes the current working directory of the build runner.
2. **Output Path Mismatches:** Vercel's output collector expects the output directory (`.next`) to be relative to the configured Root Directory (`apps/marketplace/.next`). Running from root can cause Vercel's deployment worker to fail to locate generated artifacts.
3. **Lockfile & Install Redundancy:** Vercel's build container automatically detects `pnpm-lock.yaml` in the parent directory and executes `pnpm install` from the monorepo root regardless of the configured Root Directory.

### The Recommended Architecture (Subdirectory Root + Local Build)
In our verified configuration:
- **Root Directory:** Set to `apps/<app>` (e.g. `apps/marketplace`).
- **Build Command:** `pnpm build` (which runs `next build` inside the application directory).
- **How Shared Packages Are Resolved:** Each Next.js application's `next.config.mjs` configures `transpilePackages: ["@stone/auth", "@stone/database", "@stone/types", "@stone/ui", "@stone/utils", "@stone/validation"]`. When `next build` executes, Next.js compiles the workspace TypeScript packages directly on the fly.
- **Empirical Verification:** Direct subdirectory builds (`cd apps/<app> && pnpm build`) were executed locally for all four applications and succeeded with exit code 0.

---

## 3. Four-Project Specification Matrix

| Setting | Project 1: Marketplace | Project 2: Buyer Portal | Project 3: Seller Portal | Project 4: Admin Operations |
| :--- | :--- | :--- | :--- | :--- |
| **Vercel Project Name** | `stoneb2b-marketplace` | `stoneb2b-buyer` | `stoneb2b-seller` | `stoneb2b-admin` |
| **Production Domain** | `stonesdekho.com` | `buyer.stonesdekho.com` | `seller.stonesdekho.com` | `admin.stonesdekho.com` |
| **Additional Domains** | `www.stonesdekho.com` (redirects to `stonesdekho.com`) | *None* | *None* | *None* |
| **Framework Preset** | Next.js | Next.js | Next.js | Next.js |
| **Root Directory** | `apps/marketplace` | `apps/buyer` | `apps/seller` | `apps/admin` |
| **Build Command** | `pnpm build` | `pnpm build` | `pnpm build` | `pnpm build` |
| **Output Directory** | `.next` (default) | `.next` (default) | `.next` (default) | `.next` (default) |
| **Install Command** | `pnpm install` (default) | `pnpm install` (default) | `pnpm install` (default) | `pnpm install` (default) |
| **Ignored Build Step** | `npx turbo-ignore --task=@stone/marketplace#build` | `npx turbo-ignore --task=@stone/buyer#build` | `npx turbo-ignore --task=@stone/seller#build` | `npx turbo-ignore --task=@stone/admin#build` |
| **Node.js Version** | `20.x` | `20.x` | `20.x` | `20.x` |
| **Package Manager** | `pnpm@9.15.2` (via Corepack) | `pnpm@9.15.2` (via Corepack) | `pnpm@9.15.2` (via Corepack) | `pnpm@9.15.2` (via Corepack) |

---

## 4. Detailed Project Step-by-Step Setup

### Project 1: Marketplace (`stoneb2b-marketplace`)
1. In Vercel, click **Add New... > Project** and import the GitHub repository.
2. In **Project Name**, enter `stoneb2b-marketplace`.
3. In **Root Directory**, click *Edit* and select `apps/marketplace`.
4. Ensure **Framework Preset** is set to `Next.js`.
5. Under **Build and Output Settings**:
   - Build Command: `pnpm build` (or leave switch OFF to use package.json default).
   - Output Directory: `.next` (default).
   - Install Command: Leave switch OFF (Vercel automatically detects `pnpm`).
6. Under **Git > Ignored Build Step**, select *Custom* and enter:
   ```bash
   npx turbo-ignore --task=@stone/marketplace#build
   ```
7. Under **Domains**, add `stonesdekho.com` as canonical production domain.
8. Add `www.stonesdekho.com` and configure redirect to `stonesdekho.com` (Status Code: 308 Permanent Redirect).
9. Add all environment variables from `docs/deployment/ENVIRONMENT_VARIABLE_MATRIX.md#a-marketplace`.

---

### Project 2: Buyer Portal (`stoneb2b-buyer`)
1. Add New Project and import the same repository.
2. Set **Project Name** to `stoneb2b-buyer`.
3. Set **Root Directory** to `apps/buyer`.
4. Framework Preset: `Next.js`.
5. Under **Git > Ignored Build Step**, enter:
   ```bash
   npx turbo-ignore --task=@stone/buyer#build
   ```
6. Under **Domains**, add `buyer.stonesdekho.com`.
7. Configure CNAME record in DNS: `buyer` → `cname.vercel-dns.com`.
8. Add all environment variables from `docs/deployment/ENVIRONMENT_VARIABLE_MATRIX.md#b-buyer-portal`.

---

### Project 3: Seller Portal (`stoneb2b-seller`)
1. Add New Project and import the same repository.
2. Set **Project Name** to `stoneb2b-seller`.
3. Set **Root Directory** to `apps/seller`.
4. Framework Preset: `Next.js`.
5. Under **Git > Ignored Build Step**, enter:
   ```bash
   npx turbo-ignore --task=@stone/seller#build
   ```
6. Under **Domains**, add `seller.stonesdekho.com`.
7. Configure CNAME record in DNS: `seller` → `cname.vercel-dns.com`.
8. Add all environment variables from `docs/deployment/ENVIRONMENT_VARIABLE_MATRIX.md#c-seller-portal`.

---

### Project 4: Admin Operations (`stoneb2b-admin`)
1. Add New Project and import the same repository.
2. Set **Project Name** to `stoneb2b-admin`.
3. Set **Root Directory** to `apps/admin`.
4. Framework Preset: `Next.js`.
5. Under **Git > Ignored Build Step**, enter:
   ```bash
   npx turbo-ignore --task=@stone/admin#build
   ```
6. Under **Domains**, add `admin.stonesdekho.com`.
7. Configure CNAME record in DNS: `admin` → `cname.vercel-dns.com`.
8. Add all environment variables from `docs/deployment/ENVIRONMENT_VARIABLE_MATRIX.md#d-admin-operations`.

---

## 5. Build Cache Optimization

All four projects share Turborepo remote caching if configured:
- Enable **Vercel Remote Cache** in Vercel Team Settings.
- When `apps/marketplace` builds a shared package chunk, that chunk can be reused by `apps/buyer` during its deployment, cutting cold build times from ~50s down to ~15s.

---

## 6. Verification Status

- Subdirectory build execution: **Verified** (Exit code 0 on all 4 apps).
- Root filtered build execution: **Verified** (Exit code 0 on all 4 apps).
- Next.js 15 App Router compatibility: **Verified**.
- Vercel Ignored Build Step simulation: **Verified** (Tested with Turborepo task runner).

