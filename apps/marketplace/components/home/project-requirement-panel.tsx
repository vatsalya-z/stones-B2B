"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const STONE_TYPES = [
  { label: "Marble", value: "Marble" },
  { label: "Granite", value: "Granite" },
  { label: "Sandstone", value: "Sandstone" },
  { label: "Limestone", value: "Limestone" },
  { label: "Quartzite", value: "Quartzite" },
  { label: "Slate", value: "Slate" },
  { label: "Travertine", value: "Travertine" },
  { label: "Onyx", value: "Onyx" },
];

const APPLICATIONS = [
  { label: "Flooring & Large Paving", value: "Flooring" },
  { label: "Wall Cladding & Facades", value: "Cladding" },
  { label: "Kitchen Countertops & Vanities", value: "Countertops" },
  { label: "Landscaping & Cobbles", value: "Landscaping" },
  { label: "Architectural CNC Jaalis", value: "Carving" },
  { label: "Public Infrastructure", value: "Infrastructure" },
];

const QUANTITY_PRESETS = [
  { label: "500 - 1,000 Sq. Ft. (Villa)", value: "500 - 1,000 Sq. Ft." },
  { label: "1,000 - 3,000 Sq. Ft. (Boutique)", value: "1,000 - 3,000 Sq. Ft." },
  { label: "3,000 - 5,000 Sq. Ft. (Commercial Floor)", value: "3,000 - 5,000 Sq. Ft." },
  { label: "5,000 - 10,000 Sq. Ft. (Hotel / Resort)", value: "5,000 - 10,000 Sq. Ft." },
  { label: "10,000 - 25,000 Sq. Ft. (Real Estate)", value: "10,000 - 25,000 Sq. Ft." },
  { label: "25,000+ Sq. Ft. (Township / Infra)", value: "25,000+ Sq. Ft." },
  { label: "Full Container Load (FCL Export)", value: "FCL Export" },
];

const LOCATIONS = [
  { label: "Delhi NCR / North India", value: "Delhi NCR" },
  { label: "Mumbai / Maharashtra", value: "Mumbai" },
  { label: "Bengaluru / Karnataka", value: "Bengaluru" },
  { label: "Hyderabad / Telangana", value: "Hyderabad" },
  { label: "Jaipur / Rajasthan", value: "Jaipur" },
  { label: "Ahmedabad / Gujarat", value: "Gujarat" },
  { label: "Chennai / Tamil Nadu", value: "Chennai" },
  { label: "Kolkata / Eastern India", value: "Kolkata" },
  { label: "International Export / Port Dispatch", value: "Export" },
];

/**
 * Architectural Building Blueprint / Perspective Wireframe
 * Precisely placed in the bottom-left corner of the section card.
 */
