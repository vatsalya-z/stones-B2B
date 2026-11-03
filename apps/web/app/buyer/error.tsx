"use client";

import { Button, ErrorState } from "@stone/ui";

export default function BuyerPortalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8">
      <ErrorState
        title="Unable to load Buyer Workspace"
        description="We encountered a temporary issue retrieving your buyer records. Your enquiries and quotations remain safe."
        action={
          <Button variant="primary" onClick={reset}>
            Retry Loading
          </Button>
        }
      />
    </div>
  );
}
