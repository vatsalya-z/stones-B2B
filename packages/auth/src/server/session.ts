import "server-only";
import type { User } from "@supabase/supabase-js";
import type { AppRole, SessionValidationResult } from "../shared/types";
import { getSupabaseServerClient } from "./client";
import { fetchUserRoles } from "./roles";

/**
 * Validates the JWT directly against Supabase Auth (auth.getUser()).
 * Never uses getSession() which trusts unverified local state.
 * Returns null if the user is unauthenticated or the session has expired.
 */
export async function getCurrentUser(): Promise<User | null> {
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

/**
 * Fetches all roles assigned to the current authenticated user from PostgreSQL.
 */
export async function getUserRoles(): Promise<AppRole[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return fetchUserRoles(user.id);
}

/**
 * Checks if the current authenticated user holds the specified role.
 */
export async function hasRole(role: AppRole): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes(role);
}

/**
 * Returns comprehensive session validation data for the current request.
 */
export async function validateSession(): Promise<SessionValidationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      roles: [],
    };
  }
  const roles = await fetchUserRoles(user.id);
  return {
    isAuthenticated: true,
    userId: user.id,
    email: user.email ?? null,
    roles,
  };
}

