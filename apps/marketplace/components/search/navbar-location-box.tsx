"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Check, MapPin } from "lucide-react";

const POPULAR_INDIAN_CITIES = [
  { name: "All India", state: "Nationwide", isDefault: true },
  { name: "Srinagar", state: "Jammu & Kashmir" },
  { name: "Kishangarh", state: "Marble City, Rajasthan" },
  { name: "Makrana", state: "White Marble, Rajasthan" },
  { name: "Udaipur", state: "Green Marble & Granite" },
  { name: "Bangalore", state: "South Granite Hub" },
  { name: "Kota", state: "Blue Limestone, Rajasthan" },
  { name: "Dholpur", state: "Sandstone Hub, Rajasthan" },
  { name: "Ahmedabad", state: "Gujarat Stone Market" },
  { name: "Delhi NCR", state: "Architecture & Trade Hub" },
  { name: "Mumbai", state: "Maharashtra Trade Hub" },
  { name: "Hyderabad", state: "Telangana Granite Market" },
  { name: "Jaipur", state: "Heritage Stone & Carving" },
];

interface NavbarLocationBoxProps {
  currentCity?: string;
  onCityChange?: (city: string) => void;
}

export function NavbarLocationBox({
  currentCity = "Srinagar",
  onCityChange,
}: NavbarLocationBoxProps) {
  const [city, setCity] = useState(currentCity);
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes
  useEffect(() => {
    if (currentCity) setCity(currentCity);
  }, [currentCity]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectCity(selected: string) {
    setCity(selected);
    onCityChange?.(selected);
    setIsOpen(false);
    setSearchFilter("");
  }

  const filteredCities = POPULAR_INDIAN_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.state.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Location Search Box Pill (matches image media_1794586484217_96b28b62.png) */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 80);
        }}
        className="flex items-center h-10 sm:h-11 rounded-xl border border-stone-300 bg-white shadow-xs hover:border-stone-400 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all cursor-pointer overflow-hidden w-36 sm:w-44 lg:w-48 select-none"
        title="Select quarry supply location"
        role="button"
        tabIndex={0}
      >
        {/* Red Map Pin Icon */}
        <div className="pl-3 pr-1.5 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-red-600 fill-red-600"
            aria-hidden="true"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
        </div>

        {/* City Name display */}
        <div className="flex-1 min-w-0 pr-1">
          <span className="block text-xs sm:text-[13.5px] font-semibold text-stone-900 truncate">
            {city}
          </span>
        </div>

        {/* Thin dark vertical divider line | */}
        <div className="h-5 sm:h-6 w-[1.5px] bg-stone-900/80 mx-1 shrink-0" />

        {/* Teal Search Icon matching image */}
        <div className="pr-3 pl-1.5 flex items-center justify-center shrink-0 text-[#00a699] hover:opacity-80 transition-opacity">
          <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
        </div>
      </div>

      {/* City Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 sm:w-72 rounded-2xl bg-white shadow-2xl border border-stone-200 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Search inside cities */}
          <div className="px-3 pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-200">
              <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search city or stone hub..."
                className="w-full text-xs text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Quick options */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredCities.map((item) => {
              const isSelected = city.toLowerCase() === item.name.toLowerCase();
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleSelectCity(item.name)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-amber-50 text-amber-900 font-bold"
                      : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? "text-amber-600 fill-amber-600" : "text-stone-400"
                      }`}
                    />
                    <div className="truncate">
                      <span className="font-semibold text-stone-900">{item.name}</span>
                      <span className="ml-1.5 text-[10px] text-stone-400 font-normal">
                        ({item.state})
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                </button>
              );
            })}

            {filteredCities.length === 0 && searchFilter && (
              <div className="p-3 text-center">
                <p className="text-xs text-stone-500 mb-2">
                  Use custom city: <span className="font-bold text-stone-900">&quot;{searchFilter}&quot;</span>
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectCity(searchFilter)}
                  className="w-full py-1.5 px-3 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
                >
                  Select &quot;{searchFilter}&quot;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
