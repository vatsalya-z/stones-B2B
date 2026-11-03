export type DetectedMimeType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export interface DetectedSignature {
  mime: DetectedMimeType;
  ext: "jpg" | "png" | "webp" | "pdf";
}

/**
 * Inspects actual file header magic bytes rather than trusting client-supplied
 * Content-Type or filename extensions.
 */
export function detectFileSignature(bytes: Uint8Array): DetectedSignature | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  // PDF: "%PDF-" (25 50 44 46 2D)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { mime: "application/pdf", ext: "pdf" };
  }

  return null;
}

export interface ValidateUploadOptions {
  allowedMimes: ReadonlyArray<DetectedMimeType>;
  maxBytes: number;
  declaredMime?: string | null;
}

export type ValidateUploadResult =
  | { ok: true; mime: DetectedMimeType; ext: "jpg" | "png" | "webp" | "pdf" }
  | { ok: false; error: string };

export function validateUploadBytes(
  bytes: Uint8Array,
  options: ValidateUploadOptions,
): ValidateUploadResult {
  if (bytes.byteLength === 0) {
    return { ok: false, error: "Uploaded file is empty." };
  }

  if (bytes.byteLength > options.maxBytes) {
    const maxMb = (options.maxBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "");
    return { ok: false, error: `File exceeds the ${maxMb} MB size limit.` };
  }

  const detected = detectFileSignature(bytes);
  if (!detected || !options.allowedMimes.includes(detected.mime)) {
    return {
      ok: false,
      error: `Unsupported or invalid file format. Allowed formats: ${options.allowedMimes.join(", ")}.`,
    };
  }

  if (options.declaredMime) {
    const normalizedDeclared =
      options.declaredMime.toLowerCase() === "image/jpg"
        ? "image/jpeg"
        : options.declaredMime.toLowerCase();
    if (
      normalizedDeclared !== "application/octet-stream" &&
      normalizedDeclared !== detected.mime
    ) {
      return {
        ok: false,
        error: "Declared file MIME type does not match actual file signature.",
      };
    }
  }

  return { ok: true, mime: detected.mime, ext: detected.ext };
}

