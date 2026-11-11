"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@stone/ui";
import { useRealtimePortalBadges } from "@/features/messaging/use-realtime-messaging";

export interface BuyerShellProps {
  children: ReactNode;
  userId?: string;
  userEmail: string | null;
  buyerName: string | null;
  companyName: string | null;
  unreadNotificationsCount: number;
  unreadMessagesCount?: number;
  pendingQuotationsCount: number;
  hasSellerRole: boolean;
}

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  badgeCount?: number;
  icon: ReactNode;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  profile: "Buyer Profile",
  addresses: "Delivery Addresses",
  enquiries: "My Enquiries",
  rfqs: "RFQs",
  new: "Create New RFQ",
  quotes: "Received Quotations",
  quotations: "Received Quotations",
  orders: "My Orders",
  compare: "Compare Quotations",
  messages: "Messages",
  favourites: "Saved Products",
  notifications: "Notifications",
  settings: "Account Settings",
};

export function BuyerShell({
  children,
  userId,
  userEmail,
  buyerName,
  companyName,
  unreadNotificationsCount,
  unreadMessagesCount = 0,
  pendingQuotationsCount,
  hasSellerRole,
}: BuyerShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { unreadMessages: liveUnreadMessages, unreadNotifications: liveUnreadNotifications } =
    useRealtimePortalBadges({
      userId,
      viewerRole: "buyer",
      initialUnreadMessages: unreadMessagesCount,
      initialUnreadNotifications: unreadNotificationsCount,
    });

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/buyer/dashboard",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      label: "My Enquiries",
      href: "/buyer/enquiries",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      label: "RFQs",
      href: "/buyer/rfqs",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      ),
    },
    {
      label: "Quotations",
      href: "/buyer/quotes",
      exact: true,
      badgeCount: pendingQuotationsCount,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      label: "My Orders",
      href: "/buyer/orders",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75A1.125 1.125 0 0013.125 2.625H4.875A1.125 1.125 0 003.75 3.75v10.5" />
        </svg>
      ),
    },
    {
      label: "Compare Quotes",
      href: "/buyer/quotes/compare",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
    },
    {
      label: "Messages",
      href: "/buyer/messages",
      badgeCount: liveUnreadMessages,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
    },
    {
      label: "Saved Products",
      href: "/buyer/favourites",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      label: "Notifications",
      href: "/buyer/notifications",
      badgeCount: liveUnreadNotifications,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
    },
    {
      label: "Buyer Profile",
      href: "/buyer/profile",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      label: "Delivery Addresses",
      href: "/buyer/addresses",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
    },
    {
      label: "Settings",
      href: "/buyer/settings",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return (
        pathname === item.href ||
        (pathname.startsWith(`${item.href}/`) && !pathname.startsWith("/buyer/quotes/compare"))
      );
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const activeNav = navItems.find(isActive);
  const displayName = buyerName || userEmail || "StonesDekho Buyer";
  const initials = displayName.charAt(0).toUpperCase();

  // Compute shell breadcrumbs dynamically from pathname segments
  const rawSegments = pathname.split("/").filter(Boolean).slice(1); // after "buyer"
  const crumbItems = rawSegments.map((seg, idx) => {
    const href = `/buyer/${rawSegments.slice(0, idx + 1).join("/")}`;
    const isUuid = /^[0-9a-f-]{20,}$/i.test(seg);
    const label = isUuid
      ? `#${seg.slice(0, 8).toUpperCase()}`
      : (ROUTE_LABELS[seg] ?? seg.replace(/-/g, " "));
    return {
      label,
      href: idx < rawSegments.length - 1 ? href : undefined,
    };
  });

  const renderSidebarContent = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-stone-200 px-5">
          <Link href="/buyer/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 font-bold text-white text-sm shadow-xs">
              S
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-stone-900">StonesDekho</span>
              <span className="text-[10px] uppercase font-semibold text-amber-700 tracking-wider">
                Buyer Portal
              </span>
            </div>
          </Link>
          <Link
            href="/"
            onClick={onNavigate}
            className="text-[11px] font-medium text-stone-500 hover:text-amber-700 hover:underline"
            title="Go to Public Marketplace"
          >
            Marketplace ↗
          </Link>
        </div>

        <div className="space-y-5 p-4">
        {/* Buyer Identity Card */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-amber-50 text-sm font-bold text-amber-900">
              <span>{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900">
                {displayName}
              </p>
              <p className="truncate text-xs text-stone-500">
                {companyName || "Buyer Procurement Portal"}
              </p>
            </div>
          </div>

          {hasSellerRole && (
            <div className="mt-3 border-t border-stone-200/80 pt-2.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-stone-500">Dual Account</span>
              <Link
                href="/seller/dashboard"
                onClick={onNavigate}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline"
              >
                Seller Portal ↗
              </Link>
            </div>
          )}
        </div>

        {/* Primary Quick Action */}
        <Link
          href="/buyer/rfqs/new"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create New RFQ
        </Link>

        {/* Navigation Links */}
        <nav className="space-y-1" aria-label="Buyer Portal Navigation">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-600/20"
                    : "text-stone-700 hover:bg-stone-100 hover:text-stone-950",
                )}
              >
                <span className="flex items-center gap-3">
                  <span className={cn(active ? "text-amber-700" : "text-stone-500")}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
                {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                  <span className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>

      {/* Footer / Marketplace shortcut + Sign Out */}
      <div className="border-t border-stone-200 p-4 space-y-2.5">
        <Link
          href="/products"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
        >
          Browse Stone Catalogue ↗
        </Link>
        {userEmail && (
          <p className="truncate text-xs text-stone-500" title={userEmail}>
            Signed in as <span className="font-medium text-stone-700">{userEmail}</span>
          </p>
        )}
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 print:bg-white">
      {/* Mobile / Tablet Buyer Sub-header */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50"
          aria-expanded={mobileOpen}
          aria-label="Open buyer navigation menu"
        >
          <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          <span className="truncate max-w-[140px] sm:max-w-none">
            {activeNav?.label ?? "Buyer Portal"}
          </span>
          {(liveUnreadNotifications > 0 || liveUnreadMessages > 0 || pendingQuotationsCount > 0) && (
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/buyer/messages"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            aria-label="Buyer messages"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {liveUnreadMessages > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                {liveUnreadMessages}
              </span>
            )}
          </Link>

          <Link
            href="/buyer/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            aria-label="Buyer notifications"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {liveUnreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                {liveUnreadNotifications}
              </span>
            )}
          </Link>

          <Link
            href="/buyer/rfqs/new"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New RFQ</span>
          </Link>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden print:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-stone-950/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex w-80 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3.5">
              <span className="text-sm font-bold tracking-tight text-stone-900">
                Buyer Workspace
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                aria-label="Close buyer menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderSidebarContent(() => setMobileOpen(false))}
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Split Workspace */}
      <div className="mx-auto flex w-full max-w-8xl">
        <aside className="hidden w-64 flex-shrink-0 border-r border-stone-200 bg-white lg:block print:hidden">
          <div className="sticky top-0 max-h-screen overflow-y-auto">
            {renderSidebarContent()}
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 print:p-0">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {/* Desktop Workspace Header Bar (Breadcrumbs + Notification Bell + Buyer Account Pill) */}
            <div className="hidden lg:flex items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-3 shadow-xs print:hidden">
              <nav aria-label="Portal breadcrumb" className="flex items-center gap-2 text-xs text-stone-500">
                <Link href="/buyer/dashboard" className="font-medium text-stone-700 hover:text-amber-700">
                  Buyer Portal
                </Link>
                {crumbItems.map((item, idx) => (
                  <span key={`${item.label}-${idx}`} className="flex items-center gap-2">
                    <span className="text-stone-300">/</span>
                    {item.href ? (
                      <Link href={item.href} className="hover:text-stone-900 capitalize">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-stone-900 capitalize">{item.label}</span>
                    )}
                  </span>
                ))}
              </nav>

              <div className="flex items-center gap-3">
                <Link
                  href="/buyer/messages"
                  className="relative inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
                >
                  <svg className="h-4 w-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <span>Messages</span>
                  {liveUnreadMessages > 0 && (
                    <span className="inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {liveUnreadMessages}
                    </span>
                  )}
                </Link>

                <Link
                  href="/buyer/notifications"
                  className="relative inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
                >
                  <svg className="h-4 w-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <span>Notifications</span>
                  {liveUnreadNotifications > 0 && (
                    <span className="inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {liveUnreadNotifications}
                    </span>
                  )}
                </Link>

                <Link
                  href="/buyer/profile"
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-900">
                    {initials}
                  </span>
                  <span className="max-w-[140px] truncate">{displayName}</span>
                </Link>
              </div>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

