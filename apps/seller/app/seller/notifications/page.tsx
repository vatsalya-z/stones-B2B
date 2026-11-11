import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, CardBody, EmptyState, SectionHeading } from "@stone/ui";
import { formatDateTime } from "@/components/seller/status-badges";
import { getSellerNotifications } from "@/features/messaging/queries";
import { getSellerContext } from "@/features/seller/queries";
import {
  MarkAllSellerNotificationsReadButton,
  MarkSellerNotificationReadButton,
} from "./notification-actions";

export const metadata: Metadata = {
  title: "Notifications",
};

interface SellerNotificationsPageProps {
  searchParams: Promise<{ filter?: string }>;
}

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  enquiry_received: "New Enquiry",
  enquiry_viewed: "Enquiry Update",
  quotation_received: "Quotation Update",
  quotation_accepted: "Quotation Accepted",
  quotation_rejected: "Quotation Declined",
  message_received: "Buyer Message",
  seller_verification: "Business Verification",
  product_moderation: "Catalogue Moderation",
  account_status: "Account Security",
  system: "Platform Update",
};

export default async function SellerNotificationsPage({
  searchParams,
}: SellerNotificationsPageProps) {
  const [ctx, sp] = await Promise.all([getSellerContext(), searchParams]);
  const filter = sp.filter === "unread" ? "unread" : "all";
  const view = await getSellerNotifications(
    ctx.user.id,
    ctx.sellerProfile?.id ?? null,
    filter,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <SectionHeading
          title={`Notifications (${view.unreadCount} unread)`}
          subtitle="Real-time alerts for new buyer stone enquiries, chat messages, quotation decisions, and catalogue moderation."
        />

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-xs font-semibold">
            <Link
              href="/seller/notifications"
              className={`rounded-lg px-3 py-1.5 ${
                filter === "all"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All
            </Link>
            <Link
              href="/seller/notifications?filter=unread"
              className={`rounded-lg px-3 py-1.5 ${
                filter === "unread"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Unread ({view.unreadCount})
            </Link>
          </div>

          <MarkAllSellerNotificationsReadButton disabled={view.unreadCount === 0} />
        </div>
      </div>

      {view.items.length === 0 ? (
        <Card>
          <CardBody className="p-10">
            <EmptyState
              title={
                filter === "unread"
                  ? "You are all caught up"
                  : "No notifications yet"
              }
              description="Alerts for buyer enquiries, chat messages, quotation acceptances, and verification updates appear here automatically."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/seller/enquiries"
                    className="inline-flex rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                  >
                    Open Enquiries
                  </Link>
                  <Link
                    href="/seller/messages"
                    className="inline-flex rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    Open Messages
                  </Link>
                </div>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-stone-200 bg-white">
            {view.items.map((n) => (
              <li
                key={n.id}
                className={`p-5 transition-colors ${
                  n.isRead ? "bg-white" : "bg-amber-50/40"
                }`}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.isRead && (
                        <span
                          className="inline-block h-2 w-2 rounded-full bg-amber-600"
                          aria-label="Unread"
                        />
                      )}
                      <Badge variant={n.isRead ? "secondary" : "default"}>
                        {NOTIFICATION_TYPE_LABELS[n.notificationType] ?? n.notificationType}
                      </Badge>
                      <span className="text-xs text-stone-400">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-stone-900">{n.title}</h3>
                    <p className="text-xs leading-relaxed text-stone-600">{n.message}</p>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center">
                    {n.href && (
                      <Link
                        href={n.href}
                        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                      >
                        Open Record →
                      </Link>
                    )}
                    {!n.isRead && (
                      <MarkSellerNotificationReadButton notificationId={n.id} />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

