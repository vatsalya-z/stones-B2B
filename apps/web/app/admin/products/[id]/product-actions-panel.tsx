"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@stone/ui";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";
import { moderateProductAction } from "@/features/admin/actions";
import type { ProductAdminAction } from "@stone/validation";

interface ProductActionsPanelProps {
  productId: string;
  currentStatus: string;
}

export function ProductActionsPanel({
  productId,
  currentStatus,
}: ProductActionsPanelProps) {
  const router = useRouter();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: ProductAdminAction | null;
    title: string;
    description: string;
    requiresReason: boolean;
    isDestructive: boolean;
    confirmLabel: string;
  }>({
    isOpen: false,
    action: null,
    title: "",
    description: "",
    requiresReason: false,
    isDestructive: false,
    confirmLabel: "Confirm",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openModal = (
    action: ProductAdminAction,
    title: string,
    description: string,
    requiresReason: boolean = false,
    isDestructive: boolean = false,
    confirmLabel: string = "Confirm",
  ) => {
    setActionMessage(null);
    setModalState({
      isOpen: true,
      action,
      title,
      description,
      requiresReason,
      isDestructive,
      confirmLabel,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, action: null }));
  };

  const handleExecuteAction = async (reason?: string) => {
    if (!modalState.action) return;
    setIsLoading(true);
    setActionMessage(null);

    try {
      const res = await moderateProductAction({
        productId,
        action: modalState.action,
        reason,
      });

      if (!res.success) {
        setActionMessage({ type: "error", text: res.error || "Failed to update product moderation." });
        return;
      }

      setActionMessage({ type: "success", text: "Product moderation updated successfully." });
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <h3 className="text-sm font-semibold text-white">Catalogue Moderation Controls</h3>
      <p className="mt-1 text-xs text-stone-400">
        Review natural stone characteristics, imagery, and decide listing eligibility on the public marketplace.
      </p>

      {actionMessage && (
        <div
          className={`mt-4 rounded-lg border p-3 text-xs ${
            actionMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {(currentStatus === "pending_review" || currentStatus === "draft" || currentStatus === "rejected") && (
          <Button
            variant="accent"
            size="sm"
            disabled={isLoading}
            onClick={() =>
              openModal(
                "approve",
                "Approve Product Listing",
                "Approving will publish this natural stone product immediately to the public marketplace search catalogue.",
                false,
                false,
                "Approve & Publish",
              )
            }
          >
            Approve & Publish
          </Button>
        )}

        {(currentStatus === "pending_review" || currentStatus === "approved") && (
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={isLoading}
              onClick={() =>
                openModal(
                  "request_changes",
                  "Request Supplier Changes",
                  "Notify the seller of required corrections in specifications, imagery, or pricing.",
                  true,
                  false,
                  "Send Rejection & Feedback",
                )
              }
            >
              Request Changes
            </Button>

            <Button
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={() =>
                openModal(
                  "reject",
                  "Reject Product",
                  "Reject this product listing. A clear reason must be given to the supplier.",
                  true,
                  true,
                  "Reject Listing",
                )
              }
            >
              Reject Listing
            </Button>
          </>
        )}

        {currentStatus !== "archived" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-stone-400 hover:text-white hover:bg-stone-800"
            disabled={isLoading}
            onClick={() =>
              openModal(
                "archive",
                "Archive Product",
                "Archiving delists the product from search and catalogue discovery while preserving historical quotes and enquiry references.",
                true,
                true,
                "Archive Product",
              )
            }
          >
            Archive Product
          </Button>
        )}

        {currentStatus === "archived" && (
          <Button
            variant="accent"
            size="sm"
            disabled={isLoading}
            onClick={() =>
              openModal(
                "restore",
                "Restore Archived Product",
                "Restoring returns this product to the pending review queue for re-verification before it can be published.",
                true,
                false,
                "Restore to Review Queue",
              )
            }
          >
            Restore to Review Queue
          </Button>
        )}
      </div>

      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleExecuteAction}
        title={modalState.title}
        description={modalState.description}
        requiresReason={modalState.requiresReason}
        isDestructive={modalState.isDestructive}
        confirmLabel={modalState.confirmLabel}
      />
    </div>
  );
}

