"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";
import { RoleBadge, AccountStatusBadge } from "@/components/admin/status-badges";
import {
  grantAdminRoleAction,
  revokeAdminRoleAction,
  setAccountStatusAction,
} from "@/features/admin/actions";

export interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  account_status: string;
  created_at: string;
  user_roles: { role: string }[];
}

export function UsersClient({
  users,
  currentUserId,
  isSuperAdmin,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "grant_role" | "revoke_role" | "suspend_account" | "activate_account" | null;
    userId: string;
    userName: string;
    role?: "admin" | "super_admin";
    title: string;
    description: string;
    requiresReason: boolean;
    isDestructive: boolean;
    confirmLabel: string;
  }>({
    isOpen: false,
    type: null,
    userId: "",
    userName: "",
    title: "",
    description: "",
    requiresReason: false,
    isDestructive: false,
    confirmLabel: "Confirm",
  });

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleOpenGrantRole = (user: AdminUserRow, role: "admin" | "super_admin") => {
    setFeedback(null);
    setModalState({
      isOpen: true,
      type: "grant_role",
      userId: user.id,
      userName: user.full_name || user.email || "User",
      role,
      title: `Grant ${role === "super_admin" ? "Super Admin" : "Admin"} Privileges`,
      description: `Are you sure you want to grant ${role} privileges to ${user.full_name || user.email}? This will allow administrative access to platform governance.`,
      requiresReason: false,
      isDestructive: false,
      confirmLabel: `Grant ${role}`,
    });
  };

  const handleOpenRevokeRole = (user: AdminUserRow, role: "admin" | "super_admin") => {
    setFeedback(null);
    setModalState({
      isOpen: true,
      type: "revoke_role",
      userId: user.id,
      userName: user.full_name || user.email || "User",
      role,
      title: `Revoke ${role} Privileges`,
      description: `Revoke ${role} privileges from ${user.full_name || user.email}. They will lose administrative console access.`,
      requiresReason: false,
      isDestructive: true,
      confirmLabel: "Revoke Role",
    });
  };

  const handleOpenSuspendAccount = (user: AdminUserRow) => {
    setFeedback(null);
    setModalState({
      isOpen: true,
      type: "suspend_account",
      userId: user.id,
      userName: user.full_name || user.email || "User",
      title: "Suspend User Account",
      description: `Lock login and transactions for ${user.full_name || user.email}. A reason is mandatory.`,
      requiresReason: true,
      isDestructive: true,
      confirmLabel: "Suspend Account",
    });
  };

  const handleOpenActivateAccount = (user: AdminUserRow) => {
    setFeedback(null);
    setModalState({
      isOpen: true,
      type: "activate_account",
      userId: user.id,
      userName: user.full_name || user.email || "User",
      title: "Unlock User Account",
      description: `Restore active account status for ${user.full_name || user.email}.`,
      requiresReason: false,
      isDestructive: false,
      confirmLabel: "Activate Account",
    });
  };

  const handleConfirm = async (reason?: string) => {
    if (!modalState.type) return;

    try {
      if (modalState.type === "grant_role" && modalState.role) {
        const res = await grantAdminRoleAction({
          userId: modalState.userId,
          role: modalState.role,
        });
        if (!res.success) {
          setFeedback({ type: "error", text: res.error || "Failed to grant role." });
          return;
        }
        setFeedback({ type: "success", text: `Granted ${modalState.role} role successfully.` });
      } else if (modalState.type === "revoke_role" && modalState.role) {
        const res = await revokeAdminRoleAction({
          userId: modalState.userId,
          role: modalState.role,
        });
        if (!res.success) {
          setFeedback({ type: "error", text: res.error || "Failed to revoke role." });
          return;
        }
        setFeedback({ type: "success", text: `Revoked ${modalState.role} role successfully.` });
      } else if (modalState.type === "suspend_account") {
        const res = await setAccountStatusAction({
          userId: modalState.userId,
          status: "suspended",
          reason,
        });
        if (!res.success) {
          setFeedback({ type: "error", text: res.error || "Failed to suspend account." });
          return;
        }
        setFeedback({ type: "success", text: "Account suspended successfully." });
      } else if (modalState.type === "activate_account") {
        const res = await setAccountStatusAction({
          userId: modalState.userId,
          status: "active",
          reason,
        });
        if (!res.success) {
          setFeedback({ type: "error", text: res.error || "Failed to activate account." });
          return;
        }
        setFeedback({ type: "success", text: "Account restored to active status." });
      }

      setModalState((prev) => ({ ...prev, isOpen: false }));
      router.refresh();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Action failed.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">User / Profile</th>
                <th className="py-3.5 px-4 font-semibold">Assigned Roles</th>
                <th className="py-3.5 px-4 font-semibold">Account Status</th>
                <th className="py-3.5 px-4 font-semibold">Registered</th>
                <th className="py-3.5 px-4 font-semibold text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const roles = u.user_roles?.map((r) => r.role) ?? [];
                const hasAdmin = roles.includes("admin");
                const hasSuperAdmin = roles.includes("super_admin");

                return (
                  <tr key={u.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white flex items-center gap-1.5">
                        <span>{u.full_name || "Unnamed User"}</span>
                        {isSelf && (
                          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-400">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">{u.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {roles.length === 0 ? (
                          <span className="text-stone-500 text-[11px]">No roles</span>
                        ) : (
                          roles.map((r) => <RoleBadge key={r} role={r} />)
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <AccountStatusBadge status={u.account_status} />
                    </td>

                    <td className="py-3.5 px-4 text-stone-400 font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString("en-IN")}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Super Admin role delegation controls */}
                        {isSuperAdmin && !isSelf && (
                          <>
                            {!hasAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleOpenGrantRole(u, "admin")}
                                className="rounded bg-stone-800 px-2 py-1 text-[11px] font-medium text-stone-300 hover:bg-stone-700 hover:text-white"
                              >
                                + Admin
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenRevokeRole(u, "admin")}
                                className="rounded bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20"
                              >
                                - Admin
                              </button>
                            )}

                            {!hasSuperAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleOpenGrantRole(u, "super_admin")}
                                className="rounded bg-purple-500/10 px-2 py-1 text-[11px] font-medium text-purple-400 hover:bg-purple-500/20"
                              >
                                + Super
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenRevokeRole(u, "super_admin")}
                                className="rounded bg-purple-500/20 px-2 py-1 text-[11px] font-medium text-purple-300 hover:bg-purple-500/30"
                              >
                                - Super
                              </button>
                            )}
                          </>
                        )}

                        {/* Account Lock/Unlock */}
                        {!isSelf && (
                          u.account_status === "active" ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSuspendAccount(u)}
                              className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenActivateAccount(u)}
                              className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20"
                            >
                              Unlock
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirm}
        title={modalState.title}
        description={modalState.description}
        requiresReason={modalState.requiresReason}
        isDestructive={modalState.isDestructive}
        confirmLabel={modalState.confirmLabel}
      />
    </div>
  );
}

