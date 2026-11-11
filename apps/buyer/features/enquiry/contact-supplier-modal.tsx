"use client";

import React, { useState, useActionState, useId } from "react";
import Link from "next/link";
import {
  submitSupplierEnquiry,
  type SupplierEnquiryActionResult,
} from "./supplier-enquiry-actions";

export interface ContactSupplierModalProps {
  sellerId: string;
  sellerSlug: string;
  sellerName: string;
  materialsSupplied?: string[];
  initialUserName?: string | null;
  initialUserEmail?: string | null;
}

const initialState: SupplierEnquiryActionResult = {
  success: false,
};

export function ContactSupplierModal({
  sellerId,
  sellerSlug,
  sellerName,
  materialsSupplied = [],
  initialUserName = "",
  initialUserEmail = "",
}: ContactSupplierModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const clientRequestId = useId();
  const [state, formAction, isPending] = useActionState(submitSupplierEnquiry, initialState);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-xs transition-colors hover:bg-stone-50 active:scale-[0.98]"
      >
        <svg
          className="h-4 w-4 text-stone-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
        <span>Contact Factory</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-supplier-title"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/70">
              <div>
                <h2 id="contact-supplier-title" className="text-base font-bold text-stone-900">
                  Contact {sellerName}
                </h2>
                <p className="text-xs text-stone-500">
                  Direct Factory Trade Sourcing • Direct Quotations
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700"
                aria-label="Close dialogue"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {state.success ? (
                /* Success State */
                <div className="py-8 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">Enquiry Transmitted Successfully</h3>
                  <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                    Your sourcing requirement has been sent directly to{" "}
                    <span className="font-semibold text-stone-800">{sellerName}</span> and recorded with the StonesDekho Trade Desk.
                  </p>
                  <div className="inline-block rounded-lg bg-stone-100 border border-stone-200 px-4 py-2 text-xs font-mono font-semibold text-stone-800">
                    Ref ID: {state.referenceNumber}
                  </div>

                  {state.isGuest && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left space-y-2">
                      <p className="text-xs font-semibold text-amber-900">
                        Want real-time quotation tracking?
                      </p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Create a free verified Buyer Account to compare incoming quotations side-by-side, inspect crate packaging details, and track shipment dispatch.
                      </p>
                      <div className="pt-1">
                        <Link
                          href="/register"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 hover:underline"
                        >
                          Register Free as a Stone Buyer →
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Enquiry Form */
                <form action={formAction} className="space-y-4">
                  {/* Hidden context fields */}
                  <input type="hidden" name="seller_id" value={sellerId} />
                  <input type="hidden" name="seller_slug" value={sellerSlug} />
                  <input type="hidden" name="seller_name" value={sellerName} />
                  <input type="hidden" name="client_request_id" value={clientRequestId} />
                  {/* Honeypot field for spam prevention */}
                  <div className="hidden" aria-hidden="true">
                    <input type="text" name="hp_website" tabIndex={-1} autoComplete="off" />
                  </div>

                  {state.error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                      {state.error}
                    </div>
                  )}

                  {/* Stone Material & Quantity Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Stone Material Required *
                      </label>
                      {materialsSupplied.length > 0 ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            name="material"
                            list="materials-list"
                            placeholder="e.g. Makrana White Marble"
                            required
                            className="input-base"
                            defaultValue={materialsSupplied[0] || ""}
                          />
                          <datalist id="materials-list">
                            {materialsSupplied.map((m) => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        </div>
                      ) : (
                        <input
                          type="text"
                          name="material"
                          placeholder="e.g. Natural Stone Slabs"
                          required
                          className="input-base"
                        />
                      )}
                      {state.fieldErrors?.material && (
                        <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.material}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Required Quantity & Unit *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          name="quantity"
                          min="1"
                          step="any"
                          placeholder="e.g. 5000"
                          required
                          className="input-base flex-1"
                        />
                        <select name="unit" defaultValue="sq_ft" className="input-base w-28">
                          <option value="sq_ft">Sq Ft</option>
                          <option value="sq_m">Sq M</option>
                          <option value="slab">Slabs</option>
                          <option value="ton">Tons</option>
                          <option value="metric_ton">Metric Ton</option>
                          <option value="piece">Pieces</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      {state.fieldErrors?.quantity && (
                        <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.quantity}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Name & Company */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={initialUserName || ""}
                        placeholder="e.g. Rahul Sharma"
                        required
                        className="input-base"
                      />
                      {state.fieldErrors?.name && (
                        <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Company / Architectural Firm (Optional)
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        placeholder="e.g. Apex Stone Studios"
                        className="input-base"
                      />
                      {state.fieldErrors?.companyName && (
                        <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.companyName}</p>
                      )}
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Business Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={initialUserEmail || ""}
                        placeholder="e.g. procurement@firm.com"
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
                        placeholder="e.g. +91 98765 43210"
                        required
                        className="input-base"
                      />
                      {state.fieldErrors?.phone && (
                        <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery Location / Port */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Target Delivery Destination / Sea Port (Optional)
                    </label>
                    <input
                      type="text"
                      name="delivery_location"
                      placeholder="e.g. Mundra Port (FOB) or Delhi Site Delivery"
                      className="input-base"
                    />
                    {state.fieldErrors?.deliveryLocation && (
                      <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.deliveryLocation}</p>
                    )}
                  </div>

                  {/* Requirement Message */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Technical Specifications & Requirement Details *
                    </label>
                    <textarea
                      name="message"
                      rows={3}
                      placeholder="Specify required slab thickness (16mm, 18mm, 20mm), finish (mirror polished, flamed, honed), lot veining preferences, or delivery target date."
                      required
                      className="input-base resize-none"
                    />
                    {state.fieldErrors?.message && (
                      <p className="mt-1 text-[11px] text-red-600">{state.fieldErrors.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-xl px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-stone-800 disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Transmitting Enquiry…</span>
                        </>
                      ) : (
                        <span>Submit Direct Enquiry</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

