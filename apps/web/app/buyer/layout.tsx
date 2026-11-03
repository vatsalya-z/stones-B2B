import React, { type ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BuyerShell } from "@/components/buyer/buyer-shell";
import { getBuyerContext } from "@/features/buyer/queries";
import { getCurrentUser, hasRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "Buyer Portal",
    template: "%s | Buyer Portal — StonesDekho",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BuyerPortalLayout({ children }: { children: ReactNode }) {
  // Guard: redirect unauthenticated users to login before getBuyerContext throws.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Guard: redirect users who don't hold the buyer role.
  const isBuyer = await hasRole("buyer");
  if (!isBuyer) redirect("/unauthorized");

  const ctx = await getBuyerContext();

  return (
    <BuyerShell
      userId={ctx.user.id}
      userEmail={ctx.user.email}
      buyerName={ctx.profile?.full_name ?? null}
      companyName={ctx.extendedAddress.companyName || null}
      unreadNotificationsCount={ctx.unreadNotificationsCount}
      unreadMessagesCount={ctx.unreadMessagesCount}
      pendingQuotationsCount={ctx.pendingQuotationsCount}
      hasSellerRole={ctx.hasSellerRole}
    >
      {children}
    </BuyerShell>
  );
}

