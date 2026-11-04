"use client";

import React, { useActionState, useId, useState } from "react";
import Link from "next/link";
import { submitPublicRfq, type RfqActionResult } from "./public-rfq-actions";

export interface ProductEnquiryFormProps {
  productId: string;
  productSlug: string;
  productName: string;
  materialType?: string | null;
  finish?: string | null;
  thickness?: number | null;
  length?: number | null;
  width?: number | null;
  unit: string;
  moq?: number | null;
  supplierId?: string | null;
  supplierSlug?: string | null;
  supplierName: string;
  isShowcase: boolean;
  currentUser?: {
    id: string;
    email: string;
    name?: string | null;
    companyName?: string | null;
    phone?: string | null;
  } | null;
  className?: string;
}

const initialState: RfqActionResult = {
  success: false,
};

const COMMON_UNITS = [
  { value: "sq_ft", label: "Square Feet (sq.ft)" },
  { value: "sq_m", label: "Square Metres (sq.m)" },
  { value: "slab", label: "Gangsaw Slabs" },
  { value: "metric_ton", label: "Metric Tons (MT)" },
  { value: "ton", label: "Tons" },
  { value: "piece", label: "Cut Pieces / Tiles" },
  { value: "box", label: "Crated Boxes" },
  { value: "custom", label: "Custom Specification" },
];

const THICKNESS_OPTIONS = [
  "16mm",
  "18mm",
  "20mm",
  "25mm",
  "30mm",
  "40mm",
  "50mm",
  "Custom Specification",
];

const FINISH_OPTIONS = [
  "Mirror Polished",
  "Honed / Matte",
  "Flamed / Thermal",
  "Bush-Hammered",
  "Leather / Antique",
  "Natural Cleft",
  "Shot-Blasted",
  "Sandblasted",
  "Custom Finish",
];

