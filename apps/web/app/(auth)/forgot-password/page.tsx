"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { forgotPassword } from "@/features/auth/actions";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await forgotPassword(data);
      if (result?.error) {
        setError(result.error);
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h1 className="text-xl font-semibold text-stone-900 mb-2">Check your inbox</h1>
        <p className="text-sm text-stone-500 mb-6">
          If an account exists for that email address, we&apos;ve sent a password reset link. It expires in 1 hour.
        </p>
        <Link href="/login" className="text-sm font-medium text-stone-900 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
      <h1 className="text-xl font-semibold text-stone-900 mb-2">Reset your password</h1>
      <p className="text-sm text-stone-500 mb-6">
        Enter the email address linked to your account and we&apos;ll send a reset link.
      </p>

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
            autoComplete="email"
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            placeholder="you@company.com"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-stone-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

