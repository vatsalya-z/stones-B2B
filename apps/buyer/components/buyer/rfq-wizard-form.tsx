"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, VerifiedBadge } from "@stone/ui";
import { CATALOG_UNITS, type CatalogUnit } from "@stone/validation";
import type { CategoryItem } from "@/lib/db";
import {
  COUNTRY_OPTIONS,
  STONE_COLOUR_SUGGESTIONS,
  STONE_FINISH_SUGGESTIONS,
  STONE_MATERIAL_SUGGESTIONS,
  UNIT_LABELS,
} from "@/features/seller/seller-meta";
import {
  CURRENCY_OPTIONS,
  formatCountryName,
  formatUnitLabel,
  MAX_ENQUIRY_ATTACHMENT_BYTES,
} from "@/features/buyer/buyer-meta";
import { submitBuyerRfqAction } from "@/features/buyer/actions";
import type {
  ProductSnapshotSummary,
  PublicSupplierSummary,
} from "@/features/buyer/queries";

export interface RfqWizardFormProps {
  categories: CategoryItem[];
  verifiedSuppliers: PublicSupplierSummary[];
  preselectedProduct: (ProductSnapshotSummary & { seller: PublicSupplierSummary }) | null;
  preselectedSupplier: PublicSupplierSummary | null;
  defaultDelivery: {
    country: string;
    state: string;
    city: string;
    address: string;
  };
}

interface DraftRfqState {
  mode: "product" | "general";
  sellerId: string;
  enquiryTitle: string;
  categorySlug: string;
  materialType: string;
  stoneOrigin: string;
  description: string;
  colour: string;
  finish: string;
  thickness: string;
  length: string;
  width: string;
  surfaceRequirements: string;
  customSpecifications: string;
  quantity: string;
  unit: CatalogUnit;
  expectedBudget: string;
  currency: string;
  deliveryCountry: string;
  deliveryState: string;
  deliveryCity: string;
  deliveryAddress: string;
  requiredDeliveryDate: string;
  clientRequestId: string;
}

