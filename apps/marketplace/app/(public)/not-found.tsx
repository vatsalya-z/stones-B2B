import React from "react";
import Link from "next/link";

export default function PublicNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-900 shadow-xs">
          <span className="flex h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
          404 Error • Supplier or Page Not Found
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-950 sm:text-5xl">
          Quarry or Supplier Not Found
        </h1>

        {/* Subtitle */}
        <p className="mx-auto max-w-lg text-base text-stone-600 sm:text-lg leading-relaxed">
          The supplier storefront or stone catalogue you requested does not exist, is awaiting
          verification, or has been relocated.
        </p>

        {/* Primary Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/suppliers"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-stone-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Browse Verified Suppliers
          </Link>

          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-xs transition-colors hover:bg-stone-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Explore Stone Catalogue
          </Link>

          <Link
            href="/request-quote"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-amber-700"
          >
            Request a Custom Quote
          </Link>
        </div>

        {/* Return Home Link */}
        <div className="pt-6 border-t border-stone-200/80">
          <Link
            href="/"
            className="text-xs font-medium text-stone-500 hover:text-stone-900 hover:underline"
          >
            ← Return to StonesDekho Home
          </Link>
        </div>
      </div>
    </div>
  );
}

