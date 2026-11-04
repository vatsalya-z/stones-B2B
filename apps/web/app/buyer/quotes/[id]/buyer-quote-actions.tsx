"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QuotationStatus } from "@stone/types";
import { Button } from "@stone/ui";
import { acceptQuotationAction, decideBuyerQuotationAction } from "@/features/buyer/actions";
import { getBuyerQuotationActionEligibility } from "@/features/buyer/buyer-meta";

export interface BuyerQuoteActionsProps {
  quotationId: string;
  quoteNumber: string;
  status: QuotationStatus;
  validUntil: string | null;
  totalFormatted: string;
  sellerName: string;
  defaultContactName?: string;
  defaultPhone?: string;
  defaultAddressLine1?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultPincode?: string;
  defaultCountry?: string;
  deliveryLocation?: string;
}

export function BuyerQuoteActions({
  quotationId,
  quoteNumber,
  status,
  validUntil,
  totalFormatted,
  sellerName,
  defaultContactName = "",
  defaultPhone = "",
  defaultAddressLine1 = "",
  defaultCity = "",
  defaultState = "",
  defaultPincode = "",
  defaultCountry = "IN",
  deliveryLocation = "",
}: BuyerQuoteActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const viewedSentRef = useRef(false);

  // Acceptance Form State
  const [billingName, setBillingName] = useState(defaultContactName);
  const [billingPhone, setBillingPhone] = useState(defaultPhone);
  const [billingCompany, setBillingCompany] = useState("");
  const [billingGstin, setBillingGstin] = useState("");
  const [billingLine1, setBillingLine1] = useState(defaultAddressLine1);
  const [billingLine2, setBillingLine2] = useState("");
  const [billingCity, setBillingCity] = useState(defaultCity);
  const [billingState, setBillingState] = useState(defaultState);
  const [billingPincode, setBillingPincode] = useState(defaultPincode);
  const [billingCountry, setBillingCountry] = useState(defaultCountry || "IN");

  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [shippingName, setShippingName] = useState(defaultContactName);
  const [shippingPhone, setShippingPhone] = useState(defaultPhone);
  const [shippingCompany, setShippingCompany] = useState("");
  const [shippingLine1, setShippingLine1] = useState(defaultAddressLine1 || deliveryLocation);
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingCity, setShippingCity] = useState(defaultCity);
  const [shippingState, setShippingState] = useState(defaultState);
  const [shippingPincode, setShippingPincode] = useState(defaultPincode);
  const [shippingCountry, setShippingCountry] = useState(defaultCountry || "IN");

  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [saveAddresses, setSaveAddresses] = useState(true);

  const eligibility = getBuyerQuotationActionEligibility(status, validUntil);

  // Automatically record `sent -> viewed` when the authorized buyer opens the quotation
  useEffect(() => {
    if (status === "sent" && !viewedSentRef.current) {
      viewedSentRef.current = true;
      void decideBuyerQuotationAction({
        quotationId,
        decision: "viewed",
      }).then((res) => {
        if (res.success) {
          router.refresh();
        }
      });
    }
  }, [quotationId, status, router]);

  const handleAcceptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await acceptQuotationAction({
        quotationId,
        billingAddress: {
          contactName: billingName.trim(),
          phone: billingPhone.trim(),
          companyName: billingCompany.trim() || undefined,
          gstin: billingGstin.trim() || undefined,
          addressLine1: billingLine1.trim(),
          addressLine2: billingLine2.trim() || undefined,
          city: billingCity.trim(),
          state: billingState.trim(),
          pincode: billingPincode.trim(),
          country: billingCountry.trim().toUpperCase() || "IN",
        },
        sameAsBilling,
        shippingAddress: sameAsBilling
          ? undefined
          : {
              contactName: shippingName.trim(),
              phone: shippingPhone.trim(),
              companyName: shippingCompany.trim() || undefined,
              addressLine1: shippingLine1.trim(),
              addressLine2: shippingLine2.trim() || undefined,
              city: shippingCity.trim(),
              state: shippingState.trim(),
              pincode: shippingPincode.trim(),
              country: shippingCountry.trim().toUpperCase() || "IN",
            },
        projectDeliveryNotes: deliveryNotes.trim() || undefined,
        saveAddresses,
      });

      if (!res.success) {
        setError(res.error || "Unable to accept quotation.");
        return;
      }

      setShowAcceptModal(false);
      setSuccess(`Quotation ${quoteNumber} accepted! Order initiated successfully.`);
      if (res.data?.orderId) {
        router.push(`/buyer/orders/${res.data.orderId}`);
      } else {
        router.refresh();
      }
    });
  };

  const handleDeclineSubmit = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await decideBuyerQuotationAction({
        quotationId,
        decision: "rejected",
      });

      if (!res.success) {
        setError(res.error || "Unable to decline quotation.");
        return;
      }

      setShowDeclineModal(false);
      setSuccess(
        `Quotation ${quoteNumber} declined. ${sellerName} may submit a revised quotation on the enquiry.`,
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {eligibility.canAccept && (
            <Button
              type="button"
              variant="accent"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setShowAcceptModal(true);
              }}
            >
              Accept Quotation &amp; Initiate Order
            </Button>
          )}

          {eligibility.canReject && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setShowDeclineModal(true);
              }}
            >
              Decline / Request Revision
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/buyer/quotes/${quotationId}/pdf`}
            className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-xs hover:bg-stone-50"
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
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Download PDF
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-xs hover:bg-stone-50"
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
                d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
              />
            </svg>
            Print Quotation
          </button>
        </div>
      </div>

      {eligibility.ineligibleReason && (
        <p className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-600">
          {eligibility.ineligibleReason}
        </p>
      )}

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-800"
          role="status"
        >
          {success}
        </div>
      )}

      {/* Decline Confirmation Dialog */}
      {showDeclineModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="rounded-xl border border-red-200 bg-red-50/70 p-4 space-y-3"
        >
          <h4 className="text-sm font-bold text-stone-900">
            Decline Quotation {quoteNumber} &amp; Request Revision?
          </h4>
          <p className="text-xs text-stone-700 leading-relaxed">
            Declining marks quotation {quoteNumber} as declined while keeping your enquiry open in
            &quot;In Discussion&quot; status so {sellerName} can submit a revised commercial offer.
          </p>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              loading={isPending}
              onClick={handleDeclineSubmit}
            >
              Confirm Decline
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => setShowDeclineModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Modal Dialog: Quotation Acceptance & Order Initiation */}
      {showAcceptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Phase 2 Order Initiation
                </span>
                <h3 className="mt-1 text-lg font-bold text-stone-900">
                  Accept Quotation {quoteNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  Supplier: <strong>{sellerName}</strong> • Grand Total:{" "}
                  <strong className="text-amber-700">{totalFormatted}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="text-stone-400 hover:text-stone-600 rounded-lg p-1.5"
                disabled={isPending}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Model B Architectural Settlement Banner */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <svg className="h-4 w-4 shrink-0 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Payment Model B Architecture Notice
              </p>
              <p className="text-stone-700 leading-relaxed text-[11px]">
                Upon acceptance, an official StoneB2B Pro-Forma Purchase Order is initiated. Platform payment
                integration is pending. No payment should be made using unverified platform payment instructions.
                Payment confirmation will become available after the authorized payment provider integration is activated.
                Commercial settlement will be processed through StoneB2B Payment Model B after the authorized Payment Aggregator integration is activated.
              </p>
            </div>

            <form onSubmit={handleAcceptSubmit} className="space-y-4 text-xs">
              {/* Billing Address Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 text-sm">1. Billing Address (Tax Invoice)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Phone Number * (10-15 digits)
                    </label>
                    <input
                      type="tel"
                      required
                      value={billingPhone}
                      onChange={(e) => setBillingPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Company Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={billingCompany}
                      onChange={(e) => setBillingCompany(e.target.value)}
                      placeholder="e.g. Sharma Stone Works"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      GSTIN (Optional, for Input Credit)
                    </label>
                    <input
                      type="text"
                      value={billingGstin}
                      onChange={(e) => setBillingGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 08ABCDE1234F1Z5"
                      maxLength={15}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs uppercase focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={billingLine1}
                    onChange={(e) => setBillingLine1(e.target.value)}
                    placeholder="Plot / Street / Building number"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={billingLine2}
                    onChange={(e) => setBillingLine2(e.target.value)}
                    placeholder="Suite, building, floor, or landmark"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={billingCity}
                      onChange={(e) => setBillingCity(e.target.value)}
                      placeholder="City"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={billingState}
                      onChange={(e) => setBillingState(e.target.value)}
                      placeholder="State"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={billingPincode}
                      onChange={(e) => setBillingPincode(e.target.value)}
                      placeholder="6-digit PIN"
                      maxLength={10}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={billingCountry}
                      onChange={(e) => setBillingCountry(e.target.value.toUpperCase())}
                      placeholder="IN"
                      maxLength={2}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs uppercase focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address Details */}
              <div className="space-y-3 border-t border-stone-200 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-900 text-sm">2. Delivery / Shipping Address</h4>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-800">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                    Same as billing address
                  </label>
                </div>

                {!sameAsBilling && (
                  <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Site Contact Name *
                        </label>
                        <input
                          type="text"
                          required={!sameAsBilling}
                          value={shippingName}
                          onChange={(e) => setShippingName(e.target.value)}
                          placeholder="e.g. Suresh Patel"
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Site Contact Phone *
                        </label>
                        <input
                          type="tel"
                          required={!sameAsBilling}
                          value={shippingPhone}
                          onChange={(e) => setShippingPhone(e.target.value)}
                          placeholder="Site receiver phone"
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Delivery Site Company / Project Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={shippingCompany}
                        onChange={(e) => setShippingCompany(e.target.value)}
                        placeholder="e.g. Project Warehouse / Job Site"
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Delivery Site Address Line 1 *
                      </label>
                      <input
                        type="text"
                        required={!sameAsBilling}
                        value={shippingLine1}
                        onChange={(e) => setShippingLine1(e.target.value)}
                        placeholder="Site / Warehouse delivery address"
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Delivery Site Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        value={shippingLine2}
                        onChange={(e) => setShippingLine2(e.target.value)}
                        placeholder="Gate, bay, or landmark"
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          required={!sameAsBilling}
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          placeholder="Delivery City"
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          required={!sameAsBilling}
                          value={shippingState}
                          onChange={(e) => setShippingState(e.target.value)}
                          placeholder="State"
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          PIN Code *
                        </label>
                        <input
                          type="text"
                          required={!sameAsBilling}
                          value={shippingPincode}
                          onChange={(e) => setShippingPincode(e.target.value)}
                          placeholder="PIN Code"
                          maxLength={10}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          value={shippingCountry}
                          onChange={(e) => setShippingCountry(e.target.value.toUpperCase())}
                          placeholder="IN"
                          maxLength={2}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs uppercase focus:border-amber-600 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Instructions */}
              <div className="space-y-1.5 border-t border-stone-200 pt-4">
                <label className="block text-[11px] font-semibold text-stone-700">
                  Project Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Unloading forklift available between 9am - 5pm; trailer access permitted."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
                />
              </div>

              {/* Save Address Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="saveAddresses"
                  checked={saveAddresses}
                  onChange={(e) => setSaveAddresses(e.target.checked)}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="saveAddresses" className="text-xs text-stone-700 cursor-pointer">
                  Save these addresses to my buyer profile for future orders
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setShowAcceptModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" size="sm" loading={isPending}>
                  Confirm Acceptance &amp; Initiate Order ({totalFormatted})
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
