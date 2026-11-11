"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sanitizeNextPath } from "@stone/validation";

function LoginForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const safeNext = rawNext ? sanitizeNextPath(rawNext, "/dashboard") : null;
  const registerHref = safeNext
    ? `/register?next=${encodeURIComponent(safeNext)}`
    : "/register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleAutofill(roleEmail: string, rolePass: string) {
    setEmail(roleEmail);
    setPassword(rolePass);
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
        setError(json.error || "Invalid email or password");
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
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
      <h1 className="text-xl font-semibold text-stone-900 mb-2">Sign in to your account</h1>
      {safeNext && safeNext !== "/dashboard" && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Sign in to continue to your requested StonesDekho workflow.
        </p>
      )}

      {/* Demo Test Accounts Quick Fill */}
      <div className="mb-5 rounded-xl border border-stone-200 bg-stone-50/80 p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span> Quick Test Accounts (1-Click Fill)
          </span>
          <span className="text-[10px] font-mono bg-stone-200/80 text-stone-700 px-1.5 py-0.5 rounded">
            Key: Password@123
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleAutofill("admin@gmail.com", "Password@123")}
            className="flex flex-col items-center justify-center rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100/80 px-2 py-2 text-center transition-all hover:shadow-xs active:scale-95"
            title="Auto-fill Super Admin credentials"
          >
            <span className="text-xs font-bold text-purple-900">👑 Admin</span>
            <span className="text-[10px] text-purple-700 truncate w-full">admin@gmail.com</span>
          </button>

          <button
            type="button"
            onClick={() => handleAutofill("seller@gmail.com", "Password@123")}
            className="flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100/80 px-2 py-2 text-center transition-all hover:shadow-xs active:scale-95"
            title="Auto-fill Seller credentials"
          >
            <span className="text-xs font-bold text-amber-900">🏪 Seller</span>
            <span className="text-[10px] text-amber-700 truncate w-full">seller@gmail.com</span>
          </button>

          <button
            type="button"
            onClick={() => handleAutofill("buyer@gmail.com", "Password@123")}
            className="flex flex-col items-center justify-center rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100/80 px-2 py-2 text-center transition-all hover:shadow-xs active:scale-95"
            title="Auto-fill Buyer credentials"
          >
            <span className="text-xs font-bold text-blue-900">🛒 Buyer</span>
            <span className="text-[10px] text-blue-700 truncate w-full">buyer@gmail.com</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-stone-700">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-stone-500 hover:text-stone-700">
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
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            placeholder="••••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Don&apos;t have an account?{" "}
        <Link href={registerHref} className="font-medium text-stone-900 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 animate-pulse">
          <div className="h-6 w-48 rounded bg-stone-200 mb-6" />
          <div className="space-y-4">
            <div className="h-10 rounded bg-stone-100" />
            <div className="h-10 rounded bg-stone-100" />
            <div className="h-10 rounded bg-stone-200" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
