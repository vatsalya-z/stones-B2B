"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@stone/ui";
import type { EnquiryStatus } from "@stone/types";
import { updateEnquiryStatusAction } from "@/features/seller/actions";
import { getAllowedSellerEnquiryTransitions } from "@/features/seller/seller-meta";

export interface SellerEnquiryActionsProps {
  enquiryId: string;
  currentStatus: EnquiryStatus;
  canPrepareQuote: boolean;
}

export function SellerEnquiryActions({
  enquiryId,
  currentStatus,
  canPrepareQuote,
}: SellerEnquiryActionsProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const transitions = getAllowedSellerEnquiryTransitions(currentStatus);

  const handleTransition = (
    newStatus: "viewed" | "responding" | "rejected" | "closed",
  ) => {
    if (
      newStatus === "rejected" &&
      !window.confirm("Decline this buyer enquiry? Please add a note if helpful.")
    ) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await updateEnquiryStatusAction({
        enquiryId,
        newStatus,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update enquiry status.");
        return;
      }

      setNotes("");
      setSuccessMessage("Enquiry status and history updated.");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="border-b border-stone-100 pb-4">
        <h2 className="text-base font-semibold text-stone-900">Respond &amp; Workflow Actions</h2>
        <p className="text-xs text-stone-500">
          Record response notes, update status, or prepare a formal quotation.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs font-medium text-green-800">
            {successMessage}
          </div>
        )}

        {canPrepareQuote && (
          <Link
            href={`/seller/quotes/new?enquiryId=${enquiryId}`}
            className="btn-accent w-full"
          >
            Prepare Formal Quotation →
          </Link>
        )}

        {transitions.length > 0 ? (
          <div className="space-y-3 border-t border-stone-100 pt-3">
            <div>
              <label htmlFor="enq-notes" className="label-base mb-1 !text-xs">
                Response / Status Note (Recorded in Enquiry Timeline)
              </label>
              <textarea
                id="enq-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add availability confirmation, slab block remarks, dispatch schedule, or reason…"
                className="input-base !text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {transitions.map((t) => {
                const isDestructive = t.status === "rejected";
                const isPrimary = t.status === "responding";
                return (
                  <button
                    key={t.status}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleTransition(t.status)}
                    className={
                      isPrimary
                        ? "btn-primary !px-3.5 !py-2 !text-xs"
                        : isDestructive
                          ? "rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                          : "btn-secondary !px-3.5 !py-2 !text-xs"
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-stone-500">
            This enquiry is in a terminal status ({currentStatus}) with no further status
            transitions available.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

