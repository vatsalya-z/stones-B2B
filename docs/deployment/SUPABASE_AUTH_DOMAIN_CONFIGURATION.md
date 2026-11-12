# StoneB2B — Supabase Auth & Multi-Domain Configuration Guide

**Phase:** B6 Deployment Preflight  
**Execution Date:** 2026-11-12  
**Target:** Shared Authentication Across 4 Subdomains  
**Primary Domain:** `stonesdekho.com`  
**Shared Auth Package:** `@stone/auth` (`packages/auth`)  

---

## 1. Multi-Domain Architecture Overview

StoneB2B operates across four distinct origins in production:
1. **Public Marketplace:** `https://stonesdekho.com` (canonical root domain)
2. **Buyer Portal:** `https://buyer.stonesdekho.com`
3. **Seller Portal:** `https://seller.stonesdekho.com`
4. **Admin Operations:** `https://admin.stonesdekho.com`

All four applications share a single Supabase project backend and database. A single user identity can participate across portals depending on their assigned role (`buyer`, `seller`, `admin`, `super_admin`).

To enable seamless single sign-on (SSO) and prevent authentication desynchronization, two pillars must be properly configured:
1. **Supabase Auth Dashboard Settings:** Allowed Site URL and Redirect URLs.
2. **Cross-Subdomain Cookie Architecture:** Scoped to `.stonesdekho.com` with `SameSite=Lax` and `Secure=true`.

---

## 2. Supabase Auth Dashboard Settings

In the hosted Supabase Dashboard (**Authentication > URL Configuration**), apply the following production values:

### Site URL
```
https://stonesdekho.com
```
*(The primary canonical domain for default authentication redirects).*

### Additional Redirect URLs
The wildcard pattern `/**` ensures all callback routes, OAuth redirects, email verification links, and password reset flows are accepted across all portals and local development environments.

```
# Production Origins
https://stonesdekho.com/**
https://www.stonesdekho.com/**
https://buyer.stonesdekho.com/**
https://seller.stonesdekho.com/**
https://admin.stonesdekho.com/**

# Local Development Origins
http://localhost:3000/**
http://localhost:3001/**
http://localhost:3002/**
http://localhost:3003/**
http://127.0.0.1:3000/**
http://127.0.0.1:3001/**
http://127.0.0.1:3002/**
http://127.0.0.1:3003/**
```

---

## 3. Email Callback & Deep Link Routing

### 1. Email Verification Callback
- **Trigger:** New buyer or seller sign-up.
- **Redirect Path:** `/auth/callback?next=/onboarding`
- **Application Routing:**
  - Buyer Sign-up: `https://buyer.stonesdekho.com/auth/callback?next=/dashboard`
  - Seller Sign-up: `https://seller.stonesdekho.com/auth/callback?next=/onboarding`
- **Callback Handler Implementation:**
  - All four applications expose `/auth/callback/route.ts` powered by `@stone/auth/server`:
  ```typescript
  import { createRouteHandlerClient } from "@stone/auth/server";
  import { NextResponse } from "next/server";

  export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") ?? "/dashboard";

    if (code) {
      const supabase = await createRouteHandlerClient();
      await supabase.auth.exchangeCodeForSession(code);
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }
  ```

### 2. Password Reset Callback
- **Trigger:** "Forgot Password" requested from any portal.
- **Redirect Path:** `/auth/reset-password`
- **Origin Retention:** The reset link must redirect to the originating application's domain so the user resets their password in the relevant portal context.
- **Allowed Redirect URLs:** Covered by the wildcard entries above.

### 3. Magic Link & OTP Callbacks
- Uses PKCE (Proof Key for Code Exchange) flow via `/auth/callback?code=...`.
- Code verifications are strictly performed server-side inside Route Handlers to prevent exposing auth codes to client-side scripts.

---

## 4. Cross-Subdomain Cookie Configuration

The shared authentication library (`@stone/auth`) implements multi-subdomain cookie sharing via `getCrossSubdomainCookieOptions()`.

### Code Implementation (`packages/auth/src/server/cookies.ts`)

```typescript
export function getCrossSubdomainCookieOptions(): {
  domain: string | undefined;
  path: string;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
  httpOnly: boolean;
} {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 
    (isProduction ? ".stonesdekho.com" : undefined);

  return {
    domain: cookieDomain,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
    httpOnly: true,
  };
}
```

### Critical Rules for Subdomain Sharing:
1. **Production Leading Dot:** The cookie domain must be `.stonesdekho.com`. A cookie set with `domain=.stonesdekho.com` is automatically readable and writable by:
   - `stonesdekho.com`
   - `buyer.stonesdekho.com`
   - `seller.stonesdekho.com`
   - `admin.stonesdekho.com`
2. **Local Development Exception:** On `localhost`, browsers reject cookies set with `domain=.localhost` or cross-port domain overrides. Therefore, `domain` must resolve to `undefined` (host-only cookie) during local development on `localhost:3000-3003`.
3. **SameSite Policy:** Must remain `Lax`. Using `Strict` breaks navigation when following external email links or OAuth redirects. Using `None` requires `Secure=true` and is only necessary for third-party iframe contexts, which are not used here.

---

## 5. Cross-Subdomain SSO Evaluation

| Dimension | Verification Status | Operational Notes |
| :--- | :--- | :--- |
| **Code Implementation** | **Verified** | Shared `@stone/auth` package is consumed by all 4 applications. |
| **Local Port Isolation** | **Verified** | Local dev servers run concurrently on ports 3000, 3001, 3002, 3003 with isolated host cookies. |
| **Live Multi-Domain SSO** | **Requires External Account Configuration** | Full browser verification of cross-subdomain cookie sharing (`.stonesdekho.com`) requires live DNS resolution and valid SSL/TLS certificates on all four subdomains. Cannot be fully executed on localhost. |

---

## 6. Authentication Error Handling Across Origins

### Unauthenticated Access to Protected Portals
- **Buyer Portal (`buyer.stonesdekho.com`):** If an unauthenticated user visits `/dashboard`, middleware redirects to `/login?next=/dashboard`.
- **Seller Portal (`seller.stonesdekho.com`):** If an unauthenticated user visits `/dashboard`, middleware redirects to `/login?next=/dashboard`.
- **Admin Operations (`admin.stonesdekho.com`):** If an unauthenticated user visits `/dashboard`, middleware redirects to `/login`. Admin login strictly rejects non-admin accounts with HTTP 403 Forbidden.

### Role Mismatch Handling
- When a user logged in as a `buyer` attempts to access `admin.stonesdekho.com`:
  - Middleware inspects the user metadata and JWT roles.
  - Non-admin sessions are terminated on the admin domain or redirected to an "Access Denied" page.
- When an unverified seller accesses `seller.stonesdekho.com`:
  - Middleware intercepts and routes to `/onboarding` until KYC verification documents are submitted and approved.

---

## 7. Preflight Action Checklist

Before initiating production DNS pointing:
- [ ] Confirm Supabase Dashboard Site URL is set to `https://stonesdekho.com`.
- [ ] Confirm all 5 production wildcard URLs are added to Additional Redirect URLs.
- [ ] Verify `NEXT_PUBLIC_COOKIE_DOMAIN=.stonesdekho.com` is configured in production environment variables across all four Vercel projects.
- [ ] Verify SSL certificates are active for root and all subdomains before testing cross-domain login.

