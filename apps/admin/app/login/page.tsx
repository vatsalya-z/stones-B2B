"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sanitizeNextPath } from "@stone/validation";

const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const safeNext = rawNext ? sanitizeNextPath(rawNext, "/admin/dashboard") : "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleAutofillAdmin() {
    setEmail("admin@gmail.com");
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
        setError(json.error || "Invalid administrator credentials or insufficient clearance");
        setIsPending(false);
      } else if (json.redirectTo) {
        window.location.href = json.redirectTo;
      }
    } catch {
      setError("An unexpected network error occurred. Please verify backend connectivity.");
      setIsPending(false);
    }
  }

  return (
    <div className="bg-stone-900/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/60 border border-stone-800 overflow-hidden text-stone-100">
      {/* Top Banner Accent: High Security Violet & Indigo */}
      <div className="h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600" />

      <div className="p-8">
        {/* Portal Identification Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60 mb-3 shadow-2xs">
            <span className="text-sm">👑</span>
            <span>Operations Console • Restricted</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Admin Operations Console
          </h1>
          <p className="mt-1.5 text-xs text-stone-400 max-w-sm mx-auto">
            Authorized StonesDekho platform administrators and operations governance personnel only.
          </p>
        </div>

        {safeNext && safeNext !== "/admin/dashboard" && (
          <div className="text-xs text-purple-300 bg-purple-950/60 border border-purple-800/60 rounded-lg px-3 py-2 mb-4">
            Authenticate to access protected administrative path.
          </div>
        )}

        {/* Dedicated Admin 1-Click Demo Fill */}
        <div className="mb-5 rounded-xl border border-purple-800/50 bg-purple-950/30 p-3.5 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
              <span>⚡</span> Authorized Test Account
            </span>
            <span className="text-[10px] font-mono bg-purple-900/80 text-purple-200 px-1.5 py-0.5 rounded font-medium border border-purple-700/50">
              Admin Access
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutofillAdmin}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-purple-800/60 bg-stone-800/80 hover:bg-stone-800 hover:border-purple-600 text-left transition-all shadow-2xs active:scale-[0.99] group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-900/80 border border-purple-700/50 flex items-center justify-center text-sm font-bold text-purple-200 group-hover:scale-105 transition-transform">
                👑
              </div>
              <div>
                <div className="text-xs font-bold text-white">Super Administrator (Governance)</div>
                <div className="text-[11px] text-stone-400 font-mono">admin@gmail.com</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-purple-400 group-hover:text-purple-300 flex items-center gap-0.5">
              1-Click Fill →
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-950/80 border border-red-800/80 px-4 py-3 text-xs text-red-200 flex items-start gap-2">
            <span className="text-base leading-none">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
              Administrator Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-stone-700 bg-stone-950/60 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-purple-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 transition-all"
              placeholder="admin@stonesdekho.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
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
              className="w-full rounded-lg border border-stone-700 bg-stone-950/60 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-purple-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 transition-all"
              placeholder="••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-medium py-2.5 px-4 text-sm shadow-md transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Verifying Security Clearance...</span>
              </>
            ) : (
              <span>Authenticate & Access Console →</span>
            )}
          </button>
        </form>

        {/* Security Notice: Strictly NO Public Registration */}
        <div className="mt-6 pt-5 border-t border-stone-800 text-center">
          <div className="rounded-lg bg-stone-950/60 border border-stone-800/80 px-3.5 py-2.5 text-left">
            <div className="flex items-center gap-1.5 text-stone-300 font-semibold text-xs mb-1">
              <span>🔒</span>
              <span>Platform Security Notice</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Public self-registration is disabled for administrative operations. System accounts are provisioned exclusively through internal platform governance.
            </p>
          </div>
        </div>

        {/* Governance Badges */}
        <div className="mt-5 grid grid-cols-3 gap-1 pt-4 border-t border-stone-800/80 text-center">
          <div className="text-[10px] text-stone-400 font-medium">🛡️ RBAC Enforced</div>
          <div className="text-[10px] text-stone-400 font-medium">📋 Audit Logged</div>
          <div className="text-[10px] text-stone-400 font-medium">🔐 TLS Secured</div>
        </div>
      </div>

      {/* Return to Marketplace link */}
      <div className="bg-stone-950/80 px-8 py-3.5 border-t border-stone-800 text-center">
        <a
          href={marketplaceUrl}
          className="text-xs text-stone-400 hover:text-stone-200 inline-flex items-center gap-1 transition-colors font-medium"
        >
          <span>←</span> Return to Public Marketplace (stonesdekho.com)
        </a>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-stone-900 rounded-2xl shadow-xl border border-stone-800 p-8 animate-pulse w-full max-w-md mx-auto">
          <div className="h-6 w-48 rounded bg-stone-800 mb-6 mx-auto" />
          <div className="space-y-4">
            <div className="h-10 rounded bg-stone-800" />
            <div className="h-10 rounded bg-stone-800" />
            <div className="h-10 rounded bg-stone-700" />
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
