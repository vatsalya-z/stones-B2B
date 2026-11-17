"use client";

import React, { useState, useEffect, useActionState, useId, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  Search,
  MapPin,
  Phone,
  Send,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
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

const POPULAR_STONES = [
  "Makrana White Marble",
  "Black Galaxy Granite",
  "Kota Blue Stone",
  "Dholpur Sandstone",
  "Tan Brown Granite",
  "Italian Statuario",
];

const QUICK_QUANTITIES = [
  { value: 500, label: "500 sq.ft" },
  { value: 1000, label: "1,000 sq.ft" },
  { value: 2500, label: "2,500 sq.ft" },
  { value: 5000, label: "5,000+ sq.ft" },
];

const THICKNESS_OPTIONS = [
  { value: "18mm", label: "18 mm (Standard Slab)" },
  { value: "20mm", label: "20 mm (Commercial)" },
  { value: "30mm", label: "30 mm (Paving / Cladding)" },
  { value: "Custom", label: "Custom / Block" },
];

const FINISH_OPTIONS = [
  { value: "Mirror Polished", label: "Mirror Polished" },
  { value: "Honed", label: "Honed / Matte" },
  { value: "Flamed", label: "Flamed" },
  { value: "Natural Cleft", label: "Natural Cleft" },
  { value: "Leather Finish", label: "Leather / Antique" },
];

const UNIT_OPTIONS = [
  { value: "sq_ft", label: "sq.ft (Square Feet)" },
  { value: "sq_m", label: "sq.m (Square Metres)" },
  { value: "tonnes", label: "Metric Tonnes" },
  { value: "containers", label: "20ft Containers" },
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

  // Form field states
  const prefilledProduct =
    initialData?.materialType ||
    initialData?.stoneVariety ||
    "";
  const [productQuery, setProductQuery] = useState(prefilledProduct);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quantity, setQuantity] = useState<number>(1000);
  const [unit, setUnit] = useState("sq_ft");

  // Optional specs accordion
  const [showMoreSpecs, setShowMoreSpecs] = useState(false);
  const [selectedThickness, setSelectedThickness] = useState("18mm");
  const [selectedFinish, setSelectedFinish] = useState("Mirror Polished");

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
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-10 text-center shadow-lg shadow-stone-900/5 space-y-4 my-auto">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-6 ring-emerald-50/60">
          <CheckCircle2 className="h-8 w-8 stroke-[2.2]" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-block rounded-full bg-emerald-100/90 px-3 py-0.5 text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider border border-emerald-200">
            Quotation Request Transmitted
          </span>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900">
            RFQ Dispatched to Verified Quarries
          </h3>
          <p className="mx-auto max-w-md text-xs text-stone-600 leading-relaxed">
            Your requirement has been sent directly to verified quarry owners. You will receive transparent, factory-gate pro-forma quotes shortly.
          </p>
        </div>

        {/* Reference Pill */}
        {state.referenceNumber && (
          <div className="mx-auto inline-flex items-center gap-3 rounded-2xl border border-stone-200/90 bg-stone-50 px-4 py-2.5 shadow-2xs">
            <div className="text-left">
              <span className="block text-[9.5px] font-bold text-stone-500 uppercase tracking-widest">
                Official RFQ Reference
              </span>
              <span className="font-mono text-sm font-extrabold text-stone-900 tracking-wider">
                {state.referenceNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyRefNumber(state.referenceNumber!)}
              className="rounded-xl p-1.5 text-stone-500 hover:bg-stone-200/80 hover:text-stone-900 transition-colors cursor-pointer"
              title="Copy Reference"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600 stroke-[2.4]" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Guest conversion banner */}
        {!authData.authenticated && (
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-3.5 text-left text-xs space-y-1.5">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-950 text-xs">
                  Track Quotes &amp; Compare Factory Rates:
                </strong>
                <p className="text-stone-700 text-[11px] leading-tight mt-0.5">
                  Register as a buyer to review dry-lay slab photos and compare itemized pro-formas.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-1 border-t border-amber-200/60 pt-2">
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
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {isModal && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          ) : (
            <>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-5 py-2 text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
              >
                Explore Stone Catalogue
              </Link>
              <Link
                href="/suppliers"
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-5 py-2 text-xs font-bold text-stone-800 transition-all"
              >
                Browse Verified Suppliers
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // 2. Active Form
  const prefilledLocation = initialData?.deliveryLocation || "";
  const effectiveUserName =
    authData.user?.name || initialUserName || (authData.user?.email ? authData.user.email.split("@")[0] : "");
  const effectiveUserEmail = authData.user?.email || initialUserEmail || "";
  const effectiveUserPhone = authData.user?.phone || initialUserPhone || "";

  const handlePrimaryButtonClick = () => {
    if (!formRef.current) return;
    if (!formRef.current.reportValidity()) return;
    formRef.current.requestSubmit();
  };

  const filteredSuggestions = POPULAR_STONES.filter((stone) =>
    stone.toLowerCase().includes(productQuery.toLowerCase().trim()),
  );

  // ---------------------------------------------------------------------------
  // RENDER COMPACT MODAL VIEW (WHEN isModal === true)
  // ---------------------------------------------------------------------------
  if (isModal) {
    return (
      <form
        ref={formRef}
        action={formAction}
        onInput={handleUserInteraction}
        onChange={handleUserInteraction}
        className="space-y-4"
      >
        {/* Backend hidden fields */}
        <input type="hidden" name="supplier_slug" value={supplier?.slug ?? ""} />
        <input type="hidden" name="supplier_id" value={supplier?.id ?? ""} />
        <input type="hidden" name="client_request_id" value={clientRequestId} />
        <input type="hidden" name="material_type" value={productQuery || "Natural Stone"} />
        <div className="hidden" aria-hidden="true">
          <input type="text" name="hp_project_url" tabIndex={-1} autoComplete="off" />
        </div>

        {state.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {state.error}
          </div>
        )}

        {/* Compact 3 Core Fields */}
        <div className="rounded-xl border border-[#EDE6DC] bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
          {/* Field 1: Product / Stone Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Product / Stone Name <span className="text-[#E04F16]">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#D95F18]">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                name="product_name"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Search or enter stone name (e.g. Makrana White, Black Galaxy)..."
                required
                autoComplete="off"
                className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white pl-10 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors font-medium"
              />

              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-44 overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg text-xs">
                  {filteredSuggestions.map((stone) => (
                    <button
                      key={stone}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setProductQuery(stone);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FFF9F3] hover:text-[#D95F18] flex items-center justify-between text-stone-700 transition-colors cursor-pointer"
                    >
                      <span>{stone}</span>
                      <span className="text-[10px] text-stone-400">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-stone-500 font-medium">Popular:</span>
              {POPULAR_STONES.slice(0, 4).map((stone) => (
                <button
                  key={stone}
                  type="button"
                  onClick={() => setProductQuery(stone)}
                  className="inline-flex items-center rounded-md bg-[#FAF5EE] hover:bg-[#F3EADF] border border-[#E9DFD2] px-2 py-0.5 text-[10px] text-stone-700 hover:text-[#C85D26] transition-colors cursor-pointer"
                >
                  {stone}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Mobile Number & Delivery Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Mobile Number <span className="text-[#E04F16]">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={effectiveUserPhone}
                  placeholder="e.g. +91 98765 43210"
                  required
                  className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white pl-10 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                />
              </div>
              {state.fieldErrors?.phone && (
                <p className="mt-1 text-[10px] text-red-600">{state.fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Delivery Location <span className="text-[#E04F16]">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="delivery_location"
                  defaultValue={prefilledLocation}
                  placeholder="e.g. Delhi NCR, Jaipur, Mumbai"
                  required
                  className="w-full h-9 rounded-lg border border-[#DCD5CB] bg-white pl-10 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                />
              </div>
              {state.fieldErrors?.deliveryLocation && (
                <p className="mt-1 text-[10px] text-red-600">{state.fieldErrors.deliveryLocation}</p>
              )}
            </div>
          </div>

          <input type="hidden" name="name" value={effectiveUserName || "Stone Buyer"} />
          <input type="hidden" name="email" value={effectiveUserEmail || ""} />
        </div>

        {/* Bottom Submission Bar */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#554E48] text-[10px] sm:text-[10.5px]">
            <div className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-[#FFEFE3] text-[#D95F18] shrink-0">
              <Lock className="h-2.5 w-2.5 stroke-[2.2]" />
            </div>
            <span>Shared only with relevant verified suppliers.</span>
          </div>

          <button
            type="button"
            onClick={handlePrimaryButtonClick}
            disabled={isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#E05A12] hover:bg-[#C94F0E] text-white px-4.5 py-1.5 text-xs font-semibold shadow-xs shadow-[#E05A12]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer h-8"
          >
            {isPending ? (
              <>
                <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Transmitting…</span>
              </>
            ) : (
              <>
                <Send className="h-3 w-3" />
                <span>Get Supplier Quotes →</span>
              </>
            )}
          </button>
        </div>
      </form>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER ULTRA-PREMIUM FAST-FILL PAGE FORM (WHEN isModal === false)
  // ---------------------------------------------------------------------------
  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={handleUserInteraction}
      onChange={handleUserInteraction}
      className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xl shadow-stone-900/5 space-y-4"
    >
      {/* Backend hidden fields */}
      <input type="hidden" name="supplier_slug" value={supplier?.slug ?? ""} />
      <input type="hidden" name="supplier_id" value={supplier?.id ?? ""} />
      <input type="hidden" name="client_request_id" value={clientRequestId} />
      <input type="hidden" name="material_type" value={productQuery || "Natural Stone"} />
      <div className="hidden" aria-hidden="true">
        <input type="text" name="hp_project_url" tabIndex={-1} autoComplete="off" />
      </div>

      {state.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
          {state.error}
        </div>
      )}

      {/* Target Supplier Banner if Requesting from a specific seller */}
      {supplier && (
        <div className="rounded-2xl bg-amber-50/90 border border-amber-200/80 p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2 py-0.2 rounded-md">
              Targeted Inquiry
            </span>
            <h4 className="text-sm font-extrabold text-stone-900">{supplier.name}</h4>
            <p className="text-[11px] text-stone-600 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-700" />
              <span>{supplier.location}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Direct Mill</span>
          </div>
        </div>
      )}

      {/* Form Top Title & Fast-Fill Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
            Direct Quarry Quotation Form
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            Fill 3 quick fields below to receive transparent factory-gate quotes.
          </p>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full">
          <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
          <span>Quick 30s Fill</span>
        </div>
      </div>

      {/* ── STEP 1: STONE VARIETY (WITH INSTANT 1-CLICK PILLS) ── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-stone-800">
          1. Stone Name or Category <span className="text-amber-600">*</span>
        </label>
        <div className="relative">
          <Search className="h-4 w-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.2]" />
          <input
            type="text"
            name="product_name"
            value={productQuery}
            onChange={(e) => {
              setProductQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder="Search stone (e.g. Makrana White Marble, Black Galaxy, Kota Blue)..."
            required
            autoComplete="off"
            className="w-full h-11 rounded-2xl border border-stone-200/90 bg-stone-50/70 hover:bg-stone-50 focus:bg-white pl-10 pr-4 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all"
          />

          {/* Autocomplete Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto rounded-2xl border border-stone-200 bg-white py-1 shadow-xl text-xs sm:text-sm">
              {filteredSuggestions.map((stone) => (
                <button
                  key={stone}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setProductQuery(stone);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-amber-50 hover:text-amber-800 flex items-center justify-between text-stone-700 transition-colors cursor-pointer"
                >
                  <span className="font-semibold">{stone}</span>
                  <span className="text-[10px] text-stone-400">Select</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1-Click Quick Select Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
            Quick Select:
          </span>
          {POPULAR_STONES.map((stone) => {
            const isSelected = productQuery.toLowerCase() === stone.toLowerCase();
            return (
              <button
                key={stone}
                type="button"
                onClick={() => setProductQuery(stone)}
                className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-stone-900 text-white border-stone-900 shadow-2xs"
                    : "bg-stone-100/80 hover:bg-amber-50 hover:text-amber-900 text-stone-700 border-stone-200/80"
                }`}
              >
                {stone}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP 2: QUANTITY & UNIT (COMPACT ROW) ── */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-stone-800">
          2. Estimated Quantity <span className="text-amber-600">*</span>
        </label>
        <div className="flex gap-2.5">
          <div className="w-1/2 relative">
            <input
              type="number"
              name="quantity"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
              step="any"
              required
              className="w-full h-11 rounded-2xl border border-stone-200/90 bg-stone-50/70 focus:bg-white px-3.5 text-xs sm:text-sm font-bold text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all"
            />
          </div>
          <div className="w-1/2 relative">
            <select
              name="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full h-11 rounded-2xl border border-stone-200/90 bg-stone-50/70 focus:bg-white px-3 text-xs sm:text-sm font-semibold text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all cursor-pointer"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Quantity Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {QUICK_QUANTITIES.map((q) => (
            <button
              key={q.value}
              type="button"
              onClick={() => setQuantity(q.value)}
              className={`rounded-lg px-2 py-0.5 text-[10.5px] font-semibold transition-colors border cursor-pointer ${
                quantity === q.value
                  ? "bg-amber-100 border-amber-300 text-amber-900 font-bold"
                  : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── STEP 3: DESTINATION & CONTACT (2-COL COMPACT ROW) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Delivery Location */}
        <div>
          <label className="block text-xs font-bold text-stone-800 mb-1">
            3. Delivery City / Destination <span className="text-amber-600">*</span>
          </label>
          <div className="relative">
            <MapPin className="h-4 w-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
            <input
              type="text"
              name="delivery_location"
              defaultValue={prefilledLocation}
              placeholder="e.g. Delhi NCR, Bangalore, Mumbai"
              required
              className="w-full h-11 rounded-2xl border border-stone-200/90 bg-stone-50/70 focus:bg-white pl-9 pr-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all"
            />
          </div>
          {state.fieldErrors?.deliveryLocation && (
            <p className="mt-1 text-[11px] text-red-600 font-semibold">
              {state.fieldErrors.deliveryLocation}
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <div>
          <label className="block text-xs font-bold text-stone-800 mb-1">
            4. Mobile Number (WhatsApp) <span className="text-amber-600">*</span>
          </label>
          <div className="relative">
            <Phone className="h-4 w-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
            <input
              type="tel"
              name="phone"
              defaultValue={effectiveUserPhone}
              placeholder="e.g. +91 98765 43210"
              required
              className="w-full h-11 rounded-2xl border border-stone-200/90 bg-stone-50/70 focus:bg-white pl-9 pr-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all"
            />
          </div>
          {state.fieldErrors?.phone && (
            <p className="mt-1 text-[11px] text-red-600 font-semibold">{state.fieldErrors.phone}</p>
          )}
        </div>
      </div>

      {/* ── OPTIONAL: EXPANDABLE SPECIFICATIONS ACCORDION ── */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowMoreSpecs(!showMoreSpecs)}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-xs font-bold text-stone-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>{showMoreSpecs ? "Hide Optional Details" : "+ Add Thickness, Finish & BOQ Notes (Optional)"}</span>
          </div>
          {showMoreSpecs ? (
            <ChevronUp className="h-4 w-4 text-stone-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-stone-400" />
          )}
        </button>

        {showMoreSpecs && (
          <div className="mt-3 space-y-3.5 p-4 rounded-2xl bg-stone-50/60 border border-stone-200/70 text-xs animate-in fade-in-50 duration-200">
            {/* Thickness & Finish */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Thickness / Calibration
                </label>
                <select
                  name="thickness"
                  value={selectedThickness}
                  onChange={(e) => setSelectedThickness(e.target.value)}
                  className="w-full h-9 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-800 focus:outline-none"
                >
                  {THICKNESS_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Surface Finish
                </label>
                <select
                  name="finish"
                  value={selectedFinish}
                  onChange={(e) => setSelectedFinish(e.target.value)}
                  className="w-full h-9 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-800 focus:outline-none"
                >
                  {FINISH_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={effectiveUserName}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full h-9 rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Email (For Pro-Forma PDF)
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={effectiveUserEmail}
                  placeholder="e.g. buyer@company.com"
                  className="w-full h-9 rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Company & Notes */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Company / Architect Firm (Optional)
              </label>
              <input
                type="text"
                name="company_name"
                placeholder="e.g. Skyline Architecture"
                className="w-full h-9 rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-900 focus:outline-none mb-2"
              />

              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Project Notes / Cut-to-Size Specs
              </label>
              <textarea
                name="project_notes"
                rows={2}
                placeholder="Special slab dimensions, bookmatched layout, edge profiling..."
                className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Hidden inputs to preserve identity if not expanded */}
      {!showMoreSpecs && (
        <>
          <input type="hidden" name="thickness" value={selectedThickness} />
          <input type="hidden" name="finish" value={selectedFinish} />
          <input type="hidden" name="name" value={effectiveUserName || "Stone Buyer"} />
          <input type="hidden" name="email" value={effectiveUserEmail || ""} />
        </>
      )}

      {/* ── FAST SUBMISSION BUTTON ── */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={handlePrimaryButtonClick}
          disabled={isPending}
          className="w-full h-12 sm:h-13 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-2xl px-5 shadow-lg shadow-amber-700/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Transmitting RFQ to Quarries…</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4 stroke-[2.2]" />
              <span>Get Direct Factory Quotes Now →</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 text-center font-medium">
          <Lock className="h-3 w-3 text-amber-700 stroke-[2.2]" />
          <span>100% Free • Direct Quarry Rates • Zero Broker Markup</span>
        </div>
      </div>
    </form>
  );
}
