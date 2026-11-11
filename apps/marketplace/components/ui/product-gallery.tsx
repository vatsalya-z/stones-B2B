"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { cn } from "@stone/ui";

export interface ProductGalleryImage {
  src: string;
  altText: string | null;
  isPrimary?: boolean;
}

export interface ProductGalleryProps {
  images: ProductGalleryImage[];
  productName: string;
  className?: string;
}

export function ProductGallery({ images, productName, className }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const lightboxScrollRef = useRef<HTMLDivElement>(null);

  const totalImages = images.length;

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalImages - 1));
    setZoomLevel(1);
  }, [totalImages]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev < totalImages - 1 ? prev + 1 : 0));
    setZoomLevel(1);
  }, [totalImages]);

  const toggleZoom = useCallback(() => {
    setZoomLevel((prev) => {
      if (prev === 1) return 1.75;
      if (prev === 1.75) return 2.5;
      return 1;
    });
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(2.5, +(prev + 0.75).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(1, +(prev - 0.75).toFixed(2)));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Keyboard navigation for both preview and lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input/textarea is focused
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "Escape" && isLightboxOpen) {
        setIsLightboxOpen(false);
        setZoomLevel(1);
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (isLightboxOpen) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          zoomIn();
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          zoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          resetZoom();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen, goToPrev, goToNext, zoomIn, zoomOut, resetZoom]);

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-product w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100",
          className,
        )}
        role="region"
        aria-label="Product Image"
      >
        <div className="flex flex-col items-center gap-2 text-stone-400">
          <svg
            className="h-16 w-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium">No natural stone image available</span>
        </div>
      </div>
    );
  }

  const currentImage = images[activeIndex] || images[0]!;

  return (
    <div
      className={cn("space-y-4", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Product Image Gallery"
    >
      {/* Main Preview with Lightbox Trigger */}
      <div className="group relative aspect-product w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-xs">
        {currentImage && (
          <Image
            src={currentImage.src}
            alt={currentImage.altText || `${productName} — Main slab display`}
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover transition-transform duration-500 group-hover:scale-102 cursor-zoom-in"
            priority={activeIndex === 0}
            unoptimized={!currentImage.src.includes(".supabase.co")}
            onClick={() => {
              setIsLightboxOpen(true);
              setZoomLevel(1);
            }}
          />
        )}

        {/* Top-left image counter pill */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-stone-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-xs">
          <span>{activeIndex + 1}</span>
          <span className="text-stone-400">/</span>
          <span>{images.length}</span>
          <span className="text-[11px] font-normal text-stone-300 ml-1">
            {currentImage.isPrimary ? "Primary Lot" : "Specification Detail"}
          </span>
        </div>

        {/* Navigation arrows overlaid on main preview */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-105 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
              aria-label="Previous slab image"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-105 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
              aria-label="Next slab image"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Bottom-right Lightbox trigger button */}
        <button
          type="button"
          onClick={() => {
            setIsLightboxOpen(true);
            setZoomLevel(1);
          }}
          className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-xl bg-stone-900/85 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition-all hover:bg-stone-900 hover:scale-102 active:scale-98"
          aria-label="Inspect slab in full screen high resolution"
        >
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          <span>Inspect Slab & Veining</span>
        </button>
      </div>

      {/* Thumbnails Strip */}
      {images.length > 1 && (
        <div
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-300"
          role="tablist"
          aria-label="Slab and detail thumbnails"
        >
          {images.map((img, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveIndex(idx);
                  setZoomLevel(1);
                }}
                className={cn(
                  "relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all focus:outline-hidden",
                  isSelected
                    ? "border-amber-600 ring-2 ring-amber-600/30 scale-102 shadow-xs"
                    : "border-stone-200 hover:border-stone-400 opacity-75 hover:opacity-100",
                )}
                aria-label={`View image ${idx + 1} of ${images.length}: ${img.altText || productName}`}
              >
                <Image
                  src={img.src}
                  alt={img.altText || `${productName} thumbnail ${idx + 1}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized={!img.src.includes(".supabase.co")}
                />
                {img.isPrimary && (
                  <span className="absolute bottom-1 right-1 rounded-sm bg-stone-900/80 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                    Primary
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* High-Resolution Slab Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-between bg-stone-950/95 backdrop-blur-md p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="High-Resolution Slab Inspection Lightbox"
        >
          {/* Top Control Bar */}
          <div className="z-20 flex items-center justify-between gap-4 border-b border-stone-800/80 pb-3">
            {/* Slab Title & Counter */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex-shrink-0 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 text-xs font-bold font-mono">
                {activeIndex + 1} / {images.length}
              </span>
              <div className="min-w-0 truncate">
                <h3 className="text-sm font-semibold text-white truncate">
                  {currentImage.altText || productName}
                </h3>
                <p className="text-[11px] text-stone-400 hidden sm:block">
                  High-Resolution Architectural Specimen • Use arrow keys or zoom controls
                </p>
              </div>
            </div>

            {/* Lightbox Zoom Controls & Close Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomLevel <= 1}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border border-stone-700 bg-stone-900 text-stone-200 transition-colors",
                  zoomLevel <= 1
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-stone-800 hover:text-white",
                )}
                aria-label="Zoom out"
                title="Zoom Out (-)"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>

              {/* Current Zoom Level Badge */}
              <button
                type="button"
                onClick={toggleZoom}
                className="flex h-9 items-center justify-center rounded-lg border border-stone-700 bg-stone-900 px-3 text-xs font-mono font-bold text-amber-400 hover:bg-stone-800 transition-colors"
                title="Click to toggle magnification (100% / 175% / 250%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomLevel >= 2.5}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border border-stone-700 bg-stone-900 text-stone-200 transition-colors",
                  zoomLevel >= 2.5
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-stone-800 hover:text-white",
                )}
                aria-label="Zoom in"
                title="Zoom In (+)"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {/* Reset Zoom Button */}
              {zoomLevel > 1 && (
                <button
                  type="button"
                  onClick={resetZoom}
                  className="hidden sm:inline-flex h-9 items-center justify-center rounded-lg border border-stone-700 bg-stone-900 px-2.5 text-xs font-medium text-stone-300 hover:bg-stone-800"
                  title="Reset Zoom (0)"
                >
                  Reset (1x)
                </button>
              )}

              {/* Close Lightbox */}
              <button
                type="button"
                onClick={() => {
                  setIsLightboxOpen(false);
                  setZoomLevel(1);
                }}
                className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/80 text-white hover:bg-red-600 transition-colors"
                aria-label="Close high-resolution lightbox"
                title="Close (Esc)"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Lightbox Image Stage */}
          <div
            ref={lightboxScrollRef}
            className="relative flex-1 flex items-center justify-center overflow-auto p-2 my-2 select-none"
          >
            {/* Prev Image Arrow */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={goToPrev}
                className="fixed left-4 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900/80 text-white shadow-xl backdrop-blur-md border border-stone-700 hover:bg-stone-800 hover:scale-110 active:scale-95 transition-all"
                aria-label="Previous slab image (Left arrow key)"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Lightbox Scalable Image Container */}
            <div
              className={cn(
                "relative transition-transform duration-300 flex items-center justify-center",
                zoomLevel > 1 ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
              style={{
                width: zoomLevel > 1 ? `${zoomLevel * 100}%` : "100%",
                height: zoomLevel > 1 ? `${zoomLevel * 80}vh` : "78vh",
                minHeight: "360px",
              }}
              onClick={toggleZoom}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleZoom();
                }
              }}
              aria-label={`Magnify slab grain. Current zoom: ${Math.round(zoomLevel * 100)}%`}
            >
              <Image
                src={currentImage.src}
                alt={currentImage.altText || productName}
                fill
                sizes="100vw"
                className="object-contain"
                priority
                unoptimized={!currentImage.src.includes(".supabase.co")}
              />
            </div>

            {/* Next Image Arrow */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={goToNext}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900/80 text-white shadow-xl backdrop-blur-md border border-stone-700 hover:bg-stone-800 hover:scale-110 active:scale-95 transition-all"
                aria-label="Next slab image (Right arrow key)"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip in Lightbox */}
          {images.length > 1 && (
            <div className="z-20 flex justify-center border-t border-stone-800/80 pt-3">
              <div className="flex gap-2 overflow-x-auto p-1.5 bg-stone-900/80 rounded-2xl backdrop-blur-md border border-stone-800 scrollbar-none max-w-full">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveIndex(idx);
                      setZoomLevel(1);
                    }}
                    className={cn(
                      "relative h-14 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                      idx === activeIndex
                        ? "border-amber-500 ring-2 ring-amber-500/30 scale-105"
                        : "border-transparent opacity-50 hover:opacity-100",
                    )}
                    aria-label={`Switch to image ${idx + 1}`}
                  >
                    <Image
                      src={img.src}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized={!img.src.includes(".supabase.co")}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
