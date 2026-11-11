import React, { type ReactNode } from "react";
import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { getSellerContext } from "@/features/seller/queries";

export const metadata: Metadata = {
  title: {
    default: "Seller Portal",
    template: "%s | Seller Portal — StonesDekho",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SellerLayout({ children }: { children: ReactNode }) {
  const ctx = await getSellerContext();

  return (
    <SellerShell
      userId={ctx.user.id}
      sellerId={ctx.sellerProfile?.id ?? null}
      hasBuyerRole={ctx.hasBuyerRole}
      userEmail={ctx.user.email}
      businessName={ctx.sellerProfile?.business_name ?? null}
      businessSlug={ctx.sellerProfile?.slug ?? null}
      logoUrl={ctx.sellerProfile?.resolvedLogoUrl ?? null}
      verificationStatus={ctx.sellerProfile?.verification_status ?? null}
      unreadEnquiriesCount={ctx.unreadEnquiriesCount}
      unreadMessagesCount={ctx.unreadMessagesCount}
      unreadNotificationsCount={ctx.unreadNotificationsCount}
    >
      {children}
    </SellerShell>
  );
}

