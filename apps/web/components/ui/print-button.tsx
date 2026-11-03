"use client";

import { cn } from "@stone/ui";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({
  label = "Print Pro-Forma Order",
  className,
}: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors",
        className,
      )}
    >
      {label}
    </button>
  );
}
