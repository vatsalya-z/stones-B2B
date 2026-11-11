"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@stone/ui";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";
import {
  reviewSellerAction,
  reviewDocumentAction,
  setAccountStatusAction,
} from "@/features/admin/actions";
import type { SellerAdminAction } from "@stone/validation";

interface SellerActionsPanelProps {
  sellerId: string;
  userId: string;
  currentStatus: string;
  accountStatus: string;
}

export function SellerActionsPanel({
  sellerId,
  userId,
  currentStatus,
  accountStatus,
}: SellerActionsPanelProps) {
  const router = useRouter();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: SellerAdminAction | "suspend_account" | "activate_account" | null;
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
    action: SellerAdminAction | "suspend_account" | "activate_account",
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
      if (modalState.action === "suspend_account" || modalState.action === "activate_account") {
        const res = await setAccountStatusAction({
          userId,
          status: modalState.action === "suspend_account" ? "suspended" : "active",
          reason,
        });
        if (!res.success) {
          setActionMessage({ type: "error", text: res.error || "Failed to update account status." });
          return;
        }
        setActionMessage({ type: "success", text: "Account status updated successfully." });
      } else {
        const res = await reviewSellerAction({
          sellerId,
          action: modalState.action,
          reason,
        });
        if (!res.success) {
          setActionMessage({ type: "error", text: res.error || "Failed to execute seller review." });
          return;
        }
        setActionMessage({ type: "success", text: "Seller status updated successfully." });
      }
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <h3 className="text-sm font-semibold text-white">Administrator Moderation Actions</h3>
      <p className="mt-1 text-xs text-stone-400">
        Review documentation, adjust verification state, or restrict platform capabilities.
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
        {currentStatus === "submitted" && (
          <Button
            variant="secondary"
            size="sm"
            disabled={isLoading}
            onClick={() =>
              openModal(
                "start_review",
                "Start Verification Review",
                "Mark this seller application as under review by the moderation team.",
                false,
                false,
                "Start Review",
              )
            }
          >
            Mark Under Review
          </Button>
        )}

        {(currentStatus === "submitted" || currentStatus === "under_review") && (
          <>
            <Button
              variant="accent"
              size="sm"
              disabled={isLoading}
              onClick={() =>
                openModal(
                  "approve",
                  "Approve & Verify Seller",
                  "This will grant the supplier verified status, enabling their approved products to appear on the marketplace.",
                  false,
                  false,
                  "Approve Supplier",
                )
              }
            >
              Approve Supplier
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={isLoading}
              onClick={() =>
                openModal(
                  "request_documents",
                  "Request Additional Documentation",
                  "Send an official notification to this seller requesting updated or additional documents.",
                  true,
                  false,
                  "Send Request",
                )
              }
            >
              Request Additional Documents
            </Button>

            <Button
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={() =>
                openModal(
                  "reject",
                  "Reject Seller Application",
                  "Reject this supplier application. A clear explanation must be provided to the supplier.",
                  true,
                  true,
                  "Reject Application",
                )
              }
            >
              Reject Application
            </Button>
          </>
        )}

        {currentStatus === "verified" && (
          <Button
            variant="destructive"
            size="sm"
            disabled={isLoading}
            onClick={() =>
              openModal(
                "suspend",
                "Suspend Seller",
                "Suspending this supplier will immediately prevent new quotations and mark their profile as suspended.",
                true,
                true,
                "Suspend Seller",
              )
            }
          >
            Suspend Seller
          </Button>
        )}

        {currentStatus === "suspended" && (
          <Button
            variant="accent"
            size="sm"
            disabled={isLoading}
            onClick={() =>
              openModal(
                "reactivate",
                "Reactivate Suspended Seller",
                "Restore this supplier to verified status and re-enable their marketplace capabilities.",
                false,
                false,
                "Reactivate Supplier",
              )
            }
          >
            Reactivate Supplier
          </Button>
        )}

        {/* Global User Account Status */}
        {accountStatus === "active" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            disabled={isLoading}
            onClick={() =>
              openModal(
                "suspend_account",
                "Suspend User Account",
                "This disables the underlying login account completely across all portals (buyer & seller).",
                true,
                true,
                "Suspend Account",
              )
            }
          >
            Lock User Account
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            disabled={isLoading}
            onClick={() =>
              openModal(
                "activate_account",
                "Unlock User Account",
                "Restore the user account to active status.",
                false,
                false,
                "Unlock Account",
              )
            }
          >
            Unlock User Account
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

export function DocumentReviewButtons({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReview = async (status: "approved" | "rejected") => {
    setLoading(true);
    try {
      await reviewDocumentAction({
        documentId,
        status,
        reason: status === "rejected" ? "Document does not meet verification requirements." : undefined,
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={loading}
        onClick={() => handleReview("approved")}
        className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors"
      >
        Approve Doc
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => handleReview("rejected")}
        className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
      >
        Reject Doc
      </button>
    </div>
  );
}

