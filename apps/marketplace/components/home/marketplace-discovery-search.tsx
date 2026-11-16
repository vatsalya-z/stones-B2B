"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";

const POPULAR_SEARCHES = [
  { label: "Makrana Marble", href: "/products?q=Makrana+Marble" },
  { label: "Italian Marble", href: "/products?q=Italian+Marble" },
  { label: "Black Granite", href: "/products?q=Black+Granite" },
  { label: "Dholpur Sandstone", href: "/products?q=Dholpur+Sandstone" },
  { label: "Green Onyx", href: "/products?q=Green+Onyx" },
];

// Faint golden marble vein vector accent in top-right
function GoldenVeinAccent() {
  return (
    <svg
      className="pointer-events-none absolute right-0 top-0 bottom-0 h-full w-64 sm:w-80 lg:w-96 select-none opacity-45 overflow-hidden"
      viewBox="0 0 400 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="searchVeinGrad" x1="400" y1="0" x2="80" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C88428" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#E5A955" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#F3D198" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#DE9B3D" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M400 5 Q 320 50, 260 30 T 110 145" stroke="url(#searchVeinGrad)" strokeWidth="1.6" />
      <path d="M400 35 Q 330 75, 290 55 T 150 160" stroke="url(#searchVeinGrad)" strokeWidth="1.1" />
      <path d="M370 -5 Q 295 40, 235 60 T 80 135" stroke="url(#searchVeinGrad)" strokeWidth="1.3" />
      <path d="M305 45 Q 265 80, 220 120" stroke="url(#searchVeinGrad)" strokeWidth="0.8" />
      <path d="M265 95 Q 225 125, 180 150" stroke="url(#searchVeinGrad)" strokeWidth="0.7" />
    </svg>
  );
}

export function MarketplaceDiscoverySearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/products?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/products");
    }
  };

  return (
    <section className="pt-4 sm:pt-6 pb-2">
      <div className="container-wide">
        {/* Main Discovery Search Console Card */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#EDE6DC] bg-[#FAF7F2] p-5 sm:p-6 lg:p-7 shadow-2xs">
          {/* Golden Marble Vein illustration */}
          <GoldenVeinAccent />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-7">
            {/* Left Heading */}
            <div className="shrink-0 lg:pr-4">
              <h1 className="font-serif text-2xl sm:text-[28px] lg:text-[32px] font-bold text-[#1C1917] tracking-tight leading-[1.18]">
                Find the Right Stone<br />
                for <span className="text-[#E87500]">Your Project</span>
              </h1>
            </div>

            {/* Subtle Vertical Divider on Desktop */}
            <div className="hidden lg:block w-px self-stretch bg-[#E5DED5] shrink-0" />

            {/* Right Column: Search Box on top + Popular Searches directly underneath */}
            <div className="flex-1 min-w-0 space-y-3 sm:space-y-3.5">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit}>
                <div className="relative flex items-center rounded-xl sm:rounded-2xl border border-[#DCD5CB] bg-white p-1.5 shadow-xs transition-all focus-within:border-[#E87500] focus-within:ring-2 focus-within:ring-[#E87500]/20">
                  <div className="pointer-events-none flex items-center pl-3 pr-2 text-stone-700">
                    <Search className="h-4.5 w-4.5 stroke-[2.2]" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search marble, granite, sandstone, supplier or project..."
                    className="w-full bg-transparent py-2.5 px-1.5 text-xs sm:text-sm text-[#1C1917] placeholder-[#716A64]/75 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg sm:rounded-xl bg-[#E87500] hover:bg-[#C95D00] text-white px-5 sm:px-7 py-2.5 text-xs sm:text-sm font-semibold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Search</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Directly under search box: Popular Searches */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
                <span className="font-bold text-[#1C1917] mr-1 text-xs sm:text-[13px]">
                  Popular Searches:
                </span>
                {POPULAR_SEARCHES.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E5DDD2] bg-white px-3 sm:px-3.5 py-1.5 text-xs font-medium text-stone-800 shadow-2xs transition-all hover:border-[#E87500] hover:bg-[#FFF2E5]/50 hover:text-[#E87500]"
                  >
                    <Search className="h-3 w-3 text-stone-500" />
                    <span>{chip.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
