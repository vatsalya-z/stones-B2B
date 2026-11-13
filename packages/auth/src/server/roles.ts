import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@stone/database";
import type { AppRole } from "../shared/types";
import { getSupabaseServerClient } from "./client";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Fetches all roles assigned to the given user ID directly from PostgreSQL.
 * Prefers the privileged admin client when available to avoid RLS/clock-skew edge cases,
 * with graceful fallback to request-scoped client.
 * Auto-synchronizes 'seller' role if the user owns a seller profile.
 */
export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  if (!userId) return [];

  const roles = new Set<AppRole>();
  const adminClient = getAdminClient();

  try {
    if (adminClient) {
      const { data, error } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!error && data) {
        for (const r of data) {
          if (r.role) roles.add(r.role as AppRole);
        }
      }
    }

    // Fallback or verify with request-scoped client if adminClient was unavailable or empty
    if (roles.size === 0) {
      const supabase = await getSupabaseServerClient();
      let { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error && error.message?.toLowerCase().includes("issued at future")) {
        await new Promise((r) => setTimeout(r, 600));
        const retry = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        for (const r of data) {
          if (r.role) roles.add(r.role as AppRole);
        }
      }
    }

    // Auto-heal: If user has a seller profile, they must have the seller role
    if (!roles.has("seller")) {
      const client = adminClient ?? (await getSupabaseServerClient());
      const { data: sellerProfile } = await client
        .from("seller_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (sellerProfile?.id) {
        roles.add("seller");
        if (adminClient) {
          // Persist the seller role in user_roles so subsequent reads are instant
          await adminClient
            .from("user_roles")
            .insert({ user_id: userId, role: "seller" })
            .select("id")
            .maybeSingle();
        }
      }
    }

    return Array.from(roles);
  } catch (err) {
    console.error("[fetchUserRoles] Unexpected error:", err);
    return Array.from(roles);
  }
}
