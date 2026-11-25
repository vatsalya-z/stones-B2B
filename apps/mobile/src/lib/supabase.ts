import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@stone/database";
import { PUBLIC_ENV } from "./env";
import { chunkedSecureStorage } from "./secure-storage";

export const supabase = createClient<Database>(
  PUBLIC_ENV.supabaseUrl,
  PUBLIC_ENV.supabaseAnonKey,
  {
    auth: {
      storage: chunkedSecureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Helper for tables placed under `Database["public"]["Views"]` in the generated
 * `@stone/database` definitions where `Insert`/`Update` signatures are omitted.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromPublicMutableTable(table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from as (t: string) => any)(table);
}

/**
 * Group child rows by foreign-key string field (used instead of PostgREST nested
 * embeds when `@stone/database` has empty `Relationships` arrays).
 */
export function groupRowsByKey<T, K extends keyof T>(
  rows: readonly T[] | null | undefined,
  key: K,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows ?? []) {
    const id = row[key];
    if (typeof id !== "string" || !id) continue;
    const list = map.get(id);
    if (list) list.push(row);
    else map.set(id, [row]);
  }
  return map;
}
