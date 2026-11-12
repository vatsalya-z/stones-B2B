"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sanitizeNextPath } from "@stone/validation";

const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000";

function BuyerLoginForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const safeNext = rawNext ? sanitizeNextPath(rawNext, "/buyer/dashboard") : "/buyer/dashboard";
  const registerHref = safeNext
    ? `${marketplaceUrl}/register/buyer?next=${encodeURIComponent(safeNext)}`
    : `${marketplaceUrl}/register/buyer`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleAutofillBuyer() {
    setEmail("buyer@gmail.com");
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
        setError(json.error || "Invalid buyer email or password");
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
      {/* Top Banner Accent */}
      <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

      <div className="p-8">
        {/* Portal Identification Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 mb-3 shadow-2xs">
            <span className="text-sm">🛒</span>
            <span>StonesDekho Buyer Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Sign in as a Buyer
          </h1>
          <p className="mt-1.5 text-xs text-stone-500 max-w-sm mx-auto">
            Access your architectural stone quotations, factory RFQs, and purchase order tracking.
          </p>
        </div>

        {safeNext && safeNext !== "/buyer/dashboard" && (
          <div className="text-xs text-blue-700 bg-blue-50/80 border border-blue-200 rounded-lg px-3 py-2 mb-4">
            Sign in to continue to your requested procurement page.
          </div>
        )}

        {/* Dedicated Buyer 1-Click Demo Fill */}
        <div className="mb-5 rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
              <span>⚡</span> Quick Test Account
            </span>
            <span className="text-[10px] font-mono bg-blue-100/80 text-blue-800 px-1.5 py-0.5 rounded font-medium">
              Demo Access
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutofillBuyer}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50/80 hover:border-blue-300 text-left transition-all shadow-2xs active:scale-[0.99] group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 group-hover:scale-105 transition-transform">
                🛒
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900">Commercial Buyer Account</div>
                <div className="text-[11px] text-stone-500 font-mono">buyer@gmail.com</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 flex items-center gap-0.5">
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
              Buyer Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 transition-all"
              placeholder="architect@company.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
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
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 transition-all"
              placeholder="••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium py-2.5 px-4 text-sm shadow-sm transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Authenticating Buyer...</span>
              </>
            ) : (
              <span>Sign In to Buyer Portal →</span>
            )}
          </button>
        </form>

        {/* Portal Registration Callout */}
        <div className="mt-6 pt-5 border-t border-stone-200 text-center">
          <p className="text-xs text-stone-600">
            Need a natural stone buyer account?{" "}
            <a
              href={registerHref}
              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              Register as a Buyer
            </a>
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mt-5 grid grid-cols-3 gap-1 pt-4 border-t border-stone-100 text-center">
          <div className="text-[10px] text-stone-500 font-medium">✓ Direct Quarry Rates</div>
          <div className="text-[10px] text-stone-500 font-medium">✓ Verified Suppliers</div>
          <div className="text-[10px] text-stone-500 font-medium">✓ GST Tax Invoice</div>
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

export default function BuyerLoginPage() {
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
      <BuyerLoginForm />
    </Suspense>
  );
}
