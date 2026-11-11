"use client";

import Link from "next/link";
import type { SellerSubscriptionDetails } from "@/features/subscription/queries";

export function BillingDetails({ data }: { data: SellerSubscriptionDetails }) {
  const { subscription } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-normal text-stone-900">
          Billing & Invoicing
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Manage your natural stone enterprise billing preferences, payment provider status, and tax invoicing records.
        </p>
      </div>

      {/* Provider Status Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          Payment Provider Status
        </h2>

        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="font-semibold text-amber-950">
              Provider-Neutral Architecture (Phase 4 Development Mode)
            </span>
            <p className="text-xs text-amber-800">
              Automated card/UPI payment gateways (Razorpay, Cashfree, Stripe) are currently deferred. All supplier plans are operating in Preview Mode without active charges.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-200/80 px-3 py-1 text-xs font-semibold text-amber-900">
            Billing Deferred
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-4">
            <span className="text-xs text-stone-500">Active Billing Cycle</span>
            <p className="mt-1 text-sm font-medium text-stone-900 capitalize">
              {subscription?.billingCycle || "Lifetime"}
            </p>
          </div>

          <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-4">
            <span className="text-xs text-stone-500">Current Period End</span>
            <p className="mt-1 text-sm font-medium text-stone-900">
              {subscription?.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Continuous / Non-expiring"}
            </p>
          </div>

          <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-4">
            <span className="text-xs text-stone-500">Payment Method</span>
            <p className="mt-1 text-sm font-medium text-stone-900">
              None required (Preview Access)
            </p>
          </div>

          <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-4">
            <span className="text-xs text-stone-500">Invoicing Status</span>
            <p className="mt-1 text-sm font-medium text-stone-900">
              ₹0.00 (Zero billing records generated)
            </p>
          </div>
        </div>
      </div>

      {/* Tax & GST Compliance Section */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          GST & Business Invoicing Entity
        </h2>
        <p className="mt-2 text-xs text-stone-600">
          Commercial B2B tax invoices will be issued to your verified business profile details when monetization goes live.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href="/seller/profile"
            className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Update Business & GST Details →
          </Link>
          <Link
            href="/seller/subscription/plans"
            className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            Review Subscription Plans →
          </Link>
        </div>
      </div>
    </div>
  );
}
