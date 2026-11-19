import Link from "next/link";
import { Clock, ShieldCheck, ArrowRight, Home } from "lucide-react";

export default function SellerPendingPage() {
  const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL
    ? `${process.env.NEXT_PUBLIC_SELLER_URL}/seller/dashboard`
    : "/dashboard";

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-stone-900/5 border border-stone-200/90 p-6 sm:p-8 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 shadow-xs">
          <Clock className="h-7 w-7 text-amber-700 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200/80 mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Account Successfully Registered</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Seller Profile Verification
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Your seller registration has been received. Our quarry onboarding desk will verify your business details and GST within{" "}
            <strong className="text-stone-900 font-bold">24–48 business hours</strong>.
          </p>
        </div>

        <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3.5 text-left text-xs text-stone-600 space-y-1.5">
          <div className="font-bold text-stone-800 flex items-center gap-1.5">
            <span>📋</span>
            <span>Next Steps for Verified Quarries:</span>
          </div>
          <p>• Access the Seller Portal to upload mill calibration reports and stone catalog.</p>
          <p>• Complete GSTIN verification to receive direct contractor BOQ requests.</p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <a
            href={sellerUrl}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 active:scale-[0.99] text-xs sm:text-sm font-extrabold text-white shadow-md shadow-amber-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Open Seller Portal</span>
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            href="/"
            className="w-full h-10 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs sm:text-sm font-semibold text-stone-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="h-4 w-4 text-stone-400" />
            <span>Return to Marketplace</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
