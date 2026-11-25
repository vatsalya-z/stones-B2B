# StonesDekho Mobile — EAS Build & Push Notification Setup Guide

This document describes how to transition `@stone/mobile` (`apps/mobile`, **Expo SDK 58**) from local Expo Go / Metro testing to signed Android (`.apk` / `.aab`) and iOS (`.ipa`) cloud builds via **EAS Build**, plus production **APNs / FCM** push delivery.

---

## 1. Prerequisites & Environment Variables

Non-secret configuration (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SITE_URL`, `APP_VARIANT`) is configured per profile inside `apps/mobile/eas.json`.

Before triggering any EAS cloud build, configure the public anon key as an EAS environment variable (never commit secrets or service-role keys):

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sb_publishable_..." --environment preview
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sb_publishable_..." --environment production
```

After running `eas init`, record the generated UUID under `extra.eas.projectId` inside `apps/mobile/app.config.ts` so `expo-notifications` (`getExpoPushTokenAsync({ projectId })`) can mint device push tokens.

---

## 2. Build Profiles (`apps/mobile/eas.json`)

| Profile | Android Output | iOS Output | Intended Use |
| :--- | :--- | :--- | :--- |
| `development` | Internal Development Client APK | Simulator Dev Client | Custom native debugging |
| `preview` | Internal Release APK (`com.stonesdekho.app`) | Internal Distribution (`m-medium`) | QA team physical-device install |
| `production` | Google Play App Bundle (`.aab`) | App Store Distribution (`.ipa`, `m-medium`) | Play Store & App Store release |

Example cloud build commands (requires active Expo/Apple/Play accounts):

```bash
pnpm --filter @stone/mobile exec npx eas-cli build --profile preview --platform android
pnpm --filter @stone/mobile exec npx eas-cli build --profile production --platform all
```

---

## 3. Production Push Notifications (FCM v1 & APNs)

1. **Android (FCM v1):** Generate a Firebase service account key in Firebase Console for package `com.stonesdekho.app` and upload it via `eas credentials --platform android`.
2. **iOS (APNs):** Sign in with your Apple Developer account (`com.stonesdekho.app`) during `eas credentials --platform ios` so EAS creates and manages your APNs `.p8` key and provisioning profile.
3. **Token Persistence & Deep Linking:** Mobile routes incoming trade notifications via `resolveNotificationTargetRoute()` in `apps/mobile/src/lib/notifications.ts`. Live push delivery must be verified on physical devices only after linking `extra.eas.projectId` and credentials above.
