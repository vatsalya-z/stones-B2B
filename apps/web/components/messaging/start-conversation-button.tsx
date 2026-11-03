"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@stone/ui";
import { startOrOpenConversationAction } from "@/features/messaging/actions";

export interface StartConversationButtonProps {
  sellerId: string;
  enquiryId?: string | null;
  productId?: string | null;
  subject?: string | null;
  callerContext?: "buyer" | "seller";
  isAuthenticated?: boolean;
  label?: string;
  variant?: "primary" | "outline" | "subtle";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function StartConversationButton({
  sellerId,
  enquiryId = null,
  productId = null,
  subject = null,
  callerContext = "buyer",
  isAuthenticated = true,
  label = "Message Supplier",
  variant = "outline",
  size = "md",
  fullWidth = false,
  className,
}: StartConversationButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isRealSellerUuid = UUID_REGEX.test(sellerId);
  const safeProductId = productId && UUID_REGEX.test(productId) ? productId : null;
  const safeEnquiryId = enquiryId && UUID_REGEX.test(enquiryId) ? enquiryId : null;

  const getNextUrl = () => {
    const base = pathname || "/products";
    if (typeof window !== "undefined" && window.location.search) {
      return `${base}${window.location.search}`;
    }
    return base;
  };

  const handleClick = () => {
    setError(null);

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(getNextUrl())}`);
      return;
    }

    if (!isRealSellerUuid) {
      setError("Showcase sample supplier — open a live verified supplier listing to chat.");
      return;
    }

    startTransition(async () => {
      const res = await startOrOpenConversationAction(
        {
          sellerId,
          enquiryId: safeEnquiryId,
          productId: safeProductId,
          subject,
        },
        callerContext,
      );

      if (!res.ok) {
        if (res.requiresAuth) {
          router.push(`/login?next=${encodeURIComponent(getNextUrl())}`);
          return;
        }
        setError(res.error);
        return;
      }

      router.push(res.redirectTo);
    });
  };

  return (
    <div className={cn(fullWidth && "w-full")}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-60",
          size === "sm" && "rounded-lg px-3 py-1.5 text-xs",
          size === "md" && "rounded-xl px-4 py-2.5 text-sm",
          size === "lg" && "rounded-xl px-5 py-3 text-sm",
          variant === "primary" &&
            "bg-stone-900 text-white shadow-sm hover:bg-stone-800",
          variant === "outline" &&
            "border border-stone-300 bg-white text-stone-800 shadow-xs hover:bg-stone-50 hover:text-stone-950",
          variant === "subtle" &&
            "border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
          fullWidth && "w-full",
          className,
        )}
      >
        <svg
          className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.85}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
        <span>{isPending ? "Opening Chat..." : label}</span>
      </button>

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
