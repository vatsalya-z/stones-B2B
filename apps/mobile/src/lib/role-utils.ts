import type { AppRole } from "@stone/auth";

export type ActiveWorkspace = "buyer" | "seller";

export function canAccessWorkspace(
  roles: ReadonlyArray<AppRole>,
  workspace: ActiveWorkspace,
): boolean {
  if (roles.includes("admin") || roles.includes("super_admin")) {
    return true;
  }
  return roles.includes(workspace);
}

export function resolveInitialWorkspace(
  roles: ReadonlyArray<AppRole>,
  preferred?: ActiveWorkspace | null,
): ActiveWorkspace {
  const hasBuyer = canAccessWorkspace(roles, "buyer");
  const hasSeller = canAccessWorkspace(roles, "seller");

  if (preferred === "seller" && hasSeller) return "seller";
  if (preferred === "buyer" && hasBuyer) return "buyer";
  if (hasSeller && !hasBuyer) return "seller";
  return "buyer";
}

export function hasDualWorkspaceAccess(roles: ReadonlyArray<AppRole>): boolean {
  return canAccessWorkspace(roles, "buyer") && canAccessWorkspace(roles, "seller");
}
