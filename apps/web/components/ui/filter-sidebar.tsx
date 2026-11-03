"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@stone/ui";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSidebarProps {
  categories?: FilterOption[];
  materialTypes?: FilterOption[];
  colours?: FilterOption[];
  finishes?: FilterOption[];
  origins?: FilterOption[];
  stockStatuses?: FilterOption[];
  className?: string;
  isMobileDrawer?: boolean;
  onCloseDrawer?: () => void;
}

function FilterCheckboxGroup({
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
  if (options.length === 0) return null;

  return (
    <div className="border-b border-stone-100 pb-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-700">
        {label}
      </h3>
      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
        {options.map((option) => {
          const isChecked = selectedValues.includes(option.value);
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2.5 text-sm hover:text-amber-800 transition-colors"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => onChange(param, option.value, e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600 focus:ring-offset-0"
              />
              <span className={cn(isChecked ? "text-stone-900 font-semibold" : "text-stone-600")}>
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function FilterSidebar({
  categories = [],
  materialTypes = [],
  colours = [],
  finishes = [],
  origins = [],
  stockStatuses = [],
  className,
  isMobileDrawer = false,
  onCloseDrawer,
}: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    (field: "minPrice" | "maxPrice", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set(field, value.trim());
      } else {
        params.delete(field);
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

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q); // preserve search term
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort); // preserve sort
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const isVerified = searchParams.get("verified") === "true";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  const activeFilterCount =
    getParamValues("category").length +
    getParamValues("material").length +
    getParamValues("colour").length +
    getParamValues("finish").length +
    getParamValues("origin").length +
    getParamValues("stockStatus").length +
    (isVerified ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0);

  return (
    <aside className={cn("space-y-6", className)} aria-label="Product filters">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-stone-900">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Verified Supplier Only Toggle */}
      <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-200/70">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-stone-900 block">Verified Suppliers</span>
            <span className="text-[11px] text-stone-500 block">Only certified quarries & exporters</span>
          </div>
          <input
            type="checkbox"
            checked={isVerified}
            onChange={toggleVerified}
            className="h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-600"
          />
        </label>
      </div>

      {/* Category / Stone Family */}
      <FilterCheckboxGroup
        label="Stone Category"
        param="category"
        options={categories}
        selectedValues={getParamValues("category")}
        onChange={updateParams}
      />

      {/* Material Type */}
      <FilterCheckboxGroup
        label="Geological Material"
        param="material"
        options={materialTypes}
        selectedValues={getParamValues("material")}
        onChange={updateParams}
      />

      {/* Surface Finish */}
      <FilterCheckboxGroup
        label="Surface Finish"
        param="finish"
        options={finishes}
        selectedValues={getParamValues("finish")}
        onChange={updateParams}
      />

      {/* Quarry Origin */}
      <FilterCheckboxGroup
        label="Quarry Origin"
        param="origin"
        options={origins}
        selectedValues={getParamValues("origin")}
        onChange={updateParams}
      />

      {/* Colour */}
      <FilterCheckboxGroup
        label="Stone Colour"
        param="colour"
        options={colours}
        selectedValues={getParamValues("colour")}
        onChange={updateParams}
      />

      {/* Stock Status */}
      {stockStatuses.length > 0 && (
        <FilterCheckboxGroup
          label="Availability"
          param="stockStatus"
          options={stockStatuses}
          selectedValues={getParamValues("stockStatus")}
          onChange={updateParams}
        />
      )}

      {/* Wholesale Price Range */}
      <div className="border-b border-stone-100 pb-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-700">
          Price Range (₹ / unit)
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-2 text-xs text-stone-400">₹</span>
            <input
              type="number"
              min={0}
              placeholder="Min"
              defaultValue={minPrice}
              onBlur={(e) => updatePriceRange("minPrice", e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white py-1.5 pl-6 pr-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              aria-label="Minimum price"
            />
          </div>
          <span className="text-stone-400 text-xs font-medium">to</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-2 text-xs text-stone-400">₹</span>
            <input
              type="number"
              min={0}
              placeholder="Max"
              defaultValue={maxPrice}
              onBlur={(e) => updatePriceRange("maxPrice", e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white py-1.5 pl-6 pr-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              aria-label="Maximum price"
            />
          </div>
        </div>
      </div>

      {isMobileDrawer && onCloseDrawer && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onCloseDrawer}
            className="btn-accent w-full py-2.5 text-sm font-semibold shadow-md"
          >
            Apply Filters & View Results
          </button>
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile Filter Drawer & Trigger
// ---------------------------------------------------------------------------
export function MobileFilterDrawerTrigger({
  activeFilterCount,
  onOpen,
}: {
  activeFilterCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 lg:hidden"
      aria-label="Open filter drawer"
    >
      <svg className="h-4 w-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <span>Filters</span>
      {activeFilterCount > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}

export function MobileFilterDrawerModal({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Dialog */}
      <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="text-base font-bold text-stone-900">Filter Stone Lots</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close filters"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Filter Pills
// ---------------------------------------------------------------------------
export function ActiveFilterPills() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const removeFilter = (param: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(param);
    params.delete(param);
    current.filter((v) => v !== value).forEach((v) => params.append(param, v));
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const removeSingleParam = (param: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    router.push(`${pathname}?${params.toString()}`);
  };

  const pills: { key: string; label: string; onRemove: () => void }[] = [];

  ["category", "material", "colour", "finish", "origin", "stockStatus"].forEach((param) => {
    searchParams.getAll(param).forEach((val) => {
      pills.push({
        key: `${param}-${val}`,
        label: `${param.charAt(0).toUpperCase() + param.slice(1)}: ${val}`,
        onRemove: () => removeFilter(param, val),
      });
    });
  });

  if (searchParams.get("verified") === "true") {
    pills.push({
      key: "verified",
      label: "Verified Only",
      onRemove: () => removeSingleParam("verified"),
    });
  }

  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  if (minPrice && maxPrice) {
    pills.push({
      key: "price-range",
      label: `Price: ₹${minPrice} - ₹${maxPrice}`,
      onRemove: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("minPrice");
        params.delete("maxPrice");
        router.push(`${pathname}?${params.toString()}`);
      },
    });
  } else if (minPrice) {
    pills.push({
      key: "min-price",
      label: `Min: ₹${minPrice}`,
      onRemove: () => removeSingleParam("minPrice"),
    });
  } else if (maxPrice) {
    pills.push({
      key: "max-price",
      label: `Max: ₹${maxPrice}`,
      onRemove: () => removeSingleParam("maxPrice"),
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 pb-4">
      <span className="text-xs font-semibold text-stone-500">Active Filters:</span>
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-xs"
        >
          <span>{pill.label}</span>
          <button
            type="button"
            onClick={pill.onRemove}
            className="rounded-full p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label={`Remove filter ${pill.label}`}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2 ml-1"
      >
        Clear all
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort Selector
// ---------------------------------------------------------------------------
export function ProductSortSelector({ currentSort = "featured" }: { currentSort?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (sortVal: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortVal === "featured" || !sortVal) {
      params.delete("sort");
    } else {
      params.set("sort", sortVal);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="product-sort" className="text-xs font-medium text-stone-500 whitespace-nowrap">
        Sort by:
      </label>
      <select
        id="product-sort"
        value={currentSort || "featured"}
        onChange={(e) => handleSortChange(e.target.value)}
        className="rounded-lg border border-stone-300 bg-white py-1.5 pl-2.5 pr-8 text-xs font-semibold text-stone-800 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-xs"
      >
        <option value="featured">Featured / Newest</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="newest">Recently Published</option>
      </select>
    </div>
  );
}
