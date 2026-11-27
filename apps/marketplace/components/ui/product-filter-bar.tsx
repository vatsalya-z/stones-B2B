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

  const activeCount =
    getParamValues("category").length +
    getParamValues("material").length +
    getParamValues("colour").length +
    getParamValues("finish").length +
    getParamValues("origin").length +
    getParamValues("thickness").length +
    getParamValues("stockStatus").length +
    (isVerified ? 1 : 0) +
    (searchParams.get("location") ? 1 : 0) +
    (searchParams.get("q") ? 1 : 0);

  return (
    <div className="w-full rounded-2xl border border-stone-200/90 bg-white p-3 sm:p-3.5 shadow-xs transition-all space-y-2.5 sm:space-y-3">
      {/* ── MOBILE FILTER BAR (< sm) ── */}
      <div className="flex sm:hidden flex-col gap-2.5">
        {/* Row 1: All Filters Drawer Trigger + Verified Pill + Sort Selector */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tactile All Filters Button */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition-all cursor-pointer shrink-0"
              aria-label="Open full filters drawer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-stone-300" />
              <span className="hidden min-[380px]:inline">All </span><span>Filters</span>
              {activeCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-stone-950">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Quick Pill: Verified Suppliers Only */}
            <button
              type="button"
              onClick={toggleVerified}
              className={cn(
                "inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium border transition-all cursor-pointer whitespace-nowrap shrink-0",
                isVerified
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold shadow-2xs"
                  : "bg-stone-50 text-stone-700 border-stone-200/90 hover:bg-stone-100",
              )}
              aria-pressed={isVerified}
            >
              <ShieldCheck
                className={cn(
                  "h-3.5 w-3.5",
                  isVerified ? "text-emerald-700" : "text-emerald-600",
                )}
              />
              <span>Verified</span>
            </button>
          </div>

          {/* Sort Selector on Mobile */}
          <div className="shrink-0 min-w-0">
            <ProductSortSelector currentSort={currentSort} />
          </div>
        </div>

        {/* Row 2: Lot Count & Horizontal Quick Material Tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100 overflow-x-auto no-scrollbar scrollbar-hide py-0.5">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2 py-1 text-[11px] text-stone-600 shrink-0 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span><strong className="text-stone-900 font-bold">{totalResults}</strong> Lots</span>
          </div>

          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("material");
              params.delete("page");
              router.push(`${pathname}?${params.toString()}`);
            }}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0",
              getParamValues("material").length === 0
                ? "bg-stone-900 text-white shadow-2xs"
                : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/80",
            )}
          >
            All Stones
          </button>

          {materialTypes.map((mat) => {
            const isSelected = getParamValues("material").includes(mat.value);
            return (
              <button
                key={mat.value}
                type="button"
                onClick={() => updateParams("material", mat.value, !isSelected)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 border",
                  isSelected
                    ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200/80",
                )}
              >
                {mat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP & TABLET FILTER TOOLBAR (hidden on < sm, flex on sm+) ── */}
      <div className="hidden sm:flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
