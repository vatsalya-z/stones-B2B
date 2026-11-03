"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, CardBody, CardHeader } from "@stone/ui";
import type { BusinessType, VerificationStatus } from "@stone/types";
import { BrandMediaUploader } from "@/components/seller/brand-media-uploader";
import { saveSellerProfileAction } from "@/features/seller/actions";
import {
  BUSINESS_TYPE_LABELS,
  COUNTRY_OPTIONS,
  decodeSellerDescription,
} from "@/features/seller/seller-meta";
import type { SellerProfileRow } from "@/features/seller/queries";

export interface SellerProfileFormProps {
  initialSeller:
    | (SellerProfileRow & {
        resolvedLogoUrl: string | null;
        resolvedCoverUrl: string | null;
      })
    | null;
  defaultOwnerName: string | null;
  defaultEmail: string | null;
  defaultPhone: string | null;
  categoryNames: string[];
}

export function SellerProfileForm({
  initialSeller,
  defaultOwnerName,
  defaultEmail,
  defaultPhone,
  categoryNames,
}: SellerProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const decoded = decodeSellerDescription(initialSeller?.description);

  const [hasSavedSellerRow, setHasSavedSellerRow] = useState(Boolean(initialSeller?.id));
  const [businessName, setBusinessName] = useState(initialSeller?.business_name ?? "");
  const [ownerName, setOwnerName] = useState(
    initialSeller?.owner_name ?? defaultOwnerName ?? "",
  );
  const [businessType, setBusinessType] = useState<BusinessType>(
    initialSeller?.business_type ?? "manufacturer",
  );
  const [description, setDescription] = useState(decoded.cleanDescription);
  const [businessEmail, setBusinessEmail] = useState(
    initialSeller?.business_email ?? defaultEmail ?? "",
  );
  const [phone, setPhone] = useState(initialSeller?.phone ?? defaultPhone ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    initialSeller?.whatsapp_number ?? "",
  );
  const [gstNumber, setGstNumber] = useState(initialSeller?.gst_number ?? "");
  const [website, setWebsite] = useState(initialSeller?.website ?? "");
  const [businessAddress, setBusinessAddress] = useState(
    initialSeller?.business_address ?? "",
  );
  const [city, setCity] = useState(initialSeller?.city ?? "");
  const [stateName, setStateName] = useState(initialSeller?.state ?? "");
  const [country, setCountry] = useState(initialSeller?.country ?? "IN");
  const [pincode, setPincode] = useState(initialSeller?.pincode ?? "");
  const [yearsInBusiness, setYearsInBusiness] = useState(
    initialSeller?.years_in_business !== null &&
      initialSeller?.years_in_business !== undefined
      ? String(initialSeller.years_in_business)
      : "",
  );
  const [hasManufacturing, setHasManufacturing] = useState(decoded.hasManufacturing);
  const [hasQuarry, setHasQuarry] = useState(decoded.hasQuarry);
  const [hasExport, setHasExport] = useState(decoded.hasExport);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    decoded.productCategories,
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const verificationStatus: VerificationStatus =
    initialSeller?.verification_status ?? "draft";
  const isSuspended = verificationStatus === "suspended";

  const isProfileComplete = Boolean(
    businessName.trim().length >= 2 &&
      businessEmail.trim() &&
      phone.trim() &&
      gstNumber.trim() &&
      businessAddress.trim() &&
      city.trim() &&
      stateName.trim() &&
      pincode.trim(),
  );

  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName],
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await saveSellerProfileAction({
        businessName,
        ownerName,
        businessType,
        description,
        businessEmail,
        phone,
        whatsappNumber,
        gstNumber,
        website,
        businessAddress,
        city,
        state: stateName,
        country,
        pincode,
        yearsInBusiness,
        hasManufacturing,
        hasQuarry,
        hasExport,
        productCategories: selectedCategories,
        showWebsitePublicly: decoded.showWebsitePublicly,
        acceptBulkExportEnquiries: decoded.acceptBulkExportEnquiries,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Failed to save seller profile.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }

      setHasSavedSellerRow(true);
      setSuccessMessage(
        res.data.verificationReset
          ? "Profile saved. Because Business Name or GSTIN changed, your verification status was moved back to Submitted for compliance re-check."
          : isProfileComplete
            ? "Completed seller business profile saved."
            : "Draft seller profile saved. Complete all required verification fields when ready.",
      );
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Profile Completion Status Strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-semibold text-stone-900">Onboarding State:</span>
          {isProfileComplete ? (
            <Badge variant="success">Profile Complete (Verification-Ready)</Badge>
          ) : (
            <Badge variant="warning">Draft Profile (Partial)</Badge>
          )}
        </div>
        <Link
          href="/seller/verification"
          className="text-xs font-semibold text-amber-700 hover:underline"
        >
          Proceed to Seller Verification →
        </Link>
      </div>

      {verificationStatus === "verified" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>Compliance Notice:</strong> Your account is a{" "}
          <strong>Verified Supplier</strong>. Updating non-identity details (description,
          capabilities, phone, website, logo, cover) preserves your Verified badge. Changing
          your legal <strong>Business Name</strong> or <strong>GSTIN</strong> automatically
          re-triggers admin verification review.
        </div>
      )}

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

      {/* 1. Brand Media (Logo & Cover) */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-lg font-semibold text-stone-900">Brand Identity &amp; Imagery</h2>
          <p className="text-xs text-stone-500">
            Displayed on your public supplier storefront once verified.
          </p>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BrandMediaUploader
            kind="logo"
            currentUrl={initialSeller?.resolvedLogoUrl ?? null}
            disabled={!hasSavedSellerRow || isSuspended}
            disabledReason="Save your business name below once to unlock logo & cover uploads."
          />
          <BrandMediaUploader
            kind="cover"
            currentUrl={initialSeller?.resolvedCoverUrl ?? null}
            disabled={!hasSavedSellerRow || isSuspended}
            disabledReason="Save your business name below once to unlock logo & cover uploads."
          />
        </CardBody>
      </Card>

      {/* 2. Company & Operational Overview */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-lg font-semibold text-stone-900">Company Overview</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sp-business-name" className="label-base mb-1">
                Legal / Trade Business Name <span className="text-red-500">*</span>
              </label>
              <input
                id="sp-business-name"
                type="text"
                required
                disabled={isSuspended}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Aravalli Natural Stones Pvt. Ltd."
                className="input-base"
              />
              {fieldErrors.businessName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.businessName}</p>
              )}
            </div>

            <div>
              <label htmlFor="sp-business-type" className="label-base mb-1">
                Business Classification <span className="text-red-500">*</span>
              </label>
              <select
                id="sp-business-type"
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="sp-owner-name" className="label-base mb-1">
                Owner / Authorised Director Name
              </label>
              <input
                id="sp-owner-name"
                type="text"
                disabled={isSuspended}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Rajeshwari Rathore"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="sp-years" className="label-base mb-1">
                Years in Business
              </label>
              <input
                id="sp-years"
                type="number"
                min="0"
                max="300"
                disabled={isSuspended}
                value={yearsInBusiness}
                onChange={(e) => setYearsInBusiness(e.target.value)}
                placeholder="e.g. 18"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="sp-website" className="label-base mb-1">
                Company Website
              </label>
              <input
                id="sp-website"
                type="text"
                disabled={isSuspended}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourstonecompany.com"
                className="input-base"
              />
              {fieldErrors.website && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.website}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="sp-description" className="label-base mb-1">
              Business Description &amp; Infrastructure
            </label>
            <textarea
              id="sp-description"
              rows={4}
              disabled={isSuspended}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail your gangsaw/multi-wire processing lines, quarry reserves, monthly slab capacity, and export markets…"
              className="input-base"
            />
          </div>
        </CardBody>
      </Card>

      {/* 3. Industrial Capabilities & Product Categories */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Capabilities &amp; Stone Specialisation
          </h2>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 hover:bg-stone-50">
              <input
                type="checkbox"
                checked={hasManufacturing}
                disabled={isSuspended}
                onChange={(e) => setHasManufacturing(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="block text-sm font-semibold text-stone-900">
                  Manufacturing Capability
                </span>
                <span className="text-xs text-stone-500">
                  In-house cutting, polishing, calibration &amp; CNC processing
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 hover:bg-stone-50">
              <input
                type="checkbox"
                checked={hasQuarry}
                disabled={isSuspended}
                onChange={(e) => setHasQuarry(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="block text-sm font-semibold text-stone-900">
                  Mine / Quarry Ownership
                </span>
                <span className="text-xs text-stone-500">
                  Direct mining lease or quarry block extraction rights
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 hover:bg-stone-50">
              <input
                type="checkbox"
                checked={hasExport}
                disabled={isSuspended}
                onChange={(e) => setHasExport(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="block text-sm font-semibold text-stone-900">
                  Export Capability
                </span>
                <span className="text-xs text-stone-500">
                  IEC-enabled container stuffing, fumigation &amp; port dispatch
                </span>
              </div>
            </label>
          </div>

          <div>
            <p className="label-base mb-2">Primary Stone Categories Supplied</p>
            <div className="flex flex-wrap gap-2">
              {categoryNames.map((cat) => {
                const active = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={isSuspended}
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-stone-900 text-white"
                        : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    {active ? `✓ ${cat}` : cat}
                  </button>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 4. Private Compliance, Tax & Contact Details */}
      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Compliance, Tax &amp; Facility Contact
              </h2>
              <p className="text-xs text-stone-500">
                Required to submit your account for Verified Supplier status.
              </p>
            </div>
            <Badge variant="outline">🔒 Private — Never Exposed Publicly</Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="sp-email" className="label-base mb-1">
                Business Email <span className="text-amber-600">*</span>
              </label>
              <input
                id="sp-email"
                type="email"
                disabled={isSuspended}
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="sales@company.com"
                className="input-base"
              />
              {fieldErrors.businessEmail && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.businessEmail}</p>
              )}
            </div>

            <div>
              <label htmlFor="sp-phone" className="label-base mb-1">
                Primary Phone <span className="text-amber-600">*</span>
              </label>
              <input
                id="sp-phone"
                type="tel"
                disabled={isSuspended}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98290 00000"
                className="input-base"
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="sp-whatsapp" className="label-base mb-1">
                WhatsApp Trade Number
              </label>
              <input
                id="sp-whatsapp"
                type="tel"
                disabled={isSuspended}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98290 00000"
                className="input-base"
              />
              {fieldErrors.whatsappNumber && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.whatsappNumber}</p>
              )}
            </div>

            <div>
              <label htmlFor="sp-gst" className="label-base mb-1">
                GST Number (GSTIN) <span className="text-amber-600">*</span>
              </label>
              <input
                id="sp-gst"
                type="text"
                maxLength={15}
                disabled={isSuspended}
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="08AABCU9603R1ZM"
                className="input-base uppercase"
              />
              {fieldErrors.gstNumber && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.gstNumber}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="sp-address" className="label-base mb-1">
              Factory / Registered Business Address <span className="text-amber-600">*</span>
            </label>
            <input
              id="sp-address"
              type="text"
              disabled={isSuspended}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="Plot G-42, RIICO Industrial Area, Madanganj"
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="sp-city" className="label-base mb-1">
                City / Stone Hub <span className="text-amber-600">*</span>
              </label>
              <input
                id="sp-city"
                type="text"
                disabled={isSuspended}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kishangarh"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="sp-state" className="label-base mb-1">
                State / Province <span className="text-amber-600">*</span>
              </label>
              <input
                id="sp-state"
                type="text"
                disabled={isSuspended}
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="e.g. Rajasthan"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="sp-country" className="label-base mb-1">
                Country
              </label>
              <select
                id="sp-country"
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

            <div>
              <label htmlFor="sp-pincode" className="label-base mb-1">
                PIN / Postal Code <span className="text-amber-600">*</span>
              </label>
              <input
                id="sp-pincode"
                type="text"
                disabled={isSuspended}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="305801"
                className="input-base"
              />
              {fieldErrors.pincode && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.pincode}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-stone-500">
            Fields marked with <span className="font-semibold text-amber-700">*</span> can be
            left blank while saving a Draft profile, and are required before submitting Seller
            Verification. Only City, State, and Country appear publicly.
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isPending || isSuspended}
          className="btn-primary"
        >
          {isPending
            ? "Saving Profile…"
            : isProfileComplete
              ? "Save Completed Profile"
              : "Save Draft Profile"}
        </button>
      </div>
    </form>
  );
}

