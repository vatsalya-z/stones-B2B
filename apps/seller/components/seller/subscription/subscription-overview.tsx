"use client";

import Link from "next/link";
import type { SellerSubscriptionDetails } from "@/features/subscription/queries";

export function SubscriptionOverview({ data }: { data: SellerSubscriptionDetails }) {
  const { entitlements, plan, subscription } = data;

  // Listing quota calculations
  const isUnlimited = entitlements.isUnlimited;
  const maxListings = entitlements.maxActiveListings ?? 0;
  const activeCount = entitlements.activeListingsCount;
  const remaining = entitlements.remainingListings;
  const listingPct = isUnlimited ? 15 : Math.min(100, Math.round((activeCount / maxListings) * 100));
  const isListingWarning = !isUnlimited && listingPct >= 80;
  const isListingCapped = !isUnlimited && activeCount >= maxListings;

  // Monthly lead allowance calculations
  const isUnlimitedLeads = entitlements.isUnlimitedLeads;
  const maxLeads = entitlements.maxMonthlyLeads ?? 0;
  const usedLeads = entitlements.usedMonthlyLeads;
  const remainingLeads = entitlements.remainingMonthlyLeads;
  const leadPct = isUnlimitedLeads ? 10 : Math.min(100, Math.round((usedLeads / maxLeads) * 100));
  const isLeadCapped = !isUnlimitedLeads && usedLeads >= maxLeads;

  return (
    <div className="space-y-8">
      {/* 1. Critical Status Banners */}
      {entitlements.isSuspended && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-900 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-950">Subscription Administratively Suspended</h3>
              <p className="mt-1 text-xs text-red-800">
                Your seller subscription has been suspended by platform administration. Product listing creation and incoming buyer RFQ lead routing are temporarily locked. Contact platform support or your account manager for account review.
              </p>
            </div>
          </div>
        </div>
      )}

      {entitlements.isInGracePeriod && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <h3 className="font-semibold text-amber-950">Subscription in Grace Period</h3>
              <p className="mt-1 text-xs text-amber-800">
                Your previous subscription billing period has ended. Your plan entitlements remain active during this courtesy grace period until{" "}
                <strong>
                  {entitlements.gracePeriodEnd
                    ? new Date(entitlements.gracePeriodEnd).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "the end of grace"}
                </strong>
                . Renew your plan to avoid automatic fallback to the Free tier.
              </p>
            </div>
          </div>
        </div>
      )}

      {entitlements.isOverListingLimit && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 text-sm text-blue-900 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-950">Active Catalogue Exceeds Current Plan Limit</h3>
              <p className="mt-1 text-xs text-blue-800">
                You currently have <strong>{activeCount} active listings</strong>, which exceeds your current plan allowance of <strong>{maxListings}</strong> (due to a plan downgrade or expired term).
              </p>
              <p className="mt-1 text-xs font-medium text-blue-900">
                • <strong>Buyer visibility preserved:</strong> All {activeCount} existing products remain active and visible to buyers in the public marketplace. No products have been deleted or archived.
              </p>
              <p className="mt-0.5 text-xs font-medium text-blue-900">
                • <strong>New additions paused:</strong> You cannot create or activate additional products until your active catalogue count is reduced below {maxListings}, or you upgrade to Pro or Enterprise.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Subscription Header Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                Current Plan
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                  entitlements.planCode === "enterprise"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : entitlements.planCode === "pro"
                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                      : "bg-stone-100 text-stone-700 border border-stone-200"
                }`}
              >
                {entitlements.planName}
              </span>
              {entitlements.isPromotional && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                  Promotional Preview Grant
                </span>
              )}
              {entitlements.isSuspended && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-red-800 border border-red-200">
                  Suspended
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl font-normal text-stone-900">
              {entitlements.planName} Plan
            </h1>
            <p className="max-w-2xl text-sm text-stone-600">
              {plan.description ||
                "Access natural stone buyers, manage verified catalogue items, and submit competitive architectural quotations."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/seller/subscription/plans"
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800"
            >
              {entitlements.planCode === "enterprise" ? "Manage Plans" : "Upgrade Plan"}
            </Link>
            <Link
              href="/seller/subscription/history"
              className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
            >
              View Activity
            </Link>
          </div>
        </div>

        {/* 3. Dual Quota Meters (Active Listings & Monthly Leads) */}
        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-stone-100 pt-6 lg:grid-cols-2">
          {/* Meter A: Product Listing Capacity */}
          <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-medium text-stone-900">Catalogue Listing Capacity</span>
                <p className="text-xs text-stone-500">Archived & rejected products do not consume quota</p>
              </div>
              <span className="text-sm font-semibold text-stone-900">
                {activeCount} {isUnlimited ? "active" : `/ ${maxListings} active`}
                {!isUnlimited && ` (${remaining} remaining)`}
              </span>
            </div>

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-full transition-all duration-500 ${
                  isListingCapped
                    ? "bg-red-500"
                    : isListingWarning
                      ? "bg-amber-500"
                      : "bg-emerald-600"
                }`}
                style={{ width: `${listingPct}%` }}
              />
            </div>

            {isListingCapped && (
              <p className="mt-2 text-xs text-red-700 font-medium">
                Capacity reached. Upgrade plan or archive products to list new stone varieties.
              </p>
            )}
          </div>

          {/* Meter B: Monthly Lead Allowance */}
          <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-medium text-stone-900">Monthly Lead Allowance</span>
                <p className="text-xs text-stone-500">
                  {entitlements.billingPeriodEnd
                    ? `Period resets on ${new Date(entitlements.billingPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                    : "Monthly calendar reset (IST)"}
                </p>
              </div>
              <span className="text-sm font-semibold text-stone-900">
                {usedLeads} {isUnlimitedLeads ? "leads" : `/ ${maxLeads} leads`}
                {!isUnlimitedLeads && ` (${remainingLeads} remaining)`}
              </span>
            </div>

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-full transition-all duration-500 ${
                  isLeadCapped
                    ? "bg-red-500"
                    : usedLeads >= maxLeads * 0.8
                      ? "bg-amber-500"
                      : "bg-indigo-600"
                }`}
                style={{ width: `${leadPct}%` }}
              />
            </div>

            {isLeadCapped ? (
              <p className="mt-2 text-xs text-red-700 font-medium">
                Monthly allowance exhausted. Direct RFQ lead routing is paused until next cycle or upgrade.
              </p>
            ) : (
              <p className="mt-2 text-xs text-stone-500">
                Leads are consumed when new RFQ requirements matching your catalogue are assigned to your inbox.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Plan Details & Entitlements Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card 1: Features & Commercial Privileges */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            Storefront & Features
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between text-stone-700">
              <span>Storefront Experience</span>
              <span className="font-medium text-stone-900 capitalize">
                {entitlements.features.storefront || "Basic"}
              </span>
            </li>
            <li className="flex items-center justify-between text-stone-700">
              <span>Analytics Tier</span>
              <span className="font-medium text-stone-900 capitalize">
                {entitlements.features.analytics || "Basic"}
              </span>
            </li>
            <li className="flex items-center justify-between text-stone-700">
              <span>Featured Products Placement</span>
              <span className={`font-medium ${entitlements.features.featured_products ? "text-emerald-700 font-semibold" : "text-stone-500"}`}>
                {entitlements.features.featured_products ? "Enabled" : "Pro Only"}
              </span>
            </li>
            <li className="flex items-center justify-between text-stone-700">
              <span>Priority Lead Access</span>
              <span className={`font-medium ${entitlements.features.priority_lead_routing ? "text-amber-800 font-semibold" : "text-stone-500"}`}>
                {entitlements.features.priority_lead_routing ? "High Priority" : "Standard"}
              </span>
            </li>
          </ul>
        </div>

        {/* Card 2: Billing & Cycle Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            Billing & Renewal
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between text-stone-700">
              <span>Status</span>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase text-emerald-800">
                {entitlements.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-stone-700">
              <span>Billing Cycle</span>
              <span className="font-medium text-stone-900 capitalize">
                {subscription?.billingCycle || "Lifetime"}
              </span>
            </div>
            <div className="flex items-center justify-between text-stone-700">
              <span>Current Period End</span>
              <span className="font-medium text-stone-900">
                {subscription?.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "No Expiry (Preview)"}
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/seller/subscription/billing"
                className="text-xs font-medium text-stone-900 underline hover:text-stone-700"
              >
                View billing details →
              </Link>
            </div>
          </div>
        </div>

        {/* Card 3: Quick Navigation */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            Subscription Options
          </h2>
          <div className="mt-4 space-y-2">
            <Link
              href="/seller/subscription/plans"
              className="flex items-center justify-between rounded-lg p-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
            >
              <span>Compare all 3 plans</span>
              <span className="text-stone-400">→</span>
            </Link>
            <Link
              href="/seller/subscription/billing"
              className="flex items-center justify-between rounded-lg p-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
            >
              <span>Billing & Tax settings</span>
              <span className="text-stone-400">→</span>
            </Link>
            <Link
              href="/seller/subscription/history"
              className="flex items-center justify-between rounded-lg p-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
            >
              <span>Subscription audit log</span>
              <span className="text-stone-400">→</span>
            </Link>
            <Link
              href="/seller/products"
              className="flex items-center justify-between rounded-lg p-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
            >
              <span>Manage active products</span>
              <span className="text-stone-400">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
