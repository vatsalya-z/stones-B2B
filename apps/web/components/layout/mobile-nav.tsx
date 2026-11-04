"use client";

import { useState, useEffect, useRef, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Layers,
  Building2,
  LayoutGrid,
  HelpCircle,
  FileText,
  FileCheck2,
  ShoppingBag,
  User,
  ChevronRight,
  X,
  ShieldCheck,
  BadgePercent,
  Globe,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { cn } from "@stone/ui";

interface MobileNavProps {
  isLoggedIn: boolean;
  userEmail?: string | null;
  userName?: string | null;
  isBuyer?: boolean;
  isSeller?: boolean;
  isAdmin?: boolean;
}

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

function StoneLogoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-7 w-7 text-[#D99A35] transition-transform group-hover:scale-105"
      aria-hidden="true"
    >
      <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
    </svg>
  );
}

export function MobileNav({
  isLoggedIn,
  userEmail,
  userName,
  isBuyer = false,
  isSeller = false,
  isAdmin = false,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Handle Escape key to close & restore focus
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Prevent background body scroll when open and manage focus
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  // Determine navigation menu rows based on authentication and role
  const getNavItems = (): NavItemConfig[] => {
    const items: NavItemConfig[] = [
      { label: "Home", href: "/", icon: Home },
      { label: "Products", href: "/products", icon: Layers },
      { label: "Suppliers", href: "/suppliers", icon: Building2 },
      { label: "Categories", href: "/categories", icon: LayoutGrid },
      { label: "How It Works", href: "/how-it-works", icon: HelpCircle },
    ];

    if (!isLoggedIn) {
      // Guest users see the public RFQ entry point
      items.push({
        label: "RFQ / Request Quote",
        href: "/request-quote",
        icon: FileText,
      });
      // Quotations and Orders are protected buyer/seller pages — not shown to guests
    } else if (isBuyer) {
      items.push(
        { label: "RFQ / Enquiries", href: "/buyer/rfqs", icon: FileText },
        { label: "Quotations", href: "/buyer/quotes", icon: FileCheck2 },
        { label: "Orders", href: "/buyer/orders", icon: ShoppingBag },
      );
    } else if (isSeller) {
      items.push(
        { label: "RFQ / Enquiries", href: "/seller/enquiries", icon: FileText },
        { label: "Quotations", href: "/seller/quotes", icon: FileCheck2 },
        { label: "Orders", href: "/seller/orders", icon: ShoppingBag },
      );
    } else if (isAdmin) {
      items.push(
        { label: "RFQ / Enquiries", href: "/admin/enquiries", icon: FileText },
        { label: "Quotations", href: "/admin/quotes", icon: FileCheck2 },
        { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
      );
    } else {
      // General authenticated member
      items.push({
        label: "RFQ / Request Quote",
        href: "/request-quote",
        icon: FileText,
      });
    }

    return items;
  };

  const navItems = getNavItems();

  const getPortalLink = () => {
    if (isAdmin) return { href: "/admin/dashboard", label: "Admin Console" };
    if (isSeller) return { href: "/seller/dashboard", label: "Seller Portal" };
    if (isBuyer) return { href: "/buyer/dashboard", label: "Buyer Portal" };
    return { href: "/dashboard", label: "Dashboard" };
  };

  const portal = getPortalLink();
  const roleBadgeLabel = isAdmin ? "Admin" : isSeller ? "Seller" : isBuyer ? "Buyer" : "Member";

  return (
    <>
      {/* ── Luxury Hamburger Trigger ──────────────────────────────────── */}
      <button
        ref={hamburgerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-stone-300/80 bg-white text-stone-800 transition-all duration-200 hover:border-amber-500/60 hover:bg-stone-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/40 lg:hidden shadow-xs"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation-drawer"
      >
        <div className="flex flex-col items-center justify-center gap-1.5 w-5 h-5" aria-hidden="true">
          <span
            className={cn(
              "h-0.5 w-5 rounded-full bg-stone-900 transition-all duration-300 ease-out",
              open && "translate-y-2 rotate-45 bg-amber-600",
            )}
          />
          <span
            className={cn(
              "h-0.5 w-5 rounded-full bg-stone-900 transition-all duration-200 ease-out",
              open && "opacity-0 scale-x-0",
            )}
          />
          <span
            className={cn(
              "h-0.5 w-5 rounded-full bg-stone-900 transition-all duration-300 ease-out",
              open && "-translate-y-2 -rotate-45 bg-amber-600",
            )}
          />
        </div>
      </button>

      {/* ── Backdrop Overlay ────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => {
            setOpen(false);
            hamburgerRef.current?.focus();
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Right-Side Sliding Drawer ───────────────────────────────── */}
      <div
        ref={drawerRef}
        id="mobile-navigation-drawer"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col justify-between overflow-hidden",
          "w-[min(88vw,420px)] h-[100dvh] bg-[#101010] text-[#F7F5F0]",
          "rounded-l-[28px] border-l border-white/[0.12] shadow-[0_0_60px_-15px_rgba(0,0,0,0.95)]",
          "transition-all duration-300 ease-out lg:hidden",
          open
            ? "translate-x-0 visible opacity-100 pointer-events-auto"
            : "translate-x-full invisible opacity-0 pointer-events-none",
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby={titleId}
      >
        {/* Subtle Luxury Dark Marble / Texture Overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-15 bg-radial from-white/[0.08] via-transparent to-transparent"
          aria-hidden="true"
        />

        {/* ── Always Accessible Circular Close Button (Upper-Right) ── */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => {
            setOpen(false);
            hamburgerRef.current?.focus();
          }}
          className="absolute top-[max(18px,env(safe-area-inset-top))] right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-[#F7F5F0] backdrop-blur-md transition-all duration-200 hover:border-[#E8BD78] hover:bg-[#D99A35]/25 hover:text-[#E8BD78] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#D99A35] shadow-lg shadow-black/60"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" strokeWidth={1.8} />
        </button>

        {/* ── Scrollable Drawer Body ────────────────────────────────── */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">
          {/* ── 1. Top Quarry Image Header (210–240px) ───────────────── */}
          <div
            className="relative h-[225px] sm:h-[235px] w-full flex-shrink-0 overflow-hidden bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/backgrounds/stone-quarry-header.jpg')" }}
          >
            {/* Layer 1: Real Quarry Background Photograph */}
            <Image
              src="/images/backgrounds/stone-quarry-header.jpg"
              alt="Natural Stone Quarry Landscape"
              fill
              priority
              className="object-cover object-center pointer-events-none"
              sizes="(max-width: 480px) 100vw, 420px"
              unoptimized
            />

            {/* Layer 2: Dark Charcoal Translucent Tint for Readability */}
            <div
              className="absolute inset-0 bg-[#101010]/35 z-10"
              aria-hidden="true"
            />

            {/* Layer 2b: Subtle Black Gradient from Top to Bottom */}
            <div
              className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/30 to-transparent z-10"
              aria-hidden="true"
            />

            {/* Layer 3: Stronger Bottom Gradient Transitioning into Drawer Background (#101010) */}
            <div
              className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#101010] via-[#101010]/85 to-transparent z-10"
              aria-hidden="true"
            />

            {/* Upper-Left Brand Logo & Tagline */}
            <div className="relative z-20 flex items-start px-5 pt-[max(18px,env(safe-area-inset-top))] pr-16">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 transition-opacity hover:opacity-95"
                id={titleId}
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[#D99A35]/50 bg-gradient-to-br from-[#1c1917]/90 to-[#101010]/95 p-2 shadow-lg shadow-black/70 backdrop-blur-md">
                  <StoneLogoIcon />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-extrabold tracking-tight text-[#F7F5F0] drop-shadow-md">
                    Stone<span className="text-[#D99A35]">B2B</span>
                  </span>
                  <span className="text-[10px] font-medium tracking-tight text-[#E8BD78] drop-shadow-xs leading-tight">
                    India&apos;s Leading Natural Stone B2B Network
                  </span>
                </div>
              </Link>
            </div>
          </div>

          {/* ── 2. Content Body (Overlapping Account Card + Nav + Cards) ── */}
          <div className="relative z-20 px-5 -mt-7 space-y-5 pb-6">
            {/* ── Account Access Section ──────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#191919] to-[#131313] p-4 shadow-xl shadow-black/50 backdrop-blur-sm">
            {isLoggedIn ? (
              // Authenticated Account View
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#D99A35]/40 bg-gradient-to-br from-[#D99A35]/20 to-[#191919] text-sm font-bold text-[#E8BD78] shadow-inner">
                      {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-bold text-[#F7F5F0]">
                          {userName || userEmail?.split("@")[0] || "Account"}
                        </p>
                        <span className="inline-flex items-center rounded-md border border-[#D99A35]/35 bg-[#D99A35]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#E8BD78]">
                          {roleBadgeLabel}
                        </span>
                      </div>
                      <p className="truncate font-mono text-[11px] text-[#AAA49B]">{userEmail}</p>
                    </div>
                  </div>
                </div>

                <Link
                  href={portal.href}
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-between rounded-xl bg-gradient-to-r from-[#D99A35] via-[#E8BD78] to-[#D99A35] bg-[length:200%_auto] px-4 text-xs font-bold text-[#101010] shadow-md shadow-[#D99A35]/20 transition-all hover:bg-right active:scale-[0.98]"
                >
                  <span>Go to {portal.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="text-[#AAA49B] transition-colors hover:text-[#F7F5F0] py-1"
                  >
                    Account Profile
                  </Link>
                  <form action="/api/auth/signout" method="POST">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 text-red-400/90 transition-colors hover:text-red-300 py-1"
                    >
                      <LogOut className="h-3 w-3" />
                      <span>Sign out</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              // Guest Account Access View
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#D99A35]/35 bg-[#D99A35]/15 text-[#E8BD78]">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#F7F5F0]">Access Your Account</h3>
                      <p className="text-[11px] text-[#AAA49B]">Sign in or register to continue</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#AAA49B]/70" />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-center rounded-xl border border-[#E8BD78]/40 bg-white/[0.04] text-xs font-semibold text-[#F7F5F0] transition-all hover:border-[#E8BD78] hover:bg-white/[0.08] active:scale-[0.98]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#D99A35] via-[#E8BD78] to-[#D99A35] bg-[length:200%_auto] text-xs font-bold text-[#101010] shadow-md shadow-[#D99A35]/20 transition-all hover:bg-right active:scale-[0.98]"
                  >
                    Register
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── Navigation Menu Rows ─────────────────────────────────── */}
          <nav className="space-y-1 rounded-2xl border border-white/[0.08] bg-[#161616]/70 p-2 divide-y divide-white/[0.04]" aria-label="Mobile Drawer Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <div key={item.href} className="first:pt-0 pt-1">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex min-h-[48px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "border-l-2 border-[#D99A35] bg-[#D99A35]/15 text-[#E8BD78] font-semibold"
                        : "text-[#F7F5F0]/85 hover:bg-white/[0.05] hover:text-[#F7F5F0]",
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-[#D99A35]/20 text-[#D99A35]"
                            : "text-[#AAA49B] group-hover:bg-white/[0.06] group-hover:text-[#E8BD78]",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="tracking-tight">{item.label}</span>
                    </div>

                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isActive
                          ? "text-[#E8BD78]"
                          : "text-[#AAA49B]/40 group-hover:translate-x-0.5 group-hover:text-[#E8BD78]",
                      )}
                    />
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* ── Premium Stone Promotional Card ──────────────────────── */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#D99A35]/35 bg-[#191919] p-4.5 shadow-xl transition-all duration-300 hover:border-[#D99A35] hover:shadow-[#D99A35]/10">
            {/* Background Image with Dark Vignette */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/hero/stone-quarry-hero.webp"
                alt="Natural Stone Quarry"
                fill
                className="object-cover opacity-20 transition-transform duration-700 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-[#101010]/80 to-transparent" />
            </div>

            {/* Card Content */}
            <div className="relative z-10 space-y-2">
              <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-[#D99A35]">
                SOURCE DIRECT
              </span>
              <h4 className="text-sm font-bold leading-snug tracking-tight text-[#F7F5F0]">
                Premium Natural Stone for Every Project
              </h4>
              <p className="text-[11px] leading-relaxed text-[#AAA49B]">
                Direct quarry extraction of marble, granite, sandstone &amp; limestone across India.
              </p>
              <div className="pt-1">
                <Link
                  href="/products"
                  onClick={() => setOpen(false)}
                  className="group/cta inline-flex items-center gap-1.5 text-xs font-bold text-[#E8BD78] transition-colors hover:text-[#D99A35]"
                >
                  <span>Explore Products</span>
                  <span className="transition-transform duration-200 group-hover/cta:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Trust Indicators ────────────────────────────────────── */}
          <div className="border-t border-white/[0.08] pt-4 space-y-2 pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 transition-colors hover:border-[#D99A35]/30">
                <ShieldCheck className="h-4 w-4 text-[#D99A35]" strokeWidth={1.8} />
                <span className="text-[10px] font-semibold text-[#AAA49B] leading-tight">
                  Verified Suppliers
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 transition-colors hover:border-[#D99A35]/30">
                <BadgePercent className="h-4 w-4 text-[#D99A35]" strokeWidth={1.8} />
                <span className="text-[10px] font-semibold text-[#AAA49B] leading-tight">
                  Factory-Direct Pricing
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 transition-colors hover:border-[#D99A35]/30">
                <Globe className="h-4 w-4 text-[#D99A35]" strokeWidth={1.8} />
                <span className="text-[10px] font-semibold text-[#AAA49B] leading-tight">
                  Global Dispatch
                </span>
              </div>
            </div>
            <p className="text-[9px] text-[#AAA49B]/70 text-center tracking-wide pt-1">
              Platform Trust Standards • Direct Quarry B2B Network
            </p>
          </div>
        </div>
      </div>
    </div>
  </>
);
}

// Desktop search icon (client component)
export function SearchButton() {
  return (
    <Link
      href="/products"
      className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
      aria-label="Search products"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>
    </Link>
  );
}