export function ProductEnquiryForm({
  productId,
  productSlug,
  productName,
  materialType = "Marble",
  finish = "Polished",
  thickness,
  length,
  width,
  unit = "sq_ft",
  moq,
  supplierId = null,
  supplierSlug = null,
  supplierName,
  isShowcase,
  currentUser = null,
  className = "",
}: ProductEnquiryFormProps) {
  const clientRequestId = useId();
  const [state, formAction, isPending] = useActionState(submitPublicRfq, initialState);
  const [activeTab, setActiveTab] = useState<"standard" | "custom">("standard");

  const initialThickness = thickness ? `${thickness}mm` : "18mm";
  const initialDimensions = length && width ? `${length} × ${width} mm` : "";

  if (state.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8 text-center shadow-xs space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <span className="inline-block rounded-full bg-emerald-200/70 px-3 py-0.5 text-xs font-bold text-emerald-800 uppercase tracking-wider font-mono">
            {state.referenceNumber || "RFQ REGISTERED"}
          </span>
          <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Quotation Request Transmitted
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            Your requirement for{" "}
            <span className="font-semibold text-stone-900">{productName}</span> has been successfully logged.
          </p>
        </div>

        {/* Broadcast vs Direct Supplier Explanation */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 text-left text-xs text-stone-600 space-y-2">
          {isShowcase ? (
            <p className="leading-relaxed">
              <strong className="text-stone-900 font-semibold">Editorial Showcase Protocol:</strong> Because this is an authentic quarry benchmark profile, your RFQ has been broadcast across our verified network of certified Indian stone fabricators and quarry processors matching this geological specification.
            </p>
          ) : (
            <p className="leading-relaxed">
              <strong className="text-stone-900 font-semibold">Direct Factory RFQ:</strong> Your RFQ has been transmitted directly to{" "}
              <strong className="text-stone-900">{supplierName}</strong> for commercial pricing and batch inspection photos.
            </p>
          )}
          <p className="text-[11px] text-stone-500">
            Reference: <span className="font-mono font-bold text-stone-800">{state.referenceNumber}</span> • Official StoneB2B Procurement Request
          </p>
        </div>

        {/* Actions for Guest vs Registered Buyer */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {state.isGuest ? (
            <Link
              href={`/register?next=/buyer/rfqs&email=${encodeURIComponent(currentUser?.email || "")}`}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-800"
            >
              Create Free Buyer Account to Compare Bids →
            </Link>
          ) : (
            <Link
              href="/buyer/rfqs"
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-stone-800"
            >
              View Active RFQ in Buyer Portal →
            </Link>
          )}

          <Link
            href={`/request-quote?product=${encodeURIComponent(productSlug)}&supplier=${encodeURIComponent(supplierSlug || "")}`}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Attach Separate BOQ Document
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab("standard")}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
            activeTab === "standard"
              ? "bg-amber-100/80 text-amber-900 shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          Fast Factory Quotation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("custom")}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
            activeTab === "custom"
              ? "bg-amber-100/80 text-amber-900 shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          Custom Cut-to-Size & Specifications
        </button>
      </div>

      {/* Trust & Transparency Banner */}
      <div
        className={`mb-5 rounded-xl border p-3.5 text-xs leading-relaxed ${
          isShowcase
            ? "border-amber-200/90 bg-amber-50/70 text-amber-900"
            : "border-emerald-200/90 bg-emerald-50/60 text-emerald-950"
        }`}
      >
        <div className="flex items-start gap-2">
          <svg className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            {isShowcase ? (
              <span>
                <strong className="font-semibold">Editorial Showcase Stone:</strong> Sourced from authentic quarry specifications. Your request will be transmitted as an open platform RFQ broadcast to certified Indian stone processors matching this exact material.
              </span>
            ) : (
              <span>
                <strong className="font-semibold">Factory Direct:</strong> Transmitted directly to verified processor <strong className="underline">{supplierName}</strong>. Zero broker markups.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form action={formAction} className="space-y-4">
        {/* Hidden Context Fields */}
        <input type="hidden" name="client_request_id" value={clientRequestId} />
        <input type="hidden" name="hp_project_url" value="" />
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="supplier_slug" value={supplierSlug || ""} />
        <input type="hidden" name="supplier_id" value={supplierId || ""} />
        <input type="hidden" name="material_type" value={materialType || "Marble"} />
        <input type="hidden" name="stone_variety" value={productName} />

        {/* Global Error Banner */}
        {state.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start gap-2">
            <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Submission Incomplete</p>
              <p>{state.error}</p>
            </div>
          </div>
        )}

        {/* Row 1: Quantity & Unit */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="rfq_quantity" className="block text-xs font-semibold text-stone-800 mb-1">
              Quantity Required *
            </label>
            <input
              id="rfq_quantity"
              name="quantity"
              type="number"
              min="1"
              step="any"
              required
              defaultValue={moq || 500}
              placeholder="e.g. 1000"
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 shadow-xs placeholder-stone-400 focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
            />
            {state.fieldErrors?.quantity && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.quantity}</p>
            )}
          </div>

          <div>
            <label htmlFor="rfq_unit" className="block text-xs font-semibold text-stone-800 mb-1">
              Unit of Measure
            </label>
            <select
              id="rfq_unit"
              name="unit"
              defaultValue={unit || "sq_ft"}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-xs focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Specifications Fields (Always visible or highlighted in Custom tab) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="rfq_thickness" className="block text-xs font-semibold text-stone-800 mb-1">
              Thickness
            </label>
            <select
              id="rfq_thickness"
              name="thickness"
              defaultValue={initialThickness}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 shadow-xs focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
            >
              {THICKNESS_OPTIONS.map((th) => (
                <option key={th} value={th}>
                  {th}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rfq_finish" className="block text-xs font-semibold text-stone-800 mb-1">
              Surface Finish
            </label>
            <select
              id="rfq_finish"
              name="finish"
              defaultValue={finish || "Mirror Polished"}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 shadow-xs focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
            >
              {FINISH_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rfq_dimensions" className="block text-xs font-semibold text-stone-800 mb-1">
              Slab / Tile Dimensions
            </label>
            <input
              id="rfq_dimensions"
              name="dimensions"
              type="text"
              defaultValue={initialDimensions}
              placeholder="e.g. 2800 × 1600 mm or Gangsaw"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 shadow-xs placeholder-stone-400 focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
            />
          </div>
        </div>

        {/* Row 3: Delivery Location & Timeline */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="rfq_delivery" className="block text-xs font-semibold text-stone-800 mb-1">
              Project Delivery City / Sea Port *
            </label>
            <input
              id="rfq_delivery"
              name="delivery_location"
              type="text"
              required
              placeholder="e.g. Mumbai, Mundra Port, or Dubai"
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 shadow-xs placeholder-stone-400 focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
            />
            {state.fieldErrors?.deliveryLocation && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.deliveryLocation}</p>
            )}
          </div>

          <div>
            <label htmlFor="rfq_date" className="block text-xs font-semibold text-stone-800 mb-1">
              Required Delivery Date (Optional)
            </label>
            <input
              id="rfq_date"
              name="required_delivery_date"
              type="date"
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 shadow-xs focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
            />
          </div>
        </div>

        {/* Project Notes & Technical Specifications */}
        <div>
          <label htmlFor="rfq_notes" className="block text-xs font-semibold text-stone-800 mb-1">
            Project Notes &amp; Edge Profile Requirements *
          </label>
          <textarea
            id="rfq_notes"
            name="project_notes"
            rows={3}
            required
            defaultValue={`Commercial quotation request for ${productName}. Please quote FOB / Ex-factory rates with crate packing.`}
            placeholder="Specify edge profiling (bullnose/chamfer), tolerance requirements, dry-lay inspection, or packaging standards..."
            className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs sm:text-sm text-stone-900 shadow-xs placeholder-stone-400 focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
          />
          {state.fieldErrors?.projectNotes && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.projectNotes}</p>
          )}
        </div>

        {/* Contact Information (Guest or Authenticated) */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Procurement Contact
            </span>
            {currentUser ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                Signed in as Buyer
              </span>
            ) : (
              <span className="text-[11px] text-stone-500">
                Direct Guest Submission (No Login Required)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="rfq_name" className="block text-xs font-medium text-stone-700 mb-1">
                Your Full Name *
              </label>
              <input
                id="rfq_name"
                name="name"
                type="text"
                required
                defaultValue={currentUser?.name || ""}
                placeholder="e.g. Rajesh Sharma"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-stone-900 shadow-xs focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
              />
              {state.fieldErrors?.name && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="rfq_company" className="block text-xs font-medium text-stone-700 mb-1">
                Company / Architectural Firm
              </label>
              <input
                id="rfq_company"
                name="company_name"
                type="text"
                defaultValue={currentUser?.companyName || ""}
                placeholder="e.g. Studio Vista Architecture"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-stone-900 shadow-xs focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
              />
            </div>

            <div>
              <label htmlFor="rfq_email" className="block text-xs font-medium text-stone-700 mb-1">
                Business Email *
              </label>
              <input
                id="rfq_email"
                name="email"
                type="email"
                required
                defaultValue={currentUser?.email || ""}
                placeholder="procurement@company.com"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-stone-900 shadow-xs focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
              />
              {state.fieldErrors?.email && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="rfq_phone" className="block text-xs font-medium text-stone-700 mb-1">
                Phone Number (with Country Code) *
              </label>
              <input
                id="rfq_phone"
                name="phone"
                type="tel"
                required
                defaultValue={currentUser?.phone || ""}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-stone-900 shadow-xs focus:border-amber-600 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
              />
              {state.fieldErrors?.phone && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full inline-flex items-center justify-center rounded-xl bg-amber-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-amber-800 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Submitting Quotation Request...</span>
              </span>
            ) : (
              <span>
                {isShowcase
                  ? "Broadcast RFQ to Certified Stone Processors"
                  : `Request Factory Quote from ${supplierName}`}
              </span>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-stone-500">
            Transparent Pricing • Direct Indian Quarry Concessions • ISPM-15 Export Crating
          </p>
        </div>
      </form>
    </div>
  );
}
