"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@stone/ui";
import { createEnquiry } from "./actions";

export interface EnquiryFormProps {
  productId: string;
  productName: string;
  unit: string;
  sellerName: string;
  onSuccess?: () => void;
  className?: string;
}

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function EnquiryForm({
  productId,
  productName,
  unit,
  sellerName,
  onSuccess,
  className,
}: EnquiryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [createdEnquiryId, setCreatedEnquiryId] = useState<string | null>(null);
  const [clientRequestId, setClientRequestId] = useState<string>(makeUuid);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("client_request_id", clientRequestId);

    startTransition(async () => {
      const result = await createEnquiry(productId, formData);
      if (result.success) {
        setCreatedEnquiryId(result.enquiryId ?? null);
        setSubmitted(true);
        if (onSuccess) onSuccess();
      } else {
        if (result.error?.includes("sign in")) {
          router.push(
            `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`,
          );
        } else {
          setError(result.error || "Failed to submit enquiry. Please try again.");
        }
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-green-900">Enquiry Submitted!</h3>
        <p className="text-sm text-green-700">
          Your requirement for <span className="font-semibold">{productName}</span> has been sent to{" "}
          <span className="font-semibold">{sellerName}</span>.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Link
            href={
              createdEnquiryId
                ? `/buyer/enquiries/${createdEnquiryId}`
                : "/buyer/enquiries"
            }
            className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          >
            Track Enquiry in Buyer Portal →
          </Link>
          <Link
            href="/buyer/quotes"
            className="inline-flex items-center justify-center rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-semibold text-green-900 hover:bg-green-100"
          >
            Received Quotations
          </Link>
        </div>

        <button
          type="button"
          onClick={() => {
            setClientRequestId(makeUuid());
            setCreatedEnquiryId(null);
            setSubmitted(false);
          }}
          className="block mx-auto pt-1 text-xs font-semibold text-green-800 underline hover:text-green-900"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="quantity" className="block text-xs font-medium text-stone-700 mb-1">
              Quantity Required *
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              step="any"
              required
              placeholder="e.g. 500"
              className="input-base"
            />
          </div>

          <div>
            <label htmlFor="unit" className="block text-xs font-medium text-stone-700 mb-1">
              Unit
            </label>
            <select id="unit" name="unit" defaultValue={unit || "sq_ft"} className="input-base">
              <option value="sq_ft">Square Feet (sq ft)</option>
              <option value="sq_m">Square Metres (sq m)</option>
              <option value="slab">Slabs</option>
              <option value="ton">Tons</option>
              <option value="metric_ton">Metric Tons (MT)</option>
              <option value="piece">Pieces</option>
              <option value="box">Boxes</option>
              <option value="custom">Other / Custom</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="delivery_location" className="block text-xs font-medium text-stone-700 mb-1">
            Delivery Location / Port
          </label>
          <input
            id="delivery_location"
            name="delivery_location"
            type="text"
            placeholder="e.g. Mumbai, Maharashtra or Mundra Port"
            className="input-base"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-xs font-medium text-stone-700 mb-1">
            Requirements &amp; Specifications *
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            required
            placeholder="Specify thickness, required finishes, project timeline, edge profile, or inspection requirements..."
            className="input-base"
          />
        </div>

        <div>
          <Button
            type="submit"
            variant="accent"
            loading={isPending}
            className="w-full justify-center"
          >
            Submit Enquiry to {sellerName}
          </Button>
          <p className="mt-2 text-center text-xs text-stone-500">
            Direct quotation • Verified Indian Manufacturer
          </p>
        </div>
      </div>
    </form>
  );
}
