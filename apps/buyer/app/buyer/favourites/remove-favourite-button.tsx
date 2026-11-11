"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeProductFavouriteAction } from "@/features/buyer/actions";

export function RemoveFavouriteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      const res = await removeProductFavouriteAction(productId);
      if (!res.success) {
        setError(res.error || "Unable to remove item.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
      >
        {isPending ? "Removing…" : "Remove"}
      </button>
      {error && <span className="mt-1 text-[10px] text-red-600">{error}</span>}
    </div>
  );
}

