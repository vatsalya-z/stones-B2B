"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge, Card, CardBody, CardHeader, EmptyState } from "@stone/ui";
import type { VerificationStatus } from "@stone/types";
import {
  VERIFICATION_DOCUMENT_TYPES,
  type VerificationDocumentType,
} from "@stone/validation";
import {
  formatShortDate,
  VerificationStatusBadge,
} from "@/components/seller/status-badges";
import {
  deleteVerificationDocumentAction,
  getVerificationDocumentSignedUrlAction,
  submitSellerVerificationAction,
} from "@/features/seller/actions";
import {
  DOCUMENT_TYPE_LABELS,
  MAX_VERIFICATION_DOC_BYTES,
  type VerificationReadiness,
} from "@/features/seller/seller-meta";
import type { VerificationDocRow } from "@/features/seller/queries";

export interface VerificationManagerProps {
  hasSellerProfile: boolean;
  verificationStatus: VerificationStatus;
  verificationReason: string | null;
  verifiedAt: string | null;
  readiness: VerificationReadiness;
  initialDocuments: VerificationDocRow[];
}

export function VerificationManager({
  hasSellerProfile,
  verificationStatus,
  verificationReason,
  verifiedAt,
  readiness,
  initialDocuments,
}: VerificationManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<VerificationDocRow[]>(initialDocuments);
  const [selectedType, setSelectedType] =
    useState<VerificationDocumentType>("gst_certificate");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [failedFile, setFailedFile] = useState<File | null>(null);

  const [previewModal, setPreviewModal] = useState<{
    title: string;
    signedUrl: string;
    isPdf: boolean;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!hasSellerProfile) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <h2 className="text-lg font-semibold text-stone-900">
            Step 1 Required: Complete Business Profile
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
            Before uploading private verification documents, please save your business name,
            GSTIN, and facility address in your Seller Profile.
          </p>
          <div className="mt-6">
            <Link href="/seller/profile" className="btn-primary">
              Go to Business Profile →
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  const handleUploadDocument = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const allowedMimes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedMimes.includes(file.type.toLowerCase())) {
      setUploadStatus("error");
      setErrorMessage("Unsupported format. Upload PDF, JPG, or PNG documents.");
      return;
    }

    if (file.size > MAX_VERIFICATION_DOC_BYTES) {
      setUploadStatus("error");
      setErrorMessage("Document exceeds the 10 MB maximum file size.");
      return;
    }

    setFailedFile(file);
    setUploadStatus("uploading");
    setUploadProgress(8);

    const formData = new FormData();
    formData.append("documentType", selectedType);
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/seller/verification/documents");

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.min(95, Math.max(10, Math.round((evt.loaded / evt.total) * 100)));
        setUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText || "{}") as {
          document?: VerificationDocRow;
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && payload.document) {
          setDocuments((prev) => [payload.document!, ...prev]);
          setUploadStatus("idle");
          setUploadProgress(0);
          setFailedFile(null);
          setSuccessMessage(
            `${DOCUMENT_TYPE_LABELS[selectedType]} uploaded securely to encrypted private storage.`,
          );
          router.refresh();
        } else {
          setUploadStatus("error");
          setErrorMessage(payload.error || "Document upload failed.");
        }
      } catch {
        setUploadStatus("error");
        setErrorMessage("Unexpected server response while uploading document.");
      }
    };

    xhr.onerror = () => {
      setUploadStatus("error");
      setErrorMessage("Network error while uploading document.");
    };

    xhr.send(formData);
  };

  const handlePreviewDocument = (doc: VerificationDocRow) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await getVerificationDocumentSignedUrlAction(doc.id);
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Could not generate private document preview link.");
        return;
      }
      setPreviewModal({
        title:
          DOCUMENT_TYPE_LABELS[doc.document_type as VerificationDocumentType] ??
          doc.document_type,
        signedUrl: res.data.signedUrl,
        isPdf: res.data.isPdf,
      });
    });
  };

  const handleDeleteDocument = (docId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await deleteVerificationDocumentAction(docId);
      if (!res.success) {
        setErrorMessage(res.error || "Unable to remove document.");
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccessMessage("Pending document removed.");
      router.refresh();
    });
  };

  const handleSubmitApplication = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await submitSellerVerificationAction();
      if (!res.success) {
        setErrorMessage(res.error || "Verification submission failed.");
        return;
      }
      setSuccessMessage(
        "Verification application submitted! Our compliance team will review your documents.",
      );
      router.refresh();
    });
  };

  const allProfileAndDocsComplete =
    readiness.checks.slice(0, 4).every((c) => c.complete) && documents.length >= 1;
  const canSubmitNow = readiness.canSubmitStatus && allProfileAndDocsComplete;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">Current Application Status</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                <VerificationStatusBadge status={verificationStatus} />
                {verifiedAt && verificationStatus === "verified" && (
                  <span className="text-xs text-stone-500">
                    Verified on {formatShortDate(verifiedAt)}
                  </span>
                )}
              </div>
            </div>

            {readiness.canSubmitStatus && (
              <button
                type="button"
                disabled={!canSubmitNow || isPending}
                onClick={handleSubmitApplication}
                className="btn-primary"
              >
                {isPending
                  ? "Submitting…"
                  : verificationStatus === "rejected"
                    ? "Re-Submit Verification Application"
                    : "Submit for Verification"}
              </button>
            )}
          </div>

          {verificationStatus === "rejected" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Admin Review Feedback — Action Required</p>
              <p className="mt-1 text-xs leading-relaxed text-red-800">
                {verificationReason ||
                  "One or more verification requirements were not met. Review document remarks below, upload corrected files, and re-submit."}
              </p>
            </div>
          )}

          {verificationStatus === "submitted" || verificationStatus === "under_review" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
              Your verification application is currently queued with StonesDekho Compliance. You
              may still upload supplementary supporting documents below if requested.
            </div>
          ) : null}

          {verificationStatus === "verified" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs text-green-900">
              Your business is verified. Your public supplier storefront is active and you can
              submit stone listings for marketplace publication.
            </div>
          )}
        </CardBody>
      </Card>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Readiness Checklist */}
        <Card className="lg:col-span-5">
          <CardHeader className="border-b border-stone-100 pb-4">
            <h2 className="text-base font-semibold text-stone-900">Submission Checklist</h2>
            <p className="text-xs text-stone-500">
              All 5 items must be completed before submitting
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            {readiness.checks.map((item) => {
              const done =
                item.field === "documents" ? documents.length >= 1 : item.complete;
              return (
                <div
                  key={item.label}
                  className="flex items-start gap-2.5 rounded-lg border border-stone-100 bg-stone-50/70 p-2.5 text-xs"
                >
                  <span
                    className={
                      done
                        ? "mt-0.5 font-bold text-green-600"
                        : "mt-0.5 font-bold text-amber-600"
                    }
                  >
                    {done ? "✓" : "•"}
                  </span>
                  <span className={done ? "text-stone-800 font-medium" : "text-stone-600"}>
                    {item.label}
                  </span>
                </div>
              );
            })}

            {!readiness.checks.slice(0, 4).every((c) => c.complete) && (
              <div className="pt-2">
                <Link href="/seller/profile" className="btn-secondary w-full !py-2 !text-xs">
                  Complete Missing Profile Fields →
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Upload Private Verification Document */}
        <Card className="lg:col-span-7">
          <CardHeader className="border-b border-stone-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Upload Business Documents
                </h2>
                <p className="text-xs text-stone-500">
                  PDF, JPG, or PNG up to 10 MB per document
                </p>
              </div>
              <Badge variant="outline">🔒 Private Signed-URL Vault</Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label htmlFor="verif-doc-type" className="label-base mb-1">
                Document Category
              </label>
              <select
                id="verif-doc-type"
                value={selectedType}
                disabled={uploadStatus === "uploading" || verificationStatus === "suspended"}
                onChange={(e) =>
                  setSelectedType(e.target.value as VerificationDocumentType)
                }
                className="input-base"
              >
                {VERIFICATION_DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {DOCUMENT_TYPE_LABELS[dt]}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/70 p-5 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                disabled={
                  uploadStatus === "uploading" || verificationStatus === "suspended"
                }
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadDocument(file);
                  e.target.value = "";
                }}
              />

              <p className="text-sm font-semibold text-stone-900">
                Upload {DOCUMENT_TYPE_LABELS[selectedType]}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Files are stored privately and never accessible via public URLs. Only you and
                StonesDekho compliance reviewers can view them.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  disabled={
                    uploadStatus === "uploading" || verificationStatus === "suspended"
                  }
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary !py-2 !text-xs"
                >
                  {uploadStatus === "uploading"
                    ? `Uploading ${uploadProgress}%…`
                    : "Choose File & Upload"}
                </button>

                {uploadStatus === "error" && failedFile && (
                  <button
                    type="button"
                    onClick={() => handleUploadDocument(failedFile)}
                    className="btn-accent !py-2 !text-xs"
                  >
                    Retry Upload
                  </button>
                )}
              </div>

              {uploadStatus === "uploading" && (
                <div className="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full bg-amber-600 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Uploaded Documents List */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-base font-semibold text-stone-900">
            Uploaded Verification Documents ({documents.length})
          </h2>
        </CardHeader>
        <CardBody>
          {documents.length === 0 ? (
            <EmptyState
              title="No verification documents uploaded"
              description="Upload your GST Certificate, PAN Card, or Mining/Factory registration above."
              className="py-10"
            />
          ) : (
            <div className="divide-y divide-stone-100">
              {documents.map((doc) => {
                const label =
                  DOCUMENT_TYPE_LABELS[doc.document_type as VerificationDocumentType] ??
                  doc.document_type;
                const docBadgeVariant =
                  doc.verification_status === "approved"
                    ? "success"
                    : doc.verification_status === "rejected"
                      ? "destructive"
                      : "warning";

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-stone-900">{label}</p>
                        <Badge variant={docBadgeVariant}>
                          {doc.verification_status === "approved"
                            ? "Approved"
                            : doc.verification_status === "rejected"
                              ? "Rejected"
                              : "Pending Review"}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-stone-500">
                        Uploaded {formatShortDate(doc.uploaded_at)} •{" "}
                        {doc.storage_path.split("/").pop()}
                      </p>
                      {doc.rejection_reason && (
                        <p className="text-xs font-medium text-red-700">
                          Reviewer Note: {doc.rejection_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handlePreviewDocument(doc)}
                        className="btn-secondary !px-3 !py-1.5 !text-xs"
                      >
                        Preview (Signed URL)
                      </button>

                      {doc.verification_status === "pending" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Private Document Signed-URL Preview Modal */}
      {previewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-bold text-stone-900">{previewModal.title}</h3>
                <p className="text-[11px] text-stone-500">
                  Temporary signed URL (expires in 5 minutes)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewModal.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary !px-3 !py-1.5 !text-xs"
                >
                  Open in New Tab ↗
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                  aria-label="Close document preview"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-stone-100 p-4">
              {previewModal.isPdf ? (
                <iframe
                  src={previewModal.signedUrl}
                  title={previewModal.title}
                  className="h-[70vh] w-full rounded-lg border border-stone-200 bg-white"
                />
              ) : (
                <div className="relative mx-auto h-[65vh] w-full">
                  <Image
                    src={previewModal.signedUrl}
                    alt={previewModal.title}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

