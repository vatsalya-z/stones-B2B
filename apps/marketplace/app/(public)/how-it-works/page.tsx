import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb, SectionHeading } from "@stone/ui";

export const metadata: Metadata = {
  title: "How StonesDekho Works — B2B Natural Stone Procurement Process",
  description:
    "Learn how global architects, contractors, and stone importers source premium marble, granite, and sandstone directly from verified Indian factories.",
  openGraph: {
    title: "How StonesDekho Works — B2B Natural Stone Procurement Process",
    description:
      "A transparent, 4-step natural stone procurement process designed for high-volume commercial projects and export logistics.",
    type: "website",
  },
};

const STEPS = [
  {
    step: "01",
    tag: "Discovery & Sourcing",
    title: "Direct Quarry & Factory Discovery",
    desc: "Browse certified Indian stone processors and quarry owners by stone variety, quarry belt (Makrana, Kishangarh, Ongole, Dholpur, Kota), slab thickness (16mm to 50mm), and gangsaw finish.",
    details: [
      "Filter by exact architectural parameters (Honed, Polished, Flamed, Leathered)",
      "Verify factory processing machinery, monthly capacity, and GST credentials",
      "Direct factory contact without intermediary broker markups",
    ],
  },
  {
    step: "02",
    tag: "Inspection & Sampling",
    title: "Live Lot Inspection & Architectural Sampling",
    desc: "Review high-resolution photographs of exact slab bundles, crystalline veining, and bookmatched patterns before committing to volume procurement.",
    details: [
      "Request physical, lab-tested stone samples for client & architect approvals",
      "Inspect slab bundles with millimeter-level dimensional verification",
      "Review dry-lay photo sessions for color uniformity across large lots",
    ],
  },
  {
    step: "03",
    tag: "Commercials & Terms",
    title: "Custom BOQ & Factory Commercial Quotation",
    desc: "Submit your project Bill of Quantities (BOQ). Suppliers provide transparent itemized quotations detailing slab prices, crate packaging, GST, and port logistics.",
    details: [
      "Itemized pricing per square foot / meter with zero hidden commissions",
      "Flexible export Incoterms: Ex-Factory, FOB (Mundra / Chennai), or CIF destination",
      "Idempotent digital quotation acceptance with binding commercial snapshots",
    ],
  },
  {
    step: "04",
    tag: "Fulfillment & Dispatch",
    title: "Fumigated Crate Packing & Container Loading",
    desc: "Sellers pack your slabs in ISPM-15 certified, seaworthy wooden A-frames with polyethylene moisture barriers and corner guards for secure sea or road transit.",
    details: [
      "Standard 20ft heavy-duty container stuffing (up to 27-28 metric tons payload)",
      "Pre-dispatch photo & video documentation of crating and container sealing",
      "Complete shipping documentation: Commercial Invoice, Packing List, Certificate of Origin, Phytosanitary",
    ],
  },
];

const FAQS = [
  {
    q: "How does StonesDekho verify stone factories and quarry owners?",
    a: "Every seller on StonesDekho undergoes rigorous manual verification. We inspect their official GST registration, physical processing yard coordinates, gangsaw machinery capabilities, and export track record before awarding the Verified Supplier badge.",
  },
  {
    q: "How are payments handled on the platform?",
    a: "Under our permanent Payment Model B governance, orders initiate in a pending state upon quotation acceptance. Platform payment integration is pending. No payment should be made using unverified platform payment instructions. Commercial settlement will be processed through StoneB2B Payment Model B after the authorized Payment Aggregator integration is activated.",
  },
  {
    q: "Can I order custom cut-to-size dimensions or special edge profiles?",
    a: "Yes. Our suppliers operate multi-blade gangsaw and 5-axis CNC bridge cutting equipment capable of producing custom project sizes, vanity tops, bullnose edge profiles, and calibrated tiles according to your architectural drawings.",
  },
  {
    q: "What is the typical container loading capacity for natural stone?",
    a: "A standard 20-foot container typically carries between 400 to 450 square meters (approx. 4,300 to 4,800 sq ft) of 20mm marble or granite slabs, adhering to the 27-28 metric ton gross weight payload limits of major shipping lines.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-wide space-y-12">
        {/* Breadcrumb */}
        <div>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "How It Works" },
            ]}
          />
          <SectionHeading
            className="mt-4"
            title="How StonesDekho Works"
            subtitle="An enterprise B2B procurement standard engineered specifically for natural stone trade, logistics, and architectural compliance."
          />
        </div>

        {/* 4-Step Process Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="relative rounded-2xl border border-stone-200/80 bg-white p-8 shadow-card transition-all hover:shadow-card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-amber-600 tracking-tight">{s.step}</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                  {s.tag}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-stone-900">{s.title}</h2>
              <p className="mt-3 text-sm text-stone-600 leading-relaxed">{s.desc}</p>
              <ul className="mt-6 space-y-2 border-t border-stone-100 pt-5">
                {s.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-stone-700">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Packing & Logistics Callout */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900 p-8 sm:p-12 text-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <span className="inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400 ring-1 ring-inset ring-amber-500/30">
                Packaging & Compliance
              </span>
              <h3 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl text-stone-50">
                Seaworthy Export Crating & ISPM-15 Certification
              </h3>
              <p className="mt-3 text-sm sm:text-base text-stone-300 leading-relaxed">
                Natural stone requires specialized packaging to prevent transit fractures, corner chipping, and moisture staining. Our verified exporters use heat-treated wooden A-frames, high-tensile steel strapping, and weather-resistant plastic wrapping suitable for sea freight across global ports.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3 sm:flex-row lg:flex-col justify-center">
              <Link href="/request-quote" className="btn-accent px-6 py-3 text-center text-sm font-semibold shadow-md">
                Request Custom RFQ
              </Link>
              <Link
                href="/products"
                className="btn-secondary border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700 hover:border-stone-600 px-6 py-3 text-center text-sm font-semibold"
              >
                Browse Slabs
              </Link>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-6 pt-6">
          <SectionHeading
            title="Frequently Asked Questions"
            subtitle="Key details about commercial terms, sample ordering, and logistics on StonesDekho."
            align="center"
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-5xl mx-auto mt-8">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs">
                <h4 className="text-base font-semibold text-stone-900">{faq.q}</h4>
                <p className="mt-2.5 text-sm text-stone-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-8 border-t border-stone-200">
          <h3 className="text-xl font-bold text-stone-900">Ready to procure stone for your project?</h3>
          <p className="mt-2 text-sm text-stone-600 max-w-xl mx-auto">
            Connect with certified quarries, inspect slab lots, and receive competitive commercial quotations within 24-48 hours.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/request-quote" className="btn-accent px-7 py-2.5 text-sm font-semibold">
              Post an Architectural RFQ
            </Link>
            <Link href="/suppliers" className="btn-secondary px-7 py-2.5 text-sm font-semibold">
              Explore Verified Suppliers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

