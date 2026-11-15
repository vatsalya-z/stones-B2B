"use client";

import React, { useState, useEffect, useActionState, useId, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  Layers,
  MapPin,
  Phone,
  Send,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { submitPublicRfq, type RfqActionResult } from "./public-rfq-actions";
import type { RfqPrefilledData } from "./rfq-modal-context";

export interface SharedRfqFormProps {
  supplier?: {
    id: string;
    name: string;
    slug: string;
    location: string;
  } | null;
  initialData?: RfqPrefilledData | null;
  initialUserName?: string | null;
  initialUserEmail?: string | null;
  initialUserPhone?: string | null;
  isModal?: boolean;
  onSuccess?: (referenceNumber: string) => void;
  onCancel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
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
  "Travertine",
  "Onyx",
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

export function SharedRfqForm({
  supplier = null,
  initialData = null,
  initialUserName = "",
  initialUserEmail = "",
  initialUserPhone = "",
  isModal = false,
  onSuccess,
  onCancel,
  onDirtyChange,
}: SharedRfqFormProps) {
  const clientRequestId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(submitPublicRfq, initialState);
  const [isDirty, setIsDirty] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Client-side auth state
  const [authData, setAuthData] = useState<{
    authenticated: boolean;
    user: { id: string; email: string; name: string | null; phone: string | null } | null;
    isBuyer: boolean;
  }>({
    authenticated: false,
    user: null,
    isBuyer: false,
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.authenticated && data.user) {
          setAuthData({
            authenticated: true,
            user: data.user,
            isBuyer: Array.isArray(data.roles) && data.roles.includes("buyer"),
          });
        }
      } catch {
        // Fall back to unauthenticated / guest
      }
    }
    loadAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (state.success) {
      setIsDirty(false);
      onDirtyChange?.(false);
      if (state.referenceNumber && onSuccess) {
        onSuccess(state.referenceNumber);
      }
    }
  }, [state.success, state.referenceNumber, onSuccess, onDirtyChange]);

  const handleUserInteraction = () => {
    if (!isDirty) {
      setIsDirty(true);
      onDirtyChange?.(true);
    }
  };

  const copyRefNumber = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Success Screen (Displays when quotation is logged with live RFQ reference)
  if (state.success) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 text-center shadow-xs space-y-5 my-auto">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-6 ring-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-semibold text-emerald-700">
            <Sparkles className="h-3 w-3" />
            <span>RFQ Transmitted Successfully</span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-stone-900">
            Request for Quotation Submitted
          </h2>

          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
            Your natural stone BOQ has been logged and queued for platform factory dispatch. Verified suppliers will review your specifications and submit commercial rates.
          </p>
        </div>

        {/* Reference Number Box */}
        <div className="mx-auto max-w-xs rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-0.5">
            RFQ Reference Number
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-base font-bold text-stone-900 tracking-wide">
              {state.referenceNumber}
            </span>
            <button
              type="button"
              onClick={() => copyRefNumber(state.referenceNumber || "")}
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-700 hover:bg-stone-100 transition-colors"
              title="Copy RFQ reference number"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Guest Buyer Account prompt */}
        {state.isGuest && (
          <div className="mx-auto max-w-sm rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-left space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
              Track Incoming Factory Quotations
            </h4>
            <p className="text-[11px] text-amber-800 leading-snug">
              Create a free StonesDekho Buyer Account to compare supplier bids side-by-side, inspect slab test reports, and view packaging photos.
            </p>
            <div className="pt-0.5">
              <Link
                href="/register"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:text-amber-950 hover:underline"
              >
                <span>Create Buyer Account</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {isModal && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-6 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition-colors"
            >
              Done
            </button>
          ) : (
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-6 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition-colors"
            >
              Explore Stone Catalogue
            </Link>
          )}
        </div>
      </div>
    );
  }

  // 2. Active Form
  const prefilledMaterial = initialData?.materialType || "";
  const prefilledVariety = initialData?.stoneVariety || "";
  const prefilledQuantity = initialData?.quantity ? String(initialData.quantity) : "";
  const prefilledLocation = initialData?.deliveryLocation || "";

  const effectiveUserName =
    authData.user?.name || initialUserName || (authData.user?.email ? authData.user.email.split("@")[0] : "");
  const effectiveUserEmail = authData.user?.email || initialUserEmail || "";
  const effectiveUserPhone = authData.user?.phone || initialUserPhone || "";

  // Handle clicking "Get Supplier Quotes →"
  const handlePrimaryButtonClick = () => {
    if (!formRef.current) return;

    // Check HTML5 validity for inputs
    const materialSelect = formRef.current.querySelector<HTMLSelectElement>('select[name="material_type"]');
    const quantityInput = formRef.current.querySelector<HTMLInputElement>('input[name="quantity"]');
    const locationInput = formRef.current.querySelector<HTMLInputElement>('input[name="delivery_location"]');
    const phoneInput = formRef.current.querySelector<HTMLInputElement>('input[name="phone"]');

    if (materialSelect && !materialSelect.checkValidity()) {
      materialSelect.reportValidity();
      return;
    }
    if (quantityInput && !quantityInput.checkValidity()) {
      quantityInput.reportValidity();
      return;
    }
    if (locationInput && !locationInput.checkValidity()) {
      locationInput.reportValidity();
      return;
    }
    if (phoneInput && !phoneInput.checkValidity()) {
      phoneInput.reportValidity();
      return;
    }

    // Submit form immediately
    formRef.current.requestSubmit();
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={handleUserInteraction}
      onChange={handleUserInteraction}
      className="space-y-3.5"
    >
      {/* Backend hidden fields */}
      <input type="hidden" name="supplier_slug" value={supplier?.slug ?? ""} />
      <input type="hidden" name="supplier_id" value={supplier?.id ?? ""} />
      <input type="hidden" name="client_request_id" value={clientRequestId} />
      <input
        type="hidden"
        name="project_notes"
        value={initialData?.projectNotes || "Commercial natural stone requirement with standard architectural BOQ specifications."}
      />
      <div className="hidden" aria-hidden="true">
        <input type="text" name="hp_project_url" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Authenticated user hidden fields (phone is visibly editable below) */}
      {authData.authenticated && authData.user && (
        <>
          <input type="hidden" name="name" value={effectiveUserName || "Verified Buyer"} />
          <input type="hidden" name="email" value={effectiveUserEmail} />
        </>
      )}

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {state.error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: Stone & Quantity Specifications Card (EXACTLY MATCHING IMAGE 2)   */}
      {/* ========================================================================= */}
      <div className={step === 1 ? "block" : "hidden"}>
        <div className="rounded-2xl border border-[#EDE6DC] bg-white p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3.5">
          {/* Card Header matching Image 2 (ref_crop_boq_card.png) */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFEFE3] text-[#D95F18] shrink-0">
              <Layers className="h-5 w-5 stroke-[2.1]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-[13px] font-bold text-stone-900 leading-tight">
                Stone & Quantity Specifications
              </h3>
              <p className="text-[11px] text-[#6B6259] leading-tight mt-0.5">
                Provide exact architectural BOQ requirements
              </p>
            </div>
          </div>

          {/* Row 1: Stone Material Category * & Stone Variety / Colour / Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Stone Material Category <span className="text-[#E04F16]">*</span>
              </label>
              <div className="relative">
                <select
                  name="material_type"
                  defaultValue={prefilledMaterial || "Marble"}
                  required
                  className="w-full h-9 appearance-none rounded-lg border border-[#DCD5CB] bg-white px-2.5 pr-7 text-xs text-stone-900 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                >
                  {STONE_MATERIALS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Stone Variety / Colour / Code <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="stone_variety"
                defaultValue={prefilledVariety}
                placeholder="e.g. Makrana Pure White, Black Galaxy, Dholpur Beige"
                className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white px-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Required Quantity * | Unit of Measure * | Slab Thickness * */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Required Quantity <span className="text-[#E04F16]">*</span>
              </label>
              <input
                type="text"
                name="quantity"
                defaultValue={prefilledQuantity}
                placeholder="e.g. 5,000"
                required
                className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white px-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Unit of Measure <span className="text-[#E04F16]">*</span>
              </label>
              <div className="relative">
                <select
                  name="unit"
                  defaultValue="sq_ft"
                  required
                  className="w-full h-9 appearance-none rounded-lg border border-[#DCD5CB] bg-white px-2.5 pr-7 text-xs text-stone-900 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                >
                  <option value="sq_ft">Square Feet (Sq Ft)</option>
                  <option value="sq_m">Square Metres (Sq Mt)</option>
                  <option value="slab">Slabs (Gangsaw)</option>
                  <option value="metric_ton">Metric Tons (MT)</option>
                  <option value="ton">Tons</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Slab Thickness <span className="text-[#E04F16]">*</span>
              </label>
              <div className="relative">
                <select
                  name="thickness"
                  defaultValue="18mm"
                  required
                  className="w-full h-9 appearance-none rounded-lg border border-[#DCD5CB] bg-white px-2.5 pr-7 text-xs text-stone-900 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                >
                  {THICKNESS_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600" />
              </div>
            </div>
          </div>

          {/* Row 3: Surface Finish * | Dimensions / Cut-to-Size Formats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Surface Finish <span className="text-[#E04F16]">*</span>
              </label>
              <div className="relative">
                <select
                  name="finish"
                  defaultValue="Mirror Polished"
                  required
                  className="w-full h-9 appearance-none rounded-lg border border-[#DCD5CB] bg-white px-2.5 pr-7 text-xs text-stone-900 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                >
                  {FINISH_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Dimensions / Cut-to-Size Formats <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="dimensions"
                placeholder="e.g. Gangsaw Jumbo Slabs or 600x600mm / 1200x600mm"
                className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white px-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
              />
            </div>
          </div>

          {/* Row 4: Delivery Location * & Buyer Mobile Number * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {/* Delivery Location */}
            <div className="rounded-xl bg-[#FFF9F3] border border-[#FEDCC4] p-2 sm:p-2.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEDE1] text-[#D95F18]">
                  <MapPin className="h-4 w-4 stroke-[2.2]" />
                </div>
                <label className="text-xs font-bold text-stone-900 whitespace-nowrap">
                  Delivery Location <span className="text-[#E04F16]">*</span>
                </label>
              </div>
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  name="delivery_location"
                  defaultValue={prefilledLocation}
                  placeholder="City / State"
                  required
                  className="w-full h-8 sm:h-9 rounded-lg border border-[#DCD5CB] bg-white px-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                />
              </div>
            </div>

            {/* Buyer Mobile Number */}
            <div className="rounded-xl bg-[#FFF9F3] border border-[#FEDCC4] p-2 sm:p-2.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEDE1] text-[#D95F18]">
                  <Phone className="h-4 w-4 stroke-[2.2]" />
                </div>
                <label className="text-xs font-bold text-stone-900 whitespace-nowrap">
                  Mobile Number <span className="text-[#E04F16]">*</span>
                </label>
              </div>
              <div className="relative flex-1 min-w-0">
                <input
                  type="tel"
                  name="phone"
                  defaultValue={effectiveUserPhone}
                  placeholder="e.g. +91 98765 43210"
                  required
                  className="w-full h-8 sm:h-9 rounded-lg border border-[#DCD5CB] bg-white px-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Authenticated Buyer Badge */}
          {authData.authenticated && authData.user && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-lg px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Verified Buyer Account: <strong className="text-emerald-950">{effectiveUserName}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SUBMISSION AREA matching Image 2 (ref_crop_bottom_bar.png)         */}
        {/* ========================================================================= */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#554E48] text-[11px] sm:text-xs">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FFEFE3] text-[#D95F18] shrink-0">
              <Lock className="h-3.5 w-3.5 stroke-[2.2]" />
            </div>
            <span>Your requirement will be shared only with relevant verified suppliers.</span>
          </div>

          <button
            type="button"
            onClick={handlePrimaryButtonClick}
            disabled={isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#E05A12] hover:bg-[#C94F0E] text-white px-6 sm:px-7 py-2.5 text-xs sm:text-sm font-semibold shadow-md shadow-[#E05A12]/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Transmitting RFQ…</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Get Supplier Quotes →</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: Guest Procurement Contact Details (Only when unauthenticated)      */}
      {/* ========================================================================= */}
      <div className={step === 2 ? "block" : "hidden"}>
        <div className="rounded-2xl border border-[#EDE6DC] bg-white p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFEFE3] text-[#D95F18] shrink-0">
              <ShieldCheck className="h-5 w-5 stroke-[2.1]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-[13px] font-bold text-stone-900 leading-tight">
                Procurement Contact Details
              </h3>
              <p className="text-[11px] text-[#6B6259] leading-tight mt-0.5">
                Where verified quarries and factories will transmit formal commercial quotes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Your Full Name <span className="text-[#E04F16]">*</span>
              </label>
              <input
                type="text"
                name="name"
                defaultValue={effectiveUserName}
                placeholder="e.g. Vikram Sharma"
                required={step === 2 && !authData.authenticated}
                className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white px-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs"
              />
              {state.fieldErrors?.name && (
                <p className="mt-1 text-[10px] text-red-600">{state.fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Company / Architectural Practice <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="company_name"
                placeholder="e.g. Skyline Architecture Studio"
                className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white px-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Business Email Address <span className="text-[#E04F16]">*</span>
              </label>
              <input
                type="email"
                name="email"
                defaultValue={effectiveUserEmail}
                placeholder="e.g. procurement@skyline.com"
                required={step === 2 && !authData.authenticated}
                className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white px-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs"
              />
              {state.fieldErrors?.email && (
                <p className="mt-1 text-[10px] text-red-600">{state.fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                Phone / WhatsApp with Country Code <span className="text-[#E04F16]">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                defaultValue={effectiveUserPhone}
                placeholder="e.g. +91 98765 43210"
                required={step === 2 && !authData.authenticated}
                className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white px-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs"
              />
              {state.fieldErrors?.phone && (
                <p className="mt-1 text-[10px] text-red-600">{state.fieldErrors.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Step 2 Bottom Actions */}
        <div className="pt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Specifications</span>
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E05A12] hover:bg-[#C94F0E] text-white px-6 sm:px-7 py-2.5 text-xs sm:text-sm font-semibold shadow-md shadow-[#E05A12]/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Transmitting Commercial RFQ…</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Submit Quotation Request →</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
