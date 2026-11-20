import Link from "next/link";

export default function SellerPendingPage() {
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const sellerBase =
    process.env.NEXT_PUBLIC_SELLER_URL ||
    (isProd ? "https://seller.stonesdekho.com" : "http://localhost:3002");
  const sellerUrl = `${sellerBase}/seller/dashboard`;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-semibold text-stone-900 mb-2">Verification in progress</h1>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          Your seller account is currently under review. Our team will verify your business documents within{" "}
          <strong className="text-stone-700">2–3 business days</strong>.
        </p>
        <p className="text-sm text-stone-500 mb-6">
          You&apos;ll receive an email notification once your account is approved.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href={sellerUrl}
            className="inline-block rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Open Seller Portal
          </a>
          <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
            Return to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

