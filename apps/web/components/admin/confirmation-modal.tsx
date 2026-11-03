"use client";

import { useState } from "react";
import { Button } from "@stone/ui";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requiresReason?: boolean;
  reasonPlaceholder?: string;
  reasonMinLength?: number;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  requiresReason = false,
  reasonPlaceholder = "Provide a mandatory reason (at least 10 characters)...",
  reasonMinLength = 10,
}: ConfirmationModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (requiresReason && reason.trim().length < reasonMinLength) {
      setError(`Please provide a reason of at least ${reasonMinLength} characters.`);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim() || undefined);
      setReason("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-stone-400">{description}</p>

        {requiresReason && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-stone-300">
              Reason / Feedback <span className="text-amber-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-3 text-xs text-stone-200 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <div className="mt-1 flex justify-between text-[11px] text-stone-500">
              <span>{reason.trim().length} / {reasonMinLength} min chars</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={() => {
              setReason("");
              setError(null);
              onClose();
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "accent"}
            size="sm"
            loading={isSubmitting}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

