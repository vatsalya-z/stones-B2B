# Architecture

## Phase 0 audit summary

| Item                              | Finding                                                                                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                        | Greenfield. Only `README.md` (`# Stone_B2B`) from the initial commit.                                                                                                                                 |
| Branch                            | `vatsalya` (clean tree; `main` = initial commit)                                                                                                                                                      |
| Existing code, components, assets | None                                                                                                                                                                                                  |
| Supabase                          | CLI present at `/opt/homebrew/bin/supabase`; no `supabase/` dir, no migrations, no linked project. Docker is **not installed**, so `supabase start` (local DB, RLS tests) is unavailable until it is. |
| Toolchain                         | Node 24.22, pnpm 11.27, npm 11.19                                                                                                                                                                     |
| Figma                             | Design URL provided, but no Figma tool is connected to this agent. **UI cannot be reproduced faithfully until access is provided** (see Risks).                                                       |

## Style: modular monolith

One Next.js app (`apps/web`) holds the public marketplace, buyer, seller and admin areas as route groups. A small `apps/worker` handles async jobs. No microservices.

```
apps/web      Next.js App Router (RSC by default; Server Actions for internal mutations; Route Handlers for webhooks/external APIs)
apps/worker   Background jobs (email retries, notifications, media). Starts as a stub; BullMQ/Redis only when volume justifies it.
packages/config      Shared tsconfig / ESLint / Prettier presets
packages/types       Shared domain types and enums (roles, statuses)
packages/validation  Shared Zod schemas (env + domain input)
packages/utils       Pure helpers (slugify, money, pagination)
packages/database    Supabase clients (browser / server / admin) and generated DB types
packages/ui          Design tokens + shared components (filled in Phase 3 from Figma)
packages/email       Provider-agnostic email interface (Resend adapter)
supabase/            Migrations, seed, edge functions, SQL tests
```

### Domain boundaries (inside `apps/web/features/*`)

`auth`, `sellers`, `catalogue`, `search`, `suppliers`, `enquiries`, `quotations`, `messaging`, `notifications`, `admin`, `seo`. Each feature owns its queries, actions and components; cross-feature access goes through exported APIs, not deep imports.

## Key decisions

1. **Security boundary = Postgres RLS + server-side checks.** UI hiding is never authorization.
2. **Three Supabase clients** in `packages/database`: `browser` (publishable key), `server` (cookie session, publishable key), `admin` (secret/service key, `server-only`, never imported by client code).
3. **Env validation** with Zod; server-only secrets are parsed in a separate schema that is never imported by client bundles.
4. **Keys:** uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` as requested in the spec (works with the new publishable key value too).
5. **Money/quantity** = `numeric`; currency stored per row (`INR` default) for future expansion. Country/locale columns on seller and platform settings.
6. **Search:** Postgres full-text (`tsvector` + GIN) plus `pg_trgm`, behind a single query module so it can be swapped later.
7. **Roles:** `user_roles` table (many-to-many), writable only by trusted server paths; never from client metadata.
8. **Tailwind 3.4** chosen for stable, well-supported tooling with shadcn/ui; revisit v4 later.

## Assumptions (to confirm)

- A user can hold both buyer and seller roles.
- Seller contact details are hidden from the public; contact happens through enquiries.
- Quote acceptance is not a payment or order; Razorpay is a later phase.
- Default locale `en-IN`, currency `INR`.

## Risks and dependencies

| Risk                              | Impact                                 | Mitigation                                                                    |
| --------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| No Figma access                   | UI fidelity (tokens, layouts)          | Connect the Figma plugin or export tokens/screens; Phase 3 is blocked on this |
| No Docker                         | Cannot run local Supabase or RLS tests | Install Docker Desktop, or provide a hosted dev Supabase project              |
| No Supabase project credentials   | Cannot deploy migrations or run auth   | User supplies dev project; no deployment without approval                     |
| RLS complexity (messages, quotes) | Data leakage                           | `SECURITY DEFINER` helpers, pgTAP tests per table                             |
| Private storage + signed URLs     | Document exposure                      | Private buckets, path-prefixed policies                                       |
