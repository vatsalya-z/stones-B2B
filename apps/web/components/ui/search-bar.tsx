"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@stone/ui";

export interface SearchBarProps {
  variant?: "hero" | "compact";
  defaultValue?: string;
  className?: string;
}

export function SearchBar({
  variant = "compact",
  defaultValue = "",
  className,
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue || searchParams.get("q") || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("q", query.trim());
        params.delete("page"); // reset pagination on new search
      } else {
        params.delete("q");
      }
      // Navigate to /search if on homepage, else update current page params
      const targetPath = pathname === "/" ? "/products" : pathname;
      router.push(`${targetPath}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pushSearch(newValue);
      }, 300);
    },
    [pushSearch],
  );

  const handleClear = () => {
    setValue("");
    pushSearch("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushSearch(value);
  };

  // Sync when URL q param changes externally
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setValue(q);
  }, [searchParams]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const isHero = variant === "hero";

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn("relative w-full", className)}
    >
      {/* Search icon */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 flex items-center",
          isHero ? "pl-4" : "pl-3.5",
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className={cn("text-stone-400", isHero ? "h-5 w-5" : "h-4 w-4")}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>

      <input
        type="search"
        name="q"
        value={value}
        onChange={handleChange}
        placeholder="Search marble, granite, sandstone..."
        autoComplete="off"
        aria-label="Search products"
        className={cn(
          "block w-full rounded-xl border border-stone-300 bg-white text-stone-900",
          "placeholder-stone-400 transition-colors",
          "focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/20",
          isHero
            ? "py-3.5 sm:py-4 pl-12 pr-12 text-base shadow-lg"
            : "py-2.5 pl-10 pr-9 text-sm",
          value && "pr-10",
        )}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center text-stone-400 transition-colors hover:text-stone-600",
            isHero ? "pr-4" : "pr-3",
          )}
          aria-label="Clear search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
    </form>
  );
}
