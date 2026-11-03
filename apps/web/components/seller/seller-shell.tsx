"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@stone/ui";
import type { VerificationStatus } from "@stone/types";
import { useRealtimePortalBadges } from "@/features/messaging/use-realtime-messaging";
import { VerificationStatusBadge } from "./status-badges";

export interface SellerShellProps {
  children: ReactNode;
  userId?: string;
  sellerId?: string | null;
  hasBuyerRole?: boolean;
  userEmail: string | null;
  businessName: string | null;
  businessSlug: string | null;
  logoUrl: string | null;
  verificationStatus: VerificationStatus | null;
  unreadEnquiriesCount: number;
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
}

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  badgeCount?: number;
  icon: ReactNode;
}

const SELLER_ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Products",
  enquiries: "Enquiries",
  quotes: "Quotations",
  orders: "Orders",
  messages: "Messages",
  notifications: "Notifications",
  profile: "Business Profile",
  verification: "Verification",
  store: "Store Settings",
  analytics: "Analytics",
  new: "New",
  edit: "Edit",
};

export function SellerShell({
  children,
  userId,
  sellerId = null,
  hasBuyerRole = false,
  userEmail,
  businessName,
  businessSlug,
  logoUrl,
  verificationStatus,
  unreadEnquiriesCount,
  unreadMessagesCount = 0,
  unreadNotificationsCount = 0,
}: SellerShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { unreadMessages: liveUnreadMessages, unreadNotifications: liveUnreadNotifications } =
    useRealtimePortalBadges({
      userId,
      viewerRole: "seller",
      sellerId,
      initialUnreadMessages: unreadMessagesCount,
      initialUnreadNotifications: unreadNotificationsCount,
    });

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/seller/dashboard",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      label: "Products",
      href: "/seller/products",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
    },
    {
      label: "Enquiries",
      href: "/seller/enquiries",
      badgeCount: unreadEnquiriesCount,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      label: "Quotations",
      href: "/seller/quotes",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      label: "Orders",
      href: "/seller/orders",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75A1.125 1.125 0 0013.125 2.625H4.875A1.125 1.125 0 003.75 3.75v10.5" />
        </svg>
      ),
    },
    {
      label: "Messages",
      href: "/seller/messages",
      badgeCount: liveUnreadMessages,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
    },
    {
      label: "Notifications",
      href: "/seller/notifications",
      badgeCount: liveUnreadNotifications,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
    },
    {
      label: "Business Profile",
      href: "/seller/profile",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      ),
    },
    {
      label: "Verification",
      href: "/seller/verification",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      label: "Store Settings",
      href: "/seller/store",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>
      ),
    },
    {
      label: "Analytics",
      href: "/seller/analytics",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const activeNav = navItems.find(isActive);
  const initials = (businessName || userEmail || "S").charAt(0).toUpperCase();

  // Compute shell breadcrumbs dynamically from pathname segments
  const rawSegments = pathname.split("/").filter(Boolean).slice(1); // after "seller"
  const crumbItems = rawSegments.map((seg, idx) => {
    const href = `/seller/${rawSegments.slice(0, idx + 1).join("/")}`;
    const isUuid = /^[0-9a-f-]{20,}$/i.test(seg);
    const label = isUuid
      ? `#${seg.slice(0, 8).toUpperCase()}`
      : (SELLER_ROUTE_LABELS[seg] ?? seg.replace(/-/g, " "));
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
          <Link href="/seller/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 font-bold text-white text-sm shadow-xs">
              S
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-stone-900">StonesDekho</span>
              <span className="text-[10px] uppercase font-semibold text-amber-700 tracking-wider">
                Seller Portal
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
        {/* Seller Identity Card */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-white text-sm font-bold text-stone-800">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={businessName || "Seller logo"}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900">
                {businessName || "Setup Seller Profile"}
              </p>
              <p className="truncate text-xs text-stone-500">Seller Portal</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <VerificationStatusBadge status={verificationStatus ?? "draft"} />
            {businessSlug && verificationStatus === "verified" && (
              <Link
                href={`/suppliers/${businessSlug}`}
                onClick={onNavigate}
                className="text-xs font-medium text-amber-700 hover:text-amber-800 hover:underline"
              >
                View Store ↗
              </Link>
            )}
          </div>

          {hasBuyerRole && (
            <div className="mt-2.5 flex items-center justify-between border-t border-stone-200/80 pt-2.5">
              <span className="text-[11px] font-medium text-stone-500">Dual Account</span>
              <Link
                href="/buyer/dashboard"
                onClick={onNavigate}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline"
              >
                Buyer Portal ↗
              </Link>
            </div>
          )}
        </div>

        {/* Primary Quick Action */}
        <Link
          href="/seller/products/new"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-stone-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add New Product
        </Link>

        {/* Navigation Links */}
        <nav className="space-y-1" aria-label="Seller Portal Navigation">
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

      {/* Footer / Account Sign Out */}
      <div className="border-t border-stone-200 p-4">
        {userEmail && (
          <p className="mb-2 truncate text-xs text-stone-500" title={userEmail}>
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
    <div className="min-h-screen bg-stone-50">
      {/* Mobile / Tablet Seller Sub-header */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50"
          aria-expanded={mobileOpen}
          aria-label="Open seller navigation menu"
        >
          <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          <span className="truncate max-w-[150px] sm:max-w-none">
            {activeNav?.label ?? "Seller Portal"}
          </span>
          {(unreadEnquiriesCount > 0 || liveUnreadMessages > 0 || liveUnreadNotifications > 0) && (
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/seller/messages"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            aria-label="Seller messages"
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
            href="/seller/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            aria-label="Seller notifications"
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
            href="/seller/products/new"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-stone-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-stone-950/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex w-80 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3.5">
              <span className="text-sm font-bold tracking-tight text-stone-900">
                Seller Workspace
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                aria-label="Close seller menu"
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
        <aside className="hidden w-64 flex-shrink-0 border-r border-stone-200 bg-white lg:block">
          <div className="sticky top-0 max-h-screen overflow-y-auto">
            {renderSidebarContent()}
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {/* Desktop Workspace Header Bar (Breadcrumbs + Actions) */}
            <div className="hidden lg:flex items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-3 shadow-xs">
              <nav aria-label="Portal breadcrumb" className="flex items-center gap-2 text-xs text-stone-500">
                <Link href="/seller/dashboard" className="font-medium text-stone-700 hover:text-amber-700">
                  Seller Portal
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
                  href="/seller/messages"
                  className="relative inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
                >
                  <svg className="h-4 w-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <span>Messages</span>
                  {liveUnreadMessages > 0 && (
                    <span className="inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                      {liveUnreadMessages}
                    </span>
                  )}
                </Link>

                <Link
                  href="/seller/notifications"
                  className="relative inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
                >
                  <svg className="h-4 w-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <span>Alerts</span>
                  {liveUnreadNotifications > 0 && (
                    <span className="inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                      {liveUnreadNotifications}
                    </span>
                  )}
                </Link>

                <Link
                  href="/seller/products/new"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-stone-800"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>+ Product</span>
                </Link>
              </div>
            </div>

            <div>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

