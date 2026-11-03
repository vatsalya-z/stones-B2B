import { describe, expect, it } from "vitest";
import { detectFileSignature, validateUploadBytes } from "../src";

const JPEG_HEADER = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x99,
]);
const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56,
]);
const PDF_HEADER = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3,
]);
const HTML_PAYLOAD = new TextEncoder().encode("<!DOCTYPE html><script>alert(1)</script>");

describe("File signature magic-byte sniffing (@stone/utils)", () => {
  it("detects authentic JPEG, PNG, WebP, and PDF magic bytes", () => {
    expect(detectFileSignature(JPEG_HEADER)).toEqual({ mime: "image/jpeg", ext: "jpg" });
    expect(detectFileSignature(PNG_HEADER)).toEqual({ mime: "image/png", ext: "png" });
    expect(detectFileSignature(WEBP_HEADER)).toEqual({ mime: "image/webp", ext: "webp" });
    expect(detectFileSignature(PDF_HEADER)).toEqual({ mime: "application/pdf", ext: "pdf" });
  });

  it("rejects spoofed HTML/script payloads disguised as images", () => {
    expect(detectFileSignature(HTML_PAYLOAD)).toBeNull();
    const res = validateUploadBytes(HTML_PAYLOAD, {
      allowedMimes: ["image/jpeg", "image/png", "image/webp"],
      maxBytes: 5 * 1024 * 1024,
      declaredMime: "image/jpeg",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects mismatched declared MIME vs actual file signature", () => {
    const res = validateUploadBytes(PNG_HEADER, {
      allowedMimes: ["image/jpeg", "image/png"],
      maxBytes: 5 * 1024 * 1024,
      declaredMime: "image/jpeg",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/MIME type does not match/);
    }
  });

  it("rejects PDF files when uploading to image-only product buckets", () => {
    const res = validateUploadBytes(PDF_HEADER, {
      allowedMimes: ["image/jpeg", "image/png", "image/webp"],
      maxBytes: 5 * 1024 * 1024,
      declaredMime: "application/pdf",
    });
    expect(res.ok).toBe(false);
  });

  it("enforces configurable maximum file size limits and rejects empty files", () => {
    expect(
      validateUploadBytes(new Uint8Array(0), {
        allowedMimes: ["image/jpeg"],
        maxBytes: 1024,
      }).ok,
    ).toBe(false);

    const oversized = new Uint8Array(2 * 1024 * 1024 + 10);
    oversized.set(JPEG_HEADER, 0);

    const res = validateUploadBytes(oversized, {
      allowedMimes: ["image/jpeg"],
      maxBytes: 2 * 1024 * 1024,
      declaredMime: "image/jpeg",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/2 MB/);
    }
  });
});

