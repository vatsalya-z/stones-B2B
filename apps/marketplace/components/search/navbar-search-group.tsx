"use client";

import { useState } from "react";
import { NavbarLocationBox } from "./navbar-location-box";
import { NavbarSearchBar } from "./navbar-search-bar";

export function NavbarSearchGroup() {
  const [selectedCity, setSelectedCity] = useState("Srinagar");

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 w-full">
      {/* Location Box (Left) matching image media_1794586484217_96b28b62.png */}
      <NavbarLocationBox
        currentCity={selectedCity}
        onCityChange={setSelectedCity}
      />

      {/* Main Product/Service Search Bar (Right) */}
      <div className="flex-1 min-w-0">
        <NavbarSearchBar selectedCity={selectedCity} />
      </div>
    </div>
  );
}
