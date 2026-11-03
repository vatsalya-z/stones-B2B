"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@stone/types";
import { Button } from "@stone/ui";
import { transitionAdminOrderAction } from "@/features/admin/actions";

interface AdminOrderActionsProps {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
}

export function AdminOrderActions({ orderId, orderNumber, status }: AdminOrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const executeTransition = (newStatus: "cancelled" | "completed", notes?: string) => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await transitionAdminOrderAction({
        orderId,
        newStatus,
        notes,
      });

      if (!res.success) {
        setError(res.error || "Failed to update order status.");
        return;
      }

      setShowCancelModal(false);
      setSuccess(`Order ${orderNumber} transitioned to ${newStatus}.`);
      router.refresh();
    });
  };

  const canArbitrateCancel =
    status === "pending_payment" || status === "confirmed" || status === "processing";
  const canComplete = status === "delivered";

  if (!canArbitrateCancel && !canComplete) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-semibold"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800 font-semibold"
          role="status"
        >
          {success}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {canArbitrateCancel && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setShowCancelModal(true);
            }}
          >
            Arbitrate &amp; Cancel Order
          </Button>
        )}

        {canComplete && (
          <Button
            type="button"
            variant="accent"
            size="sm"
            loading={isPending}
            onClick={() =>
              executeTransition(
                "completed",
                "Platform administrator closed order following confirmed buyer delivery",
              )
            }
          >
            Mark Order Completed
          </Button>
        )}
      </div>

      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Admin Arbitration: Cancel {orderNumber}
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Cancelling as an administrator overrides the normal participant flow and notifies both
              buyer and supplier. Please provide an explicit audit reason.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeTransition("cancelled", cancelNotes.trim() || "Administrative intervention");
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Arbitration Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="e.g. Commercial dispute arbitrated: supplier unable to supplyMakrana Grade A; mutual cancellation agreed."
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setShowCancelModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" size="sm" loading={isPending}>
                  Confirm Admin Cancellation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

