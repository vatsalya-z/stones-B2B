import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSellerContext } from "@/features/seller/queries";
import { getSellerSubscriptionDetails } from "@/features/subscription/queries";
import { SubscriptionOverview } from "@/components/seller/subscription/subscription-overview";

export const metadata: Metadata = {
  title: "Subscription & Plan",
};

export default async function SellerSubscriptionPage() {
  const ctx = await getSellerContext();
  if (!ctx.sellerProfile) {
    redirect("/seller/profile");
  }

  const data = await getSellerSubscriptionDetails(ctx.sellerProfile.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SubscriptionOverview data={data} />
    </div>
  );
}

