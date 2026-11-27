"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@stone/ui";
import { slugify } from "@stone/utils";
import type { VerificationStatus } from "@stone/types";
import type {
  CatalogUnit,
  ProductFormType,
  StockStatus,
} from "@stone/validation";
import type {
  CategoryHierarchy,
  SellerProductFull,
} from "@/features/seller/queries";
import {
  changeProductStatusAction,
  createSellerProductAction,
  updateSellerProductAction,
} from "@/features/seller/actions";
import {
  extractProductSpecifications,
  STOCK_STATUS_LABELS,
  STONE_COLOUR_SUGGESTIONS,
  STONE_FINISH_SUGGESTIONS,
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

const STEP_LABELS = [
  { id: 1, title: "Category" },
  { id: 2, title: "Variety" },
  { id: 3, title: "Product Form" },
  { id: 4, title: "Specifications" },
  { id: 5, title: "Images" },
  { id: 6, title: "Review & Publish" },
] as const;

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

  const initialFormSlug = useMemo<ProductFormType>(() => {
    const fid = initialProduct?.form_id;
    if (fid) {
      const matched = categories.forms.find((f) => f.id === fid || f.slug === fid);
      if (matched && ["slabs", "tiles", "blocks", "articles"].includes(matched.slug)) {
        return matched.slug as ProductFormType;
      }
    }
    return "slabs";
  }, [categories.forms, initialProduct?.form_id]);

  const initialFormAttrs = useMemo(() => {
    const raw = (initialProduct?.form_attributes ?? {}) as Record<string, unknown>;
    return {
      slabDimensions: typeof raw.slabDimensions === "string" ? raw.slabDimensions : "",
      surfaceDetails: typeof raw.surfaceDetails === "string" ? raw.surfaceDetails : "",
      piecesPerBox:
        typeof raw.piecesPerBox === "number" || typeof raw.piecesPerBox === "string"
          ? String(raw.piecesPerBox)
          : "",
      blockDimensions: typeof raw.blockDimensions === "string" ? raw.blockDimensions : "",
      approximateWeight: typeof raw.approximateWeight === "string" ? raw.approximateWeight : "",
      blockGrade: typeof raw.blockGrade === "string" ? raw.blockGrade : "",
      articleType: typeof raw.articleType === "string" ? raw.articleType : "",
      carvingDetails: typeof raw.carvingDetails === "string" ? raw.carvingDetails : "",
      articleDimensions: typeof raw.articleDimensions === "string" ? raw.articleDimensions : "",
      customizationAvailable: Boolean(raw.customizationAvailable),
    };
  }, [initialProduct?.form_attributes]);

  const extractedSpecs = useMemo(
    () => extractProductSpecifications(initialProduct?.specifications ?? []),
    [initialProduct?.specifications],
  );

  const [activeProductId, setActiveProductId] = useState<string | null>(
    initialProduct?.id ?? null,
  );
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus>(
    initialProduct?.moderation_status ?? "draft",
  );

  // Step 1-3: Guided Taxonomy Selection
  const [categoryId, setCategoryId] = useState(initialCategoryResolution.parentId);
  const [subcategoryId, setSubcategoryId] = useState(initialCategoryResolution.subId);
  const [varietyFilter, setVarietyFilter] = useState("");
  const [formSlug, setFormSlug] = useState<ProductFormType>(initialFormSlug);

  // Step 4: Common & Form-Specific Information
  const [name, setName] = useState(initialProduct?.name ?? "");
  const [sku, setSku] = useState(initialProduct?.sku ?? "");
  const [description, setDescription] = useState(initialProduct?.description ?? "");
  const [materialType, setMaterialType] = useState(initialProduct?.material_type ?? "");
  const [stoneOrigin, setStoneOrigin] = useState(initialProduct?.stone_origin ?? "");
  const [colour, setColour] = useState(initialProduct?.colour ?? "");
  const [finish, setFinish] = useState(initialProduct?.finish ?? "");
  const [thickness, setThickness] = useState(
    initialProduct?.thickness != null ? String(initialProduct.thickness) : "",
  );
  const [length, setLength] = useState(
    initialProduct?.length != null ? String(initialProduct.length) : "",
  );
  const [width, setWidth] = useState(
    initialProduct?.width != null ? String(initialProduct.width) : "",
  );
  const [availableSizes, setAvailableSizes] = useState(extractedSpecs.availableSizes);
  const [surfaceTreatment, setSurfaceTreatment] = useState(extractedSpecs.surfaceTreatment);
  const [customSpecs, setCustomSpecs] = useState<Array<{ name: string; value: string }>>(
    extractedSpecs.customSpecifications,
  );

  // Form-specific attributes
  const [slabDimensions, setSlabDimensions] = useState(initialFormAttrs.slabDimensions);
  const [surfaceDetails, setSurfaceDetails] = useState(initialFormAttrs.surfaceDetails);
  const [piecesPerBox, setPiecesPerBox] = useState(initialFormAttrs.piecesPerBox);
  const [blockDimensions, setBlockDimensions] = useState(initialFormAttrs.blockDimensions);
  const [approximateWeight, setApproximateWeight] = useState(initialFormAttrs.approximateWeight);
  const [blockGrade, setBlockGrade] = useState(initialFormAttrs.blockGrade);
  const [articleType, setArticleType] = useState(initialFormAttrs.articleType);
  const [carvingDetails, setCarvingDetails] = useState(initialFormAttrs.carvingDetails);
  const [articleDimensions, setArticleDimensions] = useState(initialFormAttrs.articleDimensions);
  const [customizationAvailable, setCustomizationAvailable] = useState(
    initialFormAttrs.customizationAvailable,
  );

  // Commercial availability (no public price list)
  const [unit, setUnit] = useState<CatalogUnit>(
    (initialProduct?.unit as CatalogUnit) ?? "sq_ft",
  );
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState(
    initialProduct?.minimum_order_quantity != null
      ? String(initialProduct.minimum_order_quantity)
      : "",
  );
  const [stockStatus, setStockStatus] = useState<StockStatus>(
    initialProduct?.stock_status ?? "in_stock",
  );
  const [availableQuantity, setAvailableQuantity] = useState(extractedSpecs.availableQuantity);
  const [leadTime, setLeadTime] = useState(
    initialProduct?.lead_time != null ? String(initialProduct.lead_time) : "",
  );
  const [packagingInfo, setPackagingInfo] = useState(extractedSpecs.packagingInfo);

  // SEO
  const [seoTitle, setSeoTitle] = useState(extractedSpecs.seoTitle);
  const [seoDescription, setSeoDescription] = useState(extractedSpecs.seoDescription);
  const [slug, setSlug] = useState(initialProduct?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProduct?.slug));

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const selectedParent = categories.parents.find((c) => c.id === categoryId) ?? null;
  const varieties = useMemo(
    () => (categoryId ? categories.childrenByParent[categoryId] ?? [] : []),
    [categories.childrenByParent, categoryId],
  );
  const filteredVarieties = useMemo(() => {
    const q = varietyFilter.trim().toLowerCase();
    if (!q) return varieties;
    return varieties.filter((v) => v.name.toLowerCase().includes(q));
  }, [varieties, varietyFilter]);

  const selectedVariety = varieties.find((v) => v.id === subcategoryId) ?? null;
  const effectiveCategoryId = subcategoryId || categoryId || "";

  const allowedFormSlugs = useMemo(() => {
    if (!effectiveCategoryId) return ["slabs", "tiles", "blocks"];
    return categories.enabledFormsByCategory[effectiveCategoryId] ?? ["slabs", "tiles", "blocks"];
  }, [categories.enabledFormsByCategory, effectiveCategoryId]);

  const visibleForms = useMemo(
    () => categories.forms.filter((f) => allowedFormSlugs.includes(f.slug)),
    [categories.forms, allowedFormSlugs],
  );

  const activeFormOption =
    visibleForms.find((f) => f.slug === formSlug) ?? visibleForms[0] ?? null;

  const isVerifiedSeller = sellerVerificationStatus === "verified";

  const handleSelectCategory = (nextParentId: string) => {
    setCategoryId(nextParentId);
    setSubcategoryId("");
    setVarietyFilter("");
    const parentObj = categories.parents.find((p) => p.id === nextParentId);
    if (parentObj && !materialType) {
      setMaterialType(parentObj.name);
    }
    const nextAllowed =
      categories.enabledFormsByCategory[nextParentId] ?? ["slabs", "tiles", "blocks"];
    if (!nextAllowed.includes(formSlug)) {
      setFormSlug((nextAllowed[0] as ProductFormType) ?? "slabs");
    }
  };

  const handleSelectVariety = (nextVarietyId: string) => {
    setSubcategoryId(nextVarietyId);
    const nextAllowed =
      categories.enabledFormsByCategory[nextVarietyId] ?? ["slabs", "tiles", "blocks"];
    if (!nextAllowed.includes(formSlug)) {
      setFormSlug((nextAllowed[0] as ProductFormType) ?? "slabs");
    }
  };

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

    if (!categoryId) {
      setErrorMessage("Step 1: Please select a Stone Category first.");
      return;
    }

    const cleanedCustomSpecs = customSpecs.filter(
      (s) => s.name.trim().length > 0 || s.value.trim().length > 0,
    );

    const activeForm = visibleForms.find((f) => f.slug === formSlug) ?? visibleForms[0];
    const isUuid =
      activeForm?.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeForm.id);

    const payload = {
      name,
      sku,
      categoryId,
      subcategoryId,
      formId: isUuid ? activeForm.id : undefined,
      formSlug: (activeForm?.slug as ProductFormType) ?? formSlug,
      formAttributes: {
        slabDimensions: formSlug === "slabs" ? slabDimensions : undefined,
        surfaceDetails: formSlug === "slabs" ? surfaceDetails : undefined,
        piecesPerBox: formSlug === "tiles" ? piecesPerBox : undefined,
        blockDimensions: formSlug === "blocks" ? blockDimensions : undefined,
        approximateWeight: formSlug === "blocks" ? approximateWeight : undefined,
        blockGrade: formSlug === "blocks" ? blockGrade : undefined,
        articleType: formSlug === "articles" ? articleType : undefined,
        carvingDetails: formSlug === "articles" ? carvingDetails : undefined,
        articleDimensions: formSlug === "articles" ? articleDimensions : undefined,
        customizationAvailable:
          formSlug === "articles" ? customizationAvailable : undefined,
      },
      description,
      materialType: materialType || selectedParent?.name || "",
      stoneOrigin,
      colour,
      finish,
      thickness,
      length,
      width,
      availableSizes,
      surfaceTreatment,
      customSpecifications: cleanedCustomSpecs,
      priceType: "on_request" as const,
      price: null,
      currency: "INR",
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
              "Product details were saved, but one or more images failed to upload. Use Retry in Step 5.",
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
              "Product details updated, but one or more staged images failed to upload. Retry in Step 5.",
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
      {/* Guided Stepper Progress Bar */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {STEP_LABELS.map((step) => {
            const complete =
              (step.id === 1 && Boolean(categoryId)) ||
              (step.id === 2 && (Boolean(subcategoryId) || (Boolean(categoryId) && varieties.length === 0))) ||
              (step.id === 3 && Boolean(activeFormOption)) ||
              (step.id === 4 && name.trim().length >= 3);
            return (
              <div
                key={step.id}
                className={`rounded-lg border px-2.5 py-2 text-xs ${
                  complete
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                    : "border-stone-200 bg-stone-50 text-stone-600"
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider opacity-75">
                  Step {step.id}
                </span>
                <span className="font-semibold">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Moderation Status Banner */}
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

        {!isVerifiedSeller && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
            Your seller account is currently unverified. You can save <strong>Draft</strong> listings now; complete{" "}
            <Link href="/seller/verification" className="font-semibold underline">
              Seller Verification
            </Link>{" "}
            to submit for marketplace review.
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

      {/* STEP 1 — SELECT STONE CATEGORY */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Step 1 of 6
          </p>
          <h2 className="text-lg font-semibold text-stone-900">Select Stone Category</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {categories.parents.map((cat) => {
              const active = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    active
                      ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600 text-stone-950 shadow-xs"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                  }`}
                >
                  <span className="block text-sm font-bold">{cat.name}</span>
                  <span className="block text-[11px] text-stone-500 mt-0.5">
                    {(categories.childrenByParent[cat.id] ?? []).length} varieties
                  </span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* STEP 2 — SELECT STONE VARIETY */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Step 2 of 6
              </p>
              <h2 className="text-lg font-semibold text-stone-900">
                Select Stone Variety {selectedParent ? `(${selectedParent.name})` : ""}
              </h2>
            </div>
            {varieties.length > 6 && (
              <input
                type="search"
                value={varietyFilter}
                onChange={(e) => setVarietyFilter(e.target.value)}
                placeholder="Filter varieties..."
                className="input-base sm:w-56 !py-1.5 !text-xs"
              />
            )}
          </div>
        </CardHeader>
        <CardBody>
          {!categoryId ? (
            <p className="text-sm text-stone-500">
              Select a stone category in Step 1 to see its varieties.
            </p>
          ) : varieties.length === 0 ? (
            <p className="text-sm text-stone-600">
              No sub-varieties configured for <strong>{selectedParent?.name}</strong>. Your product will be listed under <strong>{selectedParent?.name}</strong> directly.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {filteredVarieties.map((variety) => {
                const active = subcategoryId === variety.id;
                return (
                  <button
                    key={variety.id}
                    type="button"
                    onClick={() => handleSelectVariety(variety.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "border-amber-600 bg-amber-600 text-white shadow-xs"
                        : "border-stone-200 bg-stone-50/70 text-stone-800 hover:border-amber-400 hover:bg-white"
                    }`}
                  >
                    {variety.name}
                  </button>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* STEP 3 — SELECT PRODUCT FORM */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Step 3 of 6
          </p>
          <h2 className="text-lg font-semibold text-stone-900">Select Product Form</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Only product forms enabled by Admin for{" "}
            <strong>{selectedVariety?.name || selectedParent?.name || "this stone"}</strong> are shown.
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {visibleForms.map((form) => {
              const active = formSlug === form.slug;
              return (
                <button
                  key={form.slug}
                  type="button"
                  onClick={() => setFormSlug(form.slug as ProductFormType)}
                  className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    active
                      ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600 shadow-xs"
                      : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                >
                  <span className="block text-sm font-bold text-stone-900">{form.name}</span>
                  <span className="block text-[11px] text-stone-500 mt-1">
                    {form.description}
                  </span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* STEP 4 — PRODUCT INFORMATION & FORM-SPECIFIC SPECS */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Step 4 of 6
          </p>
          <h2 className="text-lg font-semibold text-stone-900">
            Product Information &amp; {activeFormOption?.name ?? "Form"} Specifications
          </h2>
        </CardHeader>
        <CardBody className="space-y-5">
          {/* Common Product Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="prod-name" className="label-base mb-1">
                Product Title <span className="text-red-500">*</span>
              </label>
              <input
                id="prod-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={`e.g. ${selectedVariety?.name || selectedParent?.name || "Agra Red"} ${activeFormOption?.name || "Slabs"}`}
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
                placeholder="e.g. AGR-SLB-20MM"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="prod-colour" className="label-base mb-1">
                Colour
              </label>
              <input
                id="prod-colour"
                list="stone-colour-list"
                type="text"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                placeholder="e.g. Red, Beige, White"
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
                placeholder="e.g. Natural Cleft, Honed, Polished"
                className="input-base"
              />
              <datalist id="stone-finish-list">
                {STONE_FINISH_SUGGESTIONS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="prod-surface-treatment" className="label-base mb-1">
                Surface Treatment
              </label>
              <input
                id="prod-surface-treatment"
                type="text"
                value={surfaceTreatment}
                onChange={(e) => setSurfaceTreatment(e.target.value)}
                placeholder="e.g. Epoxy Filled, Nano Sealed"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="prod-origin" className="label-base mb-1">
                Origin / Quarry Belt
              </label>
              <input
                id="prod-origin"
                type="text"
                value={stoneOrigin}
                onChange={(e) => setStoneOrigin(e.target.value)}
                placeholder="e.g. Agra / Dholpur / Makrana, Rajasthan"
                className="input-base"
              />
            </div>
          </div>

          {/* Conditional Form Fields */}
          {formSlug === "slabs" && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Slabs Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="prod-thickness" className="label-base mb-1">
                    Slab Thickness (mm)
                  </label>
                  <input
                    id="prod-thickness"
                    type="number"
                    step="0.01"
                    min="0"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    placeholder="e.g. 18, 20, 30"
                    className="input-base"
                  />
                </div>
                <div>
                  <label htmlFor="slab-dims" className="label-base mb-1">
                    Slab Dimensions
                  </label>
                  <input
                    id="slab-dims"
                    type="text"
                    value={slabDimensions}
                    onChange={(e) => setSlabDimensions(e.target.value)}
                    placeholder="e.g. 2400 x 1200 mm (8 x 4 ft)"
                    className="input-base"
                  />
                </div>
                <div>
                  <label htmlFor="surface-details" className="label-base mb-1">
                    Surface Details
                  </label>
                  <input
                    id="surface-details"
                    type="text"
                    value={surfaceDetails}
                    onChange={(e) => setSurfaceDetails(e.target.value)}
                    placeholder="e.g. Calibrated back, edges sawn"
                    className="input-base"
                  />
                </div>
              </div>
            </div>
          )}

          {formSlug === "tiles" && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Tiles Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="prod-length" className="label-base mb-1">
                    Tile Length (mm)
                  </label>
                  <input
                    id="prod-length"
                    type="number"
                    step="0.01"
                    min="0"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="e.g. 600"
                    className="input-base"
                  />
                </div>
                <div>
                  <label htmlFor="prod-width" className="label-base mb-1">
                    Tile Width (mm)
                  </label>
                  <input
                    id="prod-width"
                    type="number"
                    step="0.01"
                    min="0"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="e.g. 600"
                    className="input-base"
                  />
                </div>
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
                    placeholder="e.g. 20"
                    className="input-base"
                  />
                </div>
                <div>
                  <label htmlFor="pieces-per-box" className="label-base mb-1">
                    Pieces Per Box
                  </label>
                  <input
                    id="pieces-per-box"
                    type="number"
                    min="0"
                    value={piecesPerBox}
                    onChange={(e) => setPiecesPerBox(e.target.value)}
                    placeholder="e.g. 4"
                    className="input-base"
                  />
                </div>
              </div>
            </div>
          )}

          {formSlug === "blocks" && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Quarry Block Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="block-dims" className="label-base mb-1">
                    Block Dimensions
                  </label>
                  <input
                    id="block-dims"
                    type="text"
                    value={blockDimensions}
                    onChange={(e) => setBlockDimensions(e.target.value)}
                    placeholder="e.g. 300 x 180 x 160 cm"
                    className="input-base"
                  />
                </div>
                <div>
                  <label htmlFor="block-weight" className="label-base mb-1">
                    Approximate Weight
                  </label>
                  <input
                    id="block-weight"
                    type="text"
                    value={approximateWeight}
                    onChange={(e) => setApproximateWeight(e.target.value)}
                    placeholder="e.g. 24 - 28 Metric Tons"
                    className="input-base"
                  />
                </div>
                <div>
                  <label htmlFor="block-grade" className="label-base mb-1">
                    Block Grade
                  </label>
                  <input
                    id="block-grade"
                    type="text"
                    value={blockGrade}
                    onChange={(e) => setBlockGrade(e.target.value)}
                    placeholder="e.g. Export Gangsaw Grade A"
                    className="input-base"
                  />
                </div>
              </div>
            </div>
          )}

          {formSlug === "articles" && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Architectural Article Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="article-type" className="label-base mb-1">
                    Article Type
                  </label>
                  <input
                    id="article-type"
                    type="text"
                    value={articleType}
                    onChange={(e) => setArticleType(e.target.value)}
                    placeholder="e.g. Carved Jaali, Pillar, Fountain, Gazebo"
                    className="input-base"
                  />
                </div>
                <div>
                  <label htmlFor="article-dims" className="label-base mb-1">
                    Dimensions
                  </label>
                  <input
                    id="article-dims"
                    type="text"
                    value={articleDimensions}
                    onChange={(e) => setArticleDimensions(e.target.value)}
                    placeholder="e.g. 1200 x 900 x 50 mm"
                    className="input-base"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customizationAvailable}
                      onChange={(e) => setCustomizationAvailable(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-600"
                    />
                    Custom CAD / Bespoke Carving Available
                  </label>
                </div>
              </div>
              <div>
                <label htmlFor="carving-details" className="label-base mb-1">
                  Design / Carving Details
                </label>
                <input
                  id="carving-details"
                  type="text"
                  value={carvingDetails}
                  onChange={(e) => setCarvingDetails(e.target.value)}
                  placeholder="e.g. Hand-chiseled Rajasthani floral lattice work"
                  className="input-base"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="prod-desc" className="label-base mb-1">
              Product Description
            </label>
            <textarea
              id="prod-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe stone texture, applications, grading, and export/domestic supply readiness…"
              className="input-base"
            />
          </div>

          {/* Availability, Unit & MOQ (Public Prices Removed) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 border-t border-stone-100 pt-4">
            <div>
              <label htmlFor="prod-stock" className="label-base mb-1">
                Availability
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
                Available Quantity
              </label>
              <input
                id="prod-avail-qty"
                type="text"
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                placeholder="e.g. 15,000 sq. ft."
                className="input-base"
              />
            </div>
            <div>
              <label htmlFor="prod-unit" className="label-base mb-1">
                Supply Unit
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
            <div>
              <label htmlFor="prod-moq" className="label-base mb-1">
                MOQ ({UNIT_LABELS[unit]})
              </label>
              <input
                id="prod-moq"
                type="number"
                step="0.01"
                min="0"
                value={minimumOrderQuantity}
                onChange={(e) => setMinimumOrderQuantity(e.target.value)}
                placeholder="e.g. 500"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <div>
              <label htmlFor="prod-sizes" className="label-base mb-1">
                Additional Sizes / Notes
              </label>
              <input
                id="prod-sizes"
                type="text"
                value={availableSizes}
                onChange={(e) => setAvailableSizes(e.target.value)}
                placeholder="Custom cut-to-size options"
                className="input-base"
              />
            </div>
            <div>
              <label htmlFor="prod-packaging" className="label-base mb-1">
                Packaging Details
              </label>
              <input
                id="prod-packaging"
                type="text"
                value={packagingInfo}
                onChange={(e) => setPackagingInfo(e.target.value)}
                placeholder="Seaworthy wooden crates"
                className="input-base"
              />
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-600">
            <strong>Commercial Privacy:</strong> Public product prices are hidden on the marketplace. Buyers will click <em>Request a Quote</em> or <em>Get Best Price</em> and you send private pricing directly inside Quotations.
          </div>

          {/* Custom Specifications Builder */}
          <div className="space-y-2 border-t border-stone-100 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700">
                Extra Technical Properties (Optional)
              </span>
              <button
                type="button"
                onClick={addCustomSpec}
                className="btn-secondary !px-3 !py-1 !text-xs"
              >
                + Add Spec
              </button>
            </div>
            {customSpecs.map((spec, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={spec.name}
                  onChange={(e) => updateCustomSpec(idx, "name", e.target.value)}
                  placeholder="Property"
                  className="input-base sm:w-5/12"
                />
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => updateCustomSpec(idx, "value", e.target.value)}
                  placeholder="Value"
                  className="input-base sm:flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeCustomSpec(idx)}
                  className="rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* STEP 5 — MULTIPLE PRODUCT IMAGES */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Step 5 of 6
          </p>
          <h2 className="text-lg font-semibold text-stone-900">Product Images</h2>
          <p className="mt-1 text-xs text-stone-500">
            Upload main cover image and additional gallery angles. Reorder or set primary cover anytime.
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

      {/* STEP 6 — REVIEW, SEO & PUBLISH */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Step 6 of 6
          </p>
          <h2 className="text-lg font-semibold text-stone-900">Review, SEO &amp; Publish</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="block text-stone-500">Category</span>
              <strong className="text-stone-900">{selectedParent?.name || "—"}</strong>
            </div>
            <div>
              <span className="block text-stone-500">Variety</span>
              <strong className="text-stone-900">{selectedVariety?.name || "Direct"}</strong>
            </div>
            <div>
              <span className="block text-stone-500">Product Form</span>
              <strong className="text-stone-900">{activeFormOption?.name || "Slabs"}</strong>
            </div>
            <div>
              <span className="block text-stone-500">Commercial Mode</span>
              <strong className="text-amber-800">Request a Quote</strong>
            </div>
          </div>

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
                placeholder="agra-red-sandstone-slabs"
                className="input-base"
              />
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
              placeholder="Concise summary shown in search results…"
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
