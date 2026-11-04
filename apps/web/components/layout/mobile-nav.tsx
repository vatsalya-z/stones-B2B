"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@stone/ui";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Categories", href: "/categories" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Request a Quote", href: "/request-quote" },
];

interface MobileNavProps {
  isLoggedIn: boolean;
  userEmail?: string | null;
  isBuyer?: boolean;
  isSeller?: boolean;
}

export function MobileNav({
  isLoggedIn,
  userEmail,
  isBuyer = false,
  isSeller = false,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Handle Escape key to close
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

  // Prevent body scroll when open and manage focus
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Allow DOM mount before focusing close button
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  return (
    <>
      {/* Hamburger toggle */}
      <button
        ref={hamburgerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-700 transition-colors hover:bg-stone-100 lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation-drawer"
      >
        {open ? (
          // X icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          // Bars icon
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
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => {
            setOpen(false);
            hamburgerRef.current?.focus();
          }}
          aria-hidden="true"
        />
      )}

      {/* Slide-in drawer with explicit closed visibility & pointer-events isolation */}
      <div
        id="mobile-navigation-drawer"
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-xl transition-all duration-300 ease-in-out lg:hidden",
          open
            ? "translate-x-0 visible opacity-100 pointer-events-auto"
            : "translate-x-full invisible opacity-0 pointer-events-none",
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label="Navigation menu"
      >
        <div className="flex h-20 sm:h-[88px] items-center justify-between border-b border-stone-200 px-5">
          <span className="text-sm font-semibold text-stone-700">Navigation</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              setOpen(false);
              hamburgerRef.current?.focus();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            aria-label="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-stone-100 text-stone-900"
                  : "text-stone-700 hover:bg-stone-50 hover:text-stone-900",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-stone-200 p-4">
          {isLoggedIn ? (
            <div className="space-y-1">
              {userEmail && (
                <p className="px-3 py-1.5 text-xs text-stone-500 truncate">{userEmail}</p>
              )}
              {isBuyer && (
                <>
                  <Link
                    href="/buyer/dashboard"
                    className="block rounded-lg px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                  >
                    Buyer Portal
                  </Link>
                  <Link
                    href="/buyer/favourites"
                    className="block rounded-lg px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                  >
                    Saved Products
                  </Link>
                  <Link
                    href="/buyer/rfqs/new"
                    className="block rounded-lg px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  >
                    Create New RFQ
                  </Link>
                </>
              )}
              {isSeller && (
                <Link
                  href="/seller/dashboard"
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                >
                  Seller Portal
                </Link>
              )}
              {!isBuyer && !isSeller && (
                <Link
                  href="/dashboard"
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/profile"
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900"
              >
                Profile
              </Link>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="btn-secondary w-full justify-center rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-center text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn-primary w-full justify-center rounded-lg bg-stone-900 px-5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-stone-800"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Desktop search icon (client because it could eventually open a modal)
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
