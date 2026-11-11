import "server-only";
import type { AppRole } from "../shared/types";
import { getSupabaseServerClient } from "./client";

/**
 * Fetches all roles assigned to the given user ID directly from public.user_roles in PostgreSQL.
 * Handles transient clock skew ("JWT issued at future") with a single 600ms retry.
 */
export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  if (!userId) return [];
  try {
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

    if (error) {
      console.error("[fetchUserRoles] DB error:", error.message);
      return [];
    }

    return (data ?? []).map((r) => r.role as AppRole);
  } catch (err) {
    console.error("[fetchUserRoles] Unexpected error:", err);
    return [];
  }
}

