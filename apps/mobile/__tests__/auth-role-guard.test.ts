import { describe, expect, it } from "vitest";
import {
  canAccessWorkspace,
  hasDualWorkspaceAccess,
  resolveInitialWorkspace,
} from "../src/lib/role-utils";

describe("Role-Based Access & Dual Workspace Authorization", () => {
  it("keeps buyer-only users locked to buyer workspace and blocks seller access", () => {
    expect(canAccessWorkspace(["buyer"], "buyer")).toBe(true);
    expect(canAccessWorkspace(["buyer"], "seller")).toBe(false);
    expect(hasDualWorkspaceAccess(["buyer"])).toBe(false);
    expect(resolveInitialWorkspace(["buyer"], "seller")).toBe("buyer");
  });

  it("opens seller workspace for seller-only users and rejects unauthorized buyer switching", () => {
    expect(canAccessWorkspace(["seller"], "seller")).toBe(true);
    expect(canAccessWorkspace(["seller"], "buyer")).toBe(false);
    expect(hasDualWorkspaceAccess(["seller"])).toBe(false);
    expect(resolveInitialWorkspace(["seller"], "buyer")).toBe("seller");
  });

  it("allows workspace switching only when both buyer and seller roles exist", () => {
    expect(hasDualWorkspaceAccess(["buyer", "seller"])).toBe(true);
    expect(resolveInitialWorkspace(["buyer", "seller"], "seller")).toBe("seller");
    expect(resolveInitialWorkspace(["buyer", "seller"], "buyer")).toBe("buyer");
  });

  it("permits admin and super_admin supervisory workspace access", () => {
    expect(canAccessWorkspace(["admin"], "buyer")).toBe(true);
    expect(canAccessWorkspace(["admin"], "seller")).toBe(true);
    expect(canAccessWorkspace(["super_admin"], "seller")).toBe(true);
  });
});
