"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, CardBody, EmptyState, SectionHeading, VerifiedBadge, cn } from "@stone/ui";
import type { MessageSenderRole } from "@stone/types";
import type { ConversationInboxTab } from "@stone/validation";
import { formatDateTime } from "@/components/seller/status-badges";
import { toggleArchiveConversationAction } from "@/features/messaging/actions";
import type {
  ConversationInboxResult,
  ConversationListItem,
} from "@/features/messaging/queries";

export interface ConversationInboxProps {
  viewerRole: MessageSenderRole;
  viewerUserId: string;
  inbox: ConversationInboxResult;
}

export function ConversationInbox({
  viewerRole,
  viewerUserId,
  inbox,
}: ConversationInboxProps) {
  const router = useRouter();
  const basePath = viewerRole === "buyer" ? "/buyer/messages" : "/seller/messages";
  const [searchInput, setSearchInput] = useState(inbox.search);
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buildFilterHref = (overrides: {
    tab?: ConversationInboxTab;
    search?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    const tab = overrides.tab ?? inbox.tab;
    const search = overrides.search !== undefined ? overrides.search.trim() : inbox.search;
    const page = overrides.page ?? 1;

    if (tab !== "active") params.set("tab", tab);
    if (search) params.set("search", search);
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildFilterHref({ search: searchInput, page: 1 }));
  };

  const handleArchiveToggle = (item: ConversationListItem) => {
    setPendingArchiveId(item.id);
    startTransition(async () => {
      await toggleArchiveConversationAction(item.id, !item.isArchived, viewerRole);
      setPendingArchiveId(null);
      router.refresh();
    });
  };

  const tabs: { key: ConversationInboxTab; label: string; count: number }[] = [
    { key: "active", label: "Active", count: inbox.counts.active },
    { key: "unread", label: "Unread", count: inbox.counts.unread },
    { key: "archived", label: "Archived", count: inbox.counts.archived },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading
          title="Messages"
          subtitle={
            viewerRole === "buyer"
              ? "Direct real-time discussions with verified stone manufacturers, quarry owners, and suppliers."
              : "Respond to buyer stone specifications, share slab photos or PDF drawings, and negotiate quotations."
          }
        />

        <div className="inline-flex self-start rounded-xl border border-stone-200 bg-white p-1 text-xs font-semibold sm:self-auto">
          {tabs.map((t) => {
            const active = inbox.tab === t.key;
            return (
              <Link
                key={t.key}
                href={buildFilterHref({ tab: t.key, page: 1 })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors",
                  active
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
                )}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    active
                      ? "bg-white/20 text-white"
                      : t.key === "unread" && t.count > 0
                        ? "bg-amber-100 text-amber-900 font-bold"
                        : "bg-stone-100 text-stone-600",
                  )}
                >
                  {t.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardBody className="p-3.5 sm:p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.85}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={
                  viewerRole === "buyer"
                    ? "Search by supplier name, stone product, enquiry subject, or message..."
                    : "Search by buyer name, company, stone product, enquiry subject, or message..."
                }
                aria-label="Search conversations"
                className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/15"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Search
              </button>
              {inbox.search && (
                <Link
                  href={buildFilterHref({ search: "", page: 1 })}
                  onClick={() => setSearchInput("")}
                  className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Conversation List */}
      {inbox.items.length === 0 ? (
        <Card>
          <CardBody className="p-10">
            <EmptyState
              title={
                inbox.search
                  ? "No matching conversations"
                  : inbox.tab === "unread"
                    ? "No unread messages"
                    : inbox.tab === "archived"
                      ? "No archived conversations"
                      : "No conversations yet"
              }
              description={
                inbox.search
                  ? "Try clearing your search filter or switching between Active and Archived tabs."
                  : viewerRole === "buyer"
                    ? "Start a direct conversation from any verified supplier storefront, stone product page, or submitted enquiry."
                    : "When buyers message your business about stone products, RFQs, or quotations, threads appear here in real time."
              }
              action={
                viewerRole === "buyer" ? (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/products"
                      className="inline-flex rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                    >
                      Browse Stone Products
                    </Link>
                    <Link
                      href="/suppliers"
                      className="inline-flex rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                    >
                      Explore Verified Suppliers
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/seller/enquiries"
                    className="inline-flex rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                  >
                    Open Buyer Enquiries
                  </Link>
                )
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-stone-200 bg-white">
            {inbox.items.map((item) => {
              const hasUnread = item.unreadCount > 0;
              const isOwnLastMsg = item.lastMessageSenderId === viewerUserId;
              const initials = item.counterparty.displayName.charAt(0).toUpperCase();

              return (
                <li
                  key={item.id}
                  className={cn(
                    "transition-colors",
                    hasUnread ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-stone-50/80",
                  )}
                >
                  <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
                    <Link
                      href={`${basePath}/${item.id}`}
                      className="flex min-w-0 flex-1 items-start gap-3.5"
                    >
                      {/* Avatar */}
                      <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-sm font-bold text-stone-800">
                        {item.counterparty.avatarUrl ? (
                          <Image
                            src={item.counterparty.avatarUrl}
                            alt={item.counterparty.displayName}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "truncate text-sm",
                                hasUnread
                                  ? "font-bold text-stone-950"
                                  : "font-semibold text-stone-900",
                              )}
                            >
                              {item.counterparty.displayName}
                            </span>
                            {item.counterparty.isVerified && <VerifiedBadge />}
                            {item.counterparty.location && (
                              <span className="text-xs text-stone-500">
                                · {item.counterparty.location}
                              </span>
                            )}
                          </div>

                          <span className="flex-shrink-0 text-xs text-stone-400">
                            {formatDateTime(item.lastMessageAt)}
                          </span>
                        </div>

                        <p
                          className={cn(
                            "truncate text-xs",
                            hasUnread ? "font-semibold text-stone-900" : "font-medium text-stone-700",
                          )}
                        >
                          {item.subject}
                        </p>

                        <p
                          className={cn(
                            "line-clamp-1 text-xs",
                            hasUnread ? "font-medium text-stone-800" : "text-stone-500",
                          )}
                        >
                          {item.lastMessagePreview ? (
                            <>
                              {isOwnLastMsg ? (
                                <span className="font-semibold text-stone-600">You: </span>
                              ) : null}
                              {item.lastMessagePreview}
                            </>
                          ) : (
                            <span className="italic text-stone-400">
                              Conversation opened — send the first message
                            </span>
                          )}
                        </p>

                        {/* Context Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {item.enquiry && (
                            <Badge variant="default">
                              Enquiry: {item.enquiry.quantity.toLocaleString("en-IN")}{" "}
                              {item.enquiry.unit.replace(/_/g, " ")} ({item.enquiry.status})
                            </Badge>
                          )}
                          {item.enquiry?.latestQuotation && (
                            <Badge variant="secondary">
                              {item.enquiry.latestQuotation.quoteNumber} ·{" "}
                              {item.enquiry.latestQuotation.status}
                            </Badge>
                          )}
                          {item.product && (
                            <Badge variant="secondary">Stone: {item.product.name}</Badge>
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* Right Controls: Unread Pill + Archive */}
                    <div className="flex flex-col items-end gap-2">
                      {hasUnread && (
                        <span className="inline-flex min-w-[1.45rem] items-center justify-center rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          {item.unreadCount}
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={isPending && pendingArchiveId === item.id}
                        onClick={() => handleArchiveToggle(item)}
                        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
                        title={item.isArchived ? "Move back to active inbox" : "Archive conversation"}
                      >
                        {pendingArchiveId === item.id
                          ? "..."
                          : item.isArchived
                            ? "Unarchive"
                            : "Archive"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Pagination Controls */}
      {inbox.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-600">
          <span>
            Page <strong>{inbox.page}</strong> of <strong>{inbox.totalPages}</strong> (
            {inbox.totalFiltered} conversations)
          </span>
          <div className="flex items-center gap-2">
            {inbox.page > 1 && (
              <Link
                href={buildFilterHref({ page: inbox.page - 1 })}
                className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold text-stone-800 hover:bg-stone-50"
              >
                ← Previous
              </Link>
            )}
            {inbox.page < inbox.totalPages && (
              <Link
                href={buildFilterHref({ page: inbox.page + 1 })}
                className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold text-stone-800 hover:bg-stone-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

