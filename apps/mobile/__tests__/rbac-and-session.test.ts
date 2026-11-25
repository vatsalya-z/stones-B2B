import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMap = new Map<string, string>();
const signInMock = vi.fn();
const signUpMock = vi.fn();
const verifyOtpMock = vi.fn();
const signOutMock = vi.fn();
const getSessionMock = vi.fn();
const rpcMock = vi.fn();
const fromMock = vi.fn();
let authChangeCallback: ((event: string, session: unknown) => Promise<void> | void) | null = null;

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (k: string) => storageMap.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      storageMap.set(k, v);
    },
    removeItem: async (k: string) => {
      storageMap.delete(k);
    },
  },
}));

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      signInWithPassword: (...args: unknown[]) => signInMock(...args),
      signUp: (...args: unknown[]) => signUpMock(...args),
      verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
      onAuthStateChange: (cb: (event: string, session: unknown) => Promise<void> | void) => {
        authChangeCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { registerQueryCacheClearer, useAuthStore } from "../src/store/auth-store";
import { canAccessWorkspace } from "../src/lib/role-utils";

function mockUserQueries(
  rolesOrFn: Array<"buyer" | "seller"> | (() => Array<"buyer" | "seller">),
  options?: { hasSellerProfile?: boolean },
) {
  fromMock.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () =>
          table === "profiles"
            ? { data: { id: "u-1", full_name: "Aarav", city: "Udaipur" }, error: null }
            : table === "seller_profiles"
              ? options?.hasSellerProfile === false
                ? { data: null, error: null }
                : { data: { id: "s-1", business_name: "Udaipur Marbles" }, error: null }
              : { data: null, error: null },
        then: (resolve: (val: { data: Array<{ role: string }>; error: null }) => unknown) => {
          const roles = typeof rolesOrFn === "function" ? rolesOrFn() : rolesOrFn;
          return Promise.resolve({
            data: roles.map((r) => ({ role: r })),
            error: null,
          }).then(resolve);
        },
      }),
    }),
  }));
}

