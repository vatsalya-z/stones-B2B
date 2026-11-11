"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@stone/ui";
import { MAX_ENQUIRY_ATTACHMENT_BYTES } from "@/features/buyer/buyer-meta";

export interface EnquiryAttachmentUploaderProps {
  enquiryId: string;
  existingCount: number;
  disabled?: boolean;
}

export function EnquiryAttachmentUploader({
  enquiryId,
  existingCount,
  disabled = false,
}: EnquiryAttachmentUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const remainingSlots = Math.max(0, 8 - existingCount);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError(null);
    setSuccess(null);

    if (files.length > remainingSlots) {
      setError(`You can upload up to ${remainingSlots} more attachment(s) on this enquiry.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    for (const file of files) {
      if (file.size > MAX_ENQUIRY_ATTACHMENT_BYTES) {
        setError(`"${file.name}" exceeds the 10 MB maximum file size.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setUploading(true);
    let uploadedCount = 0;

    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch(`/api/buyer/enquiries/${enquiryId}/attachments`, {
          method: "POST",
          body: fd,
        });
        const payload = (await res.json().catch(() => ({}))) as { error?: string };

        if (!res.ok) {
          throw new Error(payload.error || `Failed to upload "${file.name}".`);
        }
        uploadedCount += 1;
      }

      setSuccess(
        `Uploaded ${uploadedCount} private attachment${uploadedCount > 1 ? "s" : ""} securely.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      if (uploadedCount > 0) {
        router.refresh();
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (disabled || remainingSlots === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-stone-800">
            Attach Reference Photos, Architectural Drawings, or BOQ (PDF / JPG / PNG / WebP)
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Max 10 MB per file • Private access restricted to you and the assigned supplier ({remainingSlots} slot{remainingSlots !== 1 ? "s" : ""} remaining)
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="sr-only"
            id={`attachment-upload-${enquiryId}`}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload Files"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-2.5 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2.5 text-xs font-medium text-green-700" role="status">
          {success}
        </p>
      )}
    </div>
  );
}

