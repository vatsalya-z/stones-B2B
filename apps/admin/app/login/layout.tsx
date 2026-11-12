import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Operations Console Sign In — StonesDekho",
  description: "Secure administrative sign in for authorized StonesDekho platform operators and system administrators.",
};

export default function AdminLoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-stone-100">
      {/* Dark high-security grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>
    </div>
  );
}

