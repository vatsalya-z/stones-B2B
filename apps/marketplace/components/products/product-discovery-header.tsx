"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  MapPin,
  X,
  ShieldCheck,
  Mountain,
  Truck,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Breadcrumb } from "@stone/ui";

export interface ProductCategoryShortcut {
  slug: string;
  name: string;
}

export interface StoneLocationHub {
  city: string;
  state: string;
  hubName: string;
  specialty: string;
}

export const STONE_SOURCING_HUBS: StoneLocationHub[] = [
  {
    city: "Kishangarh",
    state: "Rajasthan",
    hubName: "Kishangarh Marble & Granite Cluster",
    specialty: "Asia's largest marble processing & gangsaw hub",
  },
  {
    city: "Makrana",
    state: "Rajasthan",
    hubName: "Makrana White Marble Belt",
    specialty: "Historical pure white calcite & Kumari marble quarries",
  },
  {
    city: "Udaipur",
    state: "Rajasthan",
    hubName: "Udaipur Green Marble & Processing District",
    specialty: "Forest Green, Rainforest & exotic Indian marble",
  },
  {
    city: "Jaipur",
    state: "Rajasthan",
    hubName: "Jaipur Architectural Stone Center",
    specialty: "Bansi Paharpur pink marble, sandstone & CNC carving",
  },
  {
    city: "Jodhpur",
    state: "Rajasthan",
    hubName: "Jodhpur Sandstone Belt",
    specialty: "Chitor, Teakwood, Rainbow & Pink sandstone paving",
  },
  {
    city: "Kota",
    state: "Rajasthan",
    hubName: "Kota Stone Hub",
    specialty: "Kota Blue, Kota Brown & heavy-duty calibrated limestone",
  },
  {
    city: "Dholpur",
    state: "Rajasthan",
    hubName: "Dholpur Sandstone District",
    specialty: "Red, Beige & Chocolate exterior facade sandstone",
  },
  {
    city: "Ongole",
    state: "Andhra Pradesh",
    hubName: "Ongole / Chimakkurthi Granite Belt",
    specialty: "Export Black Galaxy, Steel Grey & Absolute Black granite",
  },
  {
    city: "Rewari",
    state: "Haryana",
    hubName: "Kund / Rewari Slate Belt",
    specialty: "Natural cleft roofing slate & crystalline quartzite",
  },
  {
    city: "Delhi NCR",
    state: "Delhi NCR",
    hubName: "Delhi NCR Architectural Supply Hub",
    specialty: "Commercial architectural supply, depots & specifications",
  },
  {
    city: "Rajasthan",
    state: "Rajasthan",
    hubName: "Rajasthan State Hub",
    specialty: "Primary hub for marble, sandstone & granite quarries",
  },
  {
    city: "Andhra Pradesh",
    state: "Andhra Pradesh",
    hubName: "Andhra Pradesh Stone Hub",
    specialty: "Granite gangsaw processors & Kadapa black limestone",
  },
  {
    city: "Gujarat",
    state: "Gujarat",
    hubName: "Ambaji & Gujarat Mining Cluster",
    specialty: "Ambaji white marble & dense sandstone pavers",
  },
  {
    city: "Karnataka",
    state: "Karnataka",
    hubName: "Bangalore & Ilkal Hub",
    specialty: "Ruby Red, Himalayan Blue & architectural granite",
  },
];

export const QUICK_SELECT_CATEGORIES = [
  { name: "All Stones", type: "all", value: "" },
  { name: "Marble", type: "material", value: "Marble" },
  { name: "Granite", type: "material", value: "Granite" },
  { name: "Sandstone", type: "material", value: "Sandstone" },
  { name: "Limestone", type: "material", value: "Limestone" },
  { name: "Quartzite", type: "material", value: "Quartzite" },
  { name: "Slate", type: "material", value: "Slate" },
  { name: "Travertine", type: "material", value: "Travertine" },
  { name: "Onyx", type: "material", value: "Onyx" },
  { name: "Natural Stone Slabs", type: "category", value: "natural-stone-slabs" },
] as const;

