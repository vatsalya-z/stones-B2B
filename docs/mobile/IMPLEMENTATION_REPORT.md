# StonesDekho Mobile App (`apps/mobile`) — Implementation & Verification Report

## 1. Executive Summary

Built the unified **StonesDekho** iOS, Android, and Expo Web B2B natural stone marketplace mobile application at `apps/mobile` (`@stone/mobile`), upgraded and verified on **Expo SDK 58 (`~58.0.26`)**, **Expo Router (`~58.0.32`)**, **React Native `0.88.1`**, and **React `19.3.0`**, integrating directly with the existing Supabase backend, PostgreSQL RPCs, Storage buckets, and `@stone/*` shared packages (`@stone/types`, `@stone/utils`, `@stone/validation`, `@stone/database`, `@stone/auth`).

Both **Buyers** and **Sellers** operate inside one application with shared Supabase authentication, chunked native token persistence (`expo-secure-store` + web `localStorage` fallback), and strict role-based workspace navigation — enforcing database-backed authorization and **Payment Model B** compliance throughout.

---

## 2. Architecture & Deliverables Inventory

### Documentation (`docs/mobile/`)
- `docs/mobile/REPOSITORY_AUDIT.md` — Monorepo workspace audit, shared package compatibility, Supabase schema/RPC/bucket inventory, auth capabilities, Payment Model B audit, and local native toolchain check.
- `docs/mobile/MOBILE_ARCHITECTURE.md` — Expo Router route hierarchy, state management (Zustand auth store + TanStack Query), Zod + React Hook Form validation integration, and SecureStore token chunking design.
- `docs/mobile/DESIGN_SYSTEM.md` — **Nature Luxe — Architectural Luxury** palette (`#0F6245` Forest Green, `#1F8A67` Jade Green, `#D9A344` Copper Gold, `#08302E` Deep Green, `#F8F5EE` Warm Ivory, `#FFFFFF` Surface, `#EFE6D6` Stone Beige), `Playfair Display` + `Inter` typography scale, 8pt spacing, >=44pt touch targets, and media/data-truthfulness rules.
- `docs/mobile/IMPLEMENTATION_REPORT.md` — Final SDK 58 implementation & verification report.

### App Configuration & Monorepo Wiring
- Root `turbo.json`: Added `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_SITE_URL` to `globalEnv`.
- Root `package.json`: Added `"dev:mobile": "pnpm --filter @stone/mobile start"`.
- `apps/mobile/package.json`, `apps/mobile/app.config.ts`, `apps/mobile/eas.json`, `apps/mobile/babel.config.js`, `apps/mobile/metro.config.js`, `apps/mobile/tsconfig.json`, `apps/mobile/vitest.config.ts`, `apps/mobile/.env.example`.
- Metro Security & Runtime Singleton Guard (`apps/mobile/metro.config.js`): Explicitly blocks bundling of `server-only`, `pg`, `next/*`, `@stone/database/(server|admin|pg)`, and `@stone/auth/server`, pins `react`, `react-dom`, `react-native-web`, and `query-string` (`^7.1.3`) to `apps/mobile/node_modules`, and enables `unstable_enableSymlinks` + `unstable_enablePackageExports`.

