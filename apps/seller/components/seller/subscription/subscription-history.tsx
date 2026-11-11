"use client";

import Link from "next/link";
import type { SubscriptionEventRow } from "@/features/subscription/queries";

export function SubscriptionHistory({ events }: { events: SubscriptionEventRow[] }) {
  const formatEventType = (type: string) => {
    switch (type) {
      case "created":
        return "Initial Enrollment";
      case "upgraded":
        return "Plan Upgraded";
      case "downgraded":
        return "Plan Downgraded";
      case "plan_changed":
        return "Plan Transitioned";
      case "grant_added":
        return "Promotional Grant Added";
      case "grant_revoked":
        return "Grant Revoked";
      case "suspended":
        return "Subscription Suspended";
      case "restored":
        return "Subscription Restored";
      case "listing_blocked":
        return "Listing Limit Enforced";
      default:
        return type.replace(/_/g, " ");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-normal text-stone-900">
            Subscription Activity Log
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Immutable audit record of all plan transitions, promotional grants, and administrative updates.
          </p>
        </div>

        <Link
          href="/seller/subscription"
          className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* Events Timeline / Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {events.length === 0 ? (
          <div className="p-12 text-center text-sm text-stone-500">
            No subscription events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-100 bg-stone-50/60 font-semibold uppercase tracking-wider text-stone-600">
                <tr>
                  <th className="px-6 py-4">Event Date</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Plan</th>
                  <th className="px-6 py-4">Triggered By</th>
                  <th className="px-6 py-4">Notes / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-stone-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-stone-500">
                      {new Date(ev.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-800 capitalize">
                        {formatEventType(ev.eventType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-stone-900">
                      {ev.newPlanName || "Standard"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize text-stone-600">
                      {ev.triggeredBy}
                    </td>
                    <td className="px-6 py-4 text-stone-600 max-w-xs truncate">
                      {ev.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

