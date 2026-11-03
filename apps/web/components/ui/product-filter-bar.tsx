"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FilterSidebar,
  type FilterOption,
  MobileFilterDrawerTrigger,
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
  stockStatuses: FilterOption[];
  currentSort?: string;
  totalResults: number;
}

export function ProductFilterBar({
  categories,
  materialTypes,
  colours,
  finishes,
  origins,
  stockStatuses,
  currentSort,
  totalResults,
}: ProductFilterBarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const searchParams = useSearchParams();

  const activeCount =
    searchParams.getAll("category").length +
    searchParams.getAll("material").length +
    searchParams.getAll("colour").length +
    searchParams.getAll("finish").length +
    searchParams.getAll("origin").length +
    searchParams.getAll("stockStatus").length +
    (searchParams.get("verified") === "true" ? 1 : 0) +
    (searchParams.get("minPrice") ? 1 : 0) +
    (searchParams.get("maxPrice") ? 1 : 0);

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
        <div className="flex items-center gap-3">
          <MobileFilterDrawerTrigger
            activeFilterCount={activeCount}
            onOpen={() => setIsDrawerOpen(true)}
          />
          <p className="text-xs text-stone-600 font-medium">
            Showing <span className="font-bold text-stone-900">{totalResults}</span> stone lots & gangsaw slabs
          </p>
        </div>

        <ProductSortSelector currentSort={currentSort} />
      </div>

      <ActiveFilterPills />

      <MobileFilterDrawerModal isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <FilterSidebar
          categories={categories}
          materialTypes={materialTypes}
          colours={colours}
          finishes={finishes}
          origins={origins}
          stockStatuses={stockStatuses}
          isMobileDrawer
          onCloseDrawer={() => setIsDrawerOpen(false)}
        />
      </MobileFilterDrawerModal>
    </div>
  );
}

