"use client";

import { useState, useTransition } from "react";
import { Button } from "@stone/ui";
import { changeBuyerPasswordAction } from "@/features/buyer/actions";

export function BuyerPasswordChangeForm() {
  const [isPending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await changeBuyerPasswordAction({
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        setError(res.error || "Unable to update password.");
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your account password has been updated securely.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs font-semibold text-green-800"
          role="status"
        >
          {success}
        </div>
      )}

      <div>
        <label htmlFor="settings-new-password" className="block text-xs font-semibold text-stone-700 mb-1">
          New Password *
        </label>
        <input
          id="settings-new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 10 chars, upper + lower + number"
          className="input-base"
        />
      </div>

      <div>
        <label htmlFor="settings-confirm-password" className="block text-xs font-semibold text-stone-700 mb-1">
          Confirm New Password *
        </label>
        <input
          id="settings-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          className="input-base"
        />
      </div>

      <Button type="submit" variant="primary" size="sm" loading={isPending}>
        {isPending ? "Updating Password…" : "Update Password"}
      </Button>
    </form>
  );
}

