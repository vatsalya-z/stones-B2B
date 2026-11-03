"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    if (isLightboxOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-product w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100",
          className,
        )}
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium">No image available</span>
        </div>
      </div>
    );
  }

  const currentImage = images[activeIndex] || images[0]!;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Preview with Lightbox Trigger */}
      <div className="group relative aspect-product w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm">
        {currentImage && (
          <Image
            src={currentImage.src}
            alt={currentImage.altText || productName}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-102 cursor-zoom-in"
            priority={activeIndex === 0}
            unoptimized={!currentImage.src.includes(".supabase.co")}
            onClick={() => setIsLightboxOpen(true)}
          />
        )}

        {/* Lightbox prompt overlay button */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-900/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm opacity-90 transition-opacity hover:opacity-100"
          aria-label="View full screen image"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          <span>Inspect Slab</span>
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {images.map((img, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                  isSelected
                    ? "border-amber-600 ring-2 ring-amber-600/20"
                    : "border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100",
                )}
                aria-label={`View image ${idx + 1} of ${images.length}`}
              >
                <Image
                  src={img.src}
                  alt={img.altText || `${productName} thumbnail ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized={!img.src.includes(".supabase.co")}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* High-Resolution Slab Lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="relative h-full w-full max-w-6xl max-h-[90vh] flex flex-col items-center justify-center">
            {/* Top Close Bar */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-3">
              <span className="text-xs text-stone-300 font-medium bg-stone-900/80 px-3 py-1 rounded-full">
                {activeIndex + 1} of {images.length}
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="rounded-full bg-stone-900/80 p-2 text-white hover:bg-stone-800 transition-colors"
                aria-label="Close lightbox"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Lightbox Image Container */}
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              <Image
                src={currentImage.src}
                alt={currentImage.altText || productName}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized={!currentImage.src.includes(".supabase.co")}
              />
            </div>

            {/* Bottom thumbnail strip in lightbox */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto p-1 bg-stone-900/70 rounded-xl backdrop-blur-sm">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={cn(
                      "relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                      idx === activeIndex
                        ? "border-amber-500"
                        : "border-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    <Image
                      src={img.src}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized={!img.src.includes(".supabase.co")}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
