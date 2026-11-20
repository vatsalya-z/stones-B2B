import Link from "next/link";
import { Card, CardBody } from "@stone/ui";
import { getMarketplaceBaseUrl } from "@/lib/marketplace-url";

const marketplaceUrl = getMarketplaceBaseUrl();

interface UnauthorizedPageProps {
  searchParams?: Promise<{
    role?: string;
    reason?: string;
  }>;
}

export default async function UnauthorizedPage({ searchParams }: UnauthorizedPageProps) {
  const sp = searchParams ? await searchParams : {};
  const isSellerRequired = sp.role === "seller_required" || !sp.role;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Card className="border border-stone-200/80 shadow-xl shadow-stone-200/50 overflow-hidden">
          {/* Top amber accent line */}
          <div className="h-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700" />

          <CardBody className="p-8 text-center space-y-6">
            {/* 403 Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
              <span>🔒</span>
              <span>403 • {isSellerRequired ? "Supplier Portal Access Required" : "Access Restricted"}</span>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                {isSellerRequired ? "Supplier Account Required" : "Access Denied"}
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                {isSellerRequired
                  ? "The account you are currently logged in with does not have Supplier permissions. To manage products, upload photographs, and access the seller dashboard, please sign in with your Supplier account or register your business."
                  : "You don't have permission to view this section of StonesDekho with your current account privileges."}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="/login?next=/seller/products/new"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-stone-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign in with Supplier Account
              </Link>

              <a
                href={`${marketplaceUrl}/register/seller?next=${encodeURIComponent("/seller/products/new")}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 shadow-2xs transition-colors hover:bg-stone-50 hover:border-stone-400"
              >
                <span>🏪</span>
                Create New Seller Account
              </a>

              <a
                href={marketplaceUrl}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-50 hover:text-amber-900"
              >
                ← Return to StonesDekho Marketplace
              </a>
            </div>

            {/* Helpful Note */}
            <div className="pt-4 border-t border-stone-100 text-xs text-stone-500">
              Need assistance with your seller profile or supplier verification?{" "}
              <a href={`${marketplaceUrl}/contact`} className="font-semibold text-amber-700 hover:underline">
                Contact StonesDekho Support
              </a>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
