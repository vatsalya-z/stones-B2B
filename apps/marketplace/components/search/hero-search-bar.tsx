"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Sparkles } from "lucide-react";
import { SearchLeadModal } from "@/components/search-lead-modal";

const POPULAR_SEARCHES = [
  "Makrana White Marble",
  "Black Galaxy Granite",
  "Kota Blue Stone",
  "Dholpur Sandstone",
  "Italian Travertine",
  "Tan Brown Granite",
];

export function HeroSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [modalQuery, setModalQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check user auth state on mount
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

  async function handleSearchTrigger(searchQuery: string) {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) return;

    // If authenticated: record lead directly & redirect to products search
    if (isAuthenticated) {
      try {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: cleanQuery }),
        });
      } catch (err) {
        console.error("Failed to record lead:", err);
      }
      router.push(`/products?q=${encodeURIComponent(cleanQuery)}`);
      return;
    }

    // If not authenticated: open IndiaMart-style lead popup immediately!
    setModalQuery(cleanQuery);
    setIsModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearchTrigger(query);
  }

  return (
    <div className="w-full max-w-2xl mx-auto lg:mx-0 mt-5 sm:mt-6">
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0 bg-white p-1.5 sm:p-2 rounded-2xl shadow-2xl border border-stone-200/80 backdrop-blur-md">
        {/* City / Location prefix tag */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-600 border-r border-stone-200 select-none bg-stone-50 rounded-xl">
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          <span>All India</span>
        </div>

        {/* Input */}
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 sm:left-4 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter stone name (e.g. Makrana Marble, Black Galaxy...)"
            className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none bg-transparent"
          />
        </div>

        {/* Search / Get Quotes Button */}
        <button
          type="submit"
          className="flex items-center justify-center gap-2 bg-[#007065] hover:bg-[#005a51] text-white px-5 sm:px-7 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
        >
          <Search className="w-4 h-4" />
          <span>Search &amp; Get Quotes</span>
        </button>
      </form>

      {/* Popular Trending Queries (IndiaMart quick chips) */}
      <div className="mt-3 flex items-center flex-wrap gap-1.5 sm:gap-2">
        <span className="text-[11px] font-semibold text-stone-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Trending:
        </span>
        {POPULAR_SEARCHES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setQuery(item);
              handleSearchTrigger(item);
            }}
            className="text-[11px] px-2.5 py-1 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-700/80 transition-colors shadow-xs cursor-pointer"
          >
            {item}
          </button>
        ))}
      </div>

      {/* IndiaMart-Style Lead Generation Modal */}
      <SearchLeadModal
        initialQuery={modalQuery}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(q) => {
          setIsModalOpen(false);
          router.push(`/products?q=${encodeURIComponent(q)}`);
        }}
      />
    </div>
  );
}

