# StonesDekho Mobile App — Technical & Navigation Architecture

## 1. Technology Stack
- **Framework:** Expo SDK 53 (`~53.0.0`), React Native `0.79`, React `19.0.0`, TypeScript (strict mode)
- **Routing:** Expo Router v5 (`apps/mobile/app/`) with typed route groups and deep-linking (`stonesdekho://`)
- **State Management:**
  - **Zustand (`src/store/auth-store.ts`)**: Authoritative auth session, `profiles`, `user_roles`, `seller_profiles`, `activeWorkspace` (`'buyer' | 'seller'`), onboarding flag.
  - **TanStack React Query v5**: Server cache, pull-to-refresh invalidation, optimistic updates where safe, retry & offline awareness.
- **Forms & Validation:** `react-hook-form` + `@hookform/resolvers/zod` backed directly by `@stone/validation` schemas.
- **Media & Storage:** `expo-image` (disk/memory cached progressive stone photography), `expo-image-picker`, `expo-document-picker` uploading directly to RLS-scoped Supabase Storage buckets.
- **Security:** Chunked `expo-secure-store` storage adapter (`src/lib/secure-storage.ts`) splitting JWT payloads above 1,800 bytes cleanly within iOS Keychain / Android EncryptedSharedPreferences 2KB limits; Metro `blockList` preventing `server-only`, `next/*`, and `pg` from ever entering bundles.

---

## 2. Navigation Tree & Role-Based Routing

```
Root Stack (_layout.tsx)
├── index.tsx (Branded Splash & Auth/Role Gate)
├── (auth)/
│   ├── onboarding.tsx (3-slide architectural stone showcase)
│   ├── sign-in.tsx
│   ├── sign-up.tsx (Buyer / Seller intent)
│   ├── forgot-password.tsx
│   └── verify-otp.tsx (Email OTP / recovery)
├── (buyer)/  [Guarded: authenticated session with buyer/admin role]
│   ├── (tabs)/
│   │   ├── index.tsx      (Home — discovery, categories, featured, recent, RFQ CTA)
│   │   ├── explore.tsx    (Categories + Filtered/Sorted Product Catalogue)
│   │   ├── rfq.tsx        (Streamlined B2B Request Quotation)
│   │   ├── messages.tsx   (Buyer-Seller Conversations Inbox)
│   │   └── account.tsx    (Profile, Dual-Role Switcher, Buyer Menu)
│   ├── products/[id].tsx
│   ├── suppliers/[id].tsx
│   ├── enquiries/index.tsx & enquiries/[id].tsx
│   ├── quotations/index.tsx, quotations/[id].tsx & quotations/compare.tsx
│   ├── orders/index.tsx & orders/[id].tsx
│   ├── chat/[conversationId].tsx
│   ├── favourites.tsx
│   ├── projects.tsx
│   ├── notifications.tsx
│   ├── addresses.tsx
│   ├── profile.tsx
│   ├── settings.tsx
│   └── support.tsx
└── (seller)/ [Guarded: authenticated session with seller/admin role in DB]
    ├── (tabs)/
    │   ├── index.tsx      (Dashboard — KPIs, subscription meter, verification readiness)
    │   ├── products.tsx   (Catalogue Management + quota enforcement)
    │   ├── leads.tsx      (Direct Enquiries + Assigned Broadcast Leads)
    │   ├── orders.tsx     (Fulfillment Queue — order vs payment state separated)
    │   └── account.tsx    (Storefront, KYC, Subscription, Dual-Role Switcher, Settings)
    ├── products/new.tsx & products/[id]/edit.tsx
    ├── leads/[id].tsx
    ├── quotations/index.tsx & quotations/new.tsx
    ├── orders/[id].tsx
    ├── storefront.tsx
    ├── verification.tsx
    ├── subscription.tsx
    ├── messages.tsx
    ├── chat/[conversationId].tsx
    ├── notifications.tsx
    └── settings.tsx
```

---

## 3. Workspace Authorization & Dual-Role Switching
- Authoritative role set is read from PostgreSQL (`public.user_roles`) after Supabase Auth session verification (`getUser()`).
- **Buyer-only** users route directly to `/(buyer)/(tabs)` and have zero UI or route access to `/(seller)/*`.
- **Seller-only** users route directly to `/(seller)/(tabs)` and cannot enter `/(buyer)/*` unless they hold a buyer role.
- **Dual-role** (`['buyer', 'seller']`) users get an accessible `WorkspaceSwitcher` inside both Account tabs (and header shortcut) to switch between Buyer Sourcing and Seller Portal without re-authenticating.
- `switchWorkspace()` validates role membership in `user_roles` before switching and never mutates database permissions.

---

## 4. Realtime Messaging & Notifications
- `messaging.service.ts` + `useRealtimeThread` subscribe to Supabase `postgres_changes` (`INSERT` on `public.messages` and `UPDATE` on `public.conversations` scoped to `conversation_id`), resolving short-lived signed URLs for private `message-attachments` (`300s` TTL) and invoking `mark_conversation_read` on view.
- `notifications.ts` requests Expo notification permissions cleanly and maps incoming `NotificationType` payloads (`enquiry_received`, `quotation_received`, `message_received`, `seller_verification`, `product_moderation`) to native deep-link screens.
