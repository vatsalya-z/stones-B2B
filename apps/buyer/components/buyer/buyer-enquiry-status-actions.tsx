"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EnquiryStatus } from "@stone/types";
import { Button } from "@stone/ui";
import { transitionBuyerEnquiryAction } from "@/features/buyer/actions";
import { getAllowedBuyerEnquiryTransitions } from "@/features/buyer/buyer-meta";

export interface BuyerEnquiryStatusActionsProps {
  enquiryId: string;
  currentStatus: EnquiryStatus;
}

export function BuyerEnquiryStatusActions({
  enquiryId,
  currentStatus,
}: BuyerEnquiryStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<"cancelled" | "closed" | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const actions = getAllowedBuyerEnquiryTransitions(currentStatus);
  if (actions.length === 0) return null;

  const activeAction = actions.find((a) => a.status === confirmTarget) ?? null;

  const handleConfirm = () => {
    if (!confirmTarget) return;
    setError(null);
    startTransition(async () => {
      const res = await transitionBuyerEnquiryAction({
        enquiryId,
        newStatus: confirmTarget,
        notes: notes.trim() || undefined,
      });
      if (!res.success) {
        setError(res.error || "Unable to update enquiry status.");
        return;
      }
      setConfirmTarget(null);
      setNotes("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.status}
            type="button"
            variant={action.destructive ? "destructive" : "secondary"}
            size="sm"
            onClick={() => {
              setError(null);
              setConfirmTarget(action.status);
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {activeAction && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="enquiry-transition-dialog-title"
          className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3"
        >
          <div>
            <h4
              id="enquiry-transition-dialog-title"
              className="text-sm font-bold text-stone-900"
            >
              Confirm: {activeAction.label}
            </h4>
            <p className="mt-1 text-xs text-stone-600">{activeAction.description}</p>
          </div>

          <div>
            <label
              htmlFor={`transition-notes-${enquiryId}`}
              className="block text-xs font-medium text-stone-700 mb-1"
            >
              Reason or Closing Note (Optional)
            </label>
            <input
              id={`transition-notes-${enquiryId}`}
              type="text"
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Project schedule revised / Order finalized"
              className="input-base"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeAction.destructive ? "destructive" : "primary"}
              loading={isPending}
              onClick={handleConfirm}
            >
              Confirm {activeAction.label}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => setConfirmTarget(null)}
            >
              Keep Current Status
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

