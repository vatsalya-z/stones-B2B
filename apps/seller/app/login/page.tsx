"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sanitizeNextPath } from "@stone/validation";
import { getMarketplaceBaseUrl } from "@/lib/marketplace-url";

const marketplaceUrl = getMarketplaceBaseUrl();

function SellerLoginForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const safeNext = rawNext ? sanitizeNextPath(rawNext, "/seller/dashboard") : "/seller/dashboard";
  const registerHref = safeNext
    ? `/register?next=${encodeURIComponent(safeNext)}`
    : `/register`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleAutofillSeller() {
    setEmail("seller@gmail.com");
    setPassword("Password@123");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          next: safeNext,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "Invalid supplier email or password");
        setIsPending(false);
      } else if (json.redirectTo) {
        window.location.href = json.redirectTo;
      }
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200 overflow-hidden">
      {/* Top Banner Accent: Warm Quarry & Earth Stone */}
      <div className="h-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700" />

      <div className="p-8">
        {/* Portal Identification Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 mb-3 shadow-2xs">
            <span className="text-sm">🏪</span>
            <span>StonesDekho Supplier & Quarry Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Sign in to Supplier Portal
          </h1>
          <p className="mt-1.5 text-xs text-stone-500 max-w-sm mx-auto">
            Manage your natural stone catalogue, receive direct buyer RFQs, and issue commercial quotations.
          </p>
        </div>

        {safeNext && safeNext !== "/seller/dashboard" && (
          <div className="text-xs text-amber-800 bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Sign in to continue to your requested supplier management page.
          </div>
        )}

        {/* Dedicated Seller 1-Click Demo Fill */}
        <div className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <span>⚡</span> Quick Test Account
            </span>
            <span className="text-[10px] font-mono bg-amber-100/80 text-amber-800 px-1.5 py-0.5 rounded font-medium">
              Demo Access
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutofillSeller}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-50/80 hover:border-amber-300 text-left transition-all shadow-2xs active:scale-[0.99] group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-800 group-hover:scale-105 transition-transform">
                🏪
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900">Makrana Marble Co. (Verified Supplier)</div>
                <div className="text-[11px] text-stone-500 font-mono">seller@gmail.com</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-700 group-hover:text-amber-800 flex items-center gap-0.5">
              1-Click Fill →
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 flex items-start gap-2">
            <span className="text-base leading-none">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Supplier / Business Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:outline-hidden focus:ring-2 focus:ring-amber-600/20 transition-all"
              placeholder="quarry@makranamarble.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:outline-hidden focus:ring-2 focus:ring-amber-600/20 transition-all"
              placeholder="••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-medium py-2.5 px-4 text-sm shadow-sm transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Authenticating Supplier...</span>
              </>
            ) : (
              <span>Sign In to Supplier Portal →</span>
            )}
          </button>
        </form>

        {/* Portal Registration Callout */}
        <div className="mt-6 pt-5 border-t border-stone-200 text-center space-y-2.5">
          <p className="text-xs text-stone-600 font-medium">
            Don&apos;t have a seller account yet?
          </p>
          <Link
            href={registerHref}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50/90 hover:bg-amber-100 hover:border-amber-400 py-2.5 px-4 text-xs sm:text-sm font-bold text-amber-950 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
          >
            <span>✨</span>
            <span>New Seller? Create Account Here</span>
            <span>→</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-5 grid grid-cols-3 gap-1 pt-4 border-t border-stone-100 text-center">
          <div className="text-[10px] text-stone-500 font-medium">✓ Direct Buyer RFQs</div>
          <div className="text-[10px] text-stone-500 font-medium">✓ 0% Commission</div>
          <div className="text-[10px] text-stone-500 font-medium">✓ Verified Supplier</div>
        </div>
      </div>

      {/* Return to Marketplace link */}
      <div className="bg-stone-50 px-8 py-3.5 border-t border-stone-200/80 text-center">
        <a
          href={marketplaceUrl}
          className="text-xs text-stone-500 hover:text-stone-800 inline-flex items-center gap-1 transition-colors font-medium"
        >
          <span>←</span> Return to Public Marketplace (stonesdekho.com)
        </a>
      </div>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8 animate-pulse w-full max-w-md mx-auto">
          <div className="h-6 w-48 rounded bg-stone-200 mb-6 mx-auto" />
          <div className="space-y-4">
            <div className="h-10 rounded bg-stone-100" />
            <div className="h-10 rounded bg-stone-100" />
            <div className="h-10 rounded bg-stone-200" />
          </div>
        </div>
      }
    >
      <SellerLoginForm />
    </Suspense>
  );
}
