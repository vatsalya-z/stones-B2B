"use client";

import { Button, ErrorState } from "@stone/ui";

export default function BuyerMessagesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8">
      <ErrorState
        title="Unable to load Messages"
        description="We encountered a temporary issue loading your supplier conversations. Your messages and attachments remain safe."
        action={
          <Button variant="primary" onClick={reset}>
            Retry Loading
          </Button>
        }
      />
    </div>
  );
}

