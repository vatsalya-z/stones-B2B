import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, CardBody, EmptyState, SectionHeading } from "@stone/ui";
import { formatDateTime } from "@/components/seller/status-badges";
import { getBuyerContext, getBuyerNotifications } from "@/features/buyer/queries";
import {
  MarkAllNotificationsReadButton,
  MarkNotificationReadButton,
} from "./notification-actions";

export const metadata: Metadata = {
  title: "Notifications",
};

interface BuyerNotificationsPageProps {
  searchParams: Promise<{ filter?: string }>;
}

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  enquiry_received: "Enquiry Received",
  enquiry_viewed: "Enquiry Viewed",
  quotation_received: "Quotation Received",
  quotation_accepted: "Quotation Accepted",
  quotation_rejected: "Quotation Declined",
  message_received: "Message",
  seller_verification: "Supplier Verification",
  product_moderation: "Catalogue Update",
  account_status: "Account Security",
  system: "Platform Update",
};

export default async function BuyerNotificationsPage({
  searchParams,
}: BuyerNotificationsPageProps) {
  const [ctx, sp] = await Promise.all([getBuyerContext(), searchParams]);
  const filter = sp.filter === "unread" ? "unread" : "all";
  const view = await getBuyerNotifications(ctx.user.id, filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeading
          title={`Notifications (${view.unreadCount} unread)`}
          subtitle="Updates regarding your natural stone enquiries, supplier quotations, and account status."
        />

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-xs font-semibold">
            <Link
              href="/buyer/notifications"
              className={`rounded-lg px-3 py-1.5 ${
                filter === "all"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All
            </Link>
            <Link
              href="/buyer/notifications?filter=unread"
              className={`rounded-lg px-3 py-1.5 ${
                filter === "unread"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Unread ({view.unreadCount})
            </Link>
          </div>

          <MarkAllNotificationsReadButton disabled={view.unreadCount === 0} />
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
              description="System and procurement notifications generated for your buyer account appear here. Check My Enquiries and Quotations anytime for live status updates."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/buyer/quotes"
                    className="inline-flex rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                  >
                    View Received Quotations
                  </Link>
                  <Link
                    href="/buyer/enquiries"
                    className="inline-flex rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    View My Enquiries
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
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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
                    <p className="text-xs text-stone-600 leading-relaxed">{n.message}</p>
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
                    {!n.isRead && <MarkNotificationReadButton notificationId={n.id} />}
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

