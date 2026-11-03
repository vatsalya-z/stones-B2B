"use client";
import { useEffect, useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { resetPassword } from "@/features/auth/actions";

/**
 * This page handles the password-reset flow.
 *
 * Supabase sends the user to:
 *   /auth/reset-password#access_token=…&type=recovery
 *
 * The Supabase JS client picks up the fragment and emits an
 * `PASSWORD_RECOVERY` auth event. We listen for it here so the session
 * is established before submitting the new password.
 */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await resetPassword(data);
      if (result?.error) setError(result.error);
    });
  }

  if (!ready) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
        <div className="text-stone-400 text-sm">Verifying your reset link…</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
      <h1 className="text-xl font-semibold text-stone-900 mb-6">Choose a new password</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
            New password
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
          {isPending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}

