import {
  resolvePublicSupabaseUrl,
  resolvePublicSupabaseAnonKey,
} from "@stone/validation";

/**
 * Public-only runtime configuration for React Native.
 * Strictly excludes any server-only credentials or admin tokens.
 */
const supabaseUrl = resolvePublicSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = resolvePublicSupabaseAnonKey(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  supabaseUrl,
);
const siteUrl = (process.env.EXPO_PUBLIC_SITE_URL || "https://stonesdekho.com")
  .trim()
  .replace(/\/+$/, "");

export const PUBLIC_ENV = {
  supabaseUrl,
  supabaseAnonKey,
  siteUrl,
} as const;
