import type { ReactNode } from "react";
import Link from "next/link";
import { Package } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-6 sm:mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 text-white shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
              <Package className="h-5 w-5" />
            </div>
            <div className="text-left">
              <span className="block text-xl font-black tracking-tight text-stone-900 leading-tight">
                Stones<span className="text-amber-700">Dekho</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                India&apos;s B2B Stone Network
              </span>
            </div>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

