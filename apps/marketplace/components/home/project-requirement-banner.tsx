"use client";

import React from "react";
import Image from "next/image";
import { FileText, Send } from "lucide-react";
import { useRfqModal } from "@/features/rfq/rfq-modal-context";

export function ProjectRequirementBanner() {
  const { openRfqModal } = useRfqModal();

  return (
    <section className="py-8 sm:py-12">
      <div className="container-wide">
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-300/80 shadow-lg bg-stone-900">
          {/* Background Image - Bright, vibrant & clearly visible */}
          <div className="absolute inset-0">
            <Image
              src="/images/backgrounds/stone-showroom-cta-desktop.jpg"
              alt="Natural Stone Project Requirements"
              fill
              className="object-cover object-center brightness-110 contrast-105"
              sizes="100vw"
            />
            {/* Elegant Translucent Gradient Overlay for Clear Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/25" />
          </div>

          {/* Banner Content */}
          <div className="relative z-10 px-6 sm:px-8 lg:px-10 py-7 sm:py-9 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left side: Icon + Headings */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-[#E87500]/25 border border-amber-400/50 text-amber-300 shrink-0 shadow-md backdrop-blur-xs">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2]" />
              </div>

              <div className="space-y-1">
                <h2 className="font-serif text-xl sm:text-2xl lg:text-[26px] font-bold text-white tracking-tight drop-shadow-md">
                  Have a Project Requirement?
                </h2>
                <p className="text-xs sm:text-sm text-stone-100/90 max-w-xl drop-shadow-sm font-medium">
                  Share your stone BOQ and get competitive quotes from verified suppliers.
                </p>
              </div>
            </div>

            {/* Right side: Action Button */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => openRfqModal()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#E87500] hover:bg-[#C95D00] text-white px-6 sm:px-8 py-3 sm:py-3.5 text-sm font-semibold shadow-xl shadow-black/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>Request a Quote →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
