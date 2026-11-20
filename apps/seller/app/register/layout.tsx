import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register Stone Quarry & Supplier Account — StonesDekho",
  description:
    "Register your stone quarry or processing business on StonesDekho Supplier Portal to list natural stones, manage inventory, and receive direct buyer RFQs.",
};

export default function SellerRegisterLayout({ children }: { children: ReactNode }) {
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
