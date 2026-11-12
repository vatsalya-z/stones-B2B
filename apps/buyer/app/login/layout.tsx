import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Portal Sign In — StonesDekho",
  description: "Sign in to your StonesDekho Buyer Portal to manage natural stone RFQs, compare supplier quotations, and track orders.",
};

export default function BuyerLoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle architectural background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>
    </div>
  );
}

