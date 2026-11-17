"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  MapPin,
  ChevronDown,
  X,
  Check,
  Building2,
} from "lucide-react";
import { cn } from "@stone/ui";
import { SearchLeadModal } from "@/components/search-lead-modal";

const POPULAR_STONE_HUBS = [
  { name: "All India", state: "Nationwide", isAll: true },
  { name: "Makrana", state: "White Calcite Marble, Rajasthan" },
  { name: "Kishangarh", state: "Asia's Stone Mandi, Rajasthan" },
  { name: "Ongole", state: "Black Galaxy Granite, Andhra Pradesh" },
  { name: "Kota", state: "Blue Limestone, Rajasthan" },
  { name: "Dholpur", state: "Architectural Sandstone, Rajasthan" },
  { name: "Udaipur", state: "Green Marble & Onyx, Rajasthan" },
  { name: "Bangalore", state: "South Granite Processing Hub" },
  { name: "Rewari", state: "Kund Slate & Quartzite Belt" },
  { name: "Delhi NCR", state: "Architectural Sourcing Hub" },
  { name: "Mumbai", state: "Commercial & Export Port Hub" },
  { name: "Srinagar", state: "Jammu & Kashmir" },
];


function CameraSearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8"
        stroke="#d97706"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8"
        stroke="#d97706"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20H8"
        stroke="#d97706"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 20h2.5a1.5 1.5 0 0 0 1.5-1.5V16"
        stroke="#d97706"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 8.5h4l.8 1.5H16a1.5 1.5 0 0 1 1.5 1.5v4.5A1.5 1.5 0 0 1 16 17.5H8A1.5 1.5 0 0 1 6.5 16V11.5A1.5 1.5 0 0 1 8 10h1.2l.8-1.5Z"
        fill="#d97706"
      />
      <circle cx="12" cy="13.5" r="1.8" fill="white" />
    </svg>
  );
}

