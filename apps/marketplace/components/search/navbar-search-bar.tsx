"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { SearchLeadModal } from "@/components/search-lead-modal";

/**
 * Visual search camera icon matching IndiaMART's dual-color bracket viewfinder
 */
function VisualSearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top Left Teal Bracket */}
      <path
        d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8"
        stroke="#00a699"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Top Right Teal Bracket */}
      <path
        d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8"
        stroke="#00a699"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Bottom Left Red Bracket */}
      <path
        d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20H8"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Bottom Right Red Bracket */}
      <path
        d="M16 20h2.5a1.5 1.5 0 0 0 1.5-1.5V16"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Camera in center */}
      <path
        d="M10 8.5h4l.8 1.5H16a1.5 1.5 0 0 1 1.5 1.5v4.5A1.5 1.5 0 0 1 16 17.5H8A1.5 1.5 0 0 1 6.5 16V11.5A1.5 1.5 0 0 1 8 10h1.2l.8-1.5Z"
        fill="#00a699"
      />
      <circle cx="12" cy="13.5" r="1.8" fill="white" />
    </svg>
  );
}

interface NavbarSearchBarProps {
  selectedCity?: string;
}

export function NavbarSearchBar({ selectedCity = "All India" }: NavbarSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync auth state
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
    const hasCity = selectedCity && selectedCity !== "All India";
    const cityParam = hasCity ? `&city=${encodeURIComponent(selectedCity)}` : "";

    if (!cleanQuery) {
      if (hasCity) {
        router.push(`/products?city=${encodeURIComponent(selectedCity)}`);
      } else {
        router.push("/products");
      }
      return;
    }

    const finalLeadQuery = hasCity ? `${cleanQuery} (in ${selectedCity})` : cleanQuery;

    if (isAuthenticated) {
      try {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: finalLeadQuery }),
        });
      } catch (err) {
        console.error("Failed to record lead:", err);
      }
      router.push(`/products?q=${encodeURIComponent(cleanQuery)}${cityParam}`);
      return;
    }

    // Guest buyer -> Open IndiaMART-style Search Lead capture modal
    setModalQuery(finalLeadQuery);
    setIsModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearchTrigger(query);
  }

  function handleCameraClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use image filename as stone visual search query
    const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const visualQuery = baseName.trim() || "Natural Stone Slab (Photo Match)";
    setQuery(visualQuery);
    handleSearchTrigger(visualQuery);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center w-full h-10 sm:h-11 rounded-xl border border-stone-300 bg-white overflow-hidden shadow-xs hover:border-stone-400 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all"
        role="search"
      >
        {/* Hidden file input for stone image visual search */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
          aria-label="Upload stone photo"
        />

        {/* Input Field matching IndiaMART placeholder */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter product / service to search"
          className="w-full h-full pl-3.5 sm:pl-4 pr-1 text-xs lg:text-[13px] text-stone-900 placeholder:text-stone-400 focus:outline-none bg-transparent"
        />

        {/* Clear query button if typed */}
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="p-1 mr-0.5 text-stone-400 hover:text-stone-700 transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Camera Visual Search Button */}
        <button
          type="button"
          onClick={handleCameraClick}
          className="p-1.5 sm:px-2 text-stone-600 hover:opacity-80 transition-opacity flex items-center justify-center shrink-0 cursor-pointer"
          title="Search by stone photo / image"
          aria-label="Visual stone search"
        >
          <VisualSearchIcon className="w-5 h-5" />
        </button>

        {/* Search Submit Button - StonesDekho Amber Theme */}
        <button
          type="submit"
          className="h-full px-3 sm:px-3.5 bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer group"
          title="Search"
          aria-label="Submit search"
        >
          <Search className="w-4 h-4 stroke-[2.2] group-hover:scale-105 transition-transform" />
        </button>
      </form>

      {/* Search Lead Modal (captures lead if guest) */}
      <SearchLeadModal
        isOpen={isModalOpen}
        initialQuery={modalQuery}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(searched) => {
          setIsModalOpen(false);
          router.push(`/products?q=${encodeURIComponent(searched)}`);
        }}
      />
    </>
  );
}
