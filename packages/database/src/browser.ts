import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePublicSupabaseUrl, resolvePublicSupabaseAnonKey } from "@stone/validation";
import type { Database } from "./database.types";

/**
 * Browser client. Uses only the public key; all access is governed by RLS.
 * NEXT_PUBLIC_* vars must be referenced literally so Next.js can inline them.
 */
export function createClient(): SupabaseClient<Database> {
  const url = resolvePublicSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = resolvePublicSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, url);
  return createBrowserClient<Database>(url, key) as unknown as SupabaseClient<Database>;
}