export function HeroSearchLocationBar({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selectedCity, setSelectedCity] = useState(
    searchParams.get("location") || "All India",
  );
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [cityFilter, setCityFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync inputs with URL changes
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    const locParam = searchParams.get("location");
    if (locParam) {
      setSelectedCity(locParam);
    } else {
      setSelectedCity("All India");
    }
  }, [searchParams]);

  // Check auth state for lead modal
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.authenticated === true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(e.target as Node)
      ) {
        setIsLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Execute combined search (Query + Location)
  const executeSearch = useCallback(
    async (targetQuery = query, targetCity = selectedCity) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page"); // reset page on search

      const cleanQuery = targetQuery.trim();
      if (cleanQuery) {
        params.set("q", cleanQuery);
      } else {
        params.delete("q");
      }

      if (targetCity && targetCity !== "All India") {
        params.set("location", targetCity);
      } else {
        params.delete("location");
      }

      // Guest lead capture logic if searching for specific product
      if (cleanQuery && !isAuthenticated) {
        const leadLabel =
          targetCity && targetCity !== "All India"
            ? `${cleanQuery} (in ${targetCity})`
            : cleanQuery;
        setModalQuery(leadLabel);
        setIsModalOpen(true);
      }

      setIsLocationOpen(false);
      const targetUrl = `${pathname}?${params.toString()}`;
      router.push(targetUrl);
    },
    [router, pathname, searchParams, query, selectedCity, isAuthenticated],
  );

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setIsLocationOpen(false);
    setCityFilter("");
    executeSearch(query, city);
  };

  const handleClearQuery = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };


  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setQuery(fileName);
      executeSearch(fileName, selectedCity);
    }
  };

  const filteredCities = POPULAR_STONE_HUBS.filter(
    (c) =>
      c.name.toLowerCase().includes(cityFilter.toLowerCase()) ||
      c.state.toLowerCase().includes(cityFilter.toLowerCase()),
  );

  return (
    <>
      <div
        className={cn(
          "w-full bg-gradient-to-b from-stone-50 via-white to-stone-50/70 border border-stone-200/90 rounded-3xl p-4 sm:p-6 lg:p-7 shadow-xs",
          className,
        )}
      >
        {/* Architectural Header Label - B2B Product Catalog Sourcing */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:pb-4 md:mb-4 md:border-b md:border-stone-200/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md inline-block">
                Live Quarry &amp; Factory Inventory
              </span>
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-stone-900 tracking-tight mt-1">
              Source Natural Stone Slabs, Blocks &amp; Tiles at Direct Factory Rates
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-600 font-semibold shrink-0">
            <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
            <span>500+ Verified Quarries &bull; Wholesale Pricing</span>
          </div>
        </div>

        {/* The Search & Location Floating Capsule - Hidden on Mobile (as Omnibar is in Header) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch(query, selectedCity);
          }}
          className="hidden md:block relative bg-white rounded-2xl border-2 border-stone-200 shadow-xs hover:border-amber-500/60 focus-within:border-amber-600 focus-within:ring-4 focus-within:ring-amber-500/10 transition-all p-1.5 sm:p-2"
        >
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-1.5 md:gap-0">
            {/* 1. Location Selector Box (Left) */}
            <div
              ref={locationDropdownRef}
              className="relative md:w-[260px] lg:w-[290px] shrink-0"
            >
              <button
                type="button"
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors text-left cursor-pointer group"
                aria-expanded={isLocationOpen}
                aria-haspopup="listbox"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Location / Quarry
                    </span>
                    <span className="block text-xs sm:text-sm font-bold text-stone-900 truncate">
                      {selectedCity}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-stone-400 transition-transform duration-200 shrink-0",
                    isLocationOpen && "rotate-180 text-amber-600",
                  )}
                />
              </button>

              {/* Location Dropdown Popover */}
              {isLocationOpen && (
                <div className="absolute left-0 top-full mt-2 w-[300px] sm:w-[320px] bg-white rounded-2xl border border-stone-200 shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                  {/* Search inside locations */}
                  <div className="p-2.5 border-b border-stone-100 bg-stone-50/50">
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-stone-200 px-3 py-1.5 focus-within:border-amber-500">
                      <Search className="h-3.5 w-3.5 text-stone-400" />
                      <input
                        type="text"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        placeholder="Search quarry cluster or city..."
                        className="w-full text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none bg-transparent"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* List of Hubs */}
                  <div className="max-h-[280px] overflow-y-auto p-1.5 space-y-0.5">
                    {filteredCities.map((hub) => {
                      const isSelected =
                        selectedCity.toLowerCase() === hub.name.toLowerCase();
                      return (
                        <button
                          key={hub.name}
                          type="button"
                          onClick={() => handleSelectCity(hub.name)}
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer text-xs",
                            isSelected
                              ? "bg-amber-50 text-amber-900 font-bold"
                              : "hover:bg-stone-100 text-stone-700",
                          )}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-stone-900 truncate">
                              {hub.name}
                            </div>
                            <div className="text-[10px] text-stone-500 truncate">
                              {hub.state}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Divider (Desktop) */}
            <div className="hidden md:block h-8 w-[1px] bg-stone-200 mx-2 shrink-0" />

            {/* 2. Main Stone & Product Search Field (Center) - Hidden on Mobile */}
            <div className="hidden md:flex flex-1 items-center gap-2 px-2.5 sm:px-3 py-1.5 md:py-1 min-w-0">
              <Search className="h-5 w-5 text-amber-600 shrink-0 hidden sm:block" />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="hero-search-input"
                  className="block text-[10px] uppercase font-bold text-stone-400 tracking-wider truncate"
                >
                  Stone Variety / Gangsaw Slab / Thickness
                </label>
                <input
                  id="hero-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stone variety, marble, granite, slab..."
                  className="w-full text-xs sm:text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none bg-transparent"
                />
              </div>

              {/* Clear button */}
              {query && (
                <button
                  type="button"
                  onClick={handleClearQuery}
                  className="h-6 w-6 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Visual Camera Search Icon */}
              <button
                type="button"
                onClick={handleCameraClick}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-amber-700 transition-all cursor-pointer relative group shrink-0 active:scale-95"
                title="Search by stone photo / texture"
              >
                <CameraSearchIcon className="h-5 w-5" />
                <span className="sr-only">Upload stone photo</span>
                <span className="hidden group-hover:block absolute bottom-full mb-2 right-0 sm:left-1/2 sm:-translate-x-1/2 px-2 py-1 text-[10px] font-semibold text-white bg-stone-900 rounded-md whitespace-nowrap shadow-sm z-30">
                  Photo Search
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* 3. Search Action CTA Button (Right) */}
            <div className="shrink-0 pt-1 md:pt-0">
              <button
                type="submit"
                className="w-full md:w-auto h-11 sm:h-12 px-6 sm:px-8 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
              >
                <Search className="h-4 w-4 stroke-[2.5]" />
                <span>Search Slabs</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Guest Lead Capture Modal */}
      <SearchLeadModal
        initialQuery={modalQuery}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setIsModalOpen(false)}
      />
    </>
  );
}
