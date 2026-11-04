"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@stone/types";
import { Button } from "@stone/ui";
import { transitionSellerOrderAction } from "@/features/seller/actions";

interface SellerOrderActionsProps {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  buyerName: string;
}

export function SellerOrderActions({
  orderId,
  orderNumber,
  status,
  buyerName,
}: SellerOrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const executeTransition = (newStatus: "confirmed" | "processing" | "dispatched", notes?: string) => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await transitionSellerOrderAction({
        orderId,
        newStatus,
        notes,
      });

      if (!res.success) {
        setError(res.error || "Failed to transition order status.");
        return;
      }

      setShowDispatchModal(false);
      setSuccess(`Order ${orderNumber} transitioned to ${newStatus.replace(/_/g, " ")}.`);
      router.refresh();
    });
  };

  if (status !== "pending_payment" && status !== "confirmed" && status !== "processing") {
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
            variant="accent"
            size="sm"
            loading={isPending}
            onClick={() =>
              executeTransition(
                "confirmed",
                "Pro-forma acknowledged; production committed by supplier",
              )
            }
          >
            Confirm Order (Commit Production)
          </Button>
        )}

        {status === "confirmed" && (
          <Button
            type="button"
            variant="accent"
            size="sm"
            loading={isPending}
            onClick={() =>
              executeTransition(
                "processing",
                "Quarry cutting, polishing, and slab packing commenced",
              )
            }
          >
            Start Processing / Cutting
          </Button>
        )}

        {status === "processing" && (
          <Button
            type="button"
            variant="accent"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setShowDispatchModal(true);
            }}
          >
            Dispatch Consignment (Add Transport Details)
          </Button>
        )}
      </div>

      {/* Dispatch Consignment Modal */}
      {showDispatchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Dispatch Consignment for {orderNumber}
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Advancing to <em>Dispatched</em> notifies <strong>{buyerName}</strong> that the
              consignment has departed your manufacturing facility / yard.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeTransition(
                  "dispatched",
                  dispatchNotes.trim() || "Consignment dispatched via commercial freight",
                );
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Logistics &amp; Transport Details *
                </label>
                <textarea
                  rows={3}
                  required
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Transporter: VRL Logistics, LR No: 9812411, Vehicle: RJ-14-GA-9999, Driver: +91 98222 33333"
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setShowDispatchModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" size="sm" loading={isPending}>
                  Confirm Dispatch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

