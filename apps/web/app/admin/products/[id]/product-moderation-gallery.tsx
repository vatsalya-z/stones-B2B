"use client";

import { useState } from "react";
import Image from "next/image";
import { getProductFallbackImage } from "@/lib/images";

export interface GalleryImage {
  id: string;
  storage_path: string;
  alt_text?: string | null;
  is_primary?: boolean;
}

export function ProductModerationGallery({
  images,
  productName,
  slug,
  stoneType,
}: {
  images: GalleryImage[];
  productName: string;
  slug: string;
  stoneType?: string | null;
}) {
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const fallback = getProductFallbackImage(slug, stoneType);

  const handleImageError = (id: string) => {
    setFailedIds((prev) => new Set(prev).add(id));
  };

  if (images.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-800 bg-stone-950/60 py-10 px-4 text-center">
        <div className="relative aspect-video w-48 overflow-hidden rounded-lg border border-stone-800 bg-stone-900 mb-3 shadow-inner">
          <Image
            src={fallback}
            alt={productName}
            fill
            className="object-cover opacity-60"
            unoptimized
          />
        </div>
        <p className="text-xs font-medium text-stone-400">No Supplier Uploads Provided</p>
        <p className="mt-1 text-[11px] text-stone-600">
          Archetype reference image rendered above for moderation context.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
      {images.map((img) => {
        const isFailed = failedIds.has(img.id);
        const imageSrc = isFailed || !img.storage_path ? fallback : img.storage_path;

        return (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-stone-800 bg-stone-950 shadow-inner"
          >
            <Image
              src={imageSrc}
              alt={img.alt_text || productName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => handleImageError(img.id)}
              unoptimized
            />

            {/* Top badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
              {img.is_primary && (
                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-black uppercase shadow-xs">
                  Primary
                </span>
              )}
              {isFailed && (
                <span className="rounded bg-red-950/90 border border-red-500/50 px-1.5 py-0.5 text-[8px] font-medium text-red-300 shadow-xs">
                  Fallback Archetype
                </span>
              )}
            </div>

            {/* Bottom info banner on hover */}
            <div className="absolute inset-x-0 bottom-0 bg-stone-950/80 px-2.5 py-1.5 text-[10px] text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs truncate">
              {img.alt_text || productName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
