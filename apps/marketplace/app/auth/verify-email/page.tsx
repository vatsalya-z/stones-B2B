import { type SearchParams } from "next/dist/server/request/search-params";
import Link from "next/link";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const hasError = params["error"] === "verification_failed";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
      {hasError ? (
        <>
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Verification failed</h1>
          <p className="text-sm text-stone-500 mb-6">
            The link may have expired or already been used. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Request new link
          </Link>
        </>
      ) : (
        <>
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Verify your email</h1>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">
            We&apos;ve sent a confirmation link to your email address. Click the link to activate your account.
            <br />
            <span className="text-xs text-stone-400 mt-2 block">Didn&apos;t receive it? Check your spam folder.</span>
          </p>
          <Link href="/login" className="text-sm font-medium text-stone-900 hover:underline">
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}

