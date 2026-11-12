import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supplier & Seller Portal Sign In — StonesDekho",
  description: "Sign in to your StonesDekho Seller Portal to manage stone inventory, respond to buyer RFQs, and track commercial orders.",
};

export default function SellerLoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Warm quarry gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(#fde68a_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" />
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>
    </div>
  );
}

