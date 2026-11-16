"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, ChevronDown, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@stone/ui";

const CATEGORY_ITEMS = [
  {
    name: "Indian White & Green Marble",
    slug: "marble",
    varieties: "Makrana Calcite, Kumari, Forest Green",
    badge: "28+ Lots",
    dotColor: "bg-stone-300",
  },
  {
    name: "Granite Gangsaw Slabs",
    slug: "granite",
    varieties: "Black Galaxy, Steel Grey, Tan Brown",
    badge: "34+ Lots",
    dotColor: "bg-stone-900",
  },
  {
    name: "Architectural Sandstone",
    slug: "sandstone",
    varieties: "Dholpur Beige, Teakwood, Rainbow Paving",
    badge: "22+ Lots",
    dotColor: "bg-amber-300",
  },
  {
    name: "Calibrated Limestone & Kota",
    slug: "limestone",
    varieties: "Kota Blue, Kota Brown, Kadapa Black",
    badge: "19+ Lots",
    dotColor: "bg-slate-400",
  },
  {
    name: "Crystalline Quartzite",
    slug: "quartzite",
    varieties: "Silver White, Taj Mahal, Cristallo",
    badge: "14+ Lots",
    dotColor: "bg-blue-200",
  },
  {
    name: "Vein-Cut Travertine",
    slug: "travertine",
    varieties: "Classic Cream, Walnut, Titanium",
    badge: "12+ Lots",
    dotColor: "bg-amber-100",
  },
  {
    name: "Natural Cleft Slate",
    slug: "slate",
    varieties: "Kund Charcoal, Multi-color, Peacock",
    badge: "16+ Lots",
    dotColor: "bg-stone-700",
  },
  {
    name: "Translucent Onyx & Alabaster",
    slug: "onyx",
    varieties: "Honey Amber, Backlit White, Green Onyx",
    badge: "8+ Lots",
    dotColor: "bg-amber-500",
  },
];

export function CategoriesMegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* E-Commerce Categories Trigger Button */}
      <button
        type="button"
        onClick={handleToggleClick}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer border",
          isOpen
            ? "bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-500/20 shadow-2xs"
            : "bg-stone-100/90 text-stone-800 border-stone-200/90 hover:bg-stone-200/80 hover:text-stone-950",
        )}
        aria-expanded={isOpen}
      >
        <LayoutGrid className="h-4 w-4 text-amber-600 stroke-[2.2]" />
        <span>Categories</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-stone-400 transition-transform duration-200",
            isOpen && "rotate-180 text-amber-700",
          )}
        />
      </button>

      {/* Mega Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-[580px] bg-white rounded-2xl border border-stone-200 shadow-2xl z-50 p-4 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100 px-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Explore Geological Stone Collections</span>
            </div>
            <Link
              href="/categories"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_ITEMS.map((item) => (
              <Link
                key={item.slug}
                href={`/products?category=${item.slug}`}
                onClick={() => setIsOpen(false)}
                className="group flex items-start gap-2.5 p-2 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200"
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 shadow-2xs border border-stone-300",
                    item.dotColor,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 group-hover:text-stone-500 truncate font-medium mt-0.5">
                    {item.varieties}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 bg-stone-50 -mx-4 -mb-4 px-4 py-2.5 rounded-b-2xl">
            <span className="font-medium">
              Direct Gangsaw Calibration: ±1mm tolerance
            </span>
            <Link
              href="/request-quote"
              onClick={() => setIsOpen(false)}
              className="font-bold text-amber-800 hover:underline"
            >
              Submit Custom BOQ →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
