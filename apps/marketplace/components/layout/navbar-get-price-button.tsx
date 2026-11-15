"use client";

import React from "react";
import Link from "next/link";
import { useRfqModal } from "@/features/rfq/rfq-modal-context";

export function NavbarGetPriceButton() {
  const { openRfqModal } = useRfqModal();

  return (
    <Link
      href="/request-quote"
      onClick={(e) => {
        // Open modal on current page without navigation
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          openRfqModal();
        }
      }}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors hover:bg-amber-700 active:scale-[0.98] whitespace-nowrap"
      aria-label="Get Best Price (Open RFQ form)"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Get Best Price</span>
    </Link>
  );
}
