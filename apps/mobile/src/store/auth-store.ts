import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import type { AppRole } from "@stone/auth";
import type { Database } from "@stone/database";
import { supabase } from "../lib/supabase";
import {
  canAccessWorkspace,
  resolveInitialWorkspace,
  type ActiveWorkspace,
} from "../lib/role-utils";
import type { RegisterInput } from "@stone/validation";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type SellerProfileRow = Database["public"]["Tables"]["seller_profiles"]["Row"];

const ONBOARDING_KEY = "stonesdekho:onboarding_done_v1";
const LEGACY_WORKSPACE_PREF_KEY = "stonesdekho:workspace_pref_v1";
const workspacePrefKey = (userId: string) => `stonesdekho:workspace_pref_v1:${userId}`;

function parseSavedWorkspace(raw: string | null): ActiveWorkspace | null {
  return raw === "buyer" || raw === "seller" ? raw : null;
}

function getDefaultWorkspaceHint(
  user: User,
  sellerProfile: SellerProfileRow | null,
): ActiveWorkspace | null {
  if (user.user_metadata?.account_type === "seller" || Boolean(sellerProfile?.id)) {
    return "seller";
  }
  return null;
}

export interface AuthState {
  initialized: boolean;
  loading: boolean;
  hasCompletedOnboarding: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  roles: AppRole[];
  sellerProfile: SellerProfileRow | null;
  activeWorkspace: ActiveWorkspace;
  authError: string | null;

