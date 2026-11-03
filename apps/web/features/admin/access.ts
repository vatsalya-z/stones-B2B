/**
 * Pure admin-access policy. No I/O, no Next.js imports — safe to unit test and to
 * import from client components for UI gating (the UI gate is cosmetic; the real
 * boundaries are the server guard in `guard.ts` and PostgreSQL RLS / RPC checks).
 */

export type AdminTier = "admin" | "super_admin";

export type AdminAccessReason = "ok" | "no_admin_role" | "inactive_account";

export interface AdminAccessDecision {
  allowed: boolean;
  isSuperAdmin: boolean;
  reason: AdminAccessReason;
}

/**
 * Decides whether an identity may use the admin console.
 * `roles` and `accountStatus` MUST come from the database (user_roles / profiles),
 * never from JWT metadata or client input.
 */
export function evaluateAdminAccess(input: {
  roles: readonly string[];
  accountStatus: string | null | undefined;
}): AdminAccessDecision {
  const isSuperAdmin = input.roles.includes("super_admin");
  const hasAdminRole = isSuperAdmin || input.roles.includes("admin");

  if (!hasAdminRole) {
    return { allowed: false, isSuperAdmin: false, reason: "no_admin_role" };
  }
  // Mirrors public.is_admin(): a suspended/pending admin has no admin power.
  if (input.accountStatus !== "active") {
    return { allowed: false, isSuperAdmin, reason: "inactive_account" };
  }
  return { allowed: true, isSuperAdmin, reason: "ok" };
}

export function meetsTier(decision: AdminAccessDecision, required: AdminTier): boolean {
  if (!decision.allowed) return false;
  return required === "admin" ? true : decision.isSuperAdmin;
}

/**
 * Permission matrix (documented in docs/admin-completion-report.md).
 * The tier is the MINIMUM role; the same rule is enforced again by the database.
 */
export const ADMIN_CAPABILITIES = {
  "dashboard.view": "admin",
  "reports.view": "admin",
  "audit.view": "admin",
  "sellers.review": "admin",
  "documents.review": "admin",
  "products.moderate": "admin",
  "accounts.suspend": "admin",
  "categories.write": "admin",
  "categories.delete": "super_admin",
  "admins.manage": "super_admin",
  "settings.write": "super_admin",
} as const satisfies Record<string, AdminTier>;

export type AdminCapability = keyof typeof ADMIN_CAPABILITIES;

export function can(decision: AdminAccessDecision, capability: AdminCapability): boolean {
  return meetsTier(decision, ADMIN_CAPABILITIES[capability]);
}

/** Roles that identify a privileged account (used to protect admin accounts from non-super admins). */
export function isPrivilegedRoleSet(roles: readonly string[]): boolean {
  return roles.includes("admin") || roles.includes("super_admin");
}

