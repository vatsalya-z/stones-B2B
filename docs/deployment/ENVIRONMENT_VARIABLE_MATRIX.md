# StoneB2B — Environment Variable Audit Matrix & Production Templates

**Phase:** B6 Deployment Preflight  
**Execution Date:** 2026-11-12  
**Target:** Four Vercel Applications + Background Worker  
**Security Status:** Sanitized (No real secrets or API keys contained)  

---

## 1. Master Environment Variable Matrix

| Variable Name | Owning Application(s) | Scope | Req / Opt | Local Dev Value | Production Requirement | Secret Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Marketplace, Buyer, Seller, Admin | Client & Server | **Required** | `http://127.0.0.1:54321` | Hosted Supabase project URL (`https://<project-ref>.supabase.co`) | Non-Secret |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Marketplace, Buyer, Seller, Admin | Client & Server | **Required** | Local GoTrue Anon Key | Hosted Supabase public anon key | Non-Secret (Public API Key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Marketplace, Buyer, Seller, Admin, Worker | **Server-Only** | **Required** | Local GoTrue Service Key | Hosted Supabase service-role key (Admin bypass) | **CRITICAL SECRET** |
| `NEXT_PUBLIC_APP_URL` | Marketplace | Client & Server | **Required** | `http://localhost:3000` | `https://stonesdekho.com` | Non-Secret |
| `NEXT_PUBLIC_APP_URL` | Buyer | Client & Server | **Required** | `http://localhost:3001` | `https://buyer.stonesdekho.com` | Non-Secret |
| `NEXT_PUBLIC_APP_URL` | Seller | Client & Server | **Required** | `http://localhost:3002` | `https://seller.stonesdekho.com` | Non-Secret |
| `NEXT_PUBLIC_APP_URL` | Admin | Client & Server | **Required** | `http://localhost:3003` | `https://admin.stonesdekho.com` | Non-Secret |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Marketplace, Buyer, Seller, Admin | Client & Server | **Required** | *Empty / undefined* | `.stonesdekho.com` | Non-Secret |
| `NEXT_PUBLIC_MARKETPLACE_URL` | Buyer, Seller, Admin | Client & Server | **Required** | `http://localhost:3000` | `https://stonesdekho.com` | Non-Secret |
| `NEXT_PUBLIC_BUYER_URL` | Marketplace, Seller, Admin | Client & Server | **Required** | `http://localhost:3001` | `https://buyer.stonesdekho.com` | Non-Secret |
| `NEXT_PUBLIC_SELLER_URL` | Marketplace, Buyer, Admin | Client & Server | **Required** | `http://localhost:3002` | `https://seller.stonesdekho.com` | Non-Secret |
| `NEXT_PUBLIC_ADMIN_URL` | Marketplace, Buyer, Seller | Client & Server | **Required** | `http://localhost:3003` | `https://admin.stonesdekho.com` | Non-Secret |
| `DATABASE_URL` | Marketplace, Buyer, Seller, Admin, Worker | **Server-Only** | **Required** | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Supabase Transaction Pooler URL (Port 6543, Session/Transaction mode) | **CRITICAL SECRET** |
| `DIRECT_URL` | Marketplace, Buyer, Seller, Admin | **Server-Only** | Optional | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Supabase Direct Session Connection URL (Port 5432) | **CRITICAL SECRET** |
| `RESEND_API_KEY` / `SMTP_HOST` | Marketplace, Buyer, Seller, Admin, Worker | **Server-Only** | Optional | *Mock / Local stubs* | Transactional email provider API key / SMTP host | **SECRET** |
| `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Worker | **Server-Only** | Optional | *Empty* | SMTP credentials for background notification dispatches | **SECRET** |
| `REDIS_URL` | Worker, Marketplace, Admin | **Server-Only** | **Required** (for Worker) | `redis://127.0.0.1:6379` | Managed Redis connection string (`rediss://...`) | **SECRET** |
| `RAZORPAY_KEY_ID` | Marketplace, Buyer, Seller | Client & Server | Optional | *Mock key* | Public Razorpay key ID (`rzp_live_...`) | Non-Secret |
| `RAZORPAY_KEY_SECRET` | Marketplace, Buyer, Seller | **Server-Only** | Optional | *Mock secret* | Razorpay secret key for webhook signature verification | **CRITICAL SECRET** |
| `RAZORPAY_WEBHOOK_SECRET` | Marketplace, Buyer, Seller | **Server-Only** | Optional | *Mock secret* | Webhook verification secret | **CRITICAL SECRET** |

---

## 2. Client-Side Bundle Secret Audit & Verification

A forensic inspection of all client-side code and build artifacts was conducted:
1. **`NEXT_PUBLIC_*` Prefix Review:**
   - Only non-sensitive URLs (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BUYER_URL`, etc.) and public API tokens (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`) utilize the `NEXT_PUBLIC_` prefix.
   - The Supabase anon key is explicitly designed by Supabase for public browser usage; data access is secured exclusively via PostgreSQL Row Level Security (RLS).
2. **Server-Side Boundary Enforcement:**
   - `SUPABASE_SERVICE_ROLE_KEY` is referenced solely inside `@stone/database` server clients, `@stone/auth/server`, and backend API route handlers.
   - Zero occurrences of `SUPABASE_SERVICE_ROLE_KEY` exist in any client component (`"use client"`).
   - In Next.js App Router, variables without `NEXT_PUBLIC_` are stripped from client bundles during compilation.
3. **Verdict:** **PASSED (Zero Secrets in Client Bundles)**.

---

## 3. Production Environment Templates

The following sanitized templates should be applied to each respective project in the Vercel Dashboard (**Project Settings > Environment Variables**) and the worker hosting platform.

### A. Marketplace (`apps/marketplace` — Vercel Project: `stoneb2b-marketplace`)

```env
# Application Identity
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://stonesdekho.com
NEXT_PUBLIC_COOKIE_DOMAIN=.stonesdekho.com

# Cross-Portal Navigation Links
NEXT_PUBLIC_MARKETPLACE_URL=https://stonesdekho.com
NEXT_PUBLIC_BUYER_URL=https://buyer.stonesdekho.com
NEXT_PUBLIC_SELLER_URL=https://seller.stonesdekho.com
NEXT_PUBLIC_ADMIN_URL=https://admin.stonesdekho.com

# Supabase Auth & Backend (Public)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Server-Only (Bypass RLS for Public Inquiries / Service operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Connection (Server-Only)
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

---

### B. Buyer Portal (`apps/buyer` — Vercel Project: `stoneb2b-buyer`)

```env
# Application Identity
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://buyer.stonesdekho.com
NEXT_PUBLIC_COOKIE_DOMAIN=.stonesdekho.com

# Cross-Portal Navigation Links
NEXT_PUBLIC_MARKETPLACE_URL=https://stonesdekho.com
NEXT_PUBLIC_BUYER_URL=https://buyer.stonesdekho.com
NEXT_PUBLIC_SELLER_URL=https://seller.stonesdekho.com
NEXT_PUBLIC_ADMIN_URL=https://admin.stonesdekho.com

# Supabase Auth & Backend (Public)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Server-Only
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Connection (Server-Only)
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

---

### C. Seller Portal (`apps/seller` — Vercel Project: `stoneb2b-seller`)

```env
# Application Identity
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://seller.stonesdekho.com
NEXT_PUBLIC_COOKIE_DOMAIN=.stonesdekho.com

# Cross-Portal Navigation Links
NEXT_PUBLIC_MARKETPLACE_URL=https://stonesdekho.com
NEXT_PUBLIC_BUYER_URL=https://buyer.stonesdekho.com
NEXT_PUBLIC_SELLER_URL=https://seller.stonesdekho.com
NEXT_PUBLIC_ADMIN_URL=https://admin.stonesdekho.com

# Supabase Auth & Backend (Public)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Server-Only
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Connection (Server-Only)
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

---

### D. Admin Operations (`apps/admin` — Vercel Project: `stoneb2b-admin`)

```env
# Application Identity
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://admin.stonesdekho.com
NEXT_PUBLIC_COOKIE_DOMAIN=.stonesdekho.com

# Cross-Portal Navigation Links
NEXT_PUBLIC_MARKETPLACE_URL=https://stonesdekho.com
NEXT_PUBLIC_BUYER_URL=https://buyer.stonesdekho.com
NEXT_PUBLIC_SELLER_URL=https://seller.stonesdekho.com
NEXT_PUBLIC_ADMIN_URL=https://admin.stonesdekho.com

# Supabase Auth & Backend (Public)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Server-Only (Mandatory for KYC Document Review and Admin RPCs)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Connection (Server-Only)
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

---

### E. Background Worker (`apps/worker` — Railway / Render)

```env
NODE_ENV=production

# Database & Supabase Server Credentials
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://<your-project-ref>.supabase.co

# Redis Connection (TLS required in production)
REDIS_URL=rediss://default:<password>@<redis-host>:6379

# Email Delivery Provider (Resend / AWS SES)
RESEND_API_KEY=re_123456789...
FROM_EMAIL=no-reply@stonesdekho.com
SUPPORT_EMAIL=support@stonesdekho.com
```