function ArchitecturalBuildingWireframe() {
  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-[280px] sm:w-[340px] lg:w-[400px] h-auto pointer-events-none select-none opacity-25 sm:opacity-75 lg:opacity-85"
      aria-hidden="true"
    >
      {/* Ground Perspective Vanishing Lines (fanning across towards the right) */}
      <g stroke="#C6B094" strokeWidth="0.8" opacity="0.55">
        <line x1="-30" y1="285" x2="440" y2="246" />
        <line x1="-30" y1="272" x2="440" y2="244" />
        <line x1="-30" y1="260" x2="440" y2="242" />
        <line x1="20" y1="258" x2="440" y2="240" />
        <line x1="80" y1="260" x2="440" y2="238" />
        <line x1="150" y1="262" x2="440" y2="236" />

        {/* Transverse Pavement / Site Perspective Rays */}
        <line x1="-20" y1="298" x2="70" y2="245" />
        <line x1="30" y1="298" x2="125" y2="242" />
        <line x1="85" y1="298" x2="180" y2="240" />
        <line x1="150" y1="298" x2="245" y2="238" />
        <line x1="225" y1="298" x2="310" y2="236" />
        <line x1="305" y1="298" x2="375" y2="235" />
      </g>

      {/* Main Structural Building Wireframe */}
      <g stroke="#B89B7A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        {/* Left Corner Column (Foreground) */}
        <line x1="16" y1="264" x2="16" y2="48" strokeWidth="1.5" />
        <line x1="20" y1="263" x2="20" y2="50" strokeWidth="0.8" opacity="0.6" />

        {/* Primary Roof Parapet / Fascia Line */}
        <line x1="16" y1="48" x2="225" y2="92" strokeWidth="1.6" />
        <line x1="16" y1="54" x2="225" y2="97" strokeWidth="0.9" opacity="0.75" />
        <line x1="16" y1="42" x2="225" y2="86" strokeWidth="0.6" strokeDasharray="4 2" opacity="0.45" />

        {/* Rear Volume / Architectural Mass Profile */}
        <line x1="225" y1="92" x2="280" y2="108" strokeWidth="1" opacity="0.6" />
        <line x1="280" y1="108" x2="280" y2="236" strokeWidth="1" opacity="0.6" />
        <line x1="225" y1="239" x2="280" y2="236" strokeWidth="0.8" opacity="0.6" />

        {/* Right Corner of Main Front Facade */}
        <line x1="225" y1="92" x2="225" y2="239" strokeWidth="1.4" />

        {/* Ground Foundation Plinth Line */}
        <line x1="16" y1="264" x2="225" y2="239" strokeWidth="1.5" />
        <line x1="16" y1="268" x2="225" y2="242" strokeWidth="0.9" opacity="0.75" />

        {/* Intermediate Floor Slab / Spandrel Beam */}
        <line x1="16" y1="156" x2="225" y2="166" strokeWidth="1.4" />
        <line x1="16" y1="161" x2="225" y2="170" strokeWidth="0.9" opacity="0.7" />

        {/* Vertical Stone Columns / Curtain Wall Mullions */}
        {/* Bay 1 */}
        <line x1="58" y1="57" x2="58" y2="259" strokeWidth="1.1" />
        <line x1="61" y1="57" x2="61" y2="259" strokeWidth="0.6" opacity="0.5" />
        {/* Bay 2 */}
        <line x1="102" y1="66" x2="102" y2="254" strokeWidth="1.1" />
        <line x1="105" y1="66" x2="105" y2="254" strokeWidth="0.6" opacity="0.5" />
        {/* Bay 3 */}
        <line x1="148" y1="75" x2="148" y2="249" strokeWidth="1.1" />
        <line x1="151" y1="75" x2="151" y2="249" strokeWidth="0.6" opacity="0.5" />
        {/* Bay 4 */}
        <line x1="190" y1="84" x2="190" y2="244" strokeWidth="1.1" />
        <line x1="193" y1="84" x2="193" y2="244" strokeWidth="0.6" opacity="0.5" />

        {/* Upper Floor Window Horizontal Paneling */}
        <line x1="16" y1="102" x2="225" y2="130" strokeWidth="0.7" opacity="0.6" />
        <line x1="16" y1="128" x2="225" y2="148" strokeWidth="0.7" opacity="0.6" />

        {/* Lower Floor Glazing Transom */}
        <line x1="16" y1="202" x2="225" y2="206" strokeWidth="0.7" opacity="0.6" />

        {/* Architectural Glass Reflection Accents */}
        <line x1="24" y1="148" x2="52" y2="68" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
        <line x1="68" y1="152" x2="96" y2="76" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
        <line x1="112" y1="158" x2="142" y2="86" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
      </g>

      {/* Modern Entrance Pavilion / Projecting Stone Canopy */}
      <g stroke="#A88A68" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        {/* Canopy Top Slab in Perspective */}
        <polygon
          points="88,198 174,192 160,216 74,222"
          fill="#FAF6F0"
          fillOpacity="0.9"
          stroke="#A88A68"
          strokeWidth="1.2"
        />
        {/* Canopy Thickness Edge */}
        <line x1="74" y1="222" x2="74" y2="226" strokeWidth="1.2" />
        <line x1="160" y1="216" x2="160" y2="220" strokeWidth="1.2" />
        <line x1="74" y1="226" x2="160" y2="220" strokeWidth="1.2" />

        {/* Canopy Support Columns to Ground */}
        <line x1="80" y1="225" x2="80" y2="257" strokeWidth="1.1" />
        <line x1="154" y1="219" x2="154" y2="249" strokeWidth="1.1" />

        {/* Double Entrance Glass Door Frame */}
        <rect x="102" y="204" width="34" height="48" stroke="#B89B7A" strokeWidth="0.9" fill="none" />
        <line x1="119" y1="204" x2="119" y2="252" stroke="#B89B7A" strokeWidth="0.7" />
      </g>

      {/* Architectural Scale Human Silhouettes */}
      <g stroke="#9C7F60" strokeWidth="1" fill="#9C7F60" opacity="0.75">
        {/* Person 1 (Entrance) */}
        <circle cx="125" cy="229" r="2" />
        <line x1="125" y1="231" x2="125" y2="243" strokeWidth="1.2" />
        <line x1="125" y1="243" x2="123" y2="252" strokeWidth="1" />
        <line x1="125" y1="243" x2="127" y2="252" strokeWidth="1" />

        {/* Person 2 (Visitor beside Column) */}
        <circle cx="134" cy="230" r="1.8" />
        <line x1="134" y1="232" x2="134" y2="242" strokeWidth="1.1" />
        <line x1="134" y1="242" x2="132" y2="251" strokeWidth="0.9" />
        <line x1="134" y1="242" x2="136" y2="251" strokeWidth="0.9" />
      </g>
    </svg>
  );
}

