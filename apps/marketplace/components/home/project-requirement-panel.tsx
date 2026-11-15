"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useRfqModal } from "@/features/rfq/rfq-modal-context";

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
 * Exact Architectural Building Illustration (Faithful Reference Recreation)
 * - Exact front-corner perspective with prominent central vertical building corner
 * - Multi-storey rectangular glass windows & vertical structural divisions
 * - Roof peak wireframe box with architectural step-down on left facade
 * - Single-storey colonnade pavilion extension on the right
 * - Architectural scale entourage human figures standing near corner plinth
 * - Ground & sky perspective construction rays
 */
function ExactArchitecturalIllustration() {
  return (
    <svg
      viewBox="0 0 600 540"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-[125px] sm:w-[145px] md:w-[155px] lg:w-[165px] xl:w-[180px] h-auto pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Perspective Construction Lines (Sky & Horizon Rays) */}
      <g stroke="#C4AA8E" strokeWidth={0.75} opacity={0.55}>
        {/* Ray extending straight up from top roof peak */}
        <line x1="306" y1="46" x2="306" y2="0" />

        {/* Rays from peak towards right horizon */}
        <line x1="306" y1="46" x2="600" y2="185" />
        <line x1="422" y1="102" x2="600" y2="185" />
        <line x1="306" y1="134" x2="600" y2="280" />

        {/* Secondary sky construction rays */}
        <line x1="306" y1="88" x2="600" y2="230" />
        <line x1="306" y1="46" x2="0" y2="175" />
      </g>

      {/* Ground Perspective Grid Lines */}
      <g stroke="#C4AA8E" strokeWidth={0.8} opacity={0.6}>
        {/* Longitudinal ground perspective lines receding towards right vanishing point */}
        <line x1="-30" y1="468" x2="600" y2="438" />
        <line x1="-30" y1="488" x2="600" y2="442" />
        <line x1="-30" y1="510" x2="600" y2="446" />
        <line x1="-30" y1="535" x2="600" y2="450" />

        {/* Transverse pavement lines angling across the ground */}
        <line x1="75" y1="540" x2="235" y2="450" />
        <line x1="175" y1="540" x2="325" y2="446" />
        <line x1="275" y1="540" x2="415" y2="444" />
        <line x1="385" y1="540" x2="505" y2="442" />

        {/* Far-right vertical site markers / posts */}
        <line x1="545" y1="412" x2="545" y2="454" strokeWidth={0.9} />
        <line x1="568" y1="422" x2="568" y2="454" strokeWidth={0.9} />
      </g>

      {/* Top Parapet Box / Upper Volume Wireframe */}
      <g stroke="#8A6848" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
        {/* Parapet Roof Peak Corner */}
        <line x1="306" y1="46" x2="306" y2="134" strokeWidth={1.5} />

        {/* Top Parapet Roofline down-left to horizon */}
        <line x1="306" y1="46" x2="0" y2="222" strokeWidth={1.4} />
        <line x1="306" y1="88" x2="0" y2="258" strokeWidth={0.9} opacity={0.75} />

        {/* Top Parapet Roofline down-right */}
        <line x1="306" y1="46" x2="422" y2="102" strokeWidth={1.4} />
        <line x1="422" y1="102" x2="422" y2="188" strokeWidth={1.3} />
        <line x1="306" y1="88" x2="422" y2="142" strokeWidth={0.9} opacity={0.75} />
      </g>

      {/* Main Two-Storey Building Cornice and Architectural Step */}
      <g stroke="#7D5B3A" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        {/* Right Cornice Line */}
        <line x1="306" y1="134" x2="412" y2="188" strokeWidth={1.8} />
        <line x1="306" y1="142" x2="412" y2="195" strokeWidth={1.1} opacity={0.85} />

        {/* Left Cornice Line (with Architectural Step-Down) */}
        <line x1="306" y1="134" x2="152" y2="228" strokeWidth={1.8} />
        <line x1="306" y1="142" x2="152" y2="235" strokeWidth={1.1} opacity={0.85} />
        {/* Step-down vertical drop */}
        <line x1="152" y1="228" x2="152" y2="248" strokeWidth={1.5} />
        {/* Lower parapet continuing to left edge */}
        <line x1="152" y1="248" x2="0" y2="310" strokeWidth={1.5} />
        <line x1="152" y1="254" x2="0" y2="315" strokeWidth={1} opacity={0.75} />
      </g>

      {/* Central Vertical Corner Pillar (Key Focal Element) */}
      <g stroke="#6B4B2B" strokeWidth={1.4} strokeLinecap="round">
        <line x1="302" y1="142" x2="302" y2="442" strokeWidth={1.1} opacity={0.75} />
        <line x1="306" y1="134" x2="306" y2="442" strokeWidth={2} />
        <line x1="310" y1="142" x2="310" y2="442" strokeWidth={1.1} opacity={0.75} />
      </g>

      {/* Right Facade (Two Storeys + Single Storey Low Wing) */}
      <g stroke="#8A6848" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
        {/* Right Corner Column of Main Block */}
        <line x1="408" y1="195" x2="408" y2="444" strokeWidth={1} opacity={0.75} />
        <line x1="412" y1="188" x2="412" y2="444" strokeWidth={1.8} />

        {/* Intermediate Column on Right Facade */}
        <line x1="358" y1="160" x2="358" y2="443" strokeWidth={1.3} />
        <line x1="362" y1="160" x2="362" y2="443" strokeWidth={0.9} opacity={0.65} />

        {/* Horizontal Floor Spandrel Band (Between Ground and Upper Floor) */}
        <line x1="306" y1="334" x2="412" y2="356" strokeWidth={1.2} />
        <line x1="306" y1="342" x2="412" y2="362" strokeWidth={1.6} />
        <line x1="306" y1="348" x2="412" y2="368" strokeWidth={1} opacity={0.8} />

        {/* Upper Floor Window Transom and Sills */}
        <line x1="306" y1="168" x2="412" y2="218" strokeWidth={0.9} opacity={0.8} />
        {/* Upper Floor Glazing Mullions */}
        {/* Bay 1 */}
        <line x1="326" y1="168" x2="326" y2="334" strokeWidth={0.9} />
        <line x1="342" y1="168" x2="342" y2="334" strokeWidth={0.9} />
        {/* Bay 2 */}
        <line x1="378" y1="198" x2="378" y2="344" strokeWidth={0.9} />
        <line x1="394" y1="208" x2="394" y2="350" strokeWidth={0.9} />

        {/* Lower Floor Storefront Transom and Mullions */}
        <line x1="306" y1="368" x2="412" y2="385" strokeWidth={0.9} />
        <line x1="326" y1="368" x2="326" y2="442" strokeWidth={0.9} />
        <line x1="342" y1="368" x2="342" y2="442" strokeWidth={0.9} />
        <line x1="378" y1="378" x2="378" y2="443" strokeWidth={0.9} />
        <line x1="394" y1="382" x2="394" y2="443" strokeWidth={0.9} />

        {/* Base Plinth / Foundation */}
        <line x1="306" y1="442" x2="412" y2="444" strokeWidth={1.5} />
        <line x1="306" y1="450" x2="412" y2="450" strokeWidth={1} opacity={0.7} />

        {/* Single-Storey Right Wing / Colonnade Pavilion */}
        <line x1="412" y1="368" x2="505" y2="388" strokeWidth={1.4} />
        <line x1="412" y1="375" x2="505" y2="394" strokeWidth={0.9} opacity={0.8} />

        {/* Wing Vertical Colonnade Posts */}
        <line x1="432" y1="372" x2="432" y2="446" strokeWidth={1.2} />
        <line x1="468" y1="378" x2="468" y2="448" strokeWidth={1.2} />
        <line x1="505" y1="388" x2="505" y2="450" strokeWidth={1.4} />

        {/* Wing Storefront Detail */}
        <rect x="442" y="394" width="16" height="52" stroke="#8A6848" strokeWidth={0.8} fill="none" />
        <line x1="505" y1="388" x2="530" y2="398" strokeWidth={0.8} opacity={0.6} />
        <line x1="505" y1="450" x2="530" y2="452" strokeWidth={0.8} opacity={0.6} />
      </g>

      {/* Left Facade (Multi-Storey Extended Glass and Stone Facade) */}
      <g stroke="#8A6848" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
        {/* Structural Columns on Left Facade */}
        {/* Column at step */}
        <line x1="152" y1="248" x2="152" y2="458" strokeWidth={1.4} />
        {/* Intermediate columns */}
        <line x1="228" y1="180" x2="228" y2="448" strokeWidth={1.3} />
        <line x1="104" y1="275" x2="104" y2="464" strokeWidth={1.2} />
        <line x1="54" y1="300" x2="54" y2="472" strokeWidth={1.1} />
        <line x1="16" y1="318" x2="16" y2="478" strokeWidth={1.1} />

        {/* Horizontal Floor Spandrel Band across Left Facade */}
        <line x1="306" y1="334" x2="0" y2="395" strokeWidth={1.2} />
        <line x1="306" y1="342" x2="0" y2="400" strokeWidth={1.6} />
        <line x1="306" y1="348" x2="0" y2="405" strokeWidth={1} opacity={0.8} />

        {/* Upper Floor Window Transoms */}
        <line x1="306" y1="168" x2="0" y2="330" strokeWidth={0.9} opacity={0.8} />
        <line x1="306" y1="240" x2="0" y2="360" strokeWidth={0.8} opacity={0.6} />

        {/* Upper Floor Glazing Mullions */}
        {/* Bay between 228 and 302 */}
        <line x1="254" y1="195" x2="254" y2="340" strokeWidth={0.9} />
        <line x1="278" y1="182" x2="278" y2="338" strokeWidth={0.9} />
        {/* Bay between 152 and 228 */}
        <line x1="178" y1="238" x2="178" y2="356" strokeWidth={0.9} />
        <line x1="202" y1="224" x2="202" y2="350" strokeWidth={0.9} />
        {/* Bay between 104 and 152 */}
        <line x1="128" y1="270" x2="128" y2="370" strokeWidth={0.8} />
        {/* Bay between 54 and 104 */}
        <line x1="78" y1="295" x2="78" y2="384" strokeWidth={0.8} />
        {/* Bay between 16 and 54 */}
        <line x1="34" y1="315" x2="34" y2="394" strokeWidth={0.8} />

        {/* Lower Floor Storefront Transom and Vertical Mullions */}
        <line x1="306" y1="368" x2="0" y2="418" strokeWidth={0.9} />
        <line x1="278" y1="368" x2="278" y2="444" strokeWidth={0.9} />
        <line x1="254" y1="368" x2="254" y2="445" strokeWidth={0.9} />
        <line x1="202" y1="375" x2="202" y2="450" strokeWidth={0.8} />
        <line x1="178" y1="380" x2="178" y2="453" strokeWidth={0.8} />
        <line x1="128" y1="390" x2="128" y2="460" strokeWidth={0.8} />
        <line x1="78" y1="400" x2="78" y2="468" strokeWidth={0.8} />
        <line x1="34" y1="410" x2="34" y2="475" strokeWidth={0.8} />

        {/* Base Plinth / Stepped Foundation along Left Facade */}
        <line x1="306" y1="442" x2="0" y2="475" strokeWidth={1.5} />
        <line x1="306" y1="450" x2="0" y2="483" strokeWidth={1} opacity={0.75} />
      </g>

      {/* Architectural Entourage Figures (Two Scale People Standing near Corner) */}
      <g stroke="#6B4D30" strokeWidth={1.1} fill="#6B4D30" opacity={0.85}>
        {/* Person 1 (Facing front-right) */}
        <circle cx="248" cy="410" r="2.8" />
        <line x1="248" y1="413" x2="248" y2="427" strokeWidth={1.4} />
        <line x1="248" y1="427" x2="246" y2="442" strokeWidth={1.1} />
        <line x1="248" y1="427" x2="250" y2="442" strokeWidth={1.1} />

        {/* Person 2 (Beside) */}
        <circle cx="256" cy="412" r="2.5" />
        <line x1="256" y1="415" x2="256" y2="427" strokeWidth={1.3} />
        <line x1="256" y1="427" x2="254" y2="442" strokeWidth={1} />
        <line x1="256" y1="427" x2="258" y2="442" strokeWidth={1} />
      </g>
    </svg>
  );
}

