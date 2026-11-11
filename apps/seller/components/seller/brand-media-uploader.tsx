"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@stone/ui";
import {
  MAX_SELLER_COVER_BYTES,
  MAX_SELLER_LOGO_BYTES,
} from "@/features/seller/seller-meta";

export interface BrandMediaUploaderProps {
  kind: "logo" | "cover";
  currentUrl: string | null;
  disabled?: boolean;
  disabledReason?: string;
  onUploaded?: (url: string) => void;
}

export function BrandMediaUploader({
  kind,
  currentUrl,
  disabled = false,
  disabledReason,
  onUploaded,
}: BrandMediaUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "error" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const maxBytes = kind === "logo" ? MAX_SELLER_LOGO_BYTES : MAX_SELLER_COVER_BYTES;
  const maxMbLabel = kind === "logo" ? "2 MB" : "5 MB";

  const uploadFile = (file: File) => {
    setErrorMessage(null);

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type.toLowerCase())) {
      setStatus("error");
      setErrorMessage("Unsupported format. Use JPG, PNG, or WebP.");
      return;
    }

    if (file.size > maxBytes) {
      setStatus("error");
      setErrorMessage(`File exceeds the ${maxMbLabel} size limit.`);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setPendingFile(file);
    setStatus("uploading");
    setProgress(5);

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/seller/brand-media");

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.min(95, Math.max(10, Math.round((evt.loaded / evt.total) * 100)));
        setProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText || "{}") as {
          url?: string;
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
          setPreviewUrl(payload.url);
          setProgress(100);
          setStatus("done");
          setPendingFile(null);
          onUploaded?.(payload.url);
          router.refresh();
        } else {
          setStatus("error");
          setErrorMessage(payload.error || "Upload failed. Please try again.");
        }
      } catch {
        setStatus("error");
        setErrorMessage("Unexpected server response during upload.");
      }
    };

    xhr.onerror = () => {
      setStatus("error");
      setErrorMessage("Network error while uploading image.");
    };

    xhr.send(formData);
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-stone-200 bg-white flex-shrink-0",
            kind === "logo" ? "h-20 w-20" : "h-28 w-full sm:w-56",
          )}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={kind === "logo" ? "Business logo preview" : "Cover banner preview"}
              fill
              unoptimized={previewUrl.startsWith("blob:")}
              sizes={kind === "logo" ? "80px" : "224px"}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
              {kind === "logo" ? "No Logo" : "No Cover Banner"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold text-stone-900">
              {kind === "logo" ? "Business Logo" : "Storefront Cover Banner"}
            </p>
            <p className="text-xs text-stone-500">
              {kind === "logo"
                ? `Square 1:1 recommended (min 400×400px). JPG, PNG, WebP up to ${maxMbLabel}.`
                : `Wide 16:9 architectural quarry/factory photo recommended. JPG, PNG, WebP up to ${maxMbLabel}.`}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled || status === "uploading"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled || status === "uploading"}
              onClick={() => inputRef.current?.click()}
              className="btn-secondary !px-3.5 !py-1.5 !text-xs"
            >
              {status === "uploading"
                ? `Uploading ${progress}%…`
                : previewUrl
                  ? "Replace Image"
                  : "Upload Image"}
            </button>

            {status === "error" && pendingFile && (
              <button
                type="button"
                onClick={() => uploadFile(pendingFile)}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                Retry Upload
              </button>
            )}

            {status === "done" && (
              <span className="text-xs font-medium text-green-700">Saved ✓</span>
            )}
          </div>

          {disabled && disabledReason && (
            <p className="text-xs text-amber-700">{disabledReason}</p>
          )}

          {status === "uploading" && (
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-amber-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {errorMessage && (
            <p className="text-xs font-medium text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

