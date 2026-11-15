"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ShieldCheck, Layers, Truck } from "lucide-react";
import { useRfqModal } from "./rfq-modal-context";
import { SharedRfqForm } from "./shared-rfq-form";

function StoneLogoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6 text-[#D95F18]"
      aria-hidden="true"
    >
      <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
    </svg>
  );
}

// 100% pure vector SVG - crisp golden marble vein accent confined strictly to top-right (no text)
function GoldenVeinTopRight() {
  return (
    <svg
      className="absolute top-0 right-0 w-32 h-20 pointer-events-none z-0"
      viewBox="0 0 140 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="goldVeinGrad" x1="140" y1="0" x2="40" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C88428" stopOpacity="0.75" />
          <stop offset="40%" stopColor="#E5A955" stopOpacity="0.6" />
          <stop offset="75%" stopColor="#F3D198" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#DE9B3D" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M140 5 Q 115 28, 95 18 T 45 75" stroke="url(#goldVeinGrad)" strokeWidth="1.6" />
      <path d="M140 22 Q 120 42, 108 32 T 65 80" stroke="url(#goldVeinGrad)" strokeWidth="1.1" />
      <path d="M125 -2 Q 105 20, 80 30 T 30 68" stroke="url(#goldVeinGrad)" strokeWidth="1.3" />
      <path d="M105 24 Q 90 42, 75 60" stroke="url(#goldVeinGrad)" strokeWidth="0.8" />
    </svg>
  );
}

// 100% pure vector SVG - elegant golden sweeping ribbon waves at bottom (no text)
function GoldenRibbonBottom() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full h-14 pointer-events-none z-0"
      viewBox="0 0 300 55"
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="goldRibbonGrad" x1="0" y1="55" x2="300" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DE9738" stopOpacity="0.85" />
          <stop offset="28%" stopColor="#E8BA73" stopOpacity="0.75" />
          <stop offset="58%" stopColor="#F5D6A0" stopOpacity="0.6" />
          <stop offset="85%" stopColor="#E5A852" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#C47D22" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path d="M-10 46 C 45 28, 100 52, 165 34 C 215 22, 260 42, 310 18" stroke="url(#goldRibbonGrad)" strokeWidth="1.8" />
      <path d="M-10 51 C 55 34, 115 55, 180 39 C 230 26, 275 48, 310 24" stroke="url(#goldRibbonGrad)" strokeWidth="1.3" />
      <path d="M-10 55 C 65 38, 130 58, 195 43 C 245 30, 285 52, 310 32" stroke="url(#goldRibbonGrad)" strokeWidth="1" opacity="0.8" />
      <path d="M15 55 C 80 43, 145 60, 210 46 C 255 35, 295 54, 310 38" stroke="url(#goldRibbonGrad)" strokeWidth="0.7" opacity="0.6" />
    </svg>
  );
}