### Shared Authentication, Services & State (`apps/mobile/src/`)
- **Theme & Assets (`src/theme/`):** `tokens.ts`, `typography.ts`, `assets.ts`, plus curated real natural stone photography (`16` photos) under `apps/mobile/assets/images/` and generated `icon.png`, `adaptive-icon.png`, `splash-icon.png` (`19` total image files).
- **Native Adapters (`src/lib/`):**
  - `env.ts` — Validates public runtime config via `@stone/validation` (`resolvePublicSupabaseUrl`, `resolvePublicSupabaseAnonKey`).
  - `secure-storage.ts` — Chunked `expo-secure-store` adapter handling tokens >2048 bytes cleanly, with browser `localStorage` fallback for Expo Web and memory fallback in Vitest.
  - `supabase.ts` — React Native Supabase client using `chunkedSecureStorage` + `fromPublicMutableTable` / `groupRowsByKey` helpers aligned with `@stone/database` `Views` typing and flat parallel relation loading.
  - `domain-meta.ts` — Encoders/decoders and state transition guards (`getAllowedBuyerOrderTransitions`, `getAllowedSellerOrderTransitions`, `encodeRfqDescription`, `encodeBuyerAddress`, `encodeSellerDescription`, `computeQuotationTotals`, `checkVerificationReadiness`).
  - `role-utils.ts`, `recently-viewed.ts`, `storage-upload.ts`, `notifications.ts`.
- **Auth & Role Store (`src/store/auth-store.ts`):** Single Supabase session backing Buyer-only, Seller-only, and Dual-role workspace switching without ever elevating permissions beyond database authorization.
- **Service Layer (`src/services/`):**
  - `catalog.service.ts` — Stone categories, filtered product catalog search (`material`, `colour`, `finish`, `origin`, `thickness`, `dimensions`, `location`, `verifiedOnly`, `priceMax`, valid sorting), product detail + specs + similar lots, public verified supplier profiles.
  - `buyer.service.ts` — Dashboard metrics, favourites, RFQ submission (`enquiries` + `enquiry-attachments`), enquiry history & transitions (`transition_enquiry_status`), quotation review & comparison, quotation acceptance (`accept_quotation_and_create_order` RPC), order tracking & delivery/cancellation transitions (`transition_order_status`), saved billing/shipping addresses (`set_default_buyer_address`), buyer profile & notifications.
  - `seller.service.ts` — Dashboard KPIs & entitlement tracking, subscription plan & monthly lead usage checks, product CRUD + image uploads + subscription active listing enforcement, direct + assigned leads (`lead_assignments`), quotation builder & sending, order fulfillment transitions (`confirmed`, `processing`, `dispatched`), quarry/storefront profile (`seller-logos`, `seller-cover-images`), and KYC document submission (`seller-verification-documents` + `submit_seller_verification` RPC).
  - `messaging.service.ts` — Buyer/seller inbox, `get_or_create_conversation` RPC, `mark_conversation_read` RPC, real-time/thread messages, signed attachment upload/download (`message-attachments`).

### Screen Inventory (52 Route Files in `apps/mobile/app/`)
- **Root & Auth (`app/_layout.tsx`, `app/index.tsx`, `app/(auth)/`):** Splash/session gate, Onboarding, Sign In, Sign Up, Verify OTP (email OTP/recovery), Forgot Password.
- **Buyer Workspace (`app/(buyer)/`):** Tabs (`index` Home, `explore` Catalog/Categories, `rfq` Request Quotation, `messages` Inbox, `account` Hub) + `products/[id]`, `suppliers/[id]`, `enquiries/index`, `enquiries/[id]`, `quotations/index`, `quotations/[id]`, `quotations/compare`, `orders/index`, `orders/[id]`, `chat/[conversationId]`, `favourites`, `projects`, `notifications`, `addresses`, `profile`, `settings`, `support`.
- **Seller Workspace (`app/(seller)/`):** Tabs (`index` Dashboard, `products` Listings, `leads` Leads & RFQs, `orders` Fulfillment Orders, `account` Hub) + `products/new`, `products/[id]/edit`, `leads/[id]`, `quotations/index`, `quotations/new`, `orders/[id]`, `storefront`, `verification`, `subscription`, `messages`, `chat/[conversationId]`, `notifications`, `settings`.

---

## 3. Verification Results (Observed on Expo SDK 58)

