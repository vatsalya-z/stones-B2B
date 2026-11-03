import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  evaluateAdminAccess,
  meetsTier,
  type AdminAccessDecision,
  type AdminTier,
} from "./access";

export type AdminSupabase = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export interface AdminIdentity {
  user: { id: string; email: string | null };
  roles: string[];
  profile: {
    full_name: string | null;
    email: string | null;
    account_status: string;
  } | null;
  decision: AdminAccessDecision;
}

export interface AdminContext extends AdminIdentity {
  isSuperAdmin: boolean;
  supabase: AdminSupabase;
}

/**
 * Loads the caller's roles and account status FROM THE DATABASE using the
 * caller's own session (RLS applies: users can read their own rows only).
 * Nothing here trusts JWT metadata or request input.
 */
async function loadIdentity(
  supabase: AdminSupabase,
  user: { id: string; email?: string | null },
): Promise<AdminIdentity> {
  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("full_name, email, account_status")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const roles = (roleRows ?? []).map((r) => r.role as string);
  const decision = evaluateAdminAccess({
    roles,
    accountStatus: profile?.account_status ?? null,
  });

  return {
    user: { id: user.id, email: user.email ?? null },
    roles,
    profile: profile ?? null,
    decision,
  };
}

/**
 * Page/layout guard. Redirects instead of throwing:
 *  - unauthenticated → /login (via requireAuth)
 *  - authenticated but not an active admin → /unauthorized
 *
 * Layouts are NOT a security boundary in the App Router, so EVERY admin page must
 * call this itself (it is request-cached, so repeated calls are free).
 */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const user = await requireAuth();
  const supabase = await getSupabaseServerClient();
  const identity = await loadIdentity(supabase, user);

  if (!identity.decision.allowed) {
    redirect("/unauthorized");
  }
  return { ...identity, isSuperAdmin: identity.decision.isSuperAdmin, supabase };
});

/** Page guard for super_admin-only screens (non-super admins are sent to /unauthorized). */
export async function getSuperAdminContext(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx.isSuperAdmin) {
    redirect("/unauthorized");
  }
  return ctx;
}

export type AdminAuthResult =
  | { ok: true; ctx: AdminContext }
  | { ok: false; error: string };

/**
 * Server Action / Route Handler guard. Never redirects (actions must return a
 * result), and is evaluated independently on EVERY call — a page having rendered
 * is never treated as proof of authorization.
 */
export async function authorizeAdminAction(
  required: AdminTier = "admin",
): Promise<AdminAuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Authentication required. Please sign in again." };
  }

  const supabase = await getSupabaseServerClient();
  const identity = await loadIdentity(supabase, user);

  if (!identity.decision.allowed) {
    return {
      ok: false,
      error:
        identity.decision.reason === "inactive_account"
          ? "Your administrator account is not active."
          : "Administrator privileges are required for this action.",
    };
  }
  if (!meetsTier(identity.decision, required)) {
    return {
      ok: false,
      error: "This action requires super administrator privileges.",
    };
  }

  return {
    ok: true,
    ctx: { ...identity, isSuperAdmin: identity.decision.isSuperAdmin, supabase },
  };
}

