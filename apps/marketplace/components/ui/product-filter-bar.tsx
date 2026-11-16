"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { cn } from "@stone/ui";
import {
  FilterSidebar,
  type FilterOption,
  MobileFilterDrawerModal,
  ProductSortSelector,
  ActiveFilterPills,
} from "./filter-sidebar";

export interface ProductFilterBarProps {
  categories: FilterOption[];
  materialTypes: FilterOption[];
  colours: FilterOption[];
  finishes: FilterOption[];
  origins: FilterOption[];
  thicknesses?: FilterOption[];
  stockStatuses: FilterOption[];
  currentSort?: string;
  totalResults: number;
}

// ---------------------------------------------------------------------------
// Reusable Popover Dropdown for Single Filter Dimension
// ---------------------------------------------------------------------------
function HorizontalFilterDropdown({
  label,
  param,
  options,
  selectedValues,
  onChange,
}: {
  label: string;
  param: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (param: string, value: string, checked: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasActive = selectedValues.length > 0;

  return (
    <div ref={containerRef} className="relative inline-block text-left shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap shadow-2xs border",
          hasActive
            ? "bg-stone-900 text-white border-stone-900 font-semibold"
            : "bg-white text-stone-700 border-stone-200/90 hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900 font-medium",
        )}
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        {hasActive && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-150",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-60 rounded-2xl border border-stone-200 bg-white p-2.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100 max-h-72 overflow-y-auto space-y-1">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 mb-1">
            Filter by {label}
          </div>
          {options.map((option) => {
            const isChecked = selectedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs hover:bg-stone-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => onChange(param, option.value, e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-stone-300 text-amber-700 focus:ring-amber-600"
                />
                <span
                  className={cn(
                    "flex-1",
                    isChecked
                      ? "text-stone-950 font-semibold"
                      : "text-stone-700 font-normal",
                  )}
                >
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popover Dropdown for Price Range
// ---------------------------------------------------------------------------
function HorizontalPriceDropdown({
  minPrice,
  maxPrice,
  onApply,
}: {
  minPrice: string;
  maxPrice: string;
  onApply: (min: string, max: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempMin, setTempMin] = useState(minPrice);
  const [tempMax, setTempMax] = useState(maxPrice);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempMin(minPrice);
    setTempMax(maxPrice);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasActive = Boolean(minPrice || maxPrice);

  return (
    <div ref={containerRef} className="relative inline-block text-left shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap shadow-2xs border",
          hasActive
            ? "bg-stone-900 text-white border-stone-900 font-semibold"
            : "bg-white text-stone-700 border-stone-200/90 hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900 font-medium",
        )}
        aria-expanded={isOpen}
      >
        <span>
          {hasActive
            ? `₹${minPrice || "0"} - ₹${maxPrice || "Max"}`
            : "Price Range"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-150",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-2xl border border-stone-200 bg-white p-3 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100 space-y-3">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Wholesale Price (₹ / unit)
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1.5 text-xs text-stone-400">
                ₹
              </span>
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={tempMin}
                onChange={(e) => setTempMin(e.target.value)}
                className="w-full rounded-lg border border-stone-300 py-1.5 pl-6 pr-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
              />
            </div>
            <span className="text-xs text-stone-400 font-medium">to</span>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1.5 text-xs text-stone-400">
                ₹
              </span>
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={tempMax}
                onChange={(e) => setTempMax(e.target.value)}
                className="w-full rounded-lg border border-stone-300 py-1.5 pl-6 pr-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onApply(tempMin, tempMax);
              setIsOpen(false);
            }}
            className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white py-1.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            Apply Price Filter
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Product Filter Bar
// ---------------------------------------------------------------------------
export function ProductFilterBar({
  categories,
  materialTypes,
  colours,
  finishes,
  origins,
  thicknesses = [],
  stockStatuses,
  currentSort,
  totalResults,
}: ProductFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getParamValues = useCallback(
    (param: string): string[] => {
      return searchParams.getAll(param);
    },
    [searchParams],
  );

  const updateParams = useCallback(
    (param: string, value: string, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.getAll(param);

      params.delete(param);
      if (checked) {
        [...current, value].forEach((v) => params.append(param, v));
      } else {
        current.filter((v) => v !== value).forEach((v) => params.append(param, v));
      }
      params.delete("page"); // reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const updatePriceRange = useCallback(
    (min: string, max: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (min.trim()) {
        params.set("minPrice", min.trim());
      } else {
        params.delete("minPrice");
      }
      if (max.trim()) {
        params.set("maxPrice", max.trim());
      } else {
        params.delete("maxPrice");
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const toggleVerified = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("verified") === "true") {
      params.delete("verified");
    } else {
      params.set("verified", "true");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const isVerified = searchParams.get("verified") === "true";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  const activeCount =
    getParamValues("category").length +
    getParamValues("material").length +
    getParamValues("colour").length +
    getParamValues("finish").length +
    getParamValues("origin").length +
    getParamValues("thickness").length +
    getParamValues("stockStatus").length +
    (isVerified ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (searchParams.get("location") ? 1 : 0) +
    (searchParams.get("q") ? 1 : 0);

  return (
    <div className="w-full space-y-3">
      {/* Top Filter Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
        {/* Left Side: Filter Pill Dropdowns & Drawer Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          {/* All Filters Button (Opens Full Slide-Over Drawer) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-800 shadow-2xs hover:bg-stone-50 hover:border-stone-400 transition-colors cursor-pointer shrink-0"
            aria-label="Open full filters drawer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-stone-600" />
            <span>All Filters</span>
            {activeCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>

          {/* Quick Dropdown: Stone Category */}
          <HorizontalFilterDropdown
            label="Category"
            param="category"
            options={categories}
            selectedValues={getParamValues("category")}
            onChange={updateParams}
          />

          {/* Quick Dropdown: Material */}
          <HorizontalFilterDropdown
            label="Material"
            param="material"
            options={materialTypes}
            selectedValues={getParamValues("material")}
            onChange={updateParams}
          />

          {/* Quick Dropdown: Finish */}
          <HorizontalFilterDropdown
            label="Finish"
            param="finish"
            options={finishes}
            selectedValues={getParamValues("finish")}
            onChange={updateParams}
          />

          {/* Quick Dropdown: Origin */}
          <HorizontalFilterDropdown
            label="Origin"
            param="origin"
            options={origins}
            selectedValues={getParamValues("origin")}
            onChange={updateParams}
          />

          {/* Quick Dropdown: Thickness */}
          {thicknesses.length > 0 && (
            <HorizontalFilterDropdown
              label="Thickness"
              param="thickness"
              options={thicknesses}
              selectedValues={getParamValues("thickness")}
              onChange={updateParams}
            />
          )}

          {/* Quick Dropdown: Price */}
          <HorizontalPriceDropdown
            minPrice={minPrice}
            maxPrice={maxPrice}
            onApply={updatePriceRange}
          />

          {/* Quick Pill: Verified Suppliers Only */}
          <button
            type="button"
            onClick={toggleVerified}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shadow-2xs shrink-0",
              isVerified
                ? "bg-emerald-800 text-white border-emerald-800 font-semibold shadow-xs"
                : "bg-white text-stone-700 border-stone-200/90 hover:border-emerald-600 hover:text-emerald-800 hover:bg-emerald-50/40",
            )}
            aria-pressed={isVerified}
          >
            <ShieldCheck
              className={cn(
                "h-3.5 w-3.5",
                isVerified ? "text-emerald-300" : "text-emerald-600",
              )}
            />
            <span>Verified Only</span>
          </button>
        </div>

        {/* Right Side: Lot Counter & Sort Selector */}
        <div className="flex items-center gap-4 shrink-0 ml-auto">
          <p className="text-xs text-stone-600 font-medium hidden sm:inline">
            Showing <span className="font-bold text-stone-900">{totalResults}</span>{" "}
            stone lots & gangsaw slabs
          </p>

          <ProductSortSelector currentSort={currentSort} />
        </div>
      </div>

      {/* Active Filter Tags */}
      <ActiveFilterPills />

      {/* Slide-over Full Filter Drawer (Modal) */}
      <MobileFilterDrawerModal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <FilterSidebar
          categories={categories}
          materialTypes={materialTypes}
          colours={colours}
          finishes={finishes}
          origins={origins}
          thicknesses={thicknesses}
          stockStatuses={stockStatuses}
          isMobileDrawer
          onCloseDrawer={() => setIsDrawerOpen(false)}
        />
      </MobileFilterDrawerModal>
    </div>
  );
}
