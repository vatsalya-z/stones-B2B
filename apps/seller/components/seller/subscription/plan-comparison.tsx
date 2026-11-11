"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sellerSelectPlanAction } from "@/features/subscription/actions";
import type { SellerSubscriptionDetails } from "@/features/subscription/queries";

export function PlanComparison({ data }: { data: SellerSubscriptionDetails }) {
  const router = useRouter();
  const { entitlements, plans } = data;
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSelectPlan = async (code: "free" | "pro" | "enterprise") => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await sellerSelectPlanAction({ targetPlanCode: code });
      if (res.success && res.data) {
        setFeedback({ type: "success", message: res.data.message });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to switch plan." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="font-serif text-3xl font-normal text-stone-900">
          Supplier Subscription Plans
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">
          Scale your natural stone catalogue, receive high-value commercial enquiries, and access verified architectural buyers across India and global export markets.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-lg p-4 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Preview Notice Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
        <strong>Platform Preview Mode:</strong> Commercial subscription billing is currently deferred. Verified natural stone suppliers can test Free, Pro, and Enterprise capabilities without payment gateway integration during this preview period.
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = entitlements.planCode === p.code;
          const isEnterprise = p.code === "enterprise";
          const isPro = p.code === "pro";

          return (
            <div
              key={p.code}
              className={`relative flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition-all sm:p-8 ${
                isCurrent
                  ? "border-stone-900 ring-2 ring-stone-900 bg-white"
                  : isPro
                    ? "border-amber-300 bg-gradient-to-b from-amber-50/30 to-white"
                    : "border-stone-200 bg-white"
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
                  Current Plan
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-normal text-stone-900">
                    {p.name}
                  </h2>
                  {p.features.badge && (
                    <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                      {p.features.badge}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-stone-600 min-h-[3rem]">
                  {p.description}
                </p>

                <div className="mt-6 border-b border-t border-stone-100 py-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-stone-900">
                      {p.priceMonthly !== null ? `₹${p.priceMonthly}` : "Preview Access"}
                    </span>
                    {p.priceMonthly !== null && (
                      <span className="text-xs text-stone-500">/ month</span>
                    )}
                  </div>
                  <span className="text-xs text-stone-500">
                    {p.maxActiveListings !== null
                      ? `Up to ${p.maxActiveListings} active product listings`
                      : "Unlimited active product listings"}
                  </span>
                </div>

                {/* Features List */}
                <ul className="mt-6 space-y-3 text-xs text-stone-700">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>
                      <strong>{p.maxActiveListings ?? "Unlimited"}</strong> Active Listings
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span className="capitalize">
                      <strong>{p.features.storefront || "Basic"}</strong> Storefront Design
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span className="capitalize">
                      <strong>{p.features.analytics || "Basic"}</strong> Seller Analytics
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span className="capitalize">
                      <strong>{p.features.lead_access || "Standard"}</strong> Lead Distribution
                    </span>
                  </li>
                  {p.features.priority_support && (
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Dedicated Account Specialist</span>
                    </li>
                  )}
                  {p.features.custom_domain && (
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Custom Subdomain & Brand Whitelabel</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-lg bg-stone-100 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-500 cursor-default"
                  >
                    Active on this Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(p.code as "free" | "pro" | "enterprise")}
                    disabled={loading}
                    className={`w-full rounded-lg py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
                      isPro
                        ? "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                        : isEnterprise
                          ? "bg-stone-900 text-white hover:bg-stone-800 shadow-sm"
                          : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    {loading ? "Processing..." : `Select ${p.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
