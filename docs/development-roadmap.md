# Development Roadmap

| Phase | Scope | Status | Notes |
| ----- | ----- | ------ | ----- |
| 0 | Audit, architecture, schema, security docs | **Done** | Architecture specifications and documentation complete. |
| 1 | Monorepo foundation, shared packages, Supabase clients, env validation, CI | **Done** | Turbo monorepo configured, workspace dependencies linked, CI scripts verified. |
| 2 | Supabase Database, Authentication & Security Implementation | **Done** | 6 migration files, 15 tables/views, 6 storage buckets, 130 database tests passing via PGlite, auth UI & Server Actions built, build passes. |
| 3 | Design system + public marketplace | **Pending** | Reproduce approved Figma designs: homepage, search results, product detail, supplier directory, storefront. |
| 4 | Seller module | **Pending** | Seller onboarding, storefront management, product catalogue, enquiry inbox. |
| 5 | Buyer module, enquiries, RFQ, quotes | **Pending** | RFQ form, enquiry management, quotation comparison & acceptance. |
| 6 | Messaging, notifications, email | **Pending** | Real-time chat, transactional notifications, email worker integration. |
| 7 | Admin console | **Pending** | Seller verification review, product moderation, category management, audit log viewer. |
| 8 | SEO and performance | **Pending** | Dynamic metadata, JSON-LD schemas, image optimization, edge caching. |
| 9 | QA, E2E, security tests, release | **Pending** | Playwright test suites, vulnerability audit, staging deployment. |

---

## Phase 2 Implementation Summary

- **Database Migrations (`supabase/migrations/`)**: 6 migration files implementing identity, seller profiles, verification documents, category hierarchy, product catalog, search vectors, enquiries, quotations, notifications, and storage policies.
- **Automated Test Suite**: 130 automated tests in `@stone/database` running against an in-process PostgreSQL instance (PGlite) with 100% pass rate.
- **Authentication System (`apps/web`)**:
  - Login, buyer registration, seller registration, forgot password, reset password, email verification, pending seller review state, and unauthorized screen.
  - Server Actions with Zod input validation and PKCE exchange callback handlers.
  - Role-based server guards (`requireAuth`, `requireBuyer`, `requireSeller`, `requireAdmin`, `requireSuperAdmin`).
  - Edge middleware session refresh and route protection.
- **Type Safety**: Strictly typed database interfaces in `@stone/database`, zero TypeScript errors across all 9 monorepo packages.
