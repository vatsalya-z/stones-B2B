import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

export type UploadBucket =
  | "product-images"
  | "seller-logos"
  | "seller-cover-images"
  | "seller-verification-documents"
  | "enquiry-attachments"
  | "message-attachments";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export interface PickedFileInput {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}

export function resolveFileExtension(file: PickedFileInput): string {
  const mime = (file.mimeType ?? "").toLowerCase();
  if (MIME_TO_EXT[mime]) return MIME_TO_EXT[mime];
  const fromName = file.fileName?.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "pdf"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  const fromUri = file.uri.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (fromUri && ["jpg", "jpeg", "png", "webp", "pdf"].includes(fromUri)) {
    return fromUri === "jpeg" ? "jpg" : fromUri;
  }
  return "jpg";
}

/**
 * Reads a native file URI into an ArrayBuffer and uploads to the Supabase Storage path
 * enforced by `20261030100500_storage.sql` and `20261031100600_messaging_and_notifications.sql`.
 */
export async function uploadNativeAsset(params: {
  bucket: UploadBucket;
  folderPrefix: string; // e.g. `${sellerId}/${productId}` or `${conversationId}`
  file: PickedFileInput;
  maxBytes?: number;
}): Promise<{ path: string; mime: string; size: number; fileName: string }> {
  const ext = resolveFileExtension(params.file);
  const contentType =
    params.file.mimeType ||
    (ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg");

  const response = await fetch(params.file.uri);
  const arrayBuffer = await response.arrayBuffer();
  const byteLength = arrayBuffer.byteLength;

  if (byteLength <= 0) {
    throw new Error("Selected file is empty.");
  }
  if (params.maxBytes && byteLength > params.maxBytes) {
    const mb = (params.maxBytes / (1024 * 1024)).toFixed(0);
    throw new Error(`File exceeds maximum allowed size of ${mb} MB.`);
  }

  const fileId = Crypto.randomUUID();
  const cleanPrefix = params.folderPrefix.replace(/^\/+|\/+$/g, "");
  const storagePath = `${cleanPrefix}/${fileId}.${ext}`;

  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "Unable to upload file to secure storage.");
  }

  return {
    path: storagePath,
    mime: contentType,
    size: byteLength,
    fileName: params.file.fileName || `${fileId}.${ext}`,
  };
}
