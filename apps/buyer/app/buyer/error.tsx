"use client";

import { useEffect } from "react";
import { Button, ErrorState } from "@stone/ui";

export default function BuyerPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // NEXT_REDIRECT errors should never be caught here — if they surface,
    // it means the redirect occurred inside a cached function. Re-trigger
    // navigation by reloading the page so the redirect completes normally.
    if (error?.message?.includes("NEXT_REDIRECT") || error?.digest?.includes("NEXT_REDIRECT")) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8">
      <ErrorState
        title="Unable to load Buyer Workspace"
        description="We encountered a temporary issue retrieving your buyer records. Your enquiries and quotations remain safe."
        action={
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Button variant="primary" onClick={reset}>
              Retry Loading
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Sign In Again
            </Button>
          </div>
        }
      />
    </div>
  );
}
