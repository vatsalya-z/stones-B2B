import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parsePublicEnv,
  resolvePublicSupabaseUrl,
  resolvePublicSupabaseAnonKey,
} from "@stone/validation";
import type { Database } from "./database.types";

export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void;
}

/**
 * Per-request server client acting as the signed-in user (RLS applies).
 * The caller passes in a cookie adapter (e.g. from `next/headers`).
 * Always authorise with `supabase.auth.getUser()`, never `getSession()`.
 */
export function createClient(cookies: CookieAdapter): SupabaseClient<Database> {
  const url = resolvePublicSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = resolvePublicSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, url);
  const env = parsePublicEnv({
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
  });
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: cookieDomain
        ? {
            domain: cookieDomain,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
          }
        : undefined,
      cookies: {
        getAll: () =>
          cookies
            .getAll()
            .filter((c) => c && typeof c.value === "string" && c.value.trim() !== ""),
        setAll: (list: Parameters<CookieAdapter["setAll"]>[0]) => {
          try {
            cookies.setAll(list);
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Safe to ignore when middleware refreshes the session.
          }
        },
      },
    },
  ) as unknown as SupabaseClient<Database>;
}
