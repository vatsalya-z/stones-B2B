import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@stone/database/server";

/** Supabase client bound to the current request's cookies (acts as the user, RLS applies). */
export async function getSupabaseServerClient() {
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
