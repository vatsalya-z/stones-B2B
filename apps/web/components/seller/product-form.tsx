"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@stone/ui";
import { slugify } from "@stone/utils";
import type { PriceType, VerificationStatus } from "@stone/types";
import type { CatalogUnit, StockStatus } from "@stone/validation";
import type { CategoryHierarchy, SellerProductFull } from "@/features/seller/queries";
import {
  changeProductStatusAction,
  createSellerProductAction,
  updateSellerProductAction,
} from "@/features/seller/actions";
import {
  extractProductSpecifications,
  PRICE_TYPE_LABELS,
  STOCK_STATUS_LABELS,
  STONE_COLOUR_SUGGESTIONS,
  STONE_FINISH_SUGGESTIONS,
  STONE_MATERIAL_SUGGESTIONS,
  UNIT_LABELS,
  type ModerationStatus,
} from "@/features/seller/seller-meta";
import {
  ProductImageUploader,
  type ProductImageUploaderHandle,
} from "./product-image-uploader";
import { ModerationStatusBadge } from "./status-badges";

export interface ProductFormProps {
  mode: "create" | "edit";
  categories: CategoryHierarchy;
  sellerVerificationStatus: VerificationStatus | null;
  hasSellerProfile: boolean;
  initialProduct?: SellerProductFull | null;
}

