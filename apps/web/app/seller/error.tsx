"use client";

import { Button, ErrorState } from "@stone/ui";

export default function SellerErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-8">
      <ErrorState
        title="Unable to load Seller Portal data"
        description={
          error.message ||
          "A temporary issue prevented loading your seller workspace. Please retry."
        }
        action={
          <Button variant="primary" onClick={reset}>
            Retry Loading
          </Button>
        }
      />
    </div>
  );
}

