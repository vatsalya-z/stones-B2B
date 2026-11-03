import React, { type ReactNode } from "react";
import { getAdminContext } from "@/features/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await getAdminContext();
  const { user, profile, isSuperAdmin, supabase } = ctx;

  // Quick counts for sidebar badges
  const [pendingSellersRes, pendingProductsRes] = await Promise.all([
    supabase
      .from("seller_profiles")
      .select("id", { count: "exact", head: true })
      .in("verification_status", ["submitted", "under_review"]),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "pending_review"),
  ]);

  return (
    <AdminShell
      userEmail={user.email}
      userName={profile?.full_name ?? null}
      isSuperAdmin={isSuperAdmin}
      pendingSellersCount={pendingSellersRes.count ?? 0}
      pendingProductsCount={pendingProductsRes.count ?? 0}
    >
      {children}
    </AdminShell>
  );
}

