"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STONE_TYPES = [
  { label: "Select stone type", value: "" },
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
  { label: "Select application", value: "" },
  { label: "Flooring & Large Paving", value: "Flooring" },
  { label: "Wall Cladding & Facades", value: "Cladding" },
  { label: "Kitchen Countertops & Vanities", value: "Countertops" },
  { label: "Landscaping & Cobbles", value: "Landscaping" },
  { label: "Architectural CNC Jaalis", value: "Carving" },
  { label: "Public Infrastructure", value: "Infrastructure" },
];

const LOCATIONS = [
  { label: "Select location", value: "" },
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
    <section className="py-8 sm:py-12 bg-white">
      <div className="container-wide">
        <div className="rounded-2xl lg:rounded-3xl border border-stone-200/90 bg-[#FDFBF7] p-6 sm:p-8 lg:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column (5 cols): Context & Actions */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
                Find the Right Stone for Your Project Requirement
              </h2>
              <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
                Search, filter and get competitive quotes from multiple verified suppliers.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Request Bulk Quote
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
                >
                  How It Works
                </Link>
              </div>
            </div>

            {/* Right Column (7 cols): Interactive B2B Requirement Form Box */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
                {/* Tabs matching the reference image */}
                <div className="flex items-center gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("rfq")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      activeTab === "rfq"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Project Requirement
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("browse")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      activeTab === "browse"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    Browse Products
                  </button>
                </div>

                {/* Form Elements Grid */}
                <form onSubmit={handleGetQuotes} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                        Stone Type
                      </label>
                      <select
                        value={stoneType}
                        onChange={(e) => setStoneType(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition-colors"
                      >
                        {STONE_TYPES.map((t) => (
                          <option key={t.label} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                        Application
                      </label>
                      <select
                        value={application}
                        onChange={(e) => setApplication(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition-colors"
                      >
                        {APPLICATIONS.map((a) => (
                          <option key={a.label} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                        Quantity (Approx.)
                      </label>
                      <input
                        type="text"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="e.g. 500 Sq. Ft"
                        className="w-full rounded-lg border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-end pt-1">
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                        Project Location
                      </label>
                      <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition-colors"
                      >
                        {LOCATIONS.map((loc) => (
                          <option key={loc.label} value={loc.value}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-5">
                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                        {activeTab === "browse" ? "Search Catalogue" : "Get Supplier Quotes"}
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