describe("Phase M2 RBAC & Session Lifecycle Hardening", () => {
  beforeEach(() => {
    storageMap.clear();
    signInMock.mockReset();
    signUpMock.mockReset();
    verifyOtpMock.mockReset();
    signOutMock.mockReset();
    getSessionMock.mockReset();
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: null, error: null });
    fromMock.mockReset();
  });

  it("enforces Buyer and Seller RBAC isolation & rejects client-side escalation", async () => {
    expect(canAccessWorkspace(["buyer"], "buyer")).toBe(true);
    expect(canAccessWorkspace(["buyer"], "seller")).toBe(false);
    expect(canAccessWorkspace(["seller"], "buyer")).toBe(false);
    expect(canAccessWorkspace(["seller"], "seller")).toBe(true);
    expect(canAccessWorkspace(["buyer", "seller"], "buyer")).toBe(true);
    expect(canAccessWorkspace(["buyer", "seller"], "seller")).toBe(true);

    signInMock.mockResolvedValue({
      data: { session: { user: { id: "u-1", email: "buyer@stonesdekho.com" } } },
      error: null,
    });
    mockUserQueries(["buyer"], { hasSellerProfile: false });

    const loginRes = await useAuthStore.getState().signIn("buyer@stonesdekho.com", "StrongPass1");
    expect(loginRes.ok).toBe(true);
    expect(useAuthStore.getState().activeWorkspace).toBe("buyer");

    const switched = await useAuthStore.getState().switchWorkspace("seller");
    expect(switched).toBe(false);
    expect(useAuthStore.getState().activeWorkspace).toBe("buyer");
  });

  it("clears React Query cache on signOut and exposes session-expiry & invalid-login errors cleanly", async () => {
    const clearSpy = vi.fn();
    registerQueryCacheClearer(clearSpy);
    getSessionMock.mockResolvedValue({ data: { session: null } });
    await useAuthStore.getState().initialize();

    // Invalid credentials
    signInMock.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    const badRes = await useAuthStore.getState().signIn("wrong@example.com", "badpass");
    expect(badRes.ok).toBe(false);
    expect(badRes.error).toBe("Invalid login credentials");

    // Network interruption
    signInMock.mockRejectedValue(new Error("Network request failed"));
    const netRes = await useAuthStore.getState().signIn("buyer@stonesdekho.com", "StrongPass1");
    expect(netRes.ok).toBe(false);
    expect(netRes.error).toBe("Network request failed");

    // Valid sign-in followed by signOut clears query cache
    signInMock.mockResolvedValue({
      data: { session: { user: { id: "u-1", email: "buyer@stonesdekho.com" } } },
      error: null,
    });
    mockUserQueries(["buyer", "seller"]);
    await useAuthStore.getState().signIn("buyer@stonesdekho.com", "StrongPass1");
    expect(await useAuthStore.getState().switchWorkspace("seller")).toBe(true);

    signOutMock.mockResolvedValue({ error: null });
    await useAuthStore.getState().signOut();
    expect(clearSpy).toHaveBeenCalled();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().roles).toEqual([]);
    expect(useAuthStore.getState().activeWorkspace).toBe("buyer");

    // Simulate expired session via onAuthStateChange
    await useAuthStore.getState().signIn("buyer@stonesdekho.com", "StrongPass1");
    expect(authChangeCallback).not.toBeNull();
    await authChangeCallback?.("SIGNED_OUT", null);
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().authError).toBe("Your session expired. Please sign in again.");
  });

  it("provisions seller role via grant_self_role fallback on seller signUp and ignores concurrent auth change race", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    await useAuthStore.getState().initialize();

    const dbRoles: Array<"buyer" | "seller"> = ["buyer"];
    rpcMock.mockImplementation(async (fnName: string, args?: { _role?: string }) => {
      if (fnName === "grant_self_role" && args?._role === "seller" && !dbRoles.includes("seller")) {
        dbRoles.push("seller");
      }
      return { data: null, error: null };
    });
    mockUserQueries(() => [...dbRoles], { hasSellerProfile: false });

    signUpMock.mockImplementation(async () => {
      // Simulate Supabase firing SIGNED_IN synchronously before signUp post-processing finishes
      await authChangeCallback?.("SIGNED_IN", {
        user: {
          id: "u-seller-signup",
          email: "quarry@stonesdekho.com",
          user_metadata: { account_type: "seller" },
        },
      });
      return {
        data: {
          session: {
            user: {
              id: "u-seller-signup",
              email: "quarry@stonesdekho.com",
              user_metadata: { account_type: "seller" },
            },
          },
        },
        error: null,
      };
    });

    const res = await useAuthStore.getState().signUp({
      fullName: "Rajputana Quarries",
      email: "quarry@stonesdekho.com",
      password: "StrongPassword1",
      accountType: "seller",
    });

    expect(res).toEqual({ ok: true, requiresOtp: false });
    expect(rpcMock).toHaveBeenCalledWith("ensure_profile");
    expect(rpcMock).toHaveBeenCalledWith("grant_self_role", { _role: "seller" });
    expect(useAuthStore.getState().roles).toContain("seller");
    expect(useAuthStore.getState().activeWorkspace).toBe("seller");
  });

  it("auto-heals missing seller role on signIn when metadata or seller_profiles marks user as seller", async () => {
    const dbRoles: Array<"buyer" | "seller"> = ["buyer"];
    rpcMock.mockImplementation(async (fnName: string, args?: { _role?: string }) => {
      if (fnName === "grant_self_role" && args?._role === "seller" && !dbRoles.includes("seller")) {
        dbRoles.push("seller");
      }
      return { data: null, error: null };
    });
    mockUserQueries(() => [...dbRoles], { hasSellerProfile: false });

    signInMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "u-seller-1",
            email: "seller1@gmail.com",
            user_metadata: { account_type: "seller" },
          },
        },
      },
      error: null,
    });

    const res = await useAuthStore.getState().signIn("seller1@gmail.com", "StrongPass1");
    expect(res.ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("grant_self_role", { _role: "seller" });
    expect(useAuthStore.getState().roles).toEqual(["buyer", "seller"]);
    expect(useAuthStore.getState().activeWorkspace).toBe("seller");
  });

  it("scopes workspace preference per userId so prior buyer session never overrides seller login", async () => {
    // 1. Login as buyer u-buyer -> sets buyer preference for u-buyer
    signInMock.mockResolvedValueOnce({
      data: { user: { id: "u-buyer" }, session: { user: { id: "u-buyer", email: "b@stones.in" } } },
      error: null,
    });
    mockUserQueries(["buyer"], { hasSellerProfile: false });
    await useAuthStore.getState().signIn("b@stones.in", "StrongPass1");
    expect(storageMap.get("stonesdekho:workspace_pref_v1:u-buyer")).toBeUndefined();

    // 2. Login as seller u-seller without logging out first -> must open seller workspace
    signInMock.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "u-seller",
            email: "s@stones.in",
            user_metadata: { account_type: "seller" },
          },
        },
      },
      error: null,
    });
    mockUserQueries(["buyer", "seller"], { hasSellerProfile: true });
    await useAuthStore.getState().signIn("s@stones.in", "StrongPass1");
    expect(useAuthStore.getState().activeWorkspace).toBe("seller");
  });

  it("activates seller role via activateWorkspaceRole RPC only when Postgres user_roles confirms it", async () => {
    signInMock.mockResolvedValue({
      data: { session: { user: { id: "u-buyer-2", email: "architect@stones.in" } } },
      error: null,
    });
    const dbRoles: Array<"buyer" | "seller"> = ["buyer"];
    mockUserQueries(() => [...dbRoles], { hasSellerProfile: false });

    await useAuthStore.getState().signIn("architect@stones.in", "StrongPass1");
    expect(await useAuthStore.getState().switchWorkspace("seller")).toBe(false);

    // Server refuses role grant -> remains in buyer
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "not authorized" } });
    const denied = await useAuthStore.getState().activateWorkspaceRole("seller");
    expect(denied).toEqual({ ok: false, error: "not authorized" });
    expect(useAuthStore.getState().activeWorkspace).toBe("buyer");

    // Server grants role -> updates roles & switches to seller
    rpcMock.mockImplementationOnce(async (fnName: string, args?: { _role?: string }) => {
      if (fnName === "grant_self_role" && args?._role === "seller") {
        dbRoles.push("seller");
      }
      return { data: null, error: null };
    });
    const granted = await useAuthStore.getState().activateWorkspaceRole("seller");
    expect(granted).toEqual({ ok: true });
    expect(useAuthStore.getState().roles).toEqual(["buyer", "seller"]);
    expect(useAuthStore.getState().activeWorkspace).toBe("seller");
  });

  it("ensures profile and opens seller workspace on verifyEmailOtp for seller accounts", async () => {
    const dbRoles: Array<"buyer" | "seller"> = ["seller"];
    mockUserQueries(() => [...dbRoles], { hasSellerProfile: false });
    verifyOtpMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "u-otp-seller",
            email: "otp-seller@stones.in",
            user_metadata: { account_type: "seller" },
          },
        },
      },
      error: null,
    });

    const res = await useAuthStore.getState().verifyEmailOtp("otp-seller@stones.in", "123456", "signup");
    expect(res.ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("ensure_profile");
    expect(useAuthStore.getState().activeWorkspace).toBe("seller");
  });
});