  initialize: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    input: RegisterInput,
  ) => Promise<{ ok: boolean; error?: string; requiresOtp?: boolean }>;
  verifyEmailOtp: (
    email: string,
    token: string,
    type: "signup" | "recovery" | "email",
  ) => Promise<{ ok: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchWorkspace: (target: ActiveWorkspace) => Promise<boolean>;
  activateWorkspaceRole: (role: ActiveWorkspace) => Promise<{ ok: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

let authSubscriptionAttached = false;
let manualSignOutInProgress = false;
let authActionInProgress = false;
let queryCacheClearer: (() => void) | null = null;

export function registerQueryCacheClearer(fn: () => void): void {
  queryCacheClearer = fn;
}

function clearCachedData() {
  try {
    queryCacheClearer?.();
  } catch {
    // Non-blocking cache reset
  }
}

async function fetchRolesWithRetry(userId: string): Promise<AppRole[]> {
  let { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error?.message?.toLowerCase().includes("issued at future")) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const retry = await supabase.from("user_roles").select("role").eq("user_id", userId);
    data = retry.data;
    error = retry.error;
  }

  const roles: AppRole[] = [];
  for (const row of data ?? []) {
    if (row.role && !roles.includes(row.role as AppRole)) {
      roles.push(row.role as AppRole);
    }
  }
  return roles;
}

async function fetchUserContext(user: User): Promise<{
  profile: ProfileRow | null;
  roles: AppRole[];
  sellerProfile: SellerProfileRow | null;
}> {
  const [{ data: initialProfile }, initialRoles, { data: initialSellerProfile }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      fetchRolesWithRetry(user.id),
      supabase.from("seller_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

  let profile = initialProfile ?? null;
  let roles = initialRoles;
  let sellerProfile = initialSellerProfile ?? null;

  if (roles.length === 0) {
    try {
      await supabase.rpc("ensure_profile");
      const [{ data: refreshedProfile }, refreshedRoles] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        fetchRolesWithRetry(user.id),
      ]);
      profile = refreshedProfile ?? profile;
      roles = refreshedRoles;
    } catch {
      // Non-fatal: surface existing profile/roles state
    }
  }

  const isMetadataSeller = user.user_metadata?.account_type === "seller";
  if (!roles.includes("seller") && (Boolean(sellerProfile?.id) || isMetadataSeller)) {
    try {
      await supabase.rpc("grant_self_role", { _role: "seller" });
      const [refreshedRoles, refreshedSeller] = await Promise.all([
        fetchRolesWithRetry(user.id),
        sellerProfile
          ? Promise.resolve({ data: sellerProfile })
          : supabase.from("seller_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      roles = refreshedRoles;
      sellerProfile = refreshedSeller.data ?? sellerProfile;
    } catch {
      // Preserve authoritative roles from Postgres user_roles
    }
  }

  return {
    profile,
    roles,
    sellerProfile,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  loading: false,
  hasCompletedOnboarding: false,
  session: null,
  user: null,
  profile: null,
  roles: [],
  sellerProfile: null,
  activeWorkspace: "buyer",
  authError: null,

  initialize: async () => {
    try {
      const [onboardingRaw, sessionRes] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        supabase.auth.getSession(),
      ]);

      const hasCompletedOnboarding = onboardingRaw === "true";
      const session = sessionRes.data.session;

      if (session?.user) {
        const [savedPrefRaw, ctx] = await Promise.all([
          AsyncStorage.getItem(workspacePrefKey(session.user.id)),
          fetchUserContext(session.user),
        ]);
        const preferred =
          parseSavedWorkspace(savedPrefRaw) ??
          getDefaultWorkspaceHint(session.user, ctx.sellerProfile);
        set({
          initialized: true,
          hasCompletedOnboarding,
          session,
          user: session.user,
          profile: ctx.profile,
          roles: ctx.roles,
          sellerProfile: ctx.sellerProfile,
          activeWorkspace: resolveInitialWorkspace(ctx.roles, preferred),
        });
      } else {
        set({
          initialized: true,
          hasCompletedOnboarding,
          session: null,
          user: null,
          profile: null,
          roles: [],
          sellerProfile: null,
          activeWorkspace: "buyer",
        });
      }

      if (!authSubscriptionAttached) {
        authSubscriptionAttached = true;
        supabase.auth.onAuthStateChange(async (event, nextSession) => {
          if (authActionInProgress) {
            return;
          }
          const prevUserId = get().user?.id ?? null;
          if (nextSession?.user) {
            if (prevUserId && prevUserId !== nextSession.user.id) {
              clearCachedData();
            }
            try {
              const [savedPrefRaw, ctx] = await Promise.all([
                AsyncStorage.getItem(workspacePrefKey(nextSession.user.id)),
                fetchUserContext(nextSession.user),
              ]);
              const preferred =
                parseSavedWorkspace(savedPrefRaw) ??
                getDefaultWorkspaceHint(nextSession.user, ctx.sellerProfile);
              set({
                session: nextSession,
                user: nextSession.user,
                profile: ctx.profile,
                roles: ctx.roles,
                sellerProfile: ctx.sellerProfile,
                activeWorkspace: resolveInitialWorkspace(ctx.roles, preferred),
                authError: null,
              });
            } catch {
              set({
                session: nextSession,
                user: nextSession.user,
              });
            }
          } else {
            const wasSignedIn = Boolean(prevUserId);
            const expiredUnexpectedly = wasSignedIn && !manualSignOutInProgress;
            clearCachedData();
            set({
              session: null,
              user: null,
              profile: null,
              roles: [],
              sellerProfile: null,
              activeWorkspace: "buyer",
              authError:
                expiredUnexpectedly || event === "TOKEN_REFRESHED"
                  ? "Your session expired. Please sign in again."
                  : null,
            });
          }
        });
      }
    } catch (err) {
      set({
        initialized: true,
        authError: err instanceof Error ? err.message : "Failed to initialize session.",
      });
    }
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    set({ hasCompletedOnboarding: true });
  },

  signIn: async (email, password) => {
    const prevUserId = get().user?.id ?? null;
    authActionInProgress = true;
    set({ loading: true, authError: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.session?.user) {
        const msg = error?.message || "Invalid email or password.";
        set({ loading: false, authError: msg });
        return { ok: false, error: msg };
      }

      if (prevUserId && prevUserId !== data.session.user.id) {
        clearCachedData();
      }

      const [savedPrefRaw, ctx] = await Promise.all([
        AsyncStorage.getItem(workspacePrefKey(data.session.user.id)),
        fetchUserContext(data.session.user),
      ]);
      const preferred =
        parseSavedWorkspace(savedPrefRaw) ??
        getDefaultWorkspaceHint(data.session.user, ctx.sellerProfile);

      set({
        loading: false,
        session: data.session,
        user: data.session.user,
        profile: ctx.profile,
        roles: ctx.roles,
        sellerProfile: ctx.sellerProfile,
        activeWorkspace: resolveInitialWorkspace(ctx.roles, preferred),
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error while signing in.";
      set({ loading: false, authError: msg });
      return { ok: false, error: msg };
    } finally {
      authActionInProgress = false;
    }
  },

  signUp: async (input) => {
    authActionInProgress = true;
    set({ loading: true, authError: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            account_type: input.accountType,
          },
        },
      });

      if (error) {
        set({ loading: false, authError: error.message });
        return { ok: false, error: error.message };
      }

      if (data.session?.user) {
        await supabase.rpc("ensure_profile");
        let ctx = await fetchUserContext(data.session.user);
        if (input.accountType === "seller" && !ctx.roles.includes("seller")) {
          await supabase.rpc("grant_self_role", { _role: "seller" });
          ctx = await fetchUserContext(data.session.user);
        }
        const initial = resolveInitialWorkspace(ctx.roles, input.accountType);
        await AsyncStorage.setItem(workspacePrefKey(data.session.user.id), initial);
        set({
          loading: false,
          session: data.session,
          user: data.session.user,
          profile: ctx.profile,
          roles: ctx.roles,
          sellerProfile: ctx.sellerProfile,
          activeWorkspace: initial,
        });
        return { ok: true, requiresOtp: false };
      }

      set({ loading: false });
      return { ok: true, requiresOtp: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      set({ loading: false, authError: msg });
      return { ok: false, error: msg };
    } finally {
      authActionInProgress = false;
    }
  },

  verifyEmailOtp: async (email, token, type) => {
    authActionInProgress = true;
    set({ loading: true, authError: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type,
      });

      if (error) {
        set({ loading: false, authError: error.message });
        return { ok: false, error: error.message };
      }

      if (data.session?.user) {
        await supabase.rpc("ensure_profile");
        const ctx = await fetchUserContext(data.session.user);
        const preferred = getDefaultWorkspaceHint(data.session.user, ctx.sellerProfile);
        const initial = resolveInitialWorkspace(ctx.roles, preferred);
        await AsyncStorage.setItem(workspacePrefKey(data.session.user.id), initial);
        set({
          loading: false,
          session: data.session,
          user: data.session.user,
          profile: ctx.profile,
          roles: ctx.roles,
          sellerProfile: ctx.sellerProfile,
          activeWorkspace: initial,
        });
      } else {
        set({ loading: false });
      }
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OTP verification failed.";
      set({ loading: false, authError: msg });
      return { ok: false, error: msg };
    } finally {
      authActionInProgress = false;
    }
  },

  sendPasswordReset: async (email) => {
    set({ loading: true, authError: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      set({ loading: false });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      set({ loading: false });
      return { ok: false, error: err instanceof Error ? err.message : "Failed to send reset email." };
    }
  },

  signOut: async () => {
    const prevUserId = get().user?.id ?? null;
    manualSignOutInProgress = true;
    set({ loading: true });
    try {
      await supabase.auth.signOut();
    } finally {
      clearCachedData();
      if (prevUserId) {
        await AsyncStorage.removeItem(workspacePrefKey(prevUserId)).catch(() => undefined);
      }
      await AsyncStorage.removeItem(LEGACY_WORKSPACE_PREF_KEY).catch(() => undefined);
      set({
        loading: false,
        session: null,
        user: null,
        profile: null,
        roles: [],
        sellerProfile: null,
        activeWorkspace: "buyer",
        authError: null,
      });
      manualSignOutInProgress = false;
    }
  },

  switchWorkspace: async (target) => {
    const { roles, user } = get();
    // Enforce DB role authorization strictly — never escalate privileges client-side
    if (!canAccessWorkspace(roles, target)) {
      return false;
    }
    if (user?.id) {
      await AsyncStorage.setItem(workspacePrefKey(user.id), target);
    }
    set({ activeWorkspace: target });
    return true;
  },

  activateWorkspaceRole: async (role) => {
    const user = get().user;
    if (!user) {
      return { ok: false, error: "Please sign in first." };
    }
    authActionInProgress = true;
    set({ loading: true, authError: null });
    try {
      const { error } = await supabase.rpc("grant_self_role", { _role: role });
      if (error) {
        set({ loading: false });
        return { ok: false, error: error.message };
      }

      const ctx = await fetchUserContext(user);
      if (!canAccessWorkspace(ctx.roles, role)) {
        set({
          loading: false,
          profile: ctx.profile,
          roles: ctx.roles,
          sellerProfile: ctx.sellerProfile,
        });
        return { ok: false, error: "Server did not authorize workspace role." };
      }

      await AsyncStorage.setItem(workspacePrefKey(user.id), role);
      clearCachedData();
      set({
        loading: false,
        profile: ctx.profile,
        roles: ctx.roles,
        sellerProfile: ctx.sellerProfile,
        activeWorkspace: role,
      });
      return { ok: true };
    } catch (err) {
      set({ loading: false });
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to activate workspace role.",
      };
    } finally {
      authActionInProgress = false;
    }
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const ctx = await fetchUserContext(user);
    set((prev) => ({
      profile: ctx.profile,
      roles: ctx.roles,
      sellerProfile: ctx.sellerProfile,
      activeWorkspace: resolveInitialWorkspace(ctx.roles, prev.activeWorkspace),
    }));
  },
}));