function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function RfqWizardForm({
  categories,
  verifiedSuppliers,
  preselectedProduct,
  preselectedSupplier,
  defaultDelivery,
}: RfqWizardFormProps) {
  const draftKey = useMemo(
    () =>
      `stonesdekho_rfq_draft_v1_${preselectedProduct?.id ?? preselectedSupplier?.id ?? "general"}`,
    [preselectedProduct?.id, preselectedSupplier?.id],
  );

  const buildInitialState = (): DraftRfqState => ({
    mode: preselectedProduct ? "product" : "general",
    sellerId:
      preselectedProduct?.seller.id ??
      preselectedSupplier?.id ??
      verifiedSuppliers[0]?.id ??
      "",
    enquiryTitle: preselectedProduct
      ? `RFQ: ${preselectedProduct.name}`
      : preselectedSupplier
        ? `Custom Stone Requirement for ${preselectedSupplier.businessName}`
        : "",
    categorySlug: preselectedProduct?.categorySlug ?? "",
    materialType: preselectedProduct?.materialType ?? "",
    stoneOrigin: preselectedProduct?.stoneOrigin ?? "",
    description: "",
    colour: preselectedProduct?.colour ?? "",
    finish: preselectedProduct?.finish ?? "",
    thickness:
      preselectedProduct?.thickness !== null && preselectedProduct?.thickness !== undefined
        ? `${preselectedProduct.thickness} mm`
        : "",
    length:
      preselectedProduct?.length !== null && preselectedProduct?.length !== undefined
        ? `${preselectedProduct.length} mm`
        : "",
    width:
      preselectedProduct?.width !== null && preselectedProduct?.width !== undefined
        ? `${preselectedProduct.width} mm`
        : "",
    surfaceRequirements: "",
    customSpecifications: "",
    quantity: "",
    unit: (CATALOG_UNITS as readonly string[]).includes(preselectedProduct?.unit ?? "")
      ? (preselectedProduct!.unit as CatalogUnit)
      : "sq_ft",
    expectedBudget: "",
    currency: preselectedProduct?.currency || "INR",
    deliveryCountry: defaultDelivery.country || "IN",
    deliveryState: defaultDelivery.state || "",
    deliveryCity: defaultDelivery.city || "",
    deliveryAddress: defaultDelivery.address || "",
    requiredDeliveryDate: "",
    clientRequestId: generateUuidV4(),
  });

  const [form, setForm] = useState<DraftRfqState>(buildInitialState);
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [confirmedReview, setConfirmedReview] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedEnquiryId, setSubmittedEnquiryId] = useState<string | null>(null);
  const [failedAttachments, setFailedAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Restore saved draft from sessionStorage safely on mount
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DraftRfqState>;
        setForm((prev) => ({
          ...prev,
          ...parsed,
          mode: preselectedProduct ? "product" : (parsed.mode ?? prev.mode),
          clientRequestId: parsed.clientRequestId || prev.clientRequestId,
        }));
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setHydratedDraft(true);
    }
  }, [draftKey, preselectedProduct]);

  // Persist draft edits automatically in sessionStorage
  useEffect(() => {
    if (!hydratedDraft || submittedEnquiryId) return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify(form));
    } catch {
      // Ignore storage quota errors
    }
  }, [form, draftKey, hydratedDraft, submittedEnquiryId]);

  const updateField = <K extends keyof DraftRfqState>(key: K, value: DraftRfqState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetDraft = () => {
    try {
      window.sessionStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }
    setForm(buildInitialState());
    setStagedFiles([]);
    setConfirmedReview(false);
    setErrorMessage(null);
  };

  const selectedSupplier = useMemo(() => {
    if (form.mode === "product" && preselectedProduct) {
      return preselectedProduct.seller;
    }
    return verifiedSuppliers.find((s) => s.id === form.sellerId) ?? null;
  }, [form.mode, form.sellerId, preselectedProduct, verifiedSuppliers]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;
    setErrorMessage(null);

    const combined = [...stagedFiles, ...incoming];
    if (combined.length > 5) {
      setErrorMessage("You can attach up to 5 files during RFQ creation (more can be added afterwards).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    for (const file of incoming) {
      if (file.size > MAX_ENQUIRY_ATTACHMENT_BYTES) {
        setErrorMessage(`"${file.name}" exceeds the 10 MB size limit.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setStagedFiles(combined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeStagedFile = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  async function uploadFilesForEnquiry(enquiryId: string, files: File[]) {
    if (files.length === 0) return [];
    setUploadingFiles(true);
    const failed: File[] = [];

    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/buyer/enquiries/${enquiryId}/attachments`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          failed.push(file);
        }
      } catch {
        failed.push(file);
      }
    }

    setUploadingFiles(false);
    return failed;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!confirmedReview) {
      setErrorMessage("Please review your specifications in Section F and confirm before submitting.");
      return;
    }

    startTransition(async () => {
      const result = await submitBuyerRfqAction({
        mode: form.mode,
        productId: form.mode === "product" ? preselectedProduct?.id : undefined,
        sellerId: form.mode === "general" ? form.sellerId : undefined,
        enquiryTitle: form.enquiryTitle,
        categorySlug: form.categorySlug,
        materialType: form.materialType,
        stoneOrigin: form.stoneOrigin,
        description: form.description,
        colour: form.colour,
        finish: form.finish,
        thickness: form.thickness,
        length: form.length,
        width: form.width,
        surfaceRequirements: form.surfaceRequirements,
        customSpecifications: form.customSpecifications,
        quantity: Number(form.quantity),
        unit: form.unit,
        expectedBudget: form.expectedBudget ? Number(form.expectedBudget) : undefined,
        currency: form.currency,
        deliveryCountry: form.deliveryCountry,
        deliveryState: form.deliveryState,
        deliveryCity: form.deliveryCity,
        deliveryAddress: form.deliveryAddress,
        requiredDeliveryDate: form.requiredDeliveryDate || undefined,
        clientRequestId: form.clientRequestId,
      });

      if (!result.success || !result.data) {
        setErrorMessage(result.error || "Unable to submit RFQ. Please verify your entries.");
        return;
      }

      const enquiryId = result.data.enquiryId;
      const failed = await uploadFilesForEnquiry(enquiryId, stagedFiles);
      setFailedAttachments(failed);
      setSubmittedEnquiryId(enquiryId);

      try {
        window.sessionStorage.removeItem(draftKey);
      } catch {
        // Ignore
      }
    });
  };

  const handleRetryFailedAttachments = async () => {
    if (!submittedEnquiryId || failedAttachments.length === 0) return;
    const stillFailed = await uploadFilesForEnquiry(submittedEnquiryId, failedAttachments);
    setFailedAttachments(stillFailed);
  };

  if (submittedEnquiryId) {
    return (
      <Card>
        <CardBody className="p-8 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <Badge variant="success">RFQ Dispatched</Badge>
            <h2 className="mt-2 text-2xl font-bold text-stone-900">
              Request for Quotation Submitted
            </h2>
            <p className="mt-2 text-sm text-stone-600 max-w-lg mx-auto">
              Your requirement <strong>{form.enquiryTitle}</strong> has been transmitted directly to{" "}
              <strong>{selectedSupplier?.businessName ?? "the verified supplier"}</strong>. You will
              receive their formal itemised quotation in your Buyer Portal.
            </p>
          </div>

          {failedAttachments.length > 0 && (
            <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="text-xs font-semibold text-amber-900">
                {failedAttachments.length} attachment(s) could not be uploaded automatically.
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Your RFQ record is safely saved (no duplicate will be created). Click retry or upload from the RFQ detail screen.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={uploadingFiles}
                onClick={handleRetryFailedAttachments}
                className="mt-3"
              >
                Retry Attachment Upload
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={`/buyer/rfqs/${submittedEnquiryId}`}
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800"
            >
              View RFQ &amp; Track Quotations
            </Link>
            <Link
              href="/buyer/rfqs"
              className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              All My RFQs
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {/* Mode Banner & Target Supplier / Product Context */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">RFQ Routing &amp; Target Supplier</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Each formal RFQ is dispatched directly to a verified StonesDekho supplier with idempotent tracking.
            </p>
          </div>
          {preselectedProduct && (
            <div className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => updateField("mode", "product")}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  form.mode === "product"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Product-Specific RFQ
              </button>
              <button
                type="button"
                onClick={() => updateField("mode", "general")}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  form.mode === "general"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                General Custom RFQ
              </button>
            </div>
          )}
        </CardHeader>

        <CardBody className="space-y-4">
          {form.mode === "product" && preselectedProduct ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
              {preselectedProduct.primaryImage && (
                <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                  <Image
                    src={preselectedProduct.primaryImage}
                    alt={preselectedProduct.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized={!preselectedProduct.primaryImage.includes(".supabase.co")}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">Product-Specific RFQ</Badge>
                  {preselectedProduct.materialType && (
                    <Badge variant="secondary">{preselectedProduct.materialType}</Badge>
                  )}
                </div>
                <p className="mt-1.5 text-base font-bold text-stone-900">
                  {preselectedProduct.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                  <span>
                    Supplier: <strong>{preselectedProduct.seller.businessName}</strong>
                  </span>
                  {preselectedProduct.seller.isVerified && <VerifiedBadge />}
                </div>
              </div>
              <Link
                href={`/products/${preselectedProduct.slug}`}
                className="text-xs font-semibold text-amber-700 hover:underline"
              >
                View Product ↗
              </Link>
            </div>
          ) : verifiedSuppliers.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No verified suppliers are currently available to receive a General RFQ (or your account
              owns the only verified supplier). Browse the public{" "}
              <Link href="/suppliers" className="font-semibold underline">
                Suppliers Directory
              </Link>{" "}
              once additional factories complete verification.
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="rfq-sellerId" className="block text-xs font-semibold text-stone-700">
                Verified Stone Manufacturer / Exporter *
              </label>
              <select
                id="rfq-sellerId"
                value={form.sellerId}
                onChange={(e) => updateField("sellerId", e.target.value)}
                required
                className="input-base"
              >
                <option value="">Select a verified stone supplier…</option>
                {verifiedSuppliers.map((sup) => {
                  const loc = [sup.city, sup.state].filter(Boolean).join(", ");
                  return (
                    <option key={sup.id} value={sup.id}>
                      {sup.businessName} ({sup.businessType.replace(/_/g, " ")}
                      {loc ? ` — ${loc}` : ""})
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-stone-500">
                General RFQs allow you to request custom cut-to-size blocks, gangsaw slabs, or non-catalogue stone directly from a verified supplier.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* SECTION A — REQUIREMENT */}
      <Card>
        <CardHeader>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Section A
          </span>
          <h3 className="text-base font-bold text-stone-900">Project Requirement</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label htmlFor="rfq-title" className="block text-xs font-semibold text-stone-700 mb-1">
              RFQ Title *
            </label>
            <input
              id="rfq-title"
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={form.enquiryTitle}
              onChange={(e) => updateField("enquiryTitle", e.target.value)}
              placeholder="e.g. 4,500 Sq Ft Makrana White Honed Flooring Slabs — Hotel Lobby Project"
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="rfq-category" className="block text-xs font-semibold text-stone-700 mb-1">
                Product Category
              </label>
              <select
                id="rfq-category"
                value={form.categorySlug}
                onChange={(e) => updateField("categorySlug", e.target.value)}
                className="input-base"
              >
                <option value="">Select stone category…</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rfq-material" className="block text-xs font-semibold text-stone-700 mb-1">
                Material Type
              </label>
              <input
                id="rfq-material"
                type="text"
                list="rfq-material-options"
                maxLength={100}
                value={form.materialType}
                onChange={(e) => updateField("materialType", e.target.value)}
                placeholder="e.g. Marble, Granite, Quartzite"
                className="input-base"
              />
              <datalist id="rfq-material-options">
                {STONE_MATERIAL_SUGGESTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="rfq-origin" className="block text-xs font-semibold text-stone-700 mb-1">
                Required Stone Origin
              </label>
              <input
                id="rfq-origin"
                type="text"
                maxLength={120}
                value={form.stoneOrigin}
                onChange={(e) => updateField("stoneOrigin", e.target.value)}
                placeholder="e.g. Makrana, Kishangarh, Ongole, Italian"
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rfq-description" className="block text-xs font-semibold text-stone-700 mb-1">
              Detailed Stone &amp; Project Description *
            </label>
            <textarea
              id="rfq-description"
              rows={4}
              required
              minLength={10}
              maxLength={3200}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the application (interior flooring, facade cladding, countertops), grade consistency, book-matching expectations, inspection, and packaging requirements…"
              className="input-base"
            />
          </div>
        </CardBody>
      </Card>

      {/* SECTION B — TECHNICAL SPECIFICATIONS */}
      <Card>
        <CardHeader>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Section B
          </span>
          <h3 className="text-base font-bold text-stone-900">Technical Specifications</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="rfq-colour" className="block text-xs font-semibold text-stone-700 mb-1">
                Colour / Tone
              </label>
              <input
                id="rfq-colour"
                type="text"
                list="rfq-colour-options"
                maxLength={80}
                value={form.colour}
                onChange={(e) => updateField("colour", e.target.value)}
                placeholder="e.g. White, Black"
                className="input-base"
              />
              <datalist id="rfq-colour-options">
                {STONE_COLOUR_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="rfq-finish" className="block text-xs font-semibold text-stone-700 mb-1">
                Surface Finish
              </label>
              <input
                id="rfq-finish"
                type="text"
                list="rfq-finish-options"
                maxLength={80}
                value={form.finish}
                onChange={(e) => updateField("finish", e.target.value)}
                placeholder="e.g. Polished, Honed"
                className="input-base"
              />
              <datalist id="rfq-finish-options">
                {STONE_FINISH_SUGGESTIONS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="rfq-thickness" className="block text-xs font-semibold text-stone-700 mb-1">
                Thickness
              </label>
              <input
                id="rfq-thickness"
                type="text"
                maxLength={60}
                value={form.thickness}
                onChange={(e) => updateField("thickness", e.target.value)}
                placeholder="e.g. 18 mm or 20 mm"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="rfq-length" className="block text-xs font-semibold text-stone-700 mb-1">
                Length
              </label>
              <input
                id="rfq-length"
                type="text"
                maxLength={60}
                value={form.length}
                onChange={(e) => updateField("length", e.target.value)}
                placeholder="e.g. 2800 mm / Random"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="rfq-width" className="block text-xs font-semibold text-stone-700 mb-1">
                Width
              </label>
              <input
                id="rfq-width"
                type="text"
                maxLength={60}
                value={form.width}
                onChange={(e) => updateField("width", e.target.value)}
                placeholder="e.g. 1600 mm / Cut-to-size"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rfq-surface" className="block text-xs font-semibold text-stone-700 mb-1">
                Surface &amp; Edge Requirements
              </label>
              <input
                id="rfq-surface"
                type="text"
                maxLength={300}
                value={form.surfaceRequirements}
                onChange={(e) => updateField("surfaceRequirements", e.target.value)}
                placeholder="e.g. Epoxy resin backed, fibre mesh, chamfered edges, zero cracks"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="rfq-custom-specs" className="block text-xs font-semibold text-stone-700 mb-1">
                Custom Technical / Tolerance Specifications
              </label>
              <input
                id="rfq-custom-specs"
                type="text"
                maxLength={600}
                value={form.customSpecifications}
                onChange={(e) => updateField("customSpecifications", e.target.value)}
                placeholder="e.g. Thickness tolerance +/- 0.5mm, fumigated wooden crates"
                className="input-base"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* SECTION C — QUANTITY AND BUDGET */}
      <Card>
        <CardHeader>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Section C
          </span>
          <h3 className="text-base font-bold text-stone-900">Quantity &amp; Target Budget</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="rfq-quantity" className="block text-xs font-semibold text-stone-700 mb-1">
                Required Quantity *
              </label>
              <input
                id="rfq-quantity"
                type="number"
                min="0.001"
                step="any"
                required
                value={form.quantity}
                onChange={(e) => updateField("quantity", e.target.value)}
                placeholder="e.g. 2500"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="rfq-unit" className="block text-xs font-semibold text-stone-700 mb-1">
                Unit of Measure *
              </label>
              <select
                id="rfq-unit"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value as CatalogUnit)}
                className="input-base"
              >
                {CATALOG_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]} ({u})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rfq-budget" className="block text-xs font-semibold text-stone-700 mb-1">
                Expected Total Budget (Optional)
              </label>
              <input
                id="rfq-budget"
                type="number"
                min="0"
                step="0.01"
                value={form.expectedBudget}
                onChange={(e) => updateField("expectedBudget", e.target.value)}
                placeholder="e.g. 650000"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="rfq-currency" className="block text-xs font-semibold text-stone-700 mb-1">
                Currency *
              </label>
              <select
                id="rfq-currency"
                value={form.currency}
                onChange={(e) => updateField("currency", e.target.value)}
                className="input-base"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* SECTION D — DELIVERY */}
      <Card>
        <CardHeader>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Section D
          </span>
          <h3 className="text-base font-bold text-stone-900">Delivery Destination &amp; Timeline</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="rfq-country" className="block text-xs font-semibold text-stone-700 mb-1">
                Delivery Country *
              </label>
              <select
                id="rfq-country"
                value={form.deliveryCountry}
                onChange={(e) => updateField("deliveryCountry", e.target.value)}
                className="input-base"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rfq-state" className="block text-xs font-semibold text-stone-700 mb-1">
                State / Province
              </label>
              <input
                id="rfq-state"
                type="text"
                maxLength={100}
                value={form.deliveryState}
                onChange={(e) => updateField("deliveryState", e.target.value)}
                placeholder="e.g. Maharashtra"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="rfq-city" className="block text-xs font-semibold text-stone-700 mb-1">
                City or Destination Port *
              </label>
              <input
                id="rfq-city"
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={form.deliveryCity}
                onChange={(e) => updateField("deliveryCity", e.target.value)}
                placeholder="e.g. Mumbai / Nhava Sheva Port"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="rfq-delivery-date" className="block text-xs font-semibold text-stone-700 mb-1">
                Required Delivery Date
              </label>
              <input
                id="rfq-delivery-date"
                type="date"
                value={form.requiredDeliveryDate}
                onChange={(e) => updateField("requiredDeliveryDate", e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rfq-address" className="block text-xs font-semibold text-stone-700 mb-1">
              Project Site Address / Unloading Location
            </label>
            <input
              id="rfq-address"
              type="text"
              maxLength={300}
              value={form.deliveryAddress}
              onChange={(e) => updateField("deliveryAddress", e.target.value)}
              placeholder="e.g. Plot 42, Industrial Estate / Project Site Gate 2"
              className="input-base"
            />
          </div>
        </CardBody>
      </Card>

      {/* SECTION E — ATTACHMENTS */}
      <Card>
        <CardHeader>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Section E
          </span>
          <h3 className="text-base font-bold text-stone-900">
            Private Reference Attachments (Drawings, BOQ, Photos)
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-stone-800">
                  Add BOQ PDFs, Architectural Drawings, or Stone Reference Photos
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  Accepted formats: PDF, JPEG, PNG, WebP (verified by binary file signature) • Max 10 MB per file • Stored privately
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFilesSelected}
                  className="sr-only"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Attachments
                </Button>
              </div>
            </div>

            {stagedFiles.length > 0 && (
              <ul className="mt-4 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
                {stagedFiles.map((file, idx) => (
                  <li
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-stone-900">{file.name}</p>
                      <p className="text-stone-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStagedFile(idx)}
                      className="font-semibold text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardBody>
      </Card>

      {/* SECTION F — REVIEW & SUBMIT */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Section F
            </span>
            <h3 className="text-base font-bold text-stone-900">Review &amp; Confirm RFQ</h3>
          </div>
          <button
            type="button"
            onClick={resetDraft}
            className="text-xs font-medium text-stone-500 hover:text-stone-800 underline self-start sm:self-auto"
          >
            Clear Draft
          </button>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-stone-200 bg-stone-50/80 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-stone-500">Target Supplier</p>
              <p className="mt-0.5 font-semibold text-stone-900">
                {selectedSupplier?.businessName ?? "Not selected"}
              </p>
            </div>
            <div>
              <p className="text-stone-500">RFQ Mode &amp; Material</p>
              <p className="mt-0.5 font-semibold text-stone-900">
                {form.mode === "product" ? "Product-Specific" : "General Custom"}
                {form.materialType ? ` • ${form.materialType}` : ""}
              </p>
            </div>
            <div>
              <p className="text-stone-500">Quantity &amp; Currency</p>
              <p className="mt-0.5 font-semibold text-stone-900">
                {form.quantity || "—"} {formatUnitLabel(form.unit)} ({form.currency})
              </p>
            </div>
            <div>
              <p className="text-stone-500">Delivery Destination</p>
              <p className="mt-0.5 font-semibold text-stone-900">
                {[form.deliveryCity, form.deliveryState, formatCountryName(form.deliveryCountry)]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmedReview}
              onChange={(e) => setConfirmedReview(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-600"
            />
            <span className="text-xs text-stone-700 leading-relaxed">
              I confirm these commercial and technical specifications are accurate and authorize
              StonesDekho to transmit this Request for Quotation directly to the selected verified
              supplier.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-100 pt-4">
            <Link
              href="/buyer/rfqs"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              variant="accent"
              loading={isPending || uploadingFiles}
              disabled={form.mode === "general" && verifiedSuppliers.length === 0}
            >
              {uploadingFiles
                ? "Uploading Attachments…"
                : isPending
                  ? "Submitting RFQ…"
                  : "Submit Request for Quotation"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}

