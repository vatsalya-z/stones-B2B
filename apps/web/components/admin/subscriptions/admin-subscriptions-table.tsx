"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminModifySellerSubscriptionAction,
  adminSuspendSellerSubscriptionAction,
  adminRestoreSellerSubscriptionAction,
} from "@/features/subscription/actions";
import type { AdminSellerSubscriptionItem } from "@/features/subscription/queries";

export function AdminSubscriptionsTable({
  initialSubscriptions,
}: {
  initialSubscriptions: AdminSellerSubscriptionItem[];
}) {
  const router = useRouter();
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Modal State
  const [activeModalSeller, setActiveModalSeller] = useState<AdminSellerSubscriptionItem | null>(null);
  const [targetPlan, setTargetPlan] = useState<"free" | "pro" | "enterprise">("pro");
  const [isPromotional, setIsPromotional] = useState(false);
  const [customMaxListings, setCustomMaxListings] = useState<string>("");
  const [customMaxMonthlyLeads, setCustomMaxMonthlyLeads] = useState<string>("");
  const [periodDays, setPeriodDays] = useState<string>("30");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const openModifyModal = (sub: AdminSellerSubscriptionItem) => {
    setActiveModalSeller(sub);
    setTargetPlan((sub.planCode as "free" | "pro" | "enterprise") || "pro");
    setIsPromotional(sub.promotionalGrant);
    setCustomMaxListings(sub.maxActiveListings ? String(sub.maxActiveListings) : "");
    setCustomMaxMonthlyLeads(sub.maxMonthlyLeads ? String(sub.maxMonthlyLeads) : "");
    setReason("");
    setFeedback(null);
  };

  const handleModifyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalSeller) return;
    if (!reason || reason.trim().length < 3) {
      setFeedback({ type: "error", message: "Audit reason must be at least 3 characters." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await adminModifySellerSubscriptionAction({
        sellerId: activeModalSeller.sellerId,
        targetPlanCode: targetPlan,
        reason: reason.trim(),
        isPromotional,
        customMaxListings: customMaxListings ? parseInt(customMaxListings, 10) : null,
        customMaxMonthlyLeads: customMaxMonthlyLeads ? parseInt(customMaxMonthlyLeads, 10) : null,
        periodDays: periodDays ? parseInt(periodDays, 10) : null,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Subscription plan updated successfully." });
        setTimeout(() => {
          setActiveModalSeller(null);
          router.refresh();
        }, 800);
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update subscription." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (sellerId: string) => {
    const promptReason = window.prompt("Enter reason for suspending seller subscription entitlements:");
    if (!promptReason) return;

    setLoading(true);
    const res = await adminSuspendSellerSubscriptionAction({
      sellerId,
      reason: promptReason,
    });
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to suspend subscription.");
    }
  };

  const handleRestore = async (sellerId: string) => {
    const promptReason = window.prompt("Enter reason for restoring seller subscription entitlements:");
    if (!promptReason) return;

    setLoading(true);
    const res = await adminRestoreSellerSubscriptionAction({
      sellerId,
      reason: promptReason,
    });
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to restore subscription.");
    }
  };

  const filtered = initialSubscriptions.filter((s) => {
    if (filterPlan !== "all" && s.planCode !== filterPlan) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (search && !s.businessName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search seller business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 w-64"
          />

          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm focus:border-stone-500 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm focus:border-stone-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired / Suspended</option>
            <option value="past_due">Past Due</option>
          </select>
        </div>

        <div className="text-xs text-stone-500">
          Showing <strong>{filtered.length}</strong> of {initialSubscriptions.length} sellers
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200 bg-stone-50/75 font-semibold uppercase tracking-wider text-stone-600">
              <tr>
                <th className="px-6 py-4">Seller Business</th>
                <th className="px-6 py-4">Current Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Active Listings / Limit</th>
                <th className="px-6 py-4">Monthly Leads</th>
                <th className="px-6 py-4">Period End</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-stone-500">
                    No seller subscriptions match the selected criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => {
                  const isUnlimited = sub.maxActiveListings === null;
                  const isCapped = !isUnlimited && sub.activeListingsCount >= (sub.maxActiveListings ?? 0);

                  return (
                    <tr key={sub.sellerId} className="hover:bg-stone-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-stone-900">{sub.businessName}</div>
                        <div className="text-[11px] text-stone-500">
                          {sub.city && sub.state ? `${sub.city}, ${sub.state}` : "Location Unset"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                              sub.planCode === "enterprise"
                                ? "bg-purple-100 text-purple-800"
                                : sub.planCode === "pro"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-stone-100 text-stone-800"
                            }`}
                          >
                            {sub.planName}
                          </span>
                          {sub.promotionalGrant && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              Promo
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                            sub.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${isCapped ? "text-red-600 font-bold" : "text-stone-900"}`}>
                            {sub.activeListingsCount}
                          </span>
                          <span className="text-stone-400">/</span>
                          <span className="text-stone-600">
                            {isUnlimited ? "Unlimited" : sub.maxActiveListings}
                          </span>
                        </div>
                        {!isUnlimited && (
                          <div className="text-[10px] text-stone-500">
                            {sub.remainingListings} remaining
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-stone-900">{sub.usedMonthlyLeads}</span>
                          <span className="text-stone-400">/</span>
                          <span className="text-stone-600">
                            {sub.maxMonthlyLeads === null ? "Unlimited" : `${sub.maxMonthlyLeads}`}
                          </span>
                        </div>
                        {sub.maxMonthlyLeads !== null && (
                          <div className="text-[10px] text-stone-500">
                            {sub.remainingMonthlyLeads} remaining
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-stone-500">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Continuous"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModifyModal(sub)}
                            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
                          >
                            Modify Plan
                          </button>

                          {sub.status === "active" ? (
                            <button
                              onClick={() => handleSuspend(sub.sellerId)}
                              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(sub.sellerId)}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Modification Modal */}
      {activeModalSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-6">
            <div>
              <h2 className="font-serif text-xl font-normal text-stone-900">
                Modify Subscription Plan
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Updating subscription entitlements for <strong>{activeModalSeller.businessName}</strong>.
              </p>
            </div>

            {feedback && (
              <div
                className={`rounded-lg p-3 text-xs ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleModifyPlan} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700">Target Plan Tier</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["free", "pro", "enterprise"] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setTargetPlan(tier)}
                      className={`rounded-lg py-2 font-medium capitalize border ${
                        targetPlan === tier
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promo_grant"
                  checked={isPromotional}
                  onChange={(e) => setIsPromotional(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                />
                <label htmlFor="promo_grant" className="text-stone-700 font-medium">
                  Promotional Grant (Waives fees, flags in audit log)
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700">
                    Custom Listing Limit
                  </label>
                  <input
                    type="number"
                    placeholder="Plan default"
                    value={customMaxListings}
                    onChange={(e) => setCustomMaxListings(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700">
                    Custom Monthly Leads
                  </label>
                  <input
                    type="number"
                    placeholder="Plan default"
                    value={customMaxMonthlyLeads}
                    onChange={(e) => setCustomMaxMonthlyLeads(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700">
                    Period Days
                  </label>
                  <input
                    type="number"
                    value={periodDays}
                    onChange={(e) => setPeriodDays(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700">
                  Audit Trail Reason (Required)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. VIP quarry onboarding grant, partner waiver, requested tier adjustment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-2.5 text-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalSeller(null)}
                  disabled={loading}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-stone-900 px-5 py-2 font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {loading ? "Applying..." : "Confirm & Apply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
