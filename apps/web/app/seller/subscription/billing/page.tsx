import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSellerContext } from "@/features/seller/queries";
import { getSellerSubscriptionDetails } from "@/features/subscription/queries";
import { BillingDetails } from "@/components/seller/subscription/billing-details";

export const metadata: Metadata = {
  title: "Billing & Invoicing",
};

export default async function SellerBillingPage() {
  const ctx = await getSellerContext();
  if (!ctx.sellerProfile) {
    redirect("/seller/profile");
  }

  const data = await getSellerSubscriptionDetails(ctx.sellerProfile.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <BillingDetails data={data} />
    </div>
  );
}

