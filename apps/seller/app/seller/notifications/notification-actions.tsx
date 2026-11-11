"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markAllSellerNotificationsReadAction,
  markSellerNotificationReadAction,
} from "@/features/messaging/actions";

export function MarkSellerNotificationReadButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markSellerNotificationReadAction(notificationId);
          router.refresh();
        })
      }
      className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline disabled:opacity-50"
    >
      {isPending ? "Saving..." : "Mark Read"}
    </button>
  );
}

export function MarkAllSellerNotificationsReadButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || isPending}
      onClick={() =>
        startTransition(async () => {
          await markAllSellerNotificationsReadAction();
          router.refresh();
        })
      }
      className="rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Marking..." : "Mark All Read"}
    </button>
  );
}

