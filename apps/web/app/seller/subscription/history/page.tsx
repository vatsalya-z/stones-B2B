import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSellerContext } from "@/features/seller/queries";
import { getSellerSubscriptionEvents } from "@/features/subscription/queries";
import { SubscriptionHistory } from "@/components/seller/subscription/subscription-history";

export const metadata: Metadata = {
  title: "Subscription Activity",
};

export default async function SellerHistoryPage() {
  const ctx = await getSellerContext();
  if (!ctx.sellerProfile) {
    redirect("/seller/profile");
  }

  const events = await getSellerSubscriptionEvents(ctx.sellerProfile.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SubscriptionHistory events={events} />
    </div>
  );
}

