"use client";

import { useState, useTransition, useId, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MapPin,
  Building2,
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

export interface SupplierFilterBarProps {
  initialSearch?: string;
  initialType?: string;
  initialState?: string;
  totalResults: number;
}

export const BUSINESS_TYPES = [
  { value: "", label: "All Business Types" },
  { value: "quarry_owner", label: "Quarry Owner (Direct Sourcing)" },
  { value: "processor", label: "Stone Processor (Gangsaw & Tiles)" },
  { value: "exporter", label: "Certified Exporter" },
  { value: "manufacturer", label: "Manufacturer / Factory" },
  { value: "wholesaler", label: "Mandi Stockist / Wholesaler" },
];

export const MAJOR_STATES = [
  { value: "", label: "All States & Quarry Hubs" },
  { value: "Rajasthan", label: "Rajasthan (Makrana, Kota, Dholpur, Kishangarh)" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh (Ongole, Chimakurthy)" },
  { value: "Karnataka", label: "Karnataka (Bangalore, Ilkal)" },
  { value: "Haryana", label: "Haryana (Kund, Rewari Slate)" },
  { value: "Gujarat", label: "Gujarat (Ambaji Marble, Morbi)" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh (Gwalior Mint)" },
  { value: "Tamil Nadu", label: "Tamil Nadu (Madurai, Salem)" },
  { value: "Telangana", label: "Telangana (Karimnagar Tan Brown)" },
  { value: "Maharashtra", label: "Maharashtra" },
];

interface QuickHubPill {
  label: string;
  badge?: string;
  type?: string;
  state?: string;
  q?: string;
}

const QUICK_HUBS: QuickHubPill[] = [
  { label: "All Suppliers", type: "", state: "", q: "" },
  { label: "Quarry Owners", badge: "👑 Direct", type: "quarry_owner", state: "", q: "" },
  { label: "Processors", badge: "🏭 Gangsaw", type: "processor", state: "", q: "" },
  { label: "Exporters", badge: "🚢 Crate", type: "exporter", state: "", q: "" },
  { label: "Makrana Marble", badge: "📍 Raj", type: "", state: "Rajasthan", q: "Makrana" },
  { label: "Ongole Galaxy", badge: "📍 AP", type: "", state: "Andhra Pradesh", q: "Ongole" },
  { label: "Kota Stone", badge: "📍 Raj", type: "", state: "Rajasthan", q: "Kota" },
  { label: "Dholpur Sandstone", badge: "📍 Raj", type: "", state: "Rajasthan", q: "Dholpur" },
  { label: "Kishangarh Mandi", badge: "📍 Raj", type: "", state: "Rajasthan", q: "Kishangarh" },
  { label: "Rewari Slate", badge: "📍 HR", type: "", state: "Haryana", q: "Rewari" },
  { label: "Bangalore Granite", badge: "📍 KA", type: "", state: "Karnataka", q: "Bangalore" },
];

function buildFilterUrl(params: { q?: string; type?: string; state?: string }) {
  const next = new URLSearchParams();
  if (params.q?.trim()) next.set("q", params.q.trim());
  if (params.type) next.set("type", params.type);
  if (params.state) next.set("state", params.state);
  const qs = next.toString();
  return qs ? `/suppliers?${qs}` : "/suppliers";
}

export function SupplierFilterBar({
  initialSearch = "",
  initialType = "",
  initialState = "",
  totalResults,
}: SupplierFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeQ = searchParams?.get("q") ?? initialSearch;
  const activeType = searchParams?.get("type") ?? initialType;
  const activeState = searchParams?.get("state") ?? initialState;

  const [q, setQ] = useState(activeQ);
  const [type, setType] = useState(activeType);
  const [state, setState] = useState(activeState);

  useEffect(() => {
    setQ(activeQ);
    setType(activeType);
    setState(activeState);
  }, [activeQ, activeType, activeState]);

  const searchInputId = useId();
  const typeSelectId = useId();
  const stateSelectId = useId();

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      router.push(buildFilterUrl({ q, type, state }));
    });
  }

  function clearSearchInput() {
    setQ("");
    startTransition(() => {
      router.push(buildFilterUrl({ q: "", type, state }));
    });
  }

  const hasActiveFilters = Boolean(activeQ?.trim() || activeType || activeState);
  const activeFilterCount =
    (activeQ?.trim() ? 1 : 0) + (activeType ? 1 : 0) + (activeState ? 1 : 0);

  const activeTypeLabel = BUSINESS_TYPES.find((b) => b.value === activeType)?.label;
  const activeStateLabel = MAJOR_STATES.find((s) => s.value === activeState)?.label;

  return (
    <div className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">
      {/* Top Meta Bar: Subtitle & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
            <SlidersHorizontal className="h-4 w-4 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-stone-900">
              Filter Verified Stone Suppliers
            </span>
            <span className="hidden md:inline text-xs text-stone-400 font-medium ml-2">
              • Search direct quarry lease holders, gangsaw mills &amp; exporters
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-semibold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>
              <strong className="font-extrabold">{totalResults}</strong> Verified Entities
            </span>
          </div>
        </div>
      </div>

      {/* Main Omnibar Search & Filter Form */}
      <form
        method="GET"
        action="/suppliers"
        onSubmit={handleFilterSubmit}
        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch"
      >
        {/* 1. Keyword / Stone / Entity Search */}
        <div className="md:col-span-12 lg:col-span-4 relative">
          <label htmlFor={searchInputId} className="sr-only">
            Search suppliers
          </label>
          <div className="relative flex items-center h-12 bg-stone-50/90 hover:bg-stone-50 border border-stone-200/90 hover:border-stone-300 rounded-2xl px-3.5 transition-all focus-within:bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-2xs">
            <Search className="h-4 w-4 text-amber-600 shrink-0 mr-2.5 pointer-events-none stroke-[2.2]" />
            <input
              id={searchInputId}
              type="text"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search factory, quarry, or stone (Makrana, Galaxy)..."
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={clearSearchInput}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Business / Facility Type Select */}
        <div className="md:col-span-6 lg:col-span-3 relative">
          <label htmlFor={typeSelectId} className="sr-only">
            Facility Type
          </label>
          <div className="relative flex items-center h-12 bg-stone-50/90 hover:bg-stone-50 border border-stone-200/90 hover:border-stone-300 rounded-2xl px-3.5 transition-all focus-within:bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-2xs">
            <Building2 className="h-4 w-4 text-amber-600 shrink-0 mr-2.5 pointer-events-none stroke-[2]" />
            <select
              id={typeSelectId}
              name="type"
              value={type}
              onChange={(e) => {
                const nextType = e.target.value;
                setType(nextType);
                startTransition(() => {
                  router.push(buildFilterUrl({ q, type: nextType, state }));
                });
              }}
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-stone-800 focus:outline-none cursor-pointer pr-6 appearance-none truncate"
            >
              {BUSINESS_TYPES.map((b) => (
                <option key={b.value} value={b.value} className="text-stone-900 font-medium">
                  {b.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-stone-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* 3. State & Mandi Hub Select */}
        <div className="md:col-span-6 lg:col-span-3 relative">
          <label htmlFor={stateSelectId} className="sr-only">
            Mandi State Hub
          </label>
          <div className="relative flex items-center h-12 bg-stone-50/90 hover:bg-stone-50 border border-stone-200/90 hover:border-stone-300 rounded-2xl px-3.5 transition-all focus-within:bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-2xs">
            <MapPin className="h-4 w-4 text-amber-600 shrink-0 mr-2.5 pointer-events-none stroke-[2]" />
            <select
              id={stateSelectId}
              name="state"
              value={state}
              onChange={(e) => {
                const nextState = e.target.value;
                setState(nextState);
                startTransition(() => {
                  router.push(buildFilterUrl({ q, type, state: nextState }));
                });
              }}
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-stone-800 focus:outline-none cursor-pointer pr-6 appearance-none truncate"
            >
              {MAJOR_STATES.map((s) => (
                <option key={s.value} value={s.value} className="text-stone-900 font-medium">
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-stone-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* 4. Filter CTA Button */}
        <div className="md:col-span-12 lg:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full h-12 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-2xl px-4 py-2.5 shadow-md shadow-amber-700/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="h-4 w-4 stroke-[2.4]" />
            <span>{isPending ? "Filtering..." : "Find Suppliers"}</span>
          </button>
        </div>
      </form>

      {/* Quick Mandi & Quarry Filter Pills */}
      <div className="pt-2 flex items-center gap-2">
        <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-400 shrink-0">
          <Sparkles className="h-3 w-3 text-amber-600" />
          <span className="hidden sm:inline">Popular Hubs:</span>
          <span className="sm:hidden">Hubs:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {QUICK_HUBS.map((hub) => {
            const isAll = !hub.type && !hub.state && !hub.q;
            const isTypeActive = hub.type && activeType === hub.type;
            const isQActive = hub.q && activeQ?.toLowerCase().includes(hub.q.toLowerCase());
            const isActive = isAll ? !hasActiveFilters : Boolean(isTypeActive || isQActive);

            return (
              <Link
                key={hub.label}
                href={buildFilterUrl({ q: hub.q, type: hub.type, state: hub.state })}
                className={`group flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200/90 hover:border-stone-300"
                }`}
              >
                {hub.badge && (
                  <span
                    className={`text-[10px] font-bold ${
                      isActive ? "text-amber-400" : "text-amber-700"
                    }`}
                  >
                    {hub.badge}
                  </span>
                )}
                <span>{hub.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Active Filter Chips & Reset Bar */}
      {hasActiveFilters && (
        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mr-1">
            Active Filters ({activeFilterCount}):
          </span>

          {activeQ?.trim() && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50/80 border border-amber-200/90 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
              <Search className="h-3 w-3 text-amber-700" />
              <span>&ldquo;{activeQ.trim()}&rdquo;</span>
              <Link
                href={buildFilterUrl({ q: "", type: activeType, state: activeState })}
                className="text-amber-700 hover:text-amber-950 p-0.5 rounded transition-colors"
                title="Remove keyword search"
              >
                <X className="h-3 w-3" />
              </Link>
            </span>
          )}

          {activeType && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50/80 border border-amber-200/90 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
              <Building2 className="h-3 w-3 text-amber-700" />
              <span>{activeTypeLabel || activeType}</span>
              <Link
                href={buildFilterUrl({ q: activeQ, type: "", state: activeState })}
                className="text-amber-700 hover:text-amber-950 p-0.5 rounded transition-colors"
                title="Remove facility type"
              >
                <X className="h-3 w-3" />
              </Link>
            </span>
          )}

          {activeState && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50/80 border border-amber-200/90 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
              <MapPin className="h-3 w-3 text-amber-700" />
              <span>{activeStateLabel?.split(" (")[0] || activeState}</span>
              <Link
                href={buildFilterUrl({ q: activeQ, type: activeType, state: "" })}
                className="text-amber-700 hover:text-amber-950 p-0.5 rounded transition-colors"
                title="Remove quarry state"
              >
                <X className="h-3 w-3" />
              </Link>
            </span>
          )}

          <Link
            href="/suppliers"
            className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-amber-800 transition-colors ml-2"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset All Filters</span>
          </Link>
        </div>
      )}
    </div>
  );
}
