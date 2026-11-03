import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetCurrentUser = vi.fn();
const mockGetSupabaseServerClient = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  requireAuth: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: () => mockGetSupabaseServerClient(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  evaluateAdminAccess,
  meetsTier,
  can,
  isPrivilegedRoleSet,
  ADMIN_CAPABILITIES,
} from "../features/admin/access";
import { authorizeAdminAction } from "../features/admin/guard";

describe("Admin Console Access Policy & Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateAdminAccess()", () => {
    it("grants full super_admin access when user has super_admin role and active profile", () => {
      const decision = evaluateAdminAccess({
        roles: ["super_admin", "buyer"],
        accountStatus: "active",
      });

      expect(decision.allowed).toBe(true);
      expect(decision.isSuperAdmin).toBe(true);
      expect(decision.reason).toBe("ok");
    });

    it("grants regular admin access when user has admin role and active profile", () => {
      const decision = evaluateAdminAccess({
        roles: ["admin"],
        accountStatus: "active",
      });

      expect(decision.allowed).toBe(true);
      expect(decision.isSuperAdmin).toBe(false);
      expect(decision.reason).toBe("ok");
    });

    it("denies access if administrator account status is suspended", () => {
      const decision = evaluateAdminAccess({
        roles: ["super_admin"],
        accountStatus: "suspended",
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("inactive_account");
    });

    it("denies access when user only has buyer or seller role", () => {
      const decision = evaluateAdminAccess({
        roles: ["buyer", "seller"],
        accountStatus: "active",
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("no_admin_role");
    });

    it("denies access when user has no roles assigned", () => {
      const decision = evaluateAdminAccess({
        roles: [],
        accountStatus: "active",
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("no_admin_role");
    });
  });

  describe("meetsTier() and Tier Boundaries", () => {
    it("satisfies tier requirements appropriately", () => {
      const superAdminDecision = evaluateAdminAccess({
        roles: ["super_admin"],
        accountStatus: "active",
      });
      const regularAdminDecision = evaluateAdminAccess({
        roles: ["admin"],
        accountStatus: "active",
      });
      const deniedDecision = evaluateAdminAccess({
        roles: ["buyer"],
        accountStatus: "active",
      });

      expect(meetsTier(superAdminDecision, "admin")).toBe(true);
      expect(meetsTier(superAdminDecision, "super_admin")).toBe(true);

      expect(meetsTier(regularAdminDecision, "admin")).toBe(true);
      expect(meetsTier(regularAdminDecision, "super_admin")).toBe(false);

      expect(meetsTier(deniedDecision, "admin")).toBe(false);
      expect(meetsTier(deniedDecision, "super_admin")).toBe(false);
    });
  });

  describe("Capability Checks with can()", () => {
    it("allows standard admin capabilities for regular admin, but blocks super_admin actions", () => {
      const regularAdmin = evaluateAdminAccess({
        roles: ["admin"],
        accountStatus: "active",
      });

      // Regular admin capabilities
      expect(can(regularAdmin, "sellers.review")).toBe(true);
      expect(can(regularAdmin, "products.moderate")).toBe(true);
      expect(can(regularAdmin, "documents.review")).toBe(true);
      expect(can(regularAdmin, "audit.view")).toBe(true);
      expect(can(regularAdmin, "reports.view")).toBe(true);
      expect(can(regularAdmin, "categories.write")).toBe(true);

      // Super admin only capabilities
      expect(can(regularAdmin, "admins.manage")).toBe(false);
      expect(can(regularAdmin, "settings.write")).toBe(false);
      expect(can(regularAdmin, "categories.delete")).toBe(false);
    });

    it("allows all capabilities for super_admin", () => {
      const superAdmin = evaluateAdminAccess({
        roles: ["super_admin"],
        accountStatus: "active",
      });

      for (const capability of Object.keys(ADMIN_CAPABILITIES) as (keyof typeof ADMIN_CAPABILITIES)[]) {
        expect(can(superAdmin, capability)).toBe(true);
      }
    });

    it("identifies privileged role sets correctly", () => {
      expect(isPrivilegedRoleSet(["admin"])).toBe(true);
      expect(isPrivilegedRoleSet(["super_admin"])).toBe(true);
      expect(isPrivilegedRoleSet(["buyer", "seller"])).toBe(false);
    });
  });

  describe("authorizeAdminAction() Guard", () => {
    it("returns error if no authenticated user session exists", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await authorizeAdminAction("admin");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Authentication required");
      }
    });

    it("returns error if caller does not have admin privileges", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123", email: "buyer@test.com" });
      mockGetSupabaseServerClient.mockResolvedValue({
        from: (table: string) => {
          if (table === "user_roles") {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [{ role: "buyer" }] }),
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { account_status: "active" } }),
                }),
              }),
            };
          }
          return {};
        },
      });

      const result = await authorizeAdminAction("admin");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Administrator privileges are required");
      }
    });

    it("returns error if regular admin attempts super_admin action", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-admin", email: "admin@stonesdekho.com" });
      mockGetSupabaseServerClient.mockResolvedValue({
        from: (table: string) => {
          if (table === "user_roles") {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [{ role: "admin" }] }),
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { account_status: "active" } }),
                }),
              }),
            };
          }
          return {};
        },
      });

      const result = await authorizeAdminAction("super_admin");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("super administrator privileges");
      }
    });

    it("authorizes super_admin successfully", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-super", email: "super@stonesdekho.com" });
      mockGetSupabaseServerClient.mockResolvedValue({
        from: (table: string) => {
          if (table === "user_roles") {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [{ role: "super_admin" }] }),
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { account_status: "active" } }),
                }),
              }),
            };
          }
          return {};
        },
      });

      const result = await authorizeAdminAction("super_admin");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ctx.isSuperAdmin).toBe(true);
      }
    });
  });
});