export function ProjectRequirementPanel() {
  const router = useRouter();
  const { openRfqModal } = useRfqModal();
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

    let parsedQuantity: number | null = null;
    if (quantity) {
      const numMatch = quantity.match(/\d[\d,]*/);
      if (numMatch) {
        parsedQuantity = parseInt(numMatch[0].replace(/,/g, ""), 10);
      }
    }

    // Opens the Premium RFQ Modal directly on current page with prefilled values
    openRfqModal({
      materialType: stoneType || null,
      quantity: parsedQuantity,
      deliveryLocation: location || null,
      projectNotes: application ? `Application: ${application}. Commercial natural stone requirement.` : null,
    });
  };

  return (
    <section className="py-6 sm:py-10 bg-white">
      <div className="container-wide">
        {/* Main Card with Warm Sandstone Background & Subtle Border */}
        <div className="relative overflow-hidden rounded-[24px] sm:rounded-[30px] lg:rounded-[32px] bg-[#FAF6F0] border border-[#EAE2D5] px-5 py-7 sm:p-7 lg:p-8 xl:p-9 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6 xl:gap-8 items-center">
            {/* Left Section (6 Cols): Building Illustration + Text side-by-side with ZERO overlap */}
            <div className="lg:col-span-6 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-5 lg:gap-6">
              {/* Architectural Building Illustration (Positioned on the Left) */}
              <div className="shrink-0 self-center sm:self-end">
                <ExactArchitecturalIllustration />
              </div>

              {/* Text Block (Positioned to the Right of the Illustration — Zero Overlap) */}
              <div className="flex flex-col justify-center min-w-0 flex-1 sm:pb-1">
                {/* Eyebrow: Orange Dash + Uppercase Tag */}
                <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
                  <span className="w-5 sm:w-6 h-[2.5px] bg-[#D95F18] inline-block rounded-full" />
                  <span className="text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-wider text-[#D95F18]">
                    GET QUOTES FROM VERIFIED SUPPLIERS
                  </span>
                </div>

                {/* Main Headline: Editorial Serif Font (Clean 2-line break) */}
                <h2 className="font-serif text-xl sm:text-2xl lg:text-[25px] xl:text-[29px] font-bold text-stone-900 tracking-tight leading-[1.18] sm:leading-[1.15]">
                  Source Stones for Your <br className="hidden sm:inline" />
                  Project Requirement
                </h2>

                {/* Subtitle */}
                <p className="mt-2 sm:mt-2.5 text-xs sm:text-[13px] lg:text-sm text-stone-600 leading-relaxed max-w-sm">
                  Share your project details and receive competitive quotes directly from verified suppliers.
                </p>
              </div>
            </div>

            {/* Right Column (6 Cols): Elevated White Card with Segmented Tabs & Requirement Form */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl sm:rounded-[24px] bg-white p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.05)] border border-stone-200/80">
                {/* Segmented Control Tabs */}
                <div className="grid grid-cols-2 sm:inline-flex items-center p-1 rounded-xl bg-stone-100/80 border border-stone-200/60 mb-4 sm:mb-5 max-w-full">
                  {/* Tab 1: Project Requirement */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("rfq")}
                    className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 lg:px-4 py-2 sm:py-2 rounded-lg text-[11px] sm:text-xs lg:text-[13px] font-semibold transition-all whitespace-nowrap ${
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
                    className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 lg:px-4 py-2 sm:py-2 rounded-lg text-[11px] sm:text-xs lg:text-[13px] font-semibold transition-all whitespace-nowrap ${
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
                <form onSubmit={handleGetQuotes} className="space-y-3.5 sm:space-y-4">
                  {/* Row 1: Stone Type, Application, Quantity */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {/* Field 1: Stone Type */}
                    <div>
                      <label className="block text-xs font-bold text-stone-900 mb-1.5">
                        Stone Type
                      </label>
                      <div className="relative">
                        <select
                          value={stoneType}
                          onChange={(e) => setStoneType(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-2.5 py-2 sm:py-2.5 pr-7 text-xs sm:text-[13px] text-stone-800 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
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
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600"
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
                          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-2.5 py-2 sm:py-2.5 pr-7 text-xs sm:text-[13px] text-stone-800 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                        >
                          <option value="">Select application</option>
                          {APPLICATIONS.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600"
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
                          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-2.5 py-2 sm:py-2.5 pr-7 text-xs sm:text-[13px] text-stone-800 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                        >
                          <option value="">e.g. 5,000 Sq. Ft.</option>
                          {QUANTITY_PRESETS.map((q) => (
                            <option key={q.value} value={q.value}>
                              {q.label}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600"
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
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end pt-0.5">
                    {/* Project Location (Left side) */}
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-stone-900 mb-1.5">
                        Project Location
                      </label>
                      <div className="relative">
                        <select
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-2.5 py-2 sm:py-2.5 pr-7 text-xs sm:text-[13px] text-stone-800 focus:border-[#D95F18] focus:outline-none focus:ring-1 focus:ring-[#D95F18] shadow-2xs transition-colors"
                        >
                          <option value="">Select location</option>
                          {LOCATIONS.map((loc) => (
                            <option key={loc.value} value={loc.value}>
                              {loc.label}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-600"
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
                    <div className="sm:col-span-6">
                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#D95F18] hover:bg-[#C25211] text-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-[13px] font-semibold shadow-md shadow-[#D95F18]/20 transition-all hover:scale-[1.01] active:scale-[0.99] whitespace-nowrap h-[38px] sm:h-[42px]"
                      >
                        <span>{activeTab === "browse" ? "Browse Materials" : "Get Supplier Quotes"}</span>
                        <span aria-hidden="true" className="text-sm font-bold">&rarr;</span>
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