export function RFQModal() {
  const { isOpen, closeRfqModal, prefilledData } = useRfqModal();
  const [mounted, setMounted] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Safe close handler that checks if user has filled in details
  const handleRequestClose = useCallback(() => {
    if (isFormDirty) {
      const confirmClose = window.confirm(
        "You have entered information in your quotation request. Are you sure you want to close and discard your progress?"
      );
      if (!confirmClose) return;
    }
    setIsFormDirty(false);
    closeRfqModal();
  }, [closeRfqModal, isFormDirty]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleRequestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleRequestClose]);

  // Focus management & Background scroll lock (locks both html and body to prevent background scrolling)
  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== "undefined") {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const timer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
        handleRequestClose();
      }
    },
    [handleRequestClose],
  );

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rfq-modal-title"
      aria-describedby="rfq-modal-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/65 backdrop-blur-[2px] animate-in fade-in duration-200 overscroll-contain"
      onClick={handleBackdropClick}
    >
      {/* Modal Container: Compact & smaller size for high visual comfort */}
      <div
        ref={modalContentRef}
        className="relative w-[94vw] sm:w-[88vw] md:w-[80vw] lg:w-[60vw] max-w-[760px] max-h-[88vh] flex flex-col md:flex-row rounded-[16px] bg-[#FAF8F5] shadow-2xl overflow-hidden border border-[#EFE9DF] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={handleRequestClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-3.5 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-[#F1ECE6] hover:bg-[#E7E0D7] text-[#221E1B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D95F18]"
          aria-label="Close Request a Quote modal"
        >
          <X className="h-3.5 w-3.5 stroke-[2.2]" />
        </button>

        {/* ========================================================================= */}
        {/* LEFT PANEL: Compact & Sleek                                               */}
        {/* ========================================================================= */}
        <div className="relative w-full md:w-[35%] lg:w-[33%] md:min-w-[195px] lg:max-w-[230px] hidden md:flex flex-col justify-between overflow-hidden bg-[#FAF7F2] border-r border-[#EFE8DD] text-stone-900 shrink-0 select-none">
          {/* Authentic Top-Right Golden Marble Vein Texture */}
          <GoldenVeinTopRight />

          {/* Upper Section: Logo & Full-Bleed Showroom Photograph */}
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            {/* Logo */}
            <div className="flex items-center gap-1.5 pt-2.5 px-3 sm:px-3.5">
              <StoneLogoIcon />
              <span className="font-extrabold text-[15px] sm:text-[16px] tracking-tight text-[#1C1815]">
                Stones<span className="text-[#D95F18]">Dekho</span>
              </span>
            </div>

            {/* Showroom Photograph */}
            <div className="relative w-full aspect-[16/10] mt-1 overflow-hidden bg-[#FAF7F2] shrink-0">
              <Image
                src="/images/rfq/stonesdekho-rfq-showroom.webp"
                alt="Luxury Natural Stone Showroom"
                fill
                priority
                sizes="(max-width: 1024px) 210px, 230px"
                className="object-cover object-top"
              />
            </div>

            {/* Heading in Elegant Display Serif Typography (Playfair Display) */}
            <div className="px-3 sm:px-3.5 pt-1 pb-0.5">
              <h2 className="font-serif text-[13.5px] sm:text-[14px] font-bold text-[#141211] leading-[1.2] tracking-tight">
                Get the Best Stone<br className="hidden sm:inline" /> Price for Your Project
              </h2>
            </div>

            {/* Three Benefit Rows */}
            <div className="px-3 sm:px-3.5 pt-0.5 pb-1 space-y-1.5 relative z-10">
              {/* 1. Verified Suppliers */}
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FFEFE3] text-[#D95F18] shrink-0 mt-0.5">
                  <ShieldCheck className="h-3.5 w-3.5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#1C1815] leading-tight">Verified Suppliers</p>
                  <p className="text-[9.5px] text-[#59514A] leading-tight mt-0.5">
                    Connect with trusted quality suppliers.
                  </p>
                </div>
              </div>

              {/* 2. Competitive Pricing */}
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FFEFE3] text-[#D95F18] shrink-0 mt-0.5">
                  <Layers className="h-3.5 w-3.5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#1C1815] leading-tight">Competitive Pricing</p>
                  <p className="text-[9.5px] text-[#59514A] leading-tight mt-0.5">
                    Project-based bulk quantity rates.
                  </p>
                </div>
              </div>

              {/* 3. Pan India & Export */}
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FFEFE3] text-[#D95F18] shrink-0 mt-0.5">
                  <Truck className="h-3.5 w-3.5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#1C1815] leading-tight">Pan India & Export</p>
                  <p className="text-[9.5px] text-[#59514A] leading-tight mt-0.5">
                    Domestic and global delivery support.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Authentic Bottom Sweeping Golden Ribbon Veins */}
          <div className="relative w-full h-8 pointer-events-none overflow-hidden z-0 mt-auto">
            <GoldenRibbonBottom />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Compact Header & Form Area                                  */}
        {/* ========================================================================= */}
        <div className="w-full md:w-[65%] lg:w-[67%] flex-1 flex flex-col justify-between overflow-y-auto overscroll-contain p-3.5 sm:p-4 md:p-4.5 bg-[#FAF8F5]">
          {/* Mobile Top Branding (< md only) */}
          <div className="md:hidden mb-1.5 pb-1.5 border-b border-stone-100 flex items-center justify-between pr-7">
            <div className="flex items-center gap-1.5">
              <StoneLogoIcon />
              <span className="font-extrabold text-[15px] text-stone-900 tracking-tight">
                Stones<span className="text-[#D95F18]">Dekho</span>
              </span>
            </div>
            <span className="text-[9px] font-bold text-[#A14309] bg-[#FFE6D3] px-2 py-0.5 rounded-full">
              RFQ MODAL
            </span>
          </div>

          {/* Top Header */}
          <div className="pr-6">
            {/* Small Orange Capsule Pill Badge */}
            <div className="inline-flex items-center rounded-full bg-[#FFE6D3] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#993D06] mb-1 shadow-2xs">
              REQUEST A QUOTATION (RFQ)
            </div>

            {/* Elegant Display Serif Heading */}
            <h1
              id="rfq-modal-title"
              className="font-serif text-lg sm:text-[19px] lg:text-[20px] font-bold text-[#141211] tracking-tight leading-[1.2]"
            >
              Request Custom Stone Quotation
            </h1>

            {/* Subtitle */}
            <p id="rfq-modal-description" className="text-[11px] text-[#554E48] mt-0.5 leading-normal">
              Share your stone requirements and get competitive quotes from verified suppliers.
            </p>
          </div>

          {/* Form Content: SharedRfqForm */}
          <div className="flex-1 my-1.5">
            <SharedRfqForm
              isModal={true}
              initialData={prefilledData}
              onCancel={closeRfqModal}
              onDirtyChange={setIsFormDirty}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
