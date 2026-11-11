import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-semibold tracking-tight text-stone-900">Stone B2B</span>
          <p className="mt-1 text-sm text-stone-500">Premium Natural Stone Marketplace</p>
        </div>
        {children}
      </div>
    </div>
  );
}

