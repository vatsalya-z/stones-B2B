"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@stone/ui";
import { toggleProductFavouriteAction } from "@/features/buyer/actions";

export interface FavouriteButtonProps {
  productId: string;
  initialFavourited?: boolean;
  variant?: "overlay" | "button";
  className?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function FavouriteButton({
  productId,
  initialFavourited = false,
  variant = "overlay",
  className,
}: FavouriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [favourited, setFavourited] = useState(initialFavourited);
  const [notice, setNotice] = useState<string | null>(null);

  const isRealUuid = UUID_REGEX.test(productId);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setNotice(null);

    if (!isRealUuid) {
      setNotice("Showcase sample item");
      setTimeout(() => setNotice(null), 2500);
      return;
    }

    startTransition(async () => {
      const res = await toggleProductFavouriteAction(productId);
      if (res.requiresAuth) {
        const nextUrl =
          typeof window !== "undefined"
            ? `${pathname}${window.location.search}`
            : pathname;
        router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
        return;
      }

      if (!res.success || !res.data) {
        setNotice(res.error || "Unable to save product");
        setTimeout(() => setNotice(null), 3500);
        return;
      }

      setFavourited(res.data.favourited);
      router.refresh();
    });
  };

  if (variant === "button") {
    return (
      <div className="inline-flex flex-col items-start">
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          aria-pressed={favourited}
          className={cn(
            "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60",
            favourited
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
            className,
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={favourited ? "currentColor" : "none"}
            strokeWidth={1.8}
            stroke="currentColor"
            className={cn("h-4 w-4", favourited ? "text-red-600" : "text-stone-500")}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
          </svg>
          <span>{favourited ? "Saved in Favourites" : "Save to Favourites"}</span>
        </button>
        {notice && (
          <p className="mt-1 text-xs font-medium text-amber-700" role="status">
            {notice}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("absolute right-2.5 top-2.5 z-10", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={favourited}
        title={favourited ? "Remove from Saved Products" : "Save to Favourites"}
        aria-label={favourited ? "Remove from favourites" : "Add to favourites"}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full shadow-xs transition-colors disabled:opacity-60",
          favourited
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white/90 text-stone-600 hover:bg-white hover:text-red-500",
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={favourited ? "currentColor" : "none"}
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
          />
        </svg>
      </button>
      {notice && (
        <span className="mt-1 block rounded bg-stone-900/90 px-2 py-0.5 text-[10px] font-medium text-white shadow">
          {notice}
        </span>
      )}
    </div>
  );
}