export function ProductForm({
  mode,
  categories,
  sellerVerificationStatus,
  hasSellerProfile,
  initialProduct,
}: ProductFormProps) {
  const router = useRouter();
  const uploaderRef = useRef<ProductImageUploaderHandle | null>(null);
  const [isPending, startTransition] = useTransition();

  // Resolve initial parent category & subcategory if editing
  const initialCategoryResolution = useMemo(() => {
    const cid = initialProduct?.category_id;
    if (!cid) return { parentId: "", subId: "" };
    const matched = categories.all.find((c) => c.id === cid);
    if (!matched) return { parentId: "", subId: "" };
    if (matched.parent_id) {
      return { parentId: matched.parent_id, subId: matched.id };
    }
    return { parentId: matched.id, subId: "" };
  }, [categories.all, initialProduct?.category_id]);

  const extractedSpecs = useMemo(
    () => extractProductSpecifications(initialProduct?.specifications ?? []),
    [initialProduct?.specifications],
  );

  // Active product ID (transitions from null -> created ID on create flow)
  const [activeProductId, setActiveProductId] = useState<string | null>(
    initialProduct?.id ?? null,
  );
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus>(
    initialProduct?.moderation_status ?? "draft",
  );

  // Section A: Basic Information
  const [name, setName] = useState(initialProduct?.name ?? "");
  const [sku, setSku] = useState(initialProduct?.sku ?? "");
  const [categoryId, setCategoryId] = useState(initialCategoryResolution.parentId);
  const [subcategoryId, setSubcategoryId] = useState(initialCategoryResolution.subId);
  const [description, setDescription] = useState(initialProduct?.description ?? "");
  const [materialType, setMaterialType] = useState(initialProduct?.material_type ?? "");
  const [stoneOrigin, setStoneOrigin] = useState(initialProduct?.stone_origin ?? "");

  // Section B: Stone Specifications
  const [colour, setColour] = useState(initialProduct?.colour ?? "");
  const [finish, setFinish] = useState(initialProduct?.finish ?? "");
  const [thickness, setThickness] = useState(
    initialProduct?.thickness !== null && initialProduct?.thickness !== undefined
      ? String(initialProduct.thickness)
      : "",
  );
  const [length, setLength] = useState(
    initialProduct?.length !== null && initialProduct?.length !== undefined
      ? String(initialProduct.length)
      : "",
  );
  const [width, setWidth] = useState(
    initialProduct?.width !== null && initialProduct?.width !== undefined
      ? String(initialProduct.width)
      : "",
  );
  const [availableSizes, setAvailableSizes] = useState(extractedSpecs.availableSizes);
  const [surfaceTreatment, setSurfaceTreatment] = useState(extractedSpecs.surfaceTreatment);
  const [customSpecs, setCustomSpecs] = useState<Array<{ name: string; value: string }>>(
    extractedSpecs.customSpecifications,
  );

  // Section C: Pricing
  const [priceType, setPriceType] = useState<PriceType>(
    initialProduct?.price_type ?? "fixed",
  );
  const [price, setPrice] = useState(
    initialProduct?.price !== null && initialProduct?.price !== undefined
      ? String(initialProduct.price)
      : "",
  );
  const [currency, setCurrency] = useState(initialProduct?.currency ?? "INR");
  const [unit, setUnit] = useState<CatalogUnit>(
    (initialProduct?.unit as CatalogUnit) ?? "sq_ft",
  );
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState(
    initialProduct?.minimum_order_quantity !== null &&
      initialProduct?.minimum_order_quantity !== undefined
      ? String(initialProduct.minimum_order_quantity)
      : "",
  );

  // Section D: Inventory
  const [stockStatus, setStockStatus] = useState<StockStatus>(
    initialProduct?.stock_status ?? "in_stock",
  );
  const [availableQuantity, setAvailableQuantity] = useState(extractedSpecs.availableQuantity);
  const [leadTime, setLeadTime] = useState(
    initialProduct?.lead_time !== null && initialProduct?.lead_time !== undefined
      ? String(initialProduct.lead_time)
      : "",
  );
  const [packagingInfo, setPackagingInfo] = useState(extractedSpecs.packagingInfo);

  // Section F: SEO
  const [seoTitle, setSeoTitle] = useState(extractedSpecs.seoTitle);
  const [seoDescription, setSeoDescription] = useState(extractedSpecs.seoDescription);
  const [slug, setSlug] = useState(initialProduct?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProduct?.slug));

  // Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const subcategories = categoryId ? categories.childrenByParent[categoryId] ?? [] : [];
  const isVerifiedSeller = sellerVerificationStatus === "verified";

  const handleNameChange = (nextName: string) => {
    setName(nextName);
    if (!slugTouched) {
      setSlug(slugify(nextName));
    }
  };

  const addCustomSpec = () => {
    setCustomSpecs((prev) => [...prev, { name: "", value: "" }]);
  };

  const updateCustomSpec = (index: number, key: "name" | "value", val: string) => {
    setCustomSpecs((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [key]: val } : row)),
    );
  };

  const removeCustomSpec = (index: number) => {
    setCustomSpecs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (intent: "draft" | "pending_review") => {
    setErrorMessage(null);
    setFieldErrors({});
    setSuccessBanner(null);

    const cleanedCustomSpecs = customSpecs.filter(
      (s) => s.name.trim().length > 0 || s.value.trim().length > 0,
    );

    const payload = {
      name,
      sku,
      categoryId,
      subcategoryId,
      description,
      materialType,
      stoneOrigin,
      colour,
      finish,
      thickness,
      length,
      width,
      availableSizes,
      surfaceTreatment,
      customSpecifications: cleanedCustomSpecs,
      priceType,
      price: priceType === "on_request" ? null : price,
      currency,
      unit,
      minimumOrderQuantity,
      stockStatus,
      availableQuantity,
      leadTime,
      packagingInfo,
      seoTitle,
      seoDescription,
      slug,
      intent,
    };

    startTransition(async () => {
      if (!activeProductId) {
        const res = await createSellerProductAction(payload);
        if (!res.success || !res.data) {
          setErrorMessage(res.error || "Unable to create product.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          return;
        }

        const createdId = res.data.productId;
        setActiveProductId(createdId);
        setModerationStatus(res.data.moderationStatus as ModerationStatus);

        if (uploaderRef.current?.hasPendingFiles()) {
          const uploadRes = await uploaderRef.current.uploadQueuedToProduct(createdId);
          if (!uploadRes.allSucceeded) {
            setErrorMessage(
              "Product details were saved, but one or more images failed to upload. Use the Retry button in Section E below.",
            );
            return;
          }
        }

        router.push(`/seller/products/${createdId}/edit?saved=1`);
        router.refresh();
      } else {
        const res = await updateSellerProductAction(activeProductId, payload);
        if (!res.success || !res.data) {
          setErrorMessage(res.error || "Unable to save product updates.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          return;
        }

        setModerationStatus(res.data.moderationStatus as ModerationStatus);
        setSlug(res.data.slug);

        if (uploaderRef.current?.hasPendingFiles()) {
          const uploadRes = await uploaderRef.current.uploadQueuedToProduct(activeProductId);
          if (!uploadRes.allSucceeded) {
            setErrorMessage(
              "Product details updated, but one or more staged images failed to upload. Retry below.",
            );
            return;
          }
        }

        setSuccessBanner(
          res.data.moderationStatus === "pending_review"
            ? "Product submitted for admin moderation review."
            : "Product saved as Draft.",
        );
        router.refresh();
      }
    });
  };

  const handleArchiveToggle = (target: "archived" | "draft") => {
    if (!activeProductId) return;
    setErrorMessage(null);
    setSuccessBanner(null);
    startTransition(async () => {
      const res = await changeProductStatusAction(activeProductId, target);
      if (!res.success) {
        setErrorMessage(res.error || "Unable to change product status.");
        return;
      }
      setModerationStatus(target);
      setSuccessBanner(
        target === "archived"
          ? "Product archived and removed from public catalogue."
          : "Product restored to Draft.",
      );
      router.refresh();
    });
  };

  if (!hasSellerProfile) {
    return (
      <Card>
        <CardBody className="py-10 text-center">
          <h2 className="text-lg font-semibold text-stone-900">
            Complete Your Seller Profile First
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
            Before adding stone products to your catalogue, set up your business profile so
            listings are linked to your company identity.
          </p>
          <div className="mt-6">
            <Link href="/seller/profile" className="btn-primary">
              Complete Business Profile
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow & Moderation Status Banner */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-semibold text-stone-900">Moderation Status:</span>
            <ModerationStatusBadge status={moderationStatus} />
            {moderationStatus === "approved" && initialProduct?.slug && (
              <Link
                href={`/products/${initialProduct.slug}`}
                className="text-xs font-semibold text-amber-700 hover:underline"
              >
                View Live Listing ↗
              </Link>
            )}
          </div>

          {activeProductId && (
            <div className="flex flex-wrap items-center gap-2">
              {moderationStatus !== "archived" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleArchiveToggle("archived")}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Archive Product
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleArchiveToggle("draft")}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Restore to Draft
                </button>
              )}
            </div>
          )}
        </div>

        {moderationStatus === "rejected" && initialProduct?.rejection_reason && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            <p className="font-semibold">Admin Review Feedback:</p>
            <p className="mt-1 text-xs leading-relaxed text-red-700">
              {initialProduct.rejection_reason}
            </p>
            <p className="mt-1.5 text-xs text-red-700">
              Update the fields or photographs below and click{" "}
              <strong>Submit for Review</strong> to re-submit.
            </p>
          </div>
        )}

        {moderationStatus === "approved" && (
          <p className="mt-2.5 text-xs text-stone-600">
            Note: To protect marketplace buyers against post-approval changes, editing a
            published product or its gallery automatically sends it back to{" "}
            <strong>Pending Review</strong> for admin re-approval.
          </p>
        )}

        {!isVerifiedSeller && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
            Your seller account is currently unverified. You can create and manage{" "}
            <strong>Draft</strong> products now; once your{" "}
            <Link href="/seller/verification" className="font-semibold underline">
              Seller Verification
            </Link>{" "}
            is approved, you can submit drafts for public marketplace review.
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {successBanner && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {successBanner}
        </div>
      )}

      {/* SECTION A — BASIC INFORMATION */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Section A
          </p>
          <h2 className="text-lg font-semibold text-stone-900">Basic Information</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="prod-name" className="label-base mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="prod-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Makrana White Sangemarmar First Quality Slab"
                className="input-base"
                required
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="prod-sku" className="label-base mb-1">
                SKU / Lot Code
              </label>
              <input
                id="prod-sku"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. MKR-WHT-20MM-01"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prod-category" className="label-base mb-1">
                Category
              </label>
              <select
                id="prod-category"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId("");
                }}
                className="input-base"
              >
                <option value="">Select primary stone category</option>
                {categories.parents.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prod-subcategory" className="label-base mb-1">
                Subcategory
              </label>
              <select
                id="prod-subcategory"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={subcategories.length === 0}
                className="input-base"
              >
                <option value="">
                  {subcategories.length === 0
                    ? "No subcategories for selection"
                    : "Optional subcategory"}
                </option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prod-material" className="label-base mb-1">
                Material Type
              </label>
              <input
                id="prod-material"
                list="stone-material-list"
                type="text"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                placeholder="e.g. Marble, Granite, Sandstone"
                className="input-base"
              />
              <datalist id="stone-material-list">
                {STONE_MATERIAL_SUGGESTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="prod-origin" className="label-base mb-1">
                Stone Origin / Quarry Belt
              </label>
              <input
                id="prod-origin"
                type="text"
                value={stoneOrigin}
                onChange={(e) => setStoneOrigin(e.target.value)}
                placeholder="e.g. Makrana, Rajasthan, India"
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prod-desc" className="label-base mb-1">
              Product Description
            </label>
            <textarea
              id="prod-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe mineral grain, veining consistency, architectural applications, grading, and quarry block quality…"
              className="input-base"
            />
          </div>
        </CardBody>
      </Card>

      {/* SECTION B — STONE SPECIFICATIONS */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Section B
          </p>
          <h2 className="text-lg font-semibold text-stone-900">Stone Specifications</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prod-colour" className="label-base mb-1">
                Primary Colour
              </label>
              <input
                id="prod-colour"
                list="stone-colour-list"
                type="text"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                placeholder="e.g. White, Black, Beige"
                className="input-base"
              />
              <datalist id="stone-colour-list">
                {STONE_COLOUR_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="prod-finish" className="label-base mb-1">
                Surface Finish
              </label>
              <input
                id="prod-finish"
                list="stone-finish-list"
                type="text"
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                placeholder="e.g. Mirror Polished, Honed, Leathered, Flamed"
                className="input-base"
              />
              <datalist id="stone-finish-list">
                {STONE_FINISH_SUGGESTIONS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="prod-thickness" className="label-base mb-1">
                Thickness (mm)
              </label>
              <input
                id="prod-thickness"
                type="number"
                step="0.01"
                min="0"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                placeholder="e.g. 18 or 20"
                className="input-base"
              />
              {fieldErrors.thickness && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.thickness}</p>
              )}
            </div>

            <div>
              <label htmlFor="prod-length" className="label-base mb-1">
                Standard Length (mm)
              </label>
              <input
                id="prod-length"
                type="number"
                step="0.01"
                min="0"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="e.g. 2800"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="prod-width" className="label-base mb-1">
                Standard Width (mm)
              </label>
              <input
                id="prod-width"
                type="number"
                step="0.01"
                min="0"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="e.g. 1800"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prod-sizes" className="label-base mb-1">
                Available Sizes / Formats
              </label>
              <input
                id="prod-sizes"
                type="text"
                value={availableSizes}
                onChange={(e) => setAvailableSizes(e.target.value)}
                placeholder="e.g. Gangsaw Slabs (9×6 ft), Cut-to-Size 600×600mm, 1200×600mm"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="prod-treatment" className="label-base mb-1">
                Surface Treatment / Backing
              </label>
              <input
                id="prod-treatment"
                type="text"
                value={surfaceTreatment}
                onChange={(e) => setSurfaceTreatment(e.target.value)}
                placeholder="e.g. Italian Epoxy Resin Vacuum Treated + Fiber Mesh Backing"
                className="input-base"
              />
            </div>
          </div>

          {/* Custom Specifications Builder */}
          <div className="space-y-3 border-t border-stone-100 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">
                  Custom Technical Specifications
                </h3>
                <p className="text-xs text-stone-500">
                  Add lab properties such as Water Absorption, Compressive Strength, Density, or
                  Bookmatch availability.
                </p>
              </div>
              <button
                type="button"
                onClick={addCustomSpec}
                className="btn-secondary !px-3 !py-1.5 !text-xs"
              >
                + Add Spec
              </button>
            </div>

            {customSpecs.length > 0 && (
              <div className="space-y-2.5">
                {customSpecs.map((spec, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-stone-50/70 p-2.5 sm:flex-row sm:items-center"
                  >
                    <input
                      type="text"
                      value={spec.name}
                      onChange={(e) => updateCustomSpec(idx, "name", e.target.value)}
                      placeholder="Property (e.g. Water Absorption)"
                      className="input-base sm:w-5/12"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => updateCustomSpec(idx, "value", e.target.value)}
                      placeholder="Value (e.g. < 0.15% by weight)"
                      className="input-base sm:flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomSpec(idx)}
                      className="self-end rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 sm:self-center"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* SECTION C — PRICING */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Section C
          </p>
          <h2 className="text-lg font-semibold text-stone-900">Commercial Pricing &amp; MOQ</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="prod-price-type" className="label-base mb-1">
                Pricing Model
              </label>
              <select
                id="prod-price-type"
                value={priceType}
                onChange={(e) => {
                  const next = e.target.value as PriceType;
                  setPriceType(next);
                  if (next === "on_request") setPrice("");
                }}
                className="input-base"
              >
                {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((pt) => (
                  <option key={pt} value={pt}>
                    {PRICE_TYPE_LABELS[pt]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prod-price" className="label-base mb-1">
                {priceType === "starting" ? "Starting Price" : "Unit Price"}{" "}
                {priceType !== "on_request" && <span className="text-red-500">*</span>}
              </label>
              <input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                disabled={priceType === "on_request"}
                value={priceType === "on_request" ? "" : price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={priceType === "on_request" ? "POA" : "e.g. 285"}
                className="input-base"
              />
              {fieldErrors.price && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.price}</p>
              )}
            </div>

            <div>
              <label htmlFor="prod-currency" className="label-base mb-1">
                Currency
              </label>
              <select
                id="prod-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-base"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AED">AED</option>
              </select>
            </div>

            <div>
              <label htmlFor="prod-unit" className="label-base mb-1">
                Selling Unit
              </label>
              <select
                id="prod-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as CatalogUnit)}
                className="input-base"
              >
                {(Object.keys(UNIT_LABELS) as CatalogUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-w-xs">
            <label htmlFor="prod-moq" className="label-base mb-1">
              Minimum Order Quantity (MOQ in {UNIT_LABELS[unit]})
            </label>
            <input
              id="prod-moq"
              type="number"
              step="0.01"
              min="0"
              value={minimumOrderQuantity}
              onChange={(e) => setMinimumOrderQuantity(e.target.value)}
              placeholder="e.g. 1500"
              className="input-base"
            />
          </div>
        </CardBody>
      </Card>

      {/* SECTION D — INVENTORY */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Section D
          </p>
          <h2 className="text-lg font-semibold text-stone-900">
            Inventory, Lead Time &amp; Packaging
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="prod-stock" className="label-base mb-1">
                Stock Availability
              </label>
              <select
                id="prod-stock"
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as StockStatus)}
                className="input-base"
              >
                {(Object.keys(STOCK_STATUS_LABELS) as StockStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {STOCK_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prod-avail-qty" className="label-base mb-1">
                Available Ready Lot Quantity
              </label>
              <input
                id="prod-avail-qty"
                type="text"
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                placeholder="e.g. 18,500 Sq. Ft. ready in stockyard"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="prod-lead-time" className="label-base mb-1">
                Dispatch Lead Time (Days)
              </label>
              <input
                id="prod-lead-time"
                type="number"
                min="0"
                max="365"
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                placeholder="e.g. 7"
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prod-packaging" className="label-base mb-1">
              Packaging &amp; Container Loading Details
            </label>
            <input
              id="prod-packaging"
              type="text"
              value={packagingInfo}
              onChange={(e) => setPackagingInfo(e.target.value)}
              placeholder="e.g. ISPM-15 fumigated seaworthy wooden bundles, 7–8 bundles per 20ft container (27 MT)"
              className="input-base"
            />
          </div>
        </CardBody>
      </Card>

      {/* SECTION E — ULTRA-HD IMAGES */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Section E
          </p>
          <h2 className="text-lg font-semibold text-stone-900">
            Ultra-HD Product Photographs
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Upload authentic slab, close-up mineral grain, and bookmatch photographs. Select the
            primary cover image and arrange display order.
          </p>
        </CardHeader>
        <CardBody>
          <ProductImageUploader
            ref={uploaderRef}
            productId={activeProductId}
            initialImages={initialProduct?.images ?? []}
            disabled={isPending}
          />
        </CardBody>
      </Card>

      {/* SECTION F — SEO */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Section F
          </p>
          <h2 className="text-lg font-semibold text-stone-900">Search Engine &amp; URL (SEO)</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prod-seo-title" className="label-base mb-1">
                SEO Meta Title
              </label>
              <input
                id="prod-seo-title"
                type="text"
                maxLength={160}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={name || "Custom search title (optional)"}
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="prod-slug" className="label-base mb-1">
                Product URL Slug
              </label>
              <input
                id="prod-slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="makrana-white-marble-slab"
                className="input-base"
              />
              {fieldErrors.slug && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.slug}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="prod-seo-desc" className="label-base mb-1">
              SEO Meta Description
            </label>
            <textarea
              id="prod-seo-desc"
              rows={2}
              maxLength={320}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Concise summary shown in Google search results for architects and stone importers…"
              className="input-base"
            />
          </div>
        </CardBody>
      </Card>

      {/* Form Action Footer */}
      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white/95 p-4 shadow-md backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <Link href="/seller/products" className="btn-ghost !justify-start">
          ← Back to Products
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit("draft")}
            className="btn-secondary flex-1 sm:flex-initial"
          >
            {isPending ? "Saving…" : "Save as Draft"}
          </button>

          <button
            type="button"
            disabled={isPending || !isVerifiedSeller}
            title={
              !isVerifiedSeller
                ? "Complete Seller Verification to submit products for marketplace review"
                : undefined
            }
            onClick={() => handleSubmit("pending_review")}
            className="btn-primary flex-1 sm:flex-initial"
          >
            {isPending
              ? "Submitting…"
              : moderationStatus === "rejected"
                ? "Resubmit for Review"
                : mode === "edit" && moderationStatus === "pending_review"
                  ? "Update Pending Listing"
                  : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