| Check | Command | Outcome | Details |
| :--- | :--- | :--- | :--- |
| TypeScript Check | `CI=true pnpm --filter @stone/mobile typecheck` | **Passed (exit 0)** | `tsc --noEmit` completed with 0 errors |
| Mobile Tests | `CI=true pnpm --filter @stone/mobile test` | **Passed (exit 0)** | **6 / 6 test files**, **22 / 22 tests passed** (`auth-role-guard`, `secure-storage`, `theme-and-tokens`, `domain-meta`, `payment-governance`, `services-integration`) |
| Validation Tests | `CI=true pnpm --filter @stone/validation test` | **Passed (exit 0)** | **7 / 7 test files**, **80 / 80 tests passed** |
| SDK 58 Dependency Check | `CI=true EXPO_OFFLINE=1 pnpm --filter @stone/mobile exec npx expo install --check` | **Passed (exit 0)** | `Dependencies are up to date` for Expo `~58.0.26` |
| Android Export | `CI=true EXPO_OFFLINE=1 pnpm --filter @stone/mobile exec npx expo export --platform android --output-dir dist-android --clear` | **Passed (exit 0)** | Bundled `2110` modules; emitted `entry-f53467ea098bb97f5a1346e319655b76.hbc` (`6.3MB`) + `87` assets |
| iOS Export | `CI=true EXPO_OFFLINE=1 pnpm --filter @stone/mobile exec npx expo export --platform ios --output-dir dist-ios` | **Passed (exit 0)** | Bundled `2113` modules; emitted `entry-eff2b138eaa9afa4f9baa4441abee992.hbc` (`6,342,390` bytes / `6.3MB`) + `84` assets |
| Live Dev Server & IDE Extension | `npx expo start --web --port 8081 --clear` + `antigravity-ide --install-extension expo.vscode-expo-tools` | **Running (`RUNNING`)** | Web bundled `1828` modules cleanly on `http://localhost:8081`; Expo Go QR running on `exp://192.168.1.4:8081`; `expo.vscode-expo-tools` `v1.6.3` installed |
| Security & Boundary Audit | Secret & server-import `grep` on `apps/mobile/{src,app}` + `git status --short` | **Passed (`SECURITY_GREP_CLEAN`)** | Zero service-role keys or server-only imports in client code; zero edits to `apps/{admin,marketplace,seller,web,worker}`, `packages/*`, or `supabase/*` |

*(Temporary `dist-android`, `dist-ios`, and `dist-web` directories were removed after verifying bundle emission.)*

---

## 4. Known Gaps & Production Readiness Notes

1. **Native Binary Builds (`.ipa` / `.aab`):** The local macOS host currently has CommandLineTools and JDK 21 installed, without full Xcode (`pod`) or Android SDK (`ANDROID_HOME`). Live **Expo Go (SDK 58)** on physical devices and **Expo Web** work locally; standalone binary builds should run via **EAS Build** (`apps/mobile/eas.json` is pre-configured with `development`, `preview`, and `production` profiles).
2. **Phone SMS OTP:** Hosted Supabase currently has `email: true`, `phone: false`. Mobile authentication supports Email + Password, Email Sign Up, Email OTP verification, and Forgot Password reset, while deliberately excluding the web `/api/auth/mobile` demo stub (`1234`).
3. **Payment Model B Checkout & Subscription Billing:** Consistent with `docs/payment-architecture-decision.md`, mobile separates `order.status` and `order.payment_status`, prohibits any manual buyer/seller payment status mutations (`PaymentGovernanceBanner`), and enforces consistent quotation/order calculations. Online escrow payment capture and subscription plan billing webhooks remain deferred server-side integrations.
4. **Push Notifications:** `apps/mobile/src/lib/notifications.ts` guards web notifications, registers `expo-notifications` permissions/tokens cleanly on native, and degrades gracefully without an EAS `projectId`; production APNs/FCM push delivery requires linking an Expo/EAS project ID and uploading APNs/FCM credentials.
5. **Untouched Backend & Deployment Guardrails:** No edits were made to hosted Supabase, database migrations, existing Next.js apps, Git remotes, or deployment targets.
