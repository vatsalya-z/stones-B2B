import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { AppRole } from "../shared/types";
import { getCurrentUser, getUserRoles, hasRole } from "./session";

/**
 * Requires an authenticated user session. Redirects to /login if unauthenticated.
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Requires the authenticated user to hold the specified role.
 * Admins and super_admins have supervisory access across panels.
 * Redirects to /unauthorized?role=... if role is missing.
 */
export async function requireRole(role: AppRole): Promise<User> {
  const user = await requireAuth();
  const ok = await hasRole(role);
  if (ok) return user;

  const roles = await getUserRoles();
  if (roles.includes("admin") || roles.includes("super_admin")) {
    return user;
  }

  redirect(`/unauthorized?role=${role}_required`);
}

/**
 * Requires 'buyer' role. Also accessible to admins and super_admins.
 */
export async function requireBuyer(): Promise<User> {
  const user = await requireAuth();
  const roles = await getUserRoles();
  if (roles.includes("buyer") || roles.includes("admin") || roles.includes("super_admin")) {
    return user;
  }
  redirect("/unauthorized?role=buyer_required");
}

/**
 * Requires 'seller' role. Also accessible to admins, super_admins, and users with seller metadata.
 */
export async function requireSeller(): Promise<User> {
  const user = await requireAuth();
  const roles = await getUserRoles();

  if (roles.includes("seller") || roles.includes("admin") || roles.includes("super_admin")) {
    return user;
  }

  // Check if account metadata indicates a seller
  if (user.user_metadata?.account_type === "seller") {
    return user;
  }

  redirect("/unauthorized?role=seller_required");
}

/**
 * Requires 'admin' or 'super_admin' role.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  const roles = await getUserRoles();
  if (!roles.includes("admin") && !roles.includes("super_admin")) {
    redirect("/unauthorized?role=admin_required");
  }
  return user;
}

/**
 * Requires 'super_admin' role.
 */
export async function requireSuperAdmin(): Promise<User> {
  const user = await requireAuth();
  const roles = await getUserRoles();
  if (!roles.includes("super_admin")) {
    redirect("/unauthorized?role=super_admin_required");
  }
  return user;
}
