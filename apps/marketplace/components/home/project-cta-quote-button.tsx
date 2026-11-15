"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRfqModal } from "@/features/rfq/rfq-modal-context";

export function ProjectCtaQuoteButton() {
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
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-black/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      <span>Request a Project Quote</span>
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}
