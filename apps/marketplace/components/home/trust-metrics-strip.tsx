import React from "react";

const METRICS = [
  {
    value: "500+",
    label: "Verified Suppliers",
    icon: (
      <svg className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    value: "10,000+",
    label: "Stone Variants",
    icon: (
      <svg className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
  {
    value: "1000+",
    label: "Projects Supplied",
    icon: (
      <svg className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.333A12.018 12.018 0 0012 9c-2.474 0-4.78.747-6.75 2.033V21m13.5 0H4.5" />
      </svg>
    ),
  },
  {
    value: "Pan India & Global",
    label: "Sourcing Support",
    icon: (
      <svg className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
      </svg>
    ),
  },
];

export function TrustMetricsStrip() {
  return (
    <div className="border-b border-stone-200/80 bg-[#FAF8F5] py-5 sm:py-6">
      <div className="container-wide">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 items-center divide-y md:divide-y-0 md:divide-x divide-stone-200/70">
          {METRICS.map((metric, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 sm:gap-4 ${
                i > 1 ? "pt-4 md:pt-0" : ""
              } ${i > 0 ? "md:pl-6 lg:pl-8" : ""}`}
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-600/20">
                {metric.icon}
              </div>
              <div>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-stone-900 leading-tight">
                  {metric.value}
                </p>
                <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
                  {metric.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
