import React from "react";
import Link from "next/link";
import { getPortalUrl } from "@stone/utils";

export default function AdminNotFound() {
  const marketplaceUrl = getPortalUrl("marketplace");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-16 text-center text-stone-900">
      <div className="mx-auto max-w-md space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-100 px-3.5 py-1 text-xs font-semibold text-stone-900 shadow-xs">
          <span className="flex h-2 w-2 rounded-full bg-stone-900 animate-pulse" />
          Admin Console • 404 Not Found
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">
          Admin Resource Not Found
        </h1>

        <p className="text-sm text-stone-600 leading-relaxed">
          The requested administrative module, audit record, user profile, or configuration view could not be located.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-stone-800"
          >
            Admin Dashboard
          </Link>

          <a
            href={marketplaceUrl}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-xs transition-colors hover:bg-stone-50"
          >
            StonesDekho Marketplace
          </a>
        </div>
      </div>
    </div>
  );
}

