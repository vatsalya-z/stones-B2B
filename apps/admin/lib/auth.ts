import "server-only";

export type { AppRole, AuthUserIdentity, SessionValidationResult } from "@stone/auth";
export {
  getCurrentUser,
  getUserRoles,
  hasRole,
  requireAuth,
  requireRole,
  requireBuyer,
  requireSeller,
  requireAdmin,
  requireSuperAdmin,
  fetchUserRoles,
  validateSession,
  getCrossSubdomainCookieOptions,
} from "@stone/auth/server";