export function ProjectRequirementPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"rfq" | "browse">("rfq");
  const [stoneType, setStoneType] = useState("");
  const [application, setApplication] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");

  const handleGetQuotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "browse") {
      const params = new URLSearchParams();
      if (stoneType) params.set("material", stoneType);
      router.push(`/products?${params.toString()}`);
      return;
    }

    const params = new URLSearchParams();
    if (stoneType) params.set("material", stoneType);
    if (application) params.set("application", application);
    if (quantity) params.set("quantity", quantity);
    if (location) params.set("city", location);
    router.push(`/request-quote?${params.toString()}`);
  };

  return (
    <section className="py-6 sm:py-10 bg-white">
      <div className="container-wide">
        {/* Main Card with Warm Sandstone Background & Subtle Border */}
        <div className="relative overflow-hidden rounded-[24px] sm:rounded-[30px] lg:rounded-[32px] bg-[#FAF6F0] border border-[#EAE2D5] px-6 py-8 sm:p-10 lg:p-12 shadow-sm min-h-[360px] flex flex-col justify-center">
          {/* Architectural Wireframe Sketch (Anchored at Bottom-Left of the Main Card) */}
          <div className="hidden sm:block absolute bottom-0 -left-4 sm:left-0 pointer-events-none select-none z-0">
            <ArchitecturalBuildingWireframe />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column (5 Cols): Eyebrow, Editorial Serif Headline, Subtitle */}
            <div className="lg:col-span-5 relative flex flex-col justify-center">
              {/* Eyebrow: Orange Dash + Uppercase Tag */}
              <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                <span className="w-5 sm:w-6 h-[2.5px] bg-[#D95F18] inline-block rounded-full" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#D95F18]">
                  GET QUOTES FROM VERIFIED SUPPLIERS
                </span>
              </div>

              {/* Main Headline: Editorial Serif Font */}
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-[40px] font-bold text-stone-900 tracking-tight leading-[1.18] sm:leading-[1.15]">
                Source Stones for Your <br className="hidden sm:inline" />
                Project Requirement
              </h2>

              {/* Subtitle */}
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm lg:text-[15px] text-stone-600 leading-relaxed max-w-md">
                Share your project details and receive competitive quotes directly from verified suppliers.
              </p>
            </div>

            {/* Right Column (7 Cols): Elevated White Card with Segmented Tabs & Requirement Form */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl sm:rounded-[24px] bg-white p-5 sm:p-7 lg:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.05)] border border-stone-200/80">
                {/* Segmented Control Tabs */}
                <div className="grid grid-cols-2 sm:inline-flex items-center p-1 rounded-xl bg-stone-100/70 border border-stone-200/60 mb-6 max-w-full">
                  {/* Tab 1: Project Requirement */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("rfq")}
                    className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs lg:text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === "rfq"
                        ? "bg-[#2D1B11] text-white shadow-xs"
                        : "text-stone-700 hover:text-stone-950 hover:bg-stone-200/50"
                    }`}
                  >
                    {/* Clipboard with Checkmark Icon */}
                    <svg
                      className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${activeTab === "rfq" ? "text-amber-400" : "text-stone-500"}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                      <path d="m9 14 2 2 4-4" />
                    </svg>
                    <span>Project Requirement</span>
                  </button>

                  {/* Tab 2: Browse Products */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("browse")}
                    className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs lg:text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === "browse"
                        ? "bg-[#2D1B11] text-white shadow-xs"
                        : "text-stone-700 hover:text-stone-950 hover:bg-stone-200/50"
                    }`}
                  >
                    {/* Catalog / Grid Icon */}
                    <svg
                      className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${activeTab === "browse" ? "text-amber-400" : "text-stone-500"}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                    <span>Browse Products</span>
                  </button>
                </div>

                {/* Form Elements */}
                <form onSubmit={handleGetQuotes} className="space-y-4">
                  {/* Row 1: Stone Type, Application, Quantity */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    {/* Field 1: Stone Type */}
                    <div>
                      <label className="block text-xs font-bold text-stone-900 mb-1.5">
                        Stone Type
                      </label>
                      <div className="relative">
                        <select
                          value={stoneType}
                          onChange={(e) => setStoneType(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-stone-800 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                        >
                          <option value="">Select stone type</option>
                          {STONE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        {/* Downward Chevron */}
                        <svg
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Field 2: Application */}
                    <div>
                      <label className="block text-xs font-bold text-stone-900 mb-1.5">
                        Application
                      </label>
                      <div className="relative">
                        <select
                          value={application}
                          onChange={(e) => setApplication(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-stone-800 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                        >
                          <option value="">Select application</option>
                          {APPLICATIONS.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Field 3: Quantity (Approx.) */}
                    <div>
                      <label className="block text-xs font-bold text-stone-900 mb-1.5">
                        Quantity (Approx.)
                      </label>
                      <div className="relative">
                        <select
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-stone-800 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                        >
                          <option value="">e.g. 5,000 Sq. Ft.</option>
                          {QUANTITY_PRESETS.map((q) => (
                            <option key={q.value} value={q.value}>
                              {q.label}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Project Location & CTA Button */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-end pt-1">
                    {/* Project Location (Left side) */}
                    <div className="sm:col-span-6 lg:col-span-7">
                      <label className="block text-xs font-bold text-stone-900 mb-1.5">
                        Project Location
                      </label>
                      <div className="relative">
                        <select
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-stone-800 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                        >
                          <option value="">Select location</option>
                          {LOCATIONS.map((loc) => (
                            <option key={loc.value} value={loc.value}>
                              {loc.label}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Action Button: Get Supplier Quotes */}
                    <div className="sm:col-span-6 lg:col-span-5">
                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#D95F18] hover:bg-[#C25211] text-white px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-md shadow-[#D95F18]/20 transition-all hover:scale-[1.01] active:scale-[0.99] h-[41px]"
                      >
                        {/* Headset / Quotation Advisor Icon */}
                        <svg
                          className="h-4 w-4 shrink-0 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                          <path d="M8 21h3a2 2 0 0 0 2-2v-1" />
                        </svg>
                        <span>{activeTab === "browse" ? "Browse Materials" : "Get Supplier Quotes"}</span>
                        {/* Right Arrow Icon */}
                        <svg
                          className="h-4 w-4 shrink-0 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
