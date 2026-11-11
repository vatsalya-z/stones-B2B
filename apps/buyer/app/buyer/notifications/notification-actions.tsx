"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@stone/ui";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/buyer/actions";

export function MarkNotificationReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await markNotificationReadAction(notificationId);
          router.refresh();
        });
      }}
      className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline disabled:opacity-50"
    >
      {isPending ? "Saving…" : "Mark as read"}
    </button>
  );
}

export function MarkAllNotificationsReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={disabled}
      loading={isPending}
      onClick={() => {
        startTransition(async () => {
          await markAllNotificationsReadAction();
          router.refresh();
        });
      }}
    >
      Mark All as Read
    </Button>
  );
}

