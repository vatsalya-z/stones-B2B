import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "StonesDekho",
  slug: "stonesdekho",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "stonesdekho",
  userInterfaceStyle: "light",
  icon: "./assets/images/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.stonesdekho.app",
    buildNumber: "1",
    associatedDomains: ["applinks:stonesdekho.com", "applinks:www.stonesdekho.com"],
    infoPlist: {
      NSCameraUsageDescription:
        "StonesDekho needs camera access so sellers can photograph natural stone slabs and buyers can attach site photos to RFQs.",
      NSPhotoLibraryUsageDescription:
        "StonesDekho needs photo library access to upload natural stone slab images, KYC verification documents, and RFQ references.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.stonesdekho.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#08302E",
    },
    permissions: [
      "android.permission.CAMERA",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.POST_NOTIFICATIONS",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "stonesdekho" },
          { scheme: "https", host: "stonesdekho.com", pathPrefix: "/products" },
          { scheme: "https", host: "stonesdekho.com", pathPrefix: "/suppliers" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#08302E",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow StonesDekho to access your photo library to upload stone imagery and attachments.",
        cameraPermission:
          "Allow StonesDekho to use your camera to capture stone slab photos and KYC documents.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#0F6245",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/icon.png",
  },
  extra: {
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL || "https://rgmasamasslqintssyrh.supabase.co",
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      "sb_publishable_bELVUlNZWChpsaJFnDk0wQ_3XZinJef",
  },
});
