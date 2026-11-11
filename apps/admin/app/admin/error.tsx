"use client";

import { useEffect } from "react";
import { Button } from "@stone/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Portal Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-base font-bold text-white">Administrative Operation Failed</h2>
      <p className="mt-2 max-w-md text-xs text-stone-400">
        {error.message || "An unexpected error occurred while processing administrative data."}
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" size="sm" onClick={() => (window.location.href = "/admin/dashboard")}>
          Return to Dashboard
        </Button>
        <Button variant="accent" size="sm" onClick={() => reset()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}

