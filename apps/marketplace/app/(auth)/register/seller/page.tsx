"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { signUp } from "@/features/auth/actions";
import { ShieldCheck, ArrowRight, Building2, User, Mail, Lock } from "lucide-react";

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
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-stone-900/5 border border-stone-200/90 p-6 sm:p-8">
      <div className="mb-6 space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200/80 mb-1">
          <Building2 className="h-3.5 w-3.5 text-amber-700" />
          <span>Quarry &amp; Processor Enrollment</span>
        </div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">Create a Seller account</h1>
        <p className="text-xs sm:text-sm text-stone-600">
          List your stone products and connect directly with verified architects and builders nationwide.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs sm:text-sm text-red-700 font-semibold flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-xs font-bold text-stone-800 mb-1">
            Owner / Contact Person Name <span className="text-amber-600">*</span>
          </label>
          <div className="relative">
            <User className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              className="w-full h-11 rounded-xl sm:rounded-2xl border border-stone-200 bg-stone-50/70 focus:bg-white pl-9 pr-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              placeholder="e.g. Shakti Singh"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-bold text-stone-800 mb-1">
            Business Email <span className="text-amber-600">*</span>
          </label>
          <div className="relative">
            <Mail className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full h-11 rounded-xl sm:rounded-2xl border border-stone-200 bg-stone-50/70 focus:bg-white pl-9 pr-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              placeholder="sales@yourcompany.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-bold text-stone-800 mb-1">
            Password <span className="text-amber-600">*</span>
          </label>
          <div className="relative">
            <Lock className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full h-11 rounded-xl sm:rounded-2xl border border-stone-200 bg-stone-50/70 focus:bg-white pl-9 pr-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              placeholder="Min 10 chars, uppercase, lowercase & number"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-stone-500 font-medium">
            At least 10 characters with uppercase, lowercase, and a number.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-12 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 active:scale-[0.99] text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-amber-700/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Creating Seller Account…</span>
            </>
          ) : (
            <>
              <span>Create Seller Account</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 rounded-xl sm:rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3 sm:p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold">Fast-Track Quarry Verification</strong>
          After creating your account you will be able to complete your quarry profile and submit GST/IEC verification documents.
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-stone-100 space-y-2 text-center text-xs text-stone-500">
        <p>
          Looking to source stones instead?{" "}
          <Link href="/register/buyer" className="font-bold text-amber-800 hover:underline">
            Create a Buyer Account
          </Link>
        </p>
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-stone-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
