"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { signUp } from "@/features/auth/actions";

export default function RegisterSellerPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await signUp({
        fullName: data.get("fullName") as string,
        email: data.get("email") as string,
        password: data.get("password") as string,
        accountType: "seller",
      });
      if (result?.error) {
        setError(result.error);
      } else if (result?.redirectTo) {
        window.location.href = result.redirectTo;
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Create a Seller account</h1>
        <p className="text-sm text-stone-500 mt-1">
          List your stone products and connect with buyers across India and beyond.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-stone-700 mb-1">
            Owner / contact name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            placeholder="Arjun Patel"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
            Business email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            placeholder="sales@yourcompany.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            placeholder="Min 10 chars, upper + lower + number"
          />
          <p className="mt-1 text-xs text-stone-400">At least 10 characters with uppercase, lowercase, and a number.</p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Creating account…" : "Create Seller account"}
        </button>
      </form>

      <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 leading-relaxed">
        After creating your account you will need to complete your seller profile and submit verification documents.
        Your listings will be reviewed before going live.
      </div>

      <p className="mt-4 text-center text-sm text-stone-500">
        Looking to buy instead?{" "}
        <Link href="/register/buyer" className="font-medium text-stone-900 hover:underline">
          Create a Buyer account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-stone-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

