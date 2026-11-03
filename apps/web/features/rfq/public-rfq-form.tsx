"use client";

import React, { useActionState, useId } from "react";
import Link from "next/link";
import { submitPublicRfq, type RfqActionResult } from "./public-rfq-actions";

export interface PublicRfqFormProps {
  supplier?: {
    id: string;
    name: string;
    slug: string;
    location: string;
  } | null;
  initialUserName?: string | null;
  initialUserEmail?: string | null;
  prefilledMaterial?: string | null;
  prefilledProduct?: string | null;
}

const initialState: RfqActionResult = {
  success: false,
};

const STONE_MATERIALS = [
  "Marble",
  "Granite",
  "Sandstone",
  "Limestone",
  "Quartzite",
  "Slate",
  "Onyx",
  "Travertine",
  "Other Natural Stone",
];

const THICKNESS_OPTIONS = ["16mm", "18mm", "20mm", "30mm", "40mm", "Custom Specification"];

const FINISH_OPTIONS = [
  "Mirror Polished",
  "Honed / Matte",
  "Flamed / Thermal",
  "Bush-Hammered",
  "Leather / Antique",
  "Natural Cleft",
  "Shot-Blasted",
  "Sandblasted",
];

export function PublicRfqForm({
  supplier = null,
  initialUserName = "",
  initialUserEmail = "",
  prefilledMaterial = "",
  prefilledProduct = "",
}: PublicRfqFormProps) {
  const clientRequestId = useId();
  const [state, formAction, isPending] = useActionState(submitPublicRfq, initialState);

  if (state.success) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 sm:p-12 text-center shadow-sm space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Request for Quotation Submitted
          </h2>
          <p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
            Your architectural stone RFQ has been logged with reference number{" "}
            <span className="font-mono font-bold text-stone-900">{state.referenceNumber}</span>
            {supplier ? (
              <>
                {" "}and transmitted directly to{" "}
                <span className="font-semibold text-stone-900">{supplier.name}</span>.
              </>
            ) : (
              <> and queued for platform factory dispatch.</>
            )}
          </p>
        </div>

        {state.isGuest && (
          <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-left space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Track Incoming Factory Quotations
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Register as a verified Stone Buyer to compare pricing side-by-side, request lab test reports, and view fumigated crate packing photos before dispatch.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 hover:underline"
              >
                Create Buyer Account to Compare Quotes →
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {supplier ? (
            <Link
              href={`/suppliers/${supplier.slug}`}
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
            >
              Back to {supplier.name} Storefront
            </Link>
          ) : (
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
            >
              Explore Stone Catalogue
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 shadow-xs hover:bg-stone-50"
          >
            Marketplace Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-10 shadow-sm space-y-8">
      {/* Hidden Fields */}
      <input type="hidden" name="supplier_slug" value={supplier?.slug ?? ""} />
      <input type="hidden" name="supplier_id" value={supplier?.id ?? ""} />
      <input type="hidden" name="client_request_id" value={clientRequestId} />
      <div className="hidden" aria-hidden="true">
        <input type="text" name="hp_project_url" tabIndex={-1} autoComplete="off" />
      </div>

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {state.error}
        </div>
      )}

      {/* Target Supplier Context Banner */}
      {supplier && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-sm font-bold text-white shadow-xs">
              S
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Direct Sourcing RFQ
              </p>
              <p className="text-sm font-bold text-stone-900">{supplier.name}</p>
              <p className="text-xs text-stone-500">{supplier.location}</p>
            </div>
          </div>
          <Link
            href={`/suppliers/${supplier.slug}`}
            className="text-xs font-medium text-amber-700 hover:underline"
          >
            View Storefront ↗
          </Link>
        </div>
      )}

      {/* Section 1: Stone Specifications */}
      <div className="space-y-4">
        <div className="border-b border-stone-200 pb-2">
          <h3 className="text-base font-bold text-stone-900">1. Stone & Quantity Specifications</h3>
          <p className="text-xs text-stone-500">Provide exact architectural BOQ requirements</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Stone Material Category *
            </label>
            <select
              name="material_type"
              defaultValue={prefilledMaterial || "Marble"}
              required
              className="input-base"
            >
              {STONE_MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {state.fieldErrors?.materialType && (
              <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.materialType}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Stone Variety / Colour / Code (Optional)
            </label>
            <input
              type="text"
              name="stone_variety"
              defaultValue={prefilledProduct || ""}
              placeholder="e.g. Makrana Pure White, Black Galaxy, Dholpur Beige"
              className="input-base"
            />
            {state.fieldErrors?.stoneVariety && (
              <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.stoneVariety}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Required Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              min="1"
              step="any"
              placeholder="e.g. 5000"
              required
              className="input-base"
            />
            {state.fieldErrors?.quantity && (
              <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.quantity}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Unit of Measure *</label>
            <select name="unit" defaultValue="sq_ft" className="input-base">
              <option value="sq_ft">Square Feet (Sq Ft)</option>
              <option value="sq_m">Square Meters (Sq M)</option>
              <option value="slab">Gangsaw Slabs</option>
              <option value="ton">Short Tons</option>
              <option value="metric_ton">Metric Tons (MT)</option>
              <option value="piece">Cut-to-size Pieces</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Slab Thickness *</label>
            <select name="thickness" defaultValue="18mm" className="input-base">
              {THICKNESS_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Surface Finish *</label>
            <select name="finish" defaultValue="Mirror Polished" className="input-base">
              {FINISH_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Dimensions / Cut-to-Size Formats (Optional)
            </label>
            <input
              type="text"
              name="dimensions"
              placeholder="e.g. Gangsaw Jumbo Slabs or 600x600mm / 1200x600mm tiles"
              className="input-base"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Logistics & Project Timeline */}
      <div className="space-y-4">
        <div className="border-b border-stone-200 pb-2">
          <h3 className="text-base font-bold text-stone-900">2. Logistics & Delivery Destination</h3>
          <p className="text-xs text-stone-500">Port of loading, destination, and target dispatch date</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Delivery Destination / Discharge Sea Port *
            </label>
            <input
              type="text"
              name="delivery_location"
              placeholder="e.g. Mundra Port (FOB), Jebel Ali Port (CIF), or Delhi Site"
              required
              className="input-base"
            />
            {state.fieldErrors?.deliveryLocation && (
              <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.deliveryLocation}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Target Delivery Date (Optional)
            </label>
            <input type="date" name="required_delivery_date" className="input-base" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Project Description, Veining Preferences & BOQ Notes *
          </label>
          <textarea
            name="project_notes"
            rows={4}
            placeholder="Describe your architectural project, tolerance preferences (e.g. +/- 1mm thickness), bookmatch veining, crate packaging instructions, or payment terms."
            required
            className="input-base resize-none"
          />
          {state.fieldErrors?.projectNotes && (
            <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.projectNotes}</p>
          )}
        </div>
      </div>

      {/* Section 3: Buyer Contact Information */}
      <div className="space-y-4">
        <div className="border-b border-stone-200 pb-2">
          <h3 className="text-base font-bold text-stone-900">3. Procurement Contact Details</h3>
          <p className="text-xs text-stone-500">Where verified factories will transmit their formal quotations</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Your Full Name *</label>
            <input
              type="text"
              name="name"
              defaultValue={initialUserName || ""}
              placeholder="e.g. Michael Thorne"
              required
              className="input-base"
            />
            {state.fieldErrors?.name && (
              <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Company / Architectural Practice (Optional)
            </label>
            <input
              type="text"
              name="company_name"
              placeholder="e.g. Thorne & Partners Architects"
              className="input-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Business Email Address *
            </label>
            <input
              type="email"
              name="email"
              defaultValue={initialUserEmail || ""}
              placeholder="e.g. procurement@architects.com"
              required
              className="input-base"
            />
            {state.fieldErrors?.email && (
              <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Phone / WhatsApp with Country Code *
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="e.g. +971 50 123 4567 or +91 98765 43210"
              required
              className="input-base"
            />
            {state.fieldErrors?.phone && (
              <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submission CTA */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-200">
        <p className="text-xs text-stone-500">
          🔒 Private & Confidential. Your RFQ is transmitted directly to verified stone producers.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-700 disabled:opacity-50 active:scale-[0.98]"
        >
          {isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Transmitting Commercial RFQ…</span>
            </>
          ) : (
            <span>Submit Request for Quotation (RFQ)</span>
          )}
        </button>
      </div>
    </form>
  );
}

