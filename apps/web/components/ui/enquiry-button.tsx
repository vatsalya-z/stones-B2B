"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@stone/ui";
import { createBrowserClient } from "@supabase/ssr";

export interface EnquiryButtonProps {
  productId: string;
  productSlug: string;
  sellerName: string;
  className?: string;
  label?: string;
  variant?: "primary" | "accent";
}

export function EnquiryButton({
  productId: _productId,
  productSlug,
  sellerName: _sellerName,
  className,
  label = "Send Enquiry",
  variant = "primary",
}: EnquiryButtonProps) {
  const router = useRouter();

  const handleClick = useCallback(async () => {
    // Inline Supabase browser client to check auth
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login with return path
      router.push(`/login?next=/products/${productSlug}`);
      return;
    }

    // User is authenticated — navigate to enquiry form
    router.push(`/products/${productSlug}/enquiry`);
  }, [router, productSlug]);

  const baseClass =
    variant === "accent"
      ? "bg-amber-600 text-white hover:bg-amber-700 focus-visible:outline-amber-600"
      : "bg-stone-900 text-white hover:bg-stone-800 focus-visible:outline-stone-900";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium",
        "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        baseClass,
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
        <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
      </svg>
      {label}
    </button>
  );
}
