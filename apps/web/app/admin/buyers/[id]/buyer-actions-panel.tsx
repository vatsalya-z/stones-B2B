"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@stone/ui";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";
import { setAccountStatusAction } from "@/features/admin/actions";

interface BuyerActionsPanelProps {
  userId: string;
  accountStatus: string;
}

export function BuyerActionsPanel({ userId, accountStatus }: BuyerActionsPanelProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleOpenSuspend = () => {
    setIsSuspending(true);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleOpenReactivate = () => {
    setIsSuspending(false);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleConfirm = async (reason?: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await setAccountStatusAction({
        userId,
        status: isSuspending ? "suspended" : "active",
        reason,
      });

      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Failed to update account status." });
        return;
      }

      setFeedback({ type: "success", text: "Account status updated successfully." });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <h3 className="text-sm font-semibold text-white">Buyer Account Status Controls</h3>
      <p className="mt-1 text-xs text-stone-400">
        Suspend or reactivate this buyer account. Suspended buyers cannot place new enquiries or communicate.
      </p>

      {feedback && (
        <div
          className={`mt-4 rounded-lg border p-3 text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        {accountStatus === "active" ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={loading}
            onClick={handleOpenSuspend}
          >
            Suspend Buyer Account
          </Button>
        ) : (
          <Button
            variant="accent"
            size="sm"
            disabled={loading}
            onClick={handleOpenReactivate}
          >
            Reactivate Buyer Account
          </Button>
        )}
      </div>

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        title={isSuspending ? "Suspend Buyer Account" : "Reactivate Buyer Account"}
        description={
          isSuspending
            ? "Suspending this account prevents the user from logging in and submitting RFQs or enquiries across the marketplace."
            : "Reactivate this buyer account, restoring normal access to enquiries and quotations."
        }
        requiresReason={isSuspending}
        isDestructive={isSuspending}
        confirmLabel={isSuspending ? "Suspend Account" : "Reactivate"}
      />
    </div>
  );
}

