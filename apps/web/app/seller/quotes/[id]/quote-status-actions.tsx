"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QuotationStatus } from "@stone/types";
import { updateQuotationStatusAction } from "@/features/seller/actions";

export interface QuoteStatusActionsProps {
  quotationId: string;
  enquiryId: string;
  status: QuotationStatus;
}

export function QuoteStatusActions({
  quotationId,
  enquiryId,
  status,
}: QuoteStatusActionsProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status !== "sent" && status !== "viewed") {
    return null;
  }

  const handleRevise = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await updateQuotationStatusAction(quotationId, "revised");
      if (!res.success) {
        setErrorMessage(res.error || "Unable to mark quotation as revised.");
        return;
      }
      router.push(
        `/seller/quotes/new?enquiryId=${enquiryId}&fromQuoteId=${quotationId}`,
      );
    });
  };

  const handleCancel = () => {
    if (!window.confirm("Cancel this sent quotation?")) return;
    setErrorMessage(null);
    startTransition(async () => {
      const res = await updateQuotationStatusAction(quotationId, "cancelled");
      if (!res.success) {
        setErrorMessage(res.error || "Unable to cancel quotation.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleRevise}
          className="btn-primary !px-3.5 !py-2 !text-xs"
        >
          {isPending ? "Preparing…" : "Issue Revised Quotation"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={handleCancel}
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Cancel Quotation
        </button>
      </div>
      {errorMessage && (
        <p className="text-xs font-medium text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}

