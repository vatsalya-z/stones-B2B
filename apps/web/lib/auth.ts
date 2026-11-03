import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "./supabase";

export type AppRole = "buyer" | "seller" | "admin" | "super_admin";

// ---------------------------------------------------------------------------
// getCurrentUser — never uses getSession(); always calls getUser() to validate
// the JWT against Supabase Auth. This prevents session-replay attacks.
// ---------------------------------------------------------------------------
export async function getCurrentUser() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// requireAuth — redirects to /login when not authenticated.
// ---------------------------------------------------------------------------
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// ---------------------------------------------------------------------------
// getUserRoles — fetches all roles assigned to the current user from the DB.
// ---------------------------------------------------------------------------
export async function getUserRoles(): Promise<AppRole[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  return (data ?? []).map((r) => r.role as AppRole);
}

// ---------------------------------------------------------------------------
// hasRole — returns true when the authenticated user holds the given role.
// ---------------------------------------------------------------------------
export async function hasRole(role: AppRole): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes(role);
}

// ---------------------------------------------------------------------------
// requireRole — redirects to /unauthorized unless user holds the role.
// ---------------------------------------------------------------------------
export async function requireRole(role: AppRole) {
  const user = await requireAuth();
  const ok = await hasRole(role);
  if (!ok) redirect("/unauthorized");
  return user;
}

export async function requireBuyer() {
  return requireRole("buyer");
}

export async function requireSeller() {
  return requireRole("seller");
}

export async function requireAdmin() {
  // admin OR super_admin satisfies the admin requirement
  const user = await requireAuth();
  const roles = await getUserRoles();
  if (!roles.includes("admin") && !roles.includes("super_admin")) redirect("/unauthorized");
  return user;
}

export async function requireSuperAdmin() {
  return requireRole("super_admin");
}

