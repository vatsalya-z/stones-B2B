import React, { type ReactNode } from "react";
import type { Metadata } from "next";
import { BuyerShell } from "@/components/buyer/buyer-shell";
import { getBuyerContext } from "@/features/buyer/queries";

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

