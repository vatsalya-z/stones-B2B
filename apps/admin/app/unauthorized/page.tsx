import Link from "next/link";
import { Card, CardBody } from "@stone/ui";
import { getCurrentUser } from "@/lib/auth";

const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000";
const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || "http://localhost:3002";

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden text-stone-100">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <Card className="border border-stone-800 bg-stone-900/90 shadow-2xl shadow-black/60 overflow-hidden">
          {/* Top accent line */}
          <div className="h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600" />

          <CardBody className="p-8 text-center space-y-6">
            {/* 403 Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800 shadow-2xs">
              <span>🔒</span>
              <span>403 • Administrator Clearance Required</span>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Access Restricted
              </h1>
              <p className="text-sm text-stone-400 leading-relaxed max-w-md mx-auto">
                {user ? (
                  <>
                    Signed in as <span className="font-semibold text-stone-200">{user.email}</span>. This account does not have administrative privileges to access the StonesDekho Operations Console.
                  </>
                ) : (
                  "You must sign in with an authorized Administrator or Super Admin account to access the StonesDekho Operations Console."
                )}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign in with Administrator Account
              </Link>

              {user && (
                <form action="/api/auth/signout" method="POST" className="w-full">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-800/80 px-5 py-2.5 text-sm font-semibold text-stone-300 shadow-2xs transition-colors hover:bg-stone-800 hover:text-white"
                  >
                    <span>🚪</span>
                    Sign Out & Switch Account
                  </button>
                </form>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={sellerUrl}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
                >
                  <span>🏪</span>
                  Seller Portal ↗
                </a>
                <a
                  href={marketplaceUrl}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
                >
                  <span>🛒</span>
                  Marketplace ↗
                </a>
              </div>
            </div>

            {/* Security note */}
            <div className="pt-4 border-t border-stone-800/80 text-xs text-stone-500">
              StonesDekho Operations & Security Console • Internal Use Only
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
