import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSellerContext } from "@/features/seller/queries";
import { getSellerSubscriptionDetails } from "@/features/subscription/queries";
import { PlanComparison } from "@/components/seller/subscription/plan-comparison";

export const metadata: Metadata = {
  title: "Subscription Plans",
};

export default async function SellerPlansPage() {
  const ctx = await getSellerContext();
  if (!ctx.sellerProfile) {
    redirect("/seller/profile");
  }

  const data = await getSellerSubscriptionDetails(ctx.sellerProfile.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PlanComparison data={data} />
    </div>
  );
}

