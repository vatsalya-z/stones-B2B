import type { UserRole } from "@stone/types";

export type AppRole = UserRole;

export interface AuthUserIdentity {
  id: string;
  email: string | null;
  roles: AppRole[];
  fullName?: string | null;
}

export interface SessionValidationResult {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  roles: AppRole[];
}

