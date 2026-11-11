import type { Metadata } from "next";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminSellerSubscriptionsList } from "@/features/subscription/queries";
import { AdminSubscriptionsTable } from "@/components/admin/subscriptions/admin-subscriptions-table";

export const metadata: Metadata = {
  title: "Seller Subscriptions | Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  await getAdminContext();
  const subscriptions = await getAdminSellerSubscriptionsList();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Seller Subscriptions & Monetization
          </h1>
          <p className="mt-1 text-xs text-stone-400">
            Audit supplier subscription tiers, active product quotas, promotional grants, and administrative overrides.
          </p>
        </div>
      </div>

      <AdminSubscriptionsTable initialSubscriptions={subscriptions} />
    </div>
  );
}

