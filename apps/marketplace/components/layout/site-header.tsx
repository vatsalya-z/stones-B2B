import Link from "next/link";
import {
  Users,
  Building2,
  ClipboardList,
  Heart,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { MobileIndiaMartHeader } from "./mobile-indiamart-header";
import { BuyerNavMenu } from "./buyer-nav-menu";
import { NavbarGetPriceButton } from "./navbar-get-price-button";
import { CategoriesMegaMenu } from "./categories-megamenu";

function StoneLogoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-8 w-8 text-amber-600 transition-transform group-hover:scale-105 shrink-0"
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
    <header className="sticky top-0 z-30 lg:border-b lg:border-stone-200/80 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85 shadow-xs transition-all print:hidden">
      {/* Mobile IndiaMART-Style Navigation (Visible on mobile/tablet < lg) */}
      <div className="lg:hidden">
        <MobileIndiaMartHeader
          isLoggedIn={isLoggedIn}
          userEmail={user?.email ?? null}
          userName={userName}
        />
      </div>

      {/* Desktop Navigation (Visible on lg+) */}
      <div className="hidden lg:flex container-wide h-18 sm:h-20 items-center justify-between gap-3 sm:gap-4 lg:gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="group flex flex-shrink-0 items-center gap-2.5 text-stone-900 transition-opacity hover:opacity-90"
          aria-label="StonesDekho — Go to homepage"
        >
          <StoneLogoIcon />
          <div>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
              Stones<span className="text-amber-600">Dekho</span>
            </div>
            <div className="text-[9px] uppercase tracking-widest text-stone-400 font-bold hidden sm:block">
              B2B Stone Marketplace
            </div>
          </div>
        </Link>

        {/* E-Commerce Marketplace Navigation Links (Desktop & Tablet) */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 text-xs sm:text-[13px] font-semibold text-stone-700">
          {/* 1. Interactive All Categories Mega Dropdown */}
          <CategoriesMegaMenu />

          {/* 2. Verified Indian Stone Sellers & Suppliers */}
          <Link
            href="/suppliers"
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-stone-100 hover:text-amber-800 transition-all font-bold text-stone-800"
          >
            <Users className="h-4 w-4 text-amber-600 stroke-[2.2]" />
            <span>Sellers</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-md">
              VERIFIED
            </span>
          </Link>

          {/* 3. Heritage Quarry Mandi & Hubs */}
          <Link
            href="/suppliers?type=quarry_owner"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-stone-100 hover:text-amber-800 transition-all font-semibold"
          >
            <Building2 className="h-3.5 w-3.5 text-stone-500" />
            <span>Quarry Hubs</span>
          </Link>

          {/* 4. Project BOQ / Custom Specification */}
          <Link
            href="/request-quote"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-stone-100 hover:text-amber-800 transition-all font-semibold"
          >
            <ClipboardList className="h-3.5 w-3.5 text-stone-500" />
            <span>Post BOQ</span>
          </Link>

        </nav>

        {/* Right E-Commerce Utilities & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Wishlist / Shortlist */}
          <Link
            href="/profile"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-stone-700 hover:text-amber-800 hover:bg-stone-100 transition-all text-xs font-semibold"
            title="Saved Stones & Shortlist"
          >
            <Heart className="h-4 w-4 text-stone-500 hover:text-rose-500 transition-colors" />
            <span>Saved</span>
          </Link>

          {/* "Get Best Price" button (Opens Premium RFQ Modal on current page) */}
          <NavbarGetPriceButton />

          {/* IndiaMART-Style Buyer "Sign In v" Dropdown Menu */}
          <div className="hidden sm:block">
            <BuyerNavMenu
              isLoggedIn={isLoggedIn}
              userEmail={user?.email ?? null}
              userName={userName}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
