import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { parsePublicEnv, parseServerEnv } from "@stone/validation";
import type { Database } from "./database.types";

/**
 * PRIVILEGED client using the service-role key. It BYPASSES RLS.
 * Use only in trusted server code (server actions, route handlers, worker)
 * after performing explicit authorization. Never import from client code;
 * the `server-only` import makes the build fail if you do.
 */
export function createAdminClient() {
  const pub = parsePublicEnv(process.env);
  const priv = parseServerEnv(process.env);
  return createSupabaseClient<Database>(
    pub.NEXT_PUBLIC_SUPABASE_URL,
    priv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
