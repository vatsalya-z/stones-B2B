"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@stone/types";
import { Button } from "@stone/ui";
import { transitionBuyerOrderAction } from "@/features/buyer/actions";

interface BuyerOrderActionsProps {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  sellerBusinessName: string;
}

export function BuyerOrderActions({
  orderId,
  orderNumber,
  status,
  sellerBusinessName,
}: BuyerOrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await transitionBuyerOrderAction({
        orderId,
        newStatus: "cancelled",
        notes: cancelNotes.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to cancel order.");
        return;
      }

      setShowCancelModal(false);
      setSuccess(`Order ${orderNumber} has been cancelled.`);
      router.refresh();
    });
  };

  const handleDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await transitionBuyerOrderAction({
        orderId,
        newStatus: "delivered",
        notes: deliveryNotes.trim() || "Consignment received and verified by buyer",
      });

      if (!res.success) {
        setError(res.error || "Failed to confirm delivery.");
        return;
      }

      setShowDeliverModal(false);
      setSuccess(`Delivery confirmed for Order ${orderNumber}!`);
      router.refresh();
    });
  };

  if (status !== "pending_payment" && status !== "dispatched") {
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
        {status === "pending_payment" && (
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
            Cancel Order Prior to Payment
          </Button>
        )}

        {status === "dispatched" && (
          <Button
            type="button"
            variant="accent"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setShowDeliverModal(true);
            }}
          >
            Confirm Consignment Received &amp; Delivered
          </Button>
        )}
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">Cancel Order {orderNumber}?</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Cancelling will close this order prior to offline settlement and notify{" "}
              <strong>{sellerBusinessName}</strong>. This action is irreversible.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Cancellation Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="e.g. Budget reallocation, project site postponed"
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
                  Keep Order
                </Button>
                <Button type="submit" variant="destructive" size="sm" loading={isPending}>
                  Confirm Cancellation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delivery Modal */}
      {showDeliverModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Confirm Receipt of Consignment {orderNumber}
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Please confirm that you have physically received and inspected the stone slabs /
              materials at your designated delivery location.
            </p>

            <form onSubmit={handleDeliverySubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Delivery Inspection Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. All 10 crates received in intact condition; quality verified against approved samples."
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setShowDeliverModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" size="sm" loading={isPending}>
                  Confirm Delivery Received
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

