import type { Metadata } from "next";
import { STONE_MATERIAL_SUGGESTIONS } from "@/features/seller/seller-meta";
import { getAllCategoriesHierarchy, getSellerContext } from "@/features/seller/queries";
import { SellerProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Business Profile & Onboarding",
};

export default async function SellerProfilePage() {
  const [ctx, categories] = await Promise.all([
    getSellerContext(),
    getAllCategoriesHierarchy(),
  ]);

  const categoryNames =
    categories.parents.length > 0
      ? categories.parents.map((c) => c.name)
      : [...STONE_MATERIAL_SUGGESTIONS];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Seller Onboarding
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Business Profile &amp; Capabilities
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Complete your factory, quarry, and compliance details. Private tax and contact
          records remain strictly protected under Row-Level Security.
        </p>
      </div>

      <SellerProfileForm
        initialSeller={ctx.sellerProfile}
        defaultOwnerName={ctx.userProfile?.full_name ?? null}
        defaultEmail={ctx.userProfile?.email ?? ctx.user.email}
        defaultPhone={ctx.userProfile?.phone ?? null}
        categoryNames={categoryNames}
      />
    </div>
  );
}

