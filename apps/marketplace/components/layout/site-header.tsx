import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { MobileNav } from "./mobile-nav";
import { BuyerNavMenu } from "./buyer-nav-menu";
import { NavbarSearchGroup } from "@/components/search/navbar-search-group";

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
  const userName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    null;

  return (
    <header className="sticky top-0 z-30 h-20 sm:h-[88px] border-b border-stone-200/80 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85 shadow-sm transition-all print:hidden">
      <div className="container-wide flex h-full items-center justify-between gap-3 sm:gap-4 lg:gap-8">
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

        {/* IndiaMART-Style Search Bar with Location Box on Left (Desktop & Tablet) */}
        <div className="hidden md:flex flex-1 max-w-xl lg:max-w-2xl xl:max-w-3xl min-w-0 mx-2 lg:mx-6">
          <NavbarSearchGroup />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {/* "Get Best Price" button */}
          <Link
            href="/request-quote"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors hover:bg-amber-700 active:scale-[0.98] whitespace-nowrap"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Get Best Price</span>
          </Link>

          {/* IndiaMART-Style Buyer "Sign In v" Dropdown Menu */}
          <div className="hidden sm:block">
            <BuyerNavMenu
              isLoggedIn={isLoggedIn}
              userEmail={user?.email ?? null}
              userName={userName}
            />
          </div>

          {/* Mobile hamburger + drawer */}
          <MobileNav
            isLoggedIn={isLoggedIn}
            userEmail={user?.email ?? null}
          />
        </div>
      </div>
    </header>
  );
}
