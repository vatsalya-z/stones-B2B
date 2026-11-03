# Stone Marketplace

B2B marketplace for natural stone (marble, granite, sandstone, slabs, tiles and more). Modular monolith in a pnpm + Turborepo monorepo.

## Status

Phase 0 (audit/docs) and Phase 1 (monorepo foundation) complete. See [docs/development-roadmap.md](docs/development-roadmap.md).

## Layout

- `apps/web` Next.js (public marketplace, buyer, seller, admin)
- `apps/worker` background jobs
- `packages/*` config, types, validation, utils, database, ui, email
- `supabase/` migrations, seed, functions, tests
- `docs/` architecture, schema, security, roadmap

## Commands

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in values
pnpm dev          # run web (and worker)
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format
```

## Environment variables

See [.env.example](.env.example). `NEXT_PUBLIC_*` values are public; `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SENTRY_DSN` are server-only. Use separate Supabase projects per environment.

## Docs

[architecture](docs/architecture.md) · [database schema](docs/database-schema.md) · [security](docs/security.md) · [roadmap](docs/development-roadmap.md)
