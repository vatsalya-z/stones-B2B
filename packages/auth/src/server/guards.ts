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
 * Redirects to /unauthorized if role is missing.
 */
export async function requireRole(role: AppRole): Promise<User> {
  const user = await requireAuth();
  const ok = await hasRole(role);
  if (!ok) redirect("/unauthorized");
  return user;
}

/**
 * Requires 'buyer' role.
 */
export async function requireBuyer(): Promise<User> {
  return requireRole("buyer");
}

/**
 * Requires 'seller' role.
 */
export async function requireSeller(): Promise<User> {
  return requireRole("seller");
}

/**
 * Requires 'admin' or 'super_admin' role.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  const roles = await getUserRoles();
  if (!roles.includes("admin") && !roles.includes("super_admin")) {
    redirect("/unauthorized");
  }
  return user;
}

/**
 * Requires 'super_admin' role.
 */
export async function requireSuperAdmin(): Promise<User> {
  return requireRole("super_admin");
}

