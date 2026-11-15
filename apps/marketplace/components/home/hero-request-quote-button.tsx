"use client";

import React from "react";
import Link from "next/link";
import { useRfqModal } from "@/features/rfq/rfq-modal-context";

export function HeroRequestQuoteButton() {
  const { openRfqModal } = useRfqModal();

  return (
    <Link
      href="/request-quote"
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          openRfqModal();
        }
      }}
      className="inline-flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-7 py-3.5 text-sm sm:text-base font-semibold shadow-xl shadow-amber-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
      aria-label="Request a Quote"
    >
      Request a Quote
    </Link>
  );
}
