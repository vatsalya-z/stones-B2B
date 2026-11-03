"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition, useState } from "react";

export interface FilterOption {
  label: string;
  value: string;
}

export interface AdminFiltersProps {
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    defaultValue?: string;
  }[];
}

export function AdminFilters({
  searchPlaceholder = "Search...",
  filters = [],
}: AdminFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") ?? "";
  const [searchValue, setSearchValue] = useState(currentSearch);

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Always reset page to 1 when changing filters
      params.delete("page");

      for (const [key, val] of Object.entries(updates)) {
        if (!val || val === "all") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      return params.toString();
    },
    [searchParams],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const qs = createQueryString({ search: searchValue.trim() });
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const qs = createQueryString({ [key]: value });
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    });
  };

  const handleReset = () => {
    setSearchValue("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters =
    Boolean(searchParams.get("search")) ||
    filters.some((f) => searchParams.has(f.key) && searchParams.get(f.key) !== "all");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-900/60 p-4 md:flex-row md:items-center md:justify-between">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-stone-700 bg-stone-950/80 px-3.5 py-2 pl-9 text-xs text-stone-200 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <svg
          className="absolute left-3 top-2.5 h-4 w-4 text-stone-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </form>

      {/* Select Filters & Reset */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const activeVal = searchParams.get(f.key) ?? f.defaultValue ?? "all";
          return (
            <select
              key={f.key}
              value={activeVal}
              onChange={(e) => handleFilterChange(f.key, e.target.value)}
              className="rounded-lg border border-stone-700 bg-stone-950/80 px-3 py-2 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-stone-900 text-stone-200">
                  {opt.label}
                </option>
              ))}
            </select>
          );
        })}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-stone-700 bg-stone-800/80 px-3 py-2 text-xs font-medium text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        )}

        {isPending && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        )}
      </div>
    </div>
  );
}

