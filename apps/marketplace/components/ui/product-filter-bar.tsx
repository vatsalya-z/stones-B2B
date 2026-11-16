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
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition-all cursor-pointer whitespace-nowrap shadow-2xs border",
          hasActive
            ? "bg-stone-900 text-white border-stone-900 font-semibold shadow-xs"
            : "bg-stone-50/70 text-stone-700 border-stone-200/90 hover:border-stone-400 hover:bg-white hover:text-stone-950 font-medium",
        )}
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        {hasActive && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-stone-950">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-150",
            isOpen ? "rotate-180" : "",
            hasActive ? "text-stone-300" : "text-stone-400",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-2xl border border-stone-200/90 bg-white p-2.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-stone-100 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Filter by {label}
            </span>
            {hasActive && (
              <button
                type="button"
                onClick={() => {
                  selectedValues.forEach((val) => onChange(param, val, false));
                }}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
            {options.map((option) => {
              const isChecked = selectedValues.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors",
                    isChecked
                      ? "bg-amber-50/60 text-amber-950 font-semibold"
                      : "text-stone-700 hover:bg-stone-50 hover:text-stone-950",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      onChange(param, option.value, e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
                  />
                  <span className="flex-1">{option.label}</span>
                </label>
              );
            })}
          </div>
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
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition-all cursor-pointer whitespace-nowrap shadow-2xs border",
          hasActive
            ? "bg-stone-900 text-white border-stone-900 font-semibold shadow-xs"
            : "bg-stone-50/70 text-stone-700 border-stone-200/90 hover:border-stone-400 hover:bg-white hover:text-stone-950 font-medium",
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
            isOpen ? "rotate-180" : "",
            hasActive ? "text-stone-300" : "text-stone-400",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Wholesale Rate (₹ / unit)
            </span>
            {hasActive && (
              <button
                type="button"
                onClick={() => {
                  setTempMin("");
                  setTempMax("");
                  onApply("", "");
                  setIsOpen(false);
                }}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "< ₹200", min: "", max: "200" },
              { label: "₹200 - ₹500", min: "200", max: "500" },
              { label: "₹500 - ₹1000", min: "500", max: "1000" },
              { label: "₹1000+", min: "1000", max: "" },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setTempMin(preset.min);
                  setTempMax(preset.max);
                  onApply(preset.min, preset.max);
                  setIsOpen(false);
                }}
                className="rounded-lg border border-stone-200 bg-stone-50/70 hover:bg-stone-100 hover:border-stone-300 py-1 text-[11px] font-medium text-stone-700 transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1.5 text-xs text-stone-400 font-medium">
                ₹
              </span>
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={tempMin}
                onChange={(e) => setTempMin(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-1.5 pl-6 pr-2 text-xs text-stone-900 focus:bg-white focus:border-amber-600 focus:outline-none transition-colors"
              />
            </div>
            <span className="text-xs text-stone-400 font-medium">to</span>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1.5 text-xs text-stone-400 font-medium">
                ₹
              </span>
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={tempMax}
                onChange={(e) => setTempMax(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-1.5 pl-6 pr-2 text-xs text-stone-900 focus:bg-white focus:border-amber-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onApply(tempMin, tempMax);
              setIsOpen(false);
            }}
            className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white py-2 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            Apply Price Filter
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Product Filter Bar (Architectural Sourcing Toolbar)
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
    <div className="w-full rounded-2xl border border-stone-200/90 bg-white p-3 sm:p-3.5 shadow-xs transition-all space-y-3">
      {/* Primary Toolbar Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left Side: All Filters Trigger + Quick Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tactile All Filters Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition-all cursor-pointer shrink-0"
            aria-label="Open full filters drawer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-stone-300" />
            <span>All Filters</span>
            {activeCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-stone-950">
                {activeCount}
              </span>
            )}
          </button>

          {/* Architectural divider */}
          <div className="hidden sm:block h-6 w-px bg-stone-200 mx-0.5" />

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
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium border transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0",
              isVerified
                ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold shadow-2xs"
                : "bg-stone-50/70 text-stone-700 border-stone-200/90 hover:bg-emerald-50/40 hover:text-emerald-800 hover:border-emerald-300",
            )}
            aria-pressed={isVerified}
          >
            <ShieldCheck
              className={cn(
                "h-3.5 w-3.5",
                isVerified ? "text-emerald-700" : "text-emerald-600",
              )}
            />
            <span>Verified Only</span>
          </button>
        </div>

        {/* Right Side: Lot Counter & Sort Selector */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2.5 xl:pt-0 border-t border-stone-100 xl:border-t-0">
          <div className="inline-flex items-center gap-2 rounded-xl bg-stone-50 border border-stone-200/80 px-3 py-2 text-xs text-stone-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong className="font-semibold text-stone-900">{totalResults}</strong> Stone Lots
            </span>
          </div>

          <ProductSortSelector currentSort={currentSort} />
        </div>
      </div>

      {/* Integrated Active Filter Shelf */}
      {activeCount > 0 && (
        <div className="mt-3 pt-3 border-t border-stone-100/90 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Active:
          </span>
          <ActiveFilterPills />
        </div>
      )}

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