interface ProductDiscoveryHeaderProps {
  totalCount: number;
  categories: ProductCategoryShortcut[];
  currentQuery?: string;
  currentLocation?: string;
  currentMaterial?: string | string[];
  currentCategory?: string;
  showBreadcrumbs?: boolean;
}

export function ProductDiscoveryHeader({
  totalCount,
  currentQuery = "",
  currentLocation = "",
  currentMaterial,
  currentCategory,
  showBreadcrumbs = true,
}: ProductDiscoveryHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Controlled states for dual search fields
  const [queryValue, setQueryValue] = useState(
    currentQuery || searchParams.get("q") || "",
  );
  const [locationValue, setLocationValue] = useState(
    currentLocation || searchParams.get("location") || "",
  );

  // Location dropdown state
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [activeLocationIndex, setActiveLocationIndex] = useState(-1);
  const locationContainerRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Sync inputs when URL search parameters change externally
  useEffect(() => {
    setQueryValue(searchParams.get("q") ?? "");
    setLocationValue(searchParams.get("location") ?? "");
  }, [searchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        locationContainerRef.current &&
        !locationContainerRef.current.contains(event.target as Node)
      ) {
        setIsLocationOpen(false);
        setActiveLocationIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter stone sourcing hubs based on user typing
  const filteredHubs = useMemo(() => {
    const q = locationValue.trim().toLowerCase();
    if (!q) {
      // Return top 8 prominent stone hubs when field is empty
      return STONE_SOURCING_HUBS.slice(0, 8);
    }
    return STONE_SOURCING_HUBS.filter(
      (hub) =>
        hub.city.toLowerCase().includes(q) ||
        hub.state.toLowerCase().includes(q) ||
        hub.hubName.toLowerCase().includes(q) ||
        hub.specialty.toLowerCase().includes(q),
    );
  }, [locationValue]);

  // Execute combined search with both Stone/Product and Location
  const executeSearch = useCallback(
    (targetQuery = queryValue, targetLocation = locationValue) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page"); // reset pagination on new search

      const cleanQuery = targetQuery.trim();
      const cleanLocation = targetLocation.trim();

      if (cleanQuery) {
        params.set("q", cleanQuery);
      } else {
        params.delete("q");
      }

      if (cleanLocation) {
        params.set("location", cleanLocation);
      } else {
        params.delete("location");
      }

      setIsLocationOpen(false);
      setActiveLocationIndex(-1);
      const targetUrl = `${pathname}?${params.toString()}`;
      console.log("[ProductDiscoveryHeader] Pushing URL:", targetUrl);
      router.push(targetUrl);
    },
    [router, pathname, searchParams, queryValue, locationValue],
  );

  // Clear query button action
  const handleClearQuery = () => {
    setQueryValue("");
    if (searchParams.has("q")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  // Clear location button action
  const handleClearLocation = () => {
    setLocationValue("");
    setIsLocationOpen(false);
    setActiveLocationIndex(-1);
    if (searchParams.has("location")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("location");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  // Key handlers for query input
  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch(queryValue, locationValue);
    }
  };

  // Key handlers for location input with keyboard navigation in dropdown
  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isLocationOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsLocationOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveLocationIndex((prev) =>
        prev < filteredHubs.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveLocationIndex((prev) =>
        prev > 0 ? prev - 1 : filteredHubs.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeLocationIndex >= 0 && activeLocationIndex < filteredHubs.length) {
        const selected = filteredHubs[activeLocationIndex];
        if (selected) {
          setLocationValue(selected.city);
          executeSearch(queryValue, selected.city);
        } else {
          executeSearch(queryValue, locationValue);
        }
      } else {
        executeSearch(queryValue, locationValue);
      }
    } else if (e.key === "Escape") {
      setIsLocationOpen(false);
      setActiveLocationIndex(-1);
    }
  };

  // Select location from dropdown suggestion
  const handleSelectHub = (hub: StoneLocationHub) => {
    setLocationValue(hub.city);
    setIsLocationOpen(false);
    setActiveLocationIndex(-1);
    executeSearch(queryValue, hub.city);
  };

  // Category normalization
  const selectedMaterials = Array.isArray(currentMaterial)
    ? currentMaterial
    : currentMaterial
      ? [currentMaterial]
      : [];

  const isAllActive = selectedMaterials.length === 0 && !currentCategory;

  const isCategoryActive = (
    item: (typeof QUICK_SELECT_CATEGORIES)[number],
  ) => {
    if (item.type === "all") return isAllActive;
    if (item.type === "material") {
      return (
        selectedMaterials.some(
          (m) => m.toLowerCase() === item.value.toLowerCase(),
        ) || currentCategory?.toLowerCase() === item.value.toLowerCase()
      );
    }
    if (item.type === "category") {
      return currentCategory?.toLowerCase() === item.value.toLowerCase();
    }
    return false;
  };

  // Quick Select Category Click Handler
  const handleQuickSelect = useCallback(
    (item: (typeof QUICK_SELECT_CATEGORIES)[number]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page"); // reset pagination

      if (item.type === "all") {
        params.delete("material");
        params.delete("category");
      } else if (item.type === "material") {
        const existingMaterials = params.getAll("material");
        if (
          existingMaterials.includes(item.value) &&
          existingMaterials.length === 1 &&
          !params.get("category")
        ) {
          // Deselect if already single selected
          params.delete("material");
        } else {
          params.delete("material");
          params.delete("category");
          params.append("material", item.value);
        }
      } else if (item.type === "category") {
        if (
          params.get("category") === item.value &&
          params.getAll("material").length === 0
        ) {
          params.delete("category");
        } else {
          params.delete("material");
          params.set("category", item.value);
        }
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      {showBreadcrumbs && (
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Products" },
          ]}
        />
      )}

      {/* Main Architectural Discovery Section Card */}
      <div className="relative overflow-visible rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 lg:p-8 shadow-xs space-y-5">
        {/* Connected Dual-Search Interface */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-2 sm:p-2.5 shadow-xs transition-all focus-within:border-amber-500/60 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-0">
            {/* Field 1: Stone / Product Search */}
            <div className="relative flex-1 flex items-center min-w-0 bg-white lg:bg-transparent rounded-xl lg:rounded-none px-3.5 py-2.5 lg:py-1 border lg:border-none border-stone-200/80">
              <Search
                className="h-5 w-5 text-stone-400 shrink-0 mr-3 transition-colors"
                aria-hidden="true"
              />
              <input
                type="text"
                value={queryValue}
                onChange={(e) => setQueryValue(e.target.value)}
                onKeyDown={handleQueryKeyDown}
                placeholder="Search marble, granite, sandstone, product or supplier..."
                className="w-full bg-transparent text-sm text-stone-900 placeholder:text-stone-400 font-medium focus:outline-none"
                aria-label="Search stone products, varieties, or suppliers"
              />
              {queryValue && (
                <button
                  type="button"
                  onClick={handleClearQuery}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0 ml-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  aria-label="Clear stone product search text"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Desktop Center Divider */}
            <div
              className="hidden lg:block w-px h-8 bg-stone-200 mx-2 shrink-0"
              aria-hidden="true"
            />

            {/* Field 2: Location Search with Hub Selector Popover */}
            <div
              ref={locationContainerRef}
              className="relative flex-1 lg:max-w-md flex items-center min-w-0 bg-white lg:bg-transparent rounded-xl lg:rounded-none px-3.5 py-2.5 lg:py-1 border lg:border-none border-stone-200/80"
            >
              <MapPin
                className="h-5 w-5 text-amber-600 shrink-0 mr-3"
                aria-hidden="true"
              />
              <input
                ref={locationInputRef}
                type="text"
                role="combobox"
                value={locationValue}
                onChange={(e) => {
                  setLocationValue(e.target.value);
                  setIsLocationOpen(true);
                  setActiveLocationIndex(-1);
                }}
                onFocus={() => setIsLocationOpen(true)}
                onKeyDown={handleLocationKeyDown}
                placeholder="Enter city, state or sourcing location..."
                className="w-full bg-transparent text-sm text-stone-900 placeholder:text-stone-400 font-medium focus:outline-none"
                aria-label="Enter sourcing city, state, or stone hub"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-controls="location-hub-listbox"
                aria-expanded={isLocationOpen}
              />
              {locationValue && (
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0 ml-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  aria-label="Clear location search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Location Suggestions Dropdown */}
              {isLocationOpen && (
                <div
                  id="location-hub-listbox"
                  className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100 max-h-72 overflow-y-auto"
                  role="listbox"
                  aria-label="Sourcing location suggestions"
                >
                  <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 mb-1">
                    <span>Major Indian Stone Sourcing Hubs</span>
                    <ChevronDown className="h-3 w-3 text-stone-400" />
                  </div>

                  {filteredHubs.length > 0 ? (
                    <div className="space-y-0.5">
                      {filteredHubs.map((hub, idx) => {
                        const isSelected = idx === activeLocationIndex;
                        return (
                          <button
                            type="button"
                            key={hub.city}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelectHub(hub)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectHub(hub);
                            }}
                            onMouseEnter={() => setActiveLocationIndex(idx)}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-amber-50 text-amber-950 font-medium"
                                : "hover:bg-stone-50 text-stone-800"
                            }`}
                          >
                            <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-stone-900">
                                  {hub.city}
                                </span>
                                <span className="text-[11px] text-stone-500 font-medium">
                                  {hub.state}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                {hub.specialty}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-3 text-xs text-stone-500 text-center space-y-1">
                      <p>
                        Search custom location:{" "}
                        <span className="font-semibold text-stone-900">
                          &quot;{locationValue}&quot;
                        </span>
                      </p>
                      <p className="text-[11px] text-stone-400">
                        Press Enter or click &quot;Search Stones&quot; to apply
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Search Button (Primary CTA) */}
            <div className="lg:pl-2 shrink-0">
              <button
                type="button"
                onClick={() => executeSearch(queryValue, locationValue)}
                className="w-full lg:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-6 py-3 text-sm font-bold shadow-xs hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 shrink-0 cursor-pointer"
                aria-label="Search Stones with selected filters"
              >
                <Search className="h-4 w-4" />
                <span>Search Stones</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Compact Marketplace Trust Indicators Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-stone-100 pb-5">
          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-stone-600 font-medium">
            <div className="inline-flex items-center gap-1.5 text-stone-800 font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Verified Suppliers</span>
            </div>
            <span className="hidden sm:inline text-stone-300">•</span>
            <div className="inline-flex items-center gap-1.5 text-stone-800 font-semibold">
              <Mountain className="h-4 w-4 text-amber-700 shrink-0" />
              <span>Direct Quarry Sourcing</span>
            </div>
            <span className="hidden sm:inline text-stone-300">•</span>
            <div className="inline-flex items-center gap-1.5 text-stone-800 font-semibold">
              <Truck className="h-4 w-4 text-stone-700 shrink-0" />
              <span>Pan India Delivery</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>{totalCount.toLocaleString("en-IN")} verified stone lots</span>
          </div>
        </div>

        {/* 4. Quick Stone Category Filters */}
        <div className="pt-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="font-bold text-stone-400 whitespace-nowrap mr-1 uppercase tracking-wider text-[11px] flex items-center gap-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Quick Select:
            </span>

            {QUICK_SELECT_CATEGORIES.map((cat) => {
              const active = isCategoryActive(cat);
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => handleQuickSelect(cat)}
                  className={`rounded-full px-4 py-2 font-semibold whitespace-nowrap transition-all duration-150 border text-xs cursor-pointer ${
                    active
                      ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                      : "bg-white text-stone-700 border-stone-200/90 hover:border-stone-400 hover:text-stone-950 hover:bg-stone-50"
                  }`}
                  aria-pressed={active}
                >
                  {cat.name}
                  {cat.type === "all" ? ` (${totalCount})` : ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
