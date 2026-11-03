import Link from "next/link";
import { getCurrentUser, getUserRoles } from "@/lib/auth";
import { cn } from "@stone/ui";
import { MobileNav, SearchButton } from "./mobile-nav";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Categories", href: "/categories" },
  { label: "How It Works", href: "/how-it-works" },
];

function StoneLogoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-8 w-8 text-amber-600 transition-transform group-hover:scale-105"
      aria-hidden="true"
    >
      <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
    </svg>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isLoggedIn = !!user;
  const roles = isLoggedIn ? await getUserRoles() : [];
  const isBuyer = roles.includes("buyer");
  const isSeller = roles.includes("seller");

  return (
    <header className="sticky top-0 z-30 h-20 sm:h-[88px] border-b border-stone-200/80 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85 shadow-sm transition-all print:hidden">
      <div className="container-wide flex h-full items-center justify-between gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="group flex flex-shrink-0 items-center gap-2.5 text-stone-900 transition-opacity hover:opacity-90"
          aria-label="StonesDekho — Go to homepage"
        >
          <StoneLogoIcon />
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Stones<span className="text-amber-600">Dekho</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-4 py-2.5 text-[15px] font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/request-quote"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-amber-700 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>Request Quote</span>
          </Link>

          <SearchButton />

          {isLoggedIn ? (
            // Account menu (server-rendered with dual-role awareness)
            <div className="hidden items-center gap-2 lg:flex">
              {isBuyer && (
                <>
                  <Link
                    href="/buyer/favourites"
                    className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
                  >
                    Saved
                  </Link>
                  <Link
                    href="/buyer/dashboard"
                    className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
                  >
                    Buyer Portal
                  </Link>
                </>
              )}
              {isSeller && (
                <Link
                  href="/seller/dashboard"
                  className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
                >
                  Seller Portal
                </Link>
              )}
              {!isBuyer && !isSeller && (
                <Link
                  href="/dashboard"
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
                >
                  Dashboard
                </Link>
              )}
              <div className="h-6 w-px bg-stone-200" />
              <Link
                href="/profile"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-sm font-bold text-stone-800 transition-colors hover:bg-stone-300 ring-2 ring-transparent hover:ring-amber-500/20"
                title={user.email ?? "Account"}
                aria-label="Account profile"
              >
                {user.email ? user.email.charAt(0).toUpperCase() : "A"}
              </Link>
            </div>
          ) : (
            <div className="hidden items-center gap-3 lg:flex">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-stone-800 hover:shadow-md active:scale-[0.98]"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile hamburger + drawer */}
          <MobileNav
            isLoggedIn={isLoggedIn}
            userEmail={user?.email ?? null}
            isBuyer={isBuyer}
            isSeller={isSeller}
          />
        </div>
      </div>
    </header>
  );
}
