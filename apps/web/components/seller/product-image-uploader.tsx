"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge, cn } from "@stone/ui";
import {
  deleteProductImageAction,
  reorderProductImagesAction,
  setPrimaryProductImageAction,
} from "@/features/seller/actions";
import { MAX_PRODUCT_IMAGE_BYTES } from "@/features/seller/seller-meta";

export interface SavedProductImageItem {
  id: string;
  storage_path: string;
  alt_text: string | null;
  is_primary: boolean;
  display_order: number;
  url: string | null;
}

interface LocalUploadItem {
  localId: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
  status: "queued" | "uploading" | "error";
  progress: number;
  error?: string;
}

export interface ProductImageUploaderHandle {
  hasPendingFiles: () => boolean;
  uploadQueuedToProduct: (targetProductId: string) => Promise<{ allSucceeded: boolean }>;
}

export interface ProductImageUploaderProps {
  productId: string | null;
  initialImages?: SavedProductImageItem[];
  disabled?: boolean;
}

const ALLOWED_CLIENT_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const ProductImageUploader = forwardRef<
  ProductImageUploaderHandle,
  ProductImageUploaderProps
>(function ProductImageUploader(
  { productId, initialImages = [], disabled = false },
  ref,
) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [savedImages, setSavedImages] = useState<SavedProductImageItem[]>(initialImages);
  const [localItems, setLocalItems] = useState<LocalUploadItem[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isMutating, startTransition] = useTransition();

  const maxMb = Math.round((MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)) * 10) / 10;

  const uploadSingleLocalItem = (
    item: LocalUploadItem,
    targetProductId: string,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setLocalItems((prev) =>
        prev.map((x) =>
          x.localId === item.localId
            ? { ...x, status: "uploading", progress: 8, error: undefined }
            : x,
        ),
      );

      const formData = new FormData();
      formData.append("file", item.file);
      if (item.isPrimary) {
        formData.append("makePrimary", "true");
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/seller/products/${targetProductId}/images`);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.min(95, Math.max(10, Math.round((evt.loaded / evt.total) * 100)));
          setLocalItems((prev) =>
            prev.map((x) => (x.localId === item.localId ? { ...x, progress: pct } : x)),
          );
        }
      };

      xhr.onload = () => {
        try {
          const payload = JSON.parse(xhr.responseText || "{}") as {
            image?: SavedProductImageItem;
            error?: string;
          };
          if (xhr.status >= 200 && xhr.status < 300 && payload.image) {
            const uploadedImg = payload.image;
            setSavedImages((prev) => {
              const next = uploadedImg.is_primary
                ? prev.map((img) => ({ ...img, is_primary: false }))
                : [...prev];
              return [...next, uploadedImg];
            });
            setLocalItems((prev) => prev.filter((x) => x.localId !== item.localId));
            URL.revokeObjectURL(item.previewUrl);
            resolve(true);
          } else {
            setLocalItems((prev) =>
              prev.map((x) =>
                x.localId === item.localId
                  ? {
                      ...x,
                      status: "error",
                      error: payload.error || "Image upload failed.",
                    }
                  : x,
              ),
            );
            resolve(false);
          }
        } catch {
          setLocalItems((prev) =>
            prev.map((x) =>
              x.localId === item.localId
                ? { ...x, status: "error", error: "Invalid server response." }
                : x,
            ),
          );
          resolve(false);
        }
      };

      xhr.onerror = () => {
        setLocalItems((prev) =>
          prev.map((x) =>
            x.localId === item.localId
              ? { ...x, status: "error", error: "Network error during upload." }
              : x,
          ),
        );
        resolve(false);
      };

      xhr.send(formData);
    });
  };

  useImperativeHandle(ref, () => ({
    hasPendingFiles: () => localItems.length > 0,
    uploadQueuedToProduct: async (targetProductId: string) => {
      const snapshot = [...localItems];
      let allSucceeded = true;
      for (const item of snapshot) {
        const ok = await uploadSingleLocalItem(item, targetProductId);
        if (!ok) allSucceeded = false;
      }
      if (allSucceeded) {
        router.refresh();
      }
      return { allSucceeded };
    },
  }));

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setGlobalError(null);

    const rejected: string[] = [];
    const accepted: LocalUploadItem[] = [];
    const hasAnyExistingPrimary =
      savedImages.some((i) => i.is_primary) || localItems.some((i) => i.isPrimary);

    Array.from(fileList).forEach((file, idx) => {
      const mime = file.type.toLowerCase();
      if (!ALLOWED_CLIENT_MIMES.has(mime)) {
        rejected.push(`"${file.name}": unsupported type (use JPG, PNG, or WebP).`);
        return;
      }
      if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
        rejected.push(`"${file.name}": exceeds ${maxMb} MB maximum file size.`);
        return;
      }
      if (file.size === 0) {
        rejected.push(`"${file.name}": file is empty.`);
        return;
      }

      accepted.push({
        localId: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isPrimary: !hasAnyExistingPrimary && idx === 0 && accepted.length === 0,
        status: "queued",
        progress: 0,
      });
    });

    if (rejected.length > 0) {
      setGlobalError(rejected.join(" "));
    }

    if (accepted.length > 0) {
      setLocalItems((prev) => [...prev, ...accepted]);
    }
  };

  const handleUploadAllStaged = async () => {
    if (!productId) return;
    const toUpload = localItems.filter((i) => i.status === "queued" || i.status === "error");
    for (const item of toUpload) {
      await uploadSingleLocalItem(item, productId);
    }
    router.refresh();
  };

  // --- Saved Images Actions ---
  const handleSetSavedPrimary = (imageId: string) => {
    if (!productId) return;
    setGlobalError(null);
    startTransition(async () => {
      const res = await setPrimaryProductImageAction(productId, imageId);
      if (!res.success) {
        setGlobalError(res.error || "Unable to update primary image.");
        return;
      }
      setSavedImages((prev) =>
        prev.map((img) => ({ ...img, is_primary: img.id === imageId })),
      );
      router.refresh();
    });
  };

  const handleMoveSaved = (index: number, direction: -1 | 1) => {
    if (!productId) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= savedImages.length) return;

    const reordered = [...savedImages];
    const current = reordered[index];
    const swap = reordered[targetIdx];
    if (!current || !swap) return;
    reordered[index] = swap;
    reordered[targetIdx] = current;

    setSavedImages(reordered);
    setGlobalError(null);

    startTransition(async () => {
      const res = await reorderProductImagesAction(
        productId,
        reordered.map((i) => i.id),
      );
      if (!res.success) {
        setGlobalError(res.error || "Failed to save image order.");
      } else {
        router.refresh();
      }
    });
  };

  const handleDeleteSaved = (imageId: string) => {
    if (!productId) return;
    setGlobalError(null);
    startTransition(async () => {
      const res = await deleteProductImageAction(productId, imageId);
      if (!res.success) {
        setGlobalError(res.error || "Failed to delete image.");
        return;
      }
      setSavedImages((prev) => {
        const remaining = prev.filter((i) => i.id !== imageId);
        if (remaining.length > 0 && !remaining.some((i) => i.is_primary)) {
          const first = remaining[0];
          if (first) {
            remaining[0] = { ...first, is_primary: true };
          }
        }
        return remaining;
      });
      router.refresh();
    });
  };

  // --- Local Queued Images Actions ---
  const handleSetLocalPrimary = (localId: string) => {
    setLocalItems((prev) =>
      prev.map((item) => ({ ...item, isPrimary: item.localId === localId })),
    );
  };

  const handleMoveLocal = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= localItems.length) return;
    setLocalItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const swap = next[targetIdx];
      if (!current || !swap) return prev;
      next[index] = swap;
      next[targetIdx] = current;
      return next;
    });
  };

  const handleRemoveLocal = (localId: string) => {
    setLocalItems((prev) => {
      const target = prev.find((i) => i.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((i) => i.localId !== localId);
      if (
        next.length > 0 &&
        !savedImages.some((s) => s.is_primary) &&
        !next.some((n) => n.isPrimary)
      ) {
        const first = next[0];
        if (first) next[0] = { ...first, isPrimary: true };
      }
      return next;
    });
  };

  const isUploadingAny = localItems.some((i) => i.status === "uploading");

  return (
    <div className="space-y-5">
      {/* Dropzone / File Picker */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && !isUploadingAny) {
            handleFilesSelected(e.dataTransfer.files);
          }
        }}
        className={cn(
          "rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/70 p-6 text-center transition-colors",
          !disabled && "hover:border-amber-500 hover:bg-amber-50/30",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled || isUploadingAny}
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-600 shadow-xs ring-1 ring-stone-200">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>

        <p className="text-sm font-semibold text-stone-900">
          Select or drag &amp; drop high-resolution stone photographs
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Supports JPG, JPEG, PNG &amp; WebP • Up to {maxMb} MB per image • Original resolution
          preserved without artificial upscaling
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={disabled || isUploadingAny}
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary !py-2 !text-xs"
          >
            Select Photographs
          </button>

          {productId && localItems.length > 0 && (
            <button
              type="button"
              disabled={isUploadingAny}
              onClick={handleUploadAllStaged}
              className="btn-accent !py-2 !text-xs"
            >
              {isUploadingAny
                ? "Uploading…"
                : `Upload ${localItems.length} Previewed Image${localItems.length > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {globalError}
        </div>
      )}

      {/* Existing Uploaded Images */}
      {savedImages.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Uploaded Gallery ({savedImages.length})
            </h4>
            {isMutating && (
              <span className="text-xs text-stone-500">Updating gallery…</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedImages.map((img, idx) => (
              <div
                key={img.id}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-xs",
                  img.is_primary ? "border-amber-500 ring-1 ring-amber-500/40" : "border-stone-200",
                )}
              >
                <div className="relative aspect-[4/3] w-full bg-stone-100">
                  {img.url ? (
                    <Image
                      src={img.url}
                      alt={img.alt_text || "Product photograph"}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-stone-400">
                      Image unavailable
                    </div>
                  )}

                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    {img.is_primary ? (
                      <Badge variant="warning" className="bg-amber-600 text-white ring-0">
                        ★ Primary Cover
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-white/90 text-stone-700">
                        #{idx + 1}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-stone-100 p-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0 || isMutating}
                      onClick={() => handleMoveSaved(idx, -1)}
                      className="rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                      title="Move earlier"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={idx === savedImages.length - 1 || isMutating}
                      onClick={() => handleMoveSaved(idx, 1)}
                      className="rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                      title="Move later"
                    >
                      →
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!img.is_primary && (
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => handleSetSavedPrimary(img.id)}
                        className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-800 hover:bg-amber-50 hover:text-amber-800"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => handleDeleteSaved(img.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-Upload Preview & Upload Progress Queue */}
      {localItems.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              {productId
                ? `Pre-Upload Preview (${localItems.length} staged — click Upload above)`
                : `Queued for Upload on Save (${localItems.length})`}
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {localItems.map((item, idx) => (
              <div
                key={item.localId}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border bg-white shadow-xs",
                  item.status === "error"
                    ? "border-red-300"
                    : item.isPrimary
                      ? "border-amber-500"
                      : "border-stone-200",
                )}
              >
                <div className="relative aspect-[4/3] w-full bg-stone-100">
                  <Image
                    src={item.previewUrl}
                    alt={item.file.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    {item.isPrimary && (
                      <Badge variant="warning" className="bg-amber-600 text-white ring-0">
                        ★ Primary
                      </Badge>
                    )}
                    <Badge variant="secondary" className="bg-stone-900/80 text-white">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 p-2.5">
                  <p className="truncate text-xs font-medium text-stone-700" title={item.file.name}>
                    {item.file.name}
                  </p>

                  {item.status === "uploading" && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-amber-700">
                        <span>Uploading…</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full bg-amber-600 transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {item.status === "error" && (
                    <div className="space-y-1.5 rounded-lg bg-red-50 p-2">
                      <p className="text-[11px] font-medium text-red-700">{item.error}</p>
                      {productId && (
                        <button
                          type="button"
                          onClick={() => uploadSingleLocalItem(item, productId)}
                          className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                        >
                          Retry Upload
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0 || item.status === "uploading"}
                        onClick={() => handleMoveLocal(idx, -1)}
                        className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={idx === localItems.length - 1 || item.status === "uploading"}
                        onClick={() => handleMoveLocal(idx, 1)}
                        className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                      >
                        →
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!item.isPrimary && (
                        <button
                          type="button"
                          disabled={item.status === "uploading"}
                          onClick={() => handleSetLocalPrimary(item.localId)}
                          className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-800 hover:bg-amber-50"
                        >
                          Set Primary
                        </button>
                      )}
                      {productId && item.status === "queued" && (
                        <button
                          type="button"
                          onClick={() => uploadSingleLocalItem(item, productId)}
                          className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          Upload
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={item.status === "uploading"}
                        onClick={() => handleRemoveLocal(item.localId)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

