"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sanitizeNextPath } from "@stone/validation";
import { getMarketplaceBaseUrl } from "@/lib/marketplace-url";

const marketplaceUrl = getMarketplaceBaseUrl();

function SellerRegisterForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const safeNext = rawNext ? sanitizeNextPath(rawNext, "/seller/dashboard") : "/seller/dashboard";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsPending(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          accountType: "seller",
          next: safeNext,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "Failed to create seller account. Please check your details.");
        setIsPending(false);
      } else if (json.redirectTo && !json.requiresEmailVerification) {
        window.location.href = json.redirectTo;
      } else {
        setSuccessMsg(
          json.message ||
            "Registration successful! Please check your email inbox to verify your account or sign in.",
        );
        setIsPending(false);
      }
    } catch {
      setError("An unexpected network error occurred. Please check connection and try again.");
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
            <span>StonesDekho Quarry &amp; Supplier Enrollment</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Create Seller Account
          </h1>
          <p className="mt-1.5 text-xs text-stone-500 max-w-sm mx-auto">
            List your natural stone catalogue, receive direct contractor RFQs, and grow your stone business nationwide.
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <span className="text-base">✅</span>
              <span>Account Created Successfully!</span>
            </div>
            <p className="leading-relaxed">{successMsg}</p>
            <div className="pt-2">
              <Link
                href={`/login?next=${encodeURIComponent(safeNext)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors"
              >
                <span>Proceed to Sign In</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start gap-2.5 font-medium animate-in fade-in">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-bold text-stone-700 mb-1.5"
              >
                Owner / Contact Person Name <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra Sharma"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-stone-700 mb-1.5"
              >
                Business Email <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="quarry@example.com"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-stone-700 mb-1.5"
              >
                Password <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-stone-500">
                At least 10 characters with uppercase, lowercase, and a number.
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 py-3 px-4 text-sm font-bold text-white shadow-md shadow-amber-600/25 transition-all hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isPending ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Registering Stone Quarry...</span>
                </>
              ) : (
                <>
                  <span>Create Seller Account</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Existing account sign-in prompt */}
        <div className="mt-6 pt-5 border-t border-stone-200/80 text-center">
          <p className="text-xs text-stone-600 mb-2">
            Already have a StonesDekho supplier account?
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(safeNext)}`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 hover:border-stone-400 py-2.5 px-4 text-xs sm:text-sm font-bold text-stone-800 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
          >
            <span>🔐</span>
            <span>Sign in to Supplier Portal</span>
            <span>→</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-5 grid grid-cols-3 gap-1 pt-4 border-t border-stone-100 text-center">
          <div className="text-[10px] text-stone-500 font-medium">✓ Direct Buyer RFQs</div>
          <div className="text-[10px] text-stone-500 font-medium">✓ 0% Commission</div>
          <div className="text-[10px] text-stone-500 font-medium">✓ Verified Quarry</div>
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

export default function SellerRegisterPage() {
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
      <SellerRegisterForm />
    </Suspense>
  );
}
