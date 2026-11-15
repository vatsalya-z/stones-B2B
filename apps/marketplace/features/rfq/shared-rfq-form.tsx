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
  "Dholpur Beige Sandstone",
  "Kota Blue Stone",
  "Italian Statuario Marble",
  "Tan Brown Granite",
  "Jaisalmer Yellow",
  "Rainforest Green",
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

  // Product search state
  const prefilledProduct =
    initialData?.materialType ||
    initialData?.stoneVariety ||
    "";
  const [productQuery, setProductQuery] = useState(prefilledProduct);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
      <div className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6 text-center shadow-xs space-y-3.5 my-auto">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50">
          <CheckCircle2 className="h-6 w-6 stroke-[2.2]" />
        </div>

        <div className="space-y-1">
          <span className="inline-block rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
            RFQ Transmitted
          </span>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900">
            Request for Quotation Submitted
          </h3>
          <p className="mx-auto max-w-md text-xs text-stone-600">
            Your custom requirement has been dispatched to relevant verified quarry owners and manufacturers.
          </p>
        </div>

        {/* Reference Pill */}
        {state.referenceNumber && (
          <div className="mx-auto inline-flex items-center gap-2.5 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2">
            <div className="text-left">
              <span className="block text-[9.5px] font-semibold text-stone-500 uppercase tracking-wider">
                RFQ Reference
              </span>
              <span className="font-mono text-sm font-bold text-stone-900 tracking-wide">
                {state.referenceNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyRefNumber(state.referenceNumber!)}
              className="rounded-md p-1 text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition-colors"
              title="Copy Reference"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}

        {/* Guest conversion banner */}
        {!authData.authenticated && (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 text-left text-xs">
            <div className="flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-amber-950 text-[11.5px]">Track Quotes &amp; Chat with Suppliers:</strong>
                <p className="mt-0.5 text-stone-700 text-[11px] leading-tight">
                  Register as a verified buyer to compare proforma quotations and coordinate directly.
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-amber-200/60 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-900 hover:text-amber-950 hover:underline"
              >
                <span>Create Buyer Account</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-2 pt-0.5">
          {isModal && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition-colors"
            >
              Done
            </button>
          ) : (
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition-colors"
            >
              Explore Stone Catalogue
            </Link>
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

      {/* Streamlined Quotation Request Card (Compact 3 Core Fields) */}
      <div className="rounded-xl border border-[#EDE6DC] bg-white p-3 sm:p-3.5 shadow-2xs space-y-2">
        {/* Field 1: Product / Stone Name (Search / Input with Suggestions) */}
        <div>
          <label className="block text-[10px] font-semibold text-stone-800 mb-0.5">
            Product / Stone Name <span className="text-[#E04F16]">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#D95F18]">
              <Search className="h-3 w-3" />
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
                // Allow click to register before hiding
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="Search or enter stone name (e.g. Makrana White Marble, Black Galaxy)..."
              required
              autoComplete="off"
              className="w-full h-8 rounded-lg border border-[#DCD5CB] bg-white pl-7.5 pr-2.5 text-[11.5px] text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors font-medium"
            />

            {/* Dropdown Suggestions */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg text-xs">
                {filteredSuggestions.map((stone) => (
                  <button
                    key={stone}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setProductQuery(stone);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFF9F3] hover:text-[#D95F18] flex items-center justify-between text-stone-700 transition-colors"
                  >
                    <span>{stone}</span>
                    <span className="text-[10px] text-stone-400">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Click Chips */}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-[9px] text-stone-500 font-medium">Popular:</span>
            {POPULAR_STONES.slice(0, 5).map((stone) => (
              <button
                key={stone}
                type="button"
                onClick={() => setProductQuery(stone)}
                className="inline-flex items-center rounded bg-[#FAF5EE] hover:bg-[#F3EADF] border border-[#E9DFD2] px-1.5 py-0.5 text-[9px] text-stone-700 hover:text-[#C85D26] transition-colors"
              >
                {stone}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Mobile Number & Delivery Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {/* Mobile Number */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-800 mb-0.5">
              Mobile Number <span className="text-[#E04F16]">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                <Phone className="h-3 w-3" />
              </div>
              <input
                type="tel"
                name="phone"
                defaultValue={effectiveUserPhone}
                placeholder="e.g. +91 98765 43210"
                required
                className="w-full h-8 rounded-lg border border-[#DCD5CB] bg-white pl-7.5 pr-2.5 text-[11.5px] text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
              />
            </div>
            {state.fieldErrors?.phone && (
              <p className="mt-0.5 text-[9.5px] text-red-600">{state.fieldErrors.phone}</p>
            )}
          </div>

          {/* Delivery Location */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-800 mb-0.5">
              Delivery Location <span className="text-[#E04F16]">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                <MapPin className="h-3 w-3" />
              </div>
              <input
                type="text"
                name="delivery_location"
                defaultValue={prefilledLocation}
                placeholder="e.g. Delhi NCR, Jaipur, Mumbai"
                required
                className="w-full h-8 rounded-lg border border-[#DCD5CB] bg-white pl-7.5 pr-2.5 text-[11.5px] text-stone-900 placeholder-stone-400 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
              />
            </div>
            {state.fieldErrors?.deliveryLocation && (
              <p className="mt-0.5 text-[9.5px] text-red-600">{state.fieldErrors.deliveryLocation}</p>
            )}
          </div>
        </div>

        {/* Hidden inputs to preserve identity when logged in */}
        <input type="hidden" name="name" value={effectiveUserName || "Stone Buyer"} />
        <input type="hidden" name="email" value={effectiveUserEmail || ""} />

        {/* Authenticated Buyer Badge */}
        {authData.authenticated && authData.user && (
          <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-lg px-2 py-0.5">
            <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
            <span>
              Verified Account: <strong className="text-emerald-950">{effectiveUserName}</strong>
            </span>
          </div>
        )}
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
