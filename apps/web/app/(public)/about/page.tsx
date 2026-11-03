import type { Metadata } from "next";
import Image from "next/image";
import { Breadcrumb, SectionHeading } from "@stone/ui";
import { HERO_IMAGES } from "@/lib/images";

export const metadata: Metadata = {
  title: "About Us — StonesDekho",
  description:
    "Learn about StonesDekho, India's premier B2B marketplace connecting global stone buyers with verified manufacturers and quarries.",
  openGraph: {
    title: "About Us — StonesDekho",
    description:
      "Learn about StonesDekho, India's premier B2B marketplace connecting global stone buyers with verified manufacturers and quarries.",
    type: "website",
  },
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Register",
    description:
      "Create a verified business account as a buyer or supplier. Complete KYC and GST verification to unlock full platform access.",
  },
  {
    step: "02",
    title: "Browse & List",
    description:
      "Buyers explore curated stone catalogues with real specifications. Suppliers list inventory with lab-grade data, photos, and pricing.",
  },
  {
    step: "03",
    title: "Trade",
    description:
      "Send or receive Requests for Quotation directly. Negotiate, confirm, and transact with verified counterparties — no middlemen.",
  },
];

const WHY_STONESDEKHO = [
  {
    title: "Direct from Source",
    description:
      "Every listing originates from a verified quarry owner, manufacturer, or authorised export house — eliminating broker markups.",
    icon: (
      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "Verified Suppliers",
    description:
      "Multi-step compliance checks cover GST registration, export history, factory machinery, and quarry licensing before any listing goes live.",
    icon: (
      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    title: "Secure Transactions",
    description:
      "All RFQs, negotiations, and trade data are stored with row-level security and encryption at rest, protecting every deal.",
    icon: (
      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
];

const STONE_TYPES = [
  "Marble",
  "Granite",
  "Sandstone",
  "Limestone",
  "Quartzite",
  "Slate",
  "Travertine",
  "Onyx",
];

export default function AboutPage() {
  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-narrow space-y-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "About Us" },
          ]}
        />
        <SectionHeading
          title="About StonesDekho"
          subtitle="Transforming natural stone commerce through transparency, verification, and direct digital trade."
        />

        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
          <Image
            src={HERO_IMAGES.showroom}
            alt="Natural stone architectural showroom and gallery"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 768px"
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Intro text */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-6 text-stone-600 leading-relaxed text-sm sm:text-base">
          <p>
            <strong className="text-stone-900 font-semibold">StonesDekho</strong> is an enterprise-grade
            digital marketplace engineered specifically for the natural stone and architectural surface
            industry. We connect verified Indian manufacturers, quarry owners, and export houses with
            architects, general contractors, wholesalers, and real estate developers worldwide.
          </p>

          <h2 className="text-xl font-bold text-stone-900 pt-4">Our Mission</h2>
          <p>
            India produces some of the world&apos;s most sought-after marble, granite, sandstone, slate,
            and quartzite varieties. However, traditional procurement has been burdened with multiple
            middlemen, opaque pricing, and inconsistent quality verification. StonesDekho streamlines the
            supply chain by providing real-time factory inventory, laboratory-grade specifications, and
            direct request-for-quotation workflows.
          </p>

          <h2 className="text-xl font-bold text-stone-900 pt-4">Why Verification Matters</h2>
          <p>
            Every supplier on our platform undergoes rigorous multi-step compliance checks, verifying
            factory machinery, GST registration, export history, and quarry licensing. When you request
            a quotation or purchase a lot through StonesDekho, you are dealing directly with vetted
            producers.
          </p>
        </div>

        {/* How It Works */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-stone-900">How It Works</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3"
              >
                <span className="text-3xl font-black text-amber-600 leading-none">{item.step}</span>
                <h3 className="text-base font-bold text-stone-900">{item.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why StonesDekho */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-stone-900">Why StonesDekho</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {WHY_STONESDEKHO.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-stone-900">{item.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stone Types */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-stone-900">Stone Types We Support</h2>
          <p className="text-sm text-stone-600">
            Our catalogue covers the full spectrum of natural architectural stone materials used in
            residential and commercial construction.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {STONE_TYPES.map((stone) => (
              <span
                key={stone}
                className="rounded-full border border-stone-200 bg-stone-50 px-4 py-1.5 text-sm font-medium text-stone-700"
              >
                {stone}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
