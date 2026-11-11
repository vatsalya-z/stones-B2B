"use client";

import { useState } from "react";
import type { ChatAttachmentMime } from "@stone/types";
import {
  formatAttachmentSize,
  isImageAttachmentMime,
} from "@/features/messaging/messaging-utils";

export interface MessageAttachmentCardProps {
  conversationId: string;
  attachmentPath: string;
  attachmentName: string | null;
  attachmentMime: ChatAttachmentMime | null;
  attachmentSize: number | null;
  initialSignedUrl: string | null;
  isOwnMessage: boolean;
}

export function MessageAttachmentCard({
  conversationId,
  attachmentPath,
  attachmentName,
  attachmentMime,
  attachmentSize,
  initialSignedUrl,
  isOwnMessage,
}: MessageAttachmentCardProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(initialSignedUrl);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const isImage = isImageAttachmentMime(attachmentMime);
  const displayName = attachmentName || "Attachment";
  const sizeLabel = formatAttachmentSize(attachmentSize);

  const refreshSignedUrl = async (): Promise<string | null> => {
    setLoadingUrl(true);
    try {
      const res = await fetch(
        `/api/messages/${conversationId}/attachments/signed-url?path=${encodeURIComponent(
          attachmentPath,
        )}`,
        { cache: "no-store" },
      );
      if (!res.ok) return null;
      const body = (await res.json()) as { signedUrl?: string };
      if (body.signedUrl) {
        setSignedUrl(body.signedUrl);
        setImageFailed(false);
        return body.signedUrl;
      }
      return null;
    } catch {
      return null;
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleOpenOrDownload = async () => {
    const fresh = await refreshSignedUrl();
    const targetUrl = fresh ?? signedUrl;
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (isImage && signedUrl && !imageFailed) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={handleOpenOrDownload}
          className="group relative block overflow-hidden rounded-xl border border-stone-200/80 bg-stone-100 text-left"
          title={`Open ${displayName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={displayName}
            onError={async () => {
              const refreshed = await refreshSignedUrl();
              if (!refreshed) setImageFailed(true);
            }}
            className="max-h-60 w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
          />
        </button>
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span
            className={`truncate max-w-[200px] ${
              isOwnMessage ? "text-stone-300" : "text-stone-500"
            }`}
          >
            {displayName}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
          </span>
          <button
            type="button"
            onClick={handleOpenOrDownload}
            disabled={loadingUrl}
            className={`font-semibold underline underline-offset-2 ${
              isOwnMessage
                ? "text-amber-300 hover:text-amber-200"
                : "text-amber-700 hover:text-amber-800"
            }`}
          >
            {loadingUrl ? "Opening..." : "Open"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
        isOwnMessage
          ? "border-stone-700 bg-stone-800/90 text-stone-100"
          : "border-stone-200 bg-stone-50 text-stone-900"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase ${
            isOwnMessage
              ? "bg-amber-500/20 text-amber-300"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {attachmentMime === "application/pdf" ? "PDF" : "IMG"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{displayName}</p>
          <p
            className={`text-[11px] ${
              isOwnMessage ? "text-stone-400" : "text-stone-500"
            }`}
          >
            {attachmentMime === "application/pdf" ? "PDF Specification" : "Image Attachment"}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleOpenOrDownload}
        disabled={loadingUrl}
        className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          isOwnMessage
            ? "bg-stone-700 text-white hover:bg-stone-600"
            : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"
        }`}
      >
        {loadingUrl ? "Loading..." : "View"}
      </button>
    </div>
  );
}

