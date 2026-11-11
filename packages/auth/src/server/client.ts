import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@stone/database/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@stone/database";

/**
 * Returns a Supabase server client bound to the current Next.js request's cookies.
 * RLS applies to all database queries under the authenticated user's context.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const store = await cookies();
  return createClient({
    getAll: () =>
      store
        .getAll()
        .filter(({ value }) => value && value.trim() !== "")
        .map(({ name, value }) => ({ name, value })),
    setAll: (list) => {
      for (const { name, value, options } of list) {
        store.set(name, value, options);
      }
    },
  });
}

