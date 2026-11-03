"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, CardBody, CardHeader, VerifiedBadge } from "@stone/ui";
import { slugify } from "@stone/utils";
import type { BusinessType } from "@stone/types";
import { BrandMediaUploader } from "@/components/seller/brand-media-uploader";
import { saveStoreSettingsAction } from "@/features/seller/actions";
import {
  BUSINESS_TYPE_LABELS,
  COUNTRY_OPTIONS,
  decodeSellerDescription,
} from "@/features/seller/seller-meta";
import type { SellerProfileRow } from "@/features/seller/queries";

export interface StoreSettingsFormProps {
  seller: SellerProfileRow & {
    resolvedLogoUrl: string | null;
    resolvedCoverUrl: string | null;
  };
  categoryNames: string[];
}

export function StoreSettingsForm({ seller, categoryNames }: StoreSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const decoded = decodeSellerDescription(seller.description);

  const [logoPreview, setLogoPreview] = useState<string | null>(seller.resolvedLogoUrl);
  const [coverPreview, setCoverPreview] = useState<string | null>(seller.resolvedCoverUrl);

  const [businessName, setBusinessName] = useState(seller.business_name);
  const [slug, setSlug] = useState(seller.slug);
  const [businessType, setBusinessType] = useState<BusinessType>(seller.business_type);
  const [description, setDescription] = useState(decoded.cleanDescription);
  const [city, setCity] = useState(seller.city ?? "");
  const [stateName, setStateName] = useState(seller.state ?? "");
  const [country, setCountry] = useState(seller.country ?? "IN");
  const [website, setWebsite] = useState(seller.website ?? "");
  const [yearsInBusiness, setYearsInBusiness] = useState(
    seller.years_in_business !== null ? String(seller.years_in_business) : "",
  );
  const [hasManufacturing, setHasManufacturing] = useState(decoded.hasManufacturing);
  const [hasQuarry, setHasQuarry] = useState(decoded.hasQuarry);
  const [hasExport, setHasExport] = useState(decoded.hasExport);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    decoded.productCategories,
  );
  const [showWebsitePublicly, setShowWebsitePublicly] = useState(
    decoded.showWebsitePublicly,
  );
  const [acceptBulkExportEnquiries, setAcceptBulkExportEnquiries] = useState(
    decoded.acceptBulkExportEnquiries,
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isVerified = seller.verification_status === "verified";
  const isSuspended = seller.verification_status === "suspended";

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await saveStoreSettingsAction({
        businessName,
        slug,
        businessType,
        description,
        city,
        state: stateName,
        country,
        website,
        yearsInBusiness,
        hasManufacturing,
        hasQuarry,
        hasExport,
        productCategories: selectedCategories,
        showWebsitePublicly,
        acceptBulkExportEnquiries,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Failed to save storefront settings.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }

      setSlug(res.data.slug);
      setSuccessMessage("Storefront branding and public settings updated.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Live Storefront Hero Preview */}
      <Card className="overflow-hidden">
        <div className="relative h-36 w-full bg-stone-800 sm:h-48">
          {coverPreview ? (
            <Image
              src={coverPreview}
              alt={`${businessName} storefront cover`}
              fill
              sizes="(max-width: 1280px) 100vw, 1024px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-xs font-medium text-stone-300">
              Upload a wide 16:9 quarry or processing plant cover banner below
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-stone-950/20 to-transparent" />
        </div>

        <CardBody className="relative pt-0">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-stone-100 text-xl font-bold text-stone-700 shadow-md">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt={`${businessName} logo`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <span>{(businessName || "S").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-stone-900">{businessName}</h2>
                  {isVerified ? (
                    <VerifiedBadge label="Verified Storefront" />
                  ) : (
                    <Badge variant="warning">Hidden Until Verified</Badge>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  {BUSINESS_TYPE_LABELS[businessType]} •{" "}
                  {[city, stateName, country].filter(Boolean).join(", ") || "Location unset"}
                </p>
              </div>
            </div>

            {isVerified ? (
              <Link
                href={`/suppliers/${slug}`}
                className="btn-secondary !py-2 !text-xs self-start sm:self-auto"
              >
                Open Public Storefront ↗
              </Link>
            ) : (
              <Link
                href="/seller/verification"
                className="btn-accent !py-2 !text-xs self-start sm:self-auto"
              >
                Complete Verification to Publish Store →
              </Link>
            )}
          </div>
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

      {/* Store Branding */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-base font-semibold text-stone-900">Store Logo &amp; Cover Image</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BrandMediaUploader
            kind="logo"
            currentUrl={seller.resolvedLogoUrl}
            disabled={isSuspended}
            onUploaded={(url) => setLogoPreview(url)}
          />
          <BrandMediaUploader
            kind="cover"
            currentUrl={seller.resolvedCoverUrl}
            disabled={isSuspended}
            onUploaded={(url) => setCoverPreview(url)}
          />
        </CardBody>
      </Card>

      {/* Public Business Details & Location */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-base font-semibold text-stone-900">
            Storefront Details &amp; Public Location
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="st-name" className="label-base mb-1">
                Display Business Name
              </label>
              <input
                id="st-name"
                type="text"
                required
                disabled={isSuspended}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="input-base"
              />
              {isVerified && businessName !== seller.business_name && (
                <p className="mt-1 text-[11px] text-amber-700">
                  Note: Changing legal business name on a verified account triggers compliance
                  re-verification.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="st-slug" className="label-base mb-1">
                Public Storefront URL Slug
              </label>
              <div className="flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-stone-500 focus-within:ring-1 focus-within:ring-stone-500">
                <span className="pl-3 text-xs text-stone-400">/suppliers/</span>
                <input
                  id="st-slug"
                  type="text"
                  required
                  disabled={isSuspended}
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full rounded-r-lg border-0 bg-transparent px-2 py-2.5 text-sm text-stone-900 focus:outline-none"
                />
              </div>
              {fieldErrors.slug && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.slug}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="st-type" className="label-base mb-1">
                Supplier Type
              </label>
              <select
                id="st-type"
                disabled={isSuspended}
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="input-base"
              >
                {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map((bt) => (
                  <option key={bt} value={bt}>
                    {BUSINESS_TYPE_LABELS[bt]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="st-city" className="label-base mb-1">
                Public City / Stone Belt
              </label>
              <input
                id="st-city"
                type="text"
                disabled={isSuspended}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="st-state" className="label-base mb-1">
                Public State
              </label>
              <input
                id="st-state"
                type="text"
                disabled={isSuspended}
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="st-country" className="label-base mb-1">
                Country
              </label>
              <select
                id="st-country"
                disabled={isSuspended}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input-base"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="st-desc" className="label-base mb-1">
              Storefront About &amp; Story
            </label>
            <textarea
              id="st-desc"
              rows={4}
              disabled={isSuspended}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Introduce your quarry heritage, processing machinery, quality inspection standards, and architectural project portfolio…"
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
            <label className="flex items-center gap-2.5 rounded-lg border border-stone-200 p-3 text-xs font-medium text-stone-800">
              <input
                type="checkbox"
                checked={hasManufacturing}
                disabled={isSuspended}
                onChange={(e) => setHasManufacturing(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-amber-600"
              />
              In-House Manufacturing Unit
            </label>
            <label className="flex items-center gap-2.5 rounded-lg border border-stone-200 p-3 text-xs font-medium text-stone-800">
              <input
                type="checkbox"
                checked={hasQuarry}
                disabled={isSuspended}
                onChange={(e) => setHasQuarry(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-amber-600"
              />
              Direct Quarry Ownership
            </label>
            <label className="flex items-center gap-2.5 rounded-lg border border-stone-200 p-3 text-xs font-medium text-stone-800">
              <input
                type="checkbox"
                checked={hasExport}
                disabled={isSuspended}
                onChange={(e) => setHasExport(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-amber-600"
              />
              Export &amp; Container Loading
            </label>
          </div>

          <div>
            <p className="label-base mb-2 !text-xs">Featured Stone Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {categoryNames.map((cat) => {
                const selected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={isSuspended}
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-stone-900 text-white"
                        : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    {selected ? `✓ ${cat}` : cat}
                  </button>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Public Contact Preferences */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-base font-semibold text-stone-900">Public Contact Preferences</h2>
          <p className="text-xs text-stone-500">
            StonesDekho protects your private phone, email, and GSTIN from public scraping;
            authenticated buyers contact you via structured RFQs.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="st-website" className="label-base mb-1">
                Public Website URL
              </label>
              <input
                id="st-website"
                type="text"
                disabled={isSuspended || !showWebsitePublicly}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="st-years" className="label-base mb-1">
                Years in Business Badge
              </label>
              <input
                id="st-years"
                type="number"
                min="0"
                max="300"
                disabled={isSuspended}
                value={yearsInBusiness}
                onChange={(e) => setYearsInBusiness(e.target.value)}
                placeholder="e.g. 20"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 hover:bg-stone-50">
              <input
                type="checkbox"
                checked={showWebsitePublicly}
                disabled={isSuspended}
                onChange={(e) => setShowWebsitePublicly(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600"
              />
              <div>
                <span className="block text-sm font-semibold text-stone-900">
                  Display Website Link on Storefront
                </span>
                <span className="text-xs text-stone-500">
                  Show your official corporate website link on `/suppliers/{slug}`
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 hover:bg-stone-50">
              <input
                type="checkbox"
                checked={acceptBulkExportEnquiries}
                disabled={isSuspended}
                onChange={(e) => setAcceptBulkExportEnquiries(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600"
              />
              <div>
                <span className="block text-sm font-semibold text-stone-900">
                  Accept International &amp; Bulk Container RFQs
                </span>
                <span className="text-xs text-stone-500">
                  Highlight openness to overseas export &amp; project-scale enquiries
                </span>
              </div>
            </label>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || isSuspended}
          className="btn-primary"
        >
          {isPending ? "Saving Store Settings…" : "Save Storefront Settings"}
        </button>
      </div>
    </form>
  );
}

