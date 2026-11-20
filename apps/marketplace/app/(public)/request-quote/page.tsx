import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import {
  ShieldCheck,
  Zap,
  Building2,
  Package,
  Ruler,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { PublicRfqForm } from "@/features/rfq/public-rfq-form";
import { getSellerBySlug } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Request Custom Stone Quotation (RFQ) | StonesDekho",
  description:
    "Broadcast your natural stone requirements directly to certified Indian quarry owners and manufacturing factories in Makrana, Ongole, Kota, and Dholpur.",
  alternates: {
    canonical: "/request-quote",
  },
};

interface RequestQuotePageProps {
  searchParams: Promise<{
    supplier?: string;
    material?: string;
    product?: string;
  }>;
}

const TRUST_PILLS = [
  { icon: Building2, text: "0% Broker Markups" },
  { icon: Zap, text: "24h Pro-Formas" },
  { icon: Ruler, text: "±1mm Gangsaw Cut" },
  { icon: Package, text: "ISPM-15 Wood Crates" },
];

export default async function RequestQuotePage({ searchParams }: RequestQuotePageProps) {
  const sp = await searchParams;
  const currentUser = await getCurrentUser();

  let targetSupplier = null;
  if (sp.supplier) {
    const seller = await getSellerBySlug(sp.supplier);
    if (seller) {
      targetSupplier = {
        id: seller.id,
        name: seller.businessName,
        slug: seller.slug,
        location: [seller.city, seller.state, seller.country].filter(Boolean).join(", "),
      };
    }
  }

  return (
    <div className="bg-stone-50 min-h-screen py-6 sm:py-8">
      <div className="container-wide max-w-6xl space-y-6">
        {/* Top Header Strip */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200/80 mx-auto sm:mx-0">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
                <span>Direct Quarry Procurement Desk</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 tracking-tight leading-tight">
                {targetSupplier
                  ? `Request Quotation from ${targetSupplier.name}`
                  : "Request Direct Factory Quotes in 30 Seconds"}
              </h1>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl mx-auto sm:mx-0">
                Broadcast your stone requirements directly to verified quarry owners in Makrana, Ongole, Kota &amp; Dholpur. Zero broker fees.
              </p>
            </div>

            {/* Compact Trust Pills - 2-col on mobile, flex on lg */}
            <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:flex lg:flex-wrap lg:items-center shrink-0">
              {TRUST_PILLS.map((pill) => {
                const Icon = pill.icon;
                return (
                  <div
                    key={pill.text}
                    className="inline-flex items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-stone-200/80 bg-white px-2 py-1.5 sm:px-2.5 sm:py-1 text-[11px] font-semibold text-stone-700 shadow-2xs whitespace-nowrap"
                  >
                    <Icon className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>{pill.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2-Column Compact Procurement Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): The Fast-Fill RFQ Form */}
          <div className="lg:col-span-7">
            <PublicRfqForm
              supplier={targetSupplier}
              initialUserName={currentUser?.email ? currentUser.email.split("@")[0] : null}
              initialUserEmail={currentUser?.email ?? null}
              prefilledMaterial={sp.material ?? null}
              prefilledProduct={sp.product ?? null}
            />
          </div>

          {/* Right Column (5 cols): Compact Luxury Visual Showcase Card */}
          <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            {/* Visual Showroom Card with Floating Badges */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm group">
              <div className="relative h-44 sm:h-48 w-full">
                <Image
                  src="/images/hero/luxurious-symmetrical-marble-showroom.webp"
                  alt="Certified Indian Natural Stone Quarry Network"
                  fill
                  priority
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/40 to-transparent" />
              </div>
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-900/80 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[10.5px] font-bold text-white shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>8 Verified Quarries Active</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-stone-950 shadow-xs">
                  <Sparkles className="h-3 w-3" />
                  <span>Direct Factory</span>
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 p-4 text-white space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                  Certified Processing Hubs
                </span>
                <p className="text-xs font-semibold leading-snug">
                  Over 250,000 sq.ft of factory-inspected slabs &amp; tiles ready for direct project dispatch.
                </p>
              </div>
            </div>

            {/* Quality Standards Strip */}
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <ShieldCheck className="h-4 w-4 text-emerald-600 stroke-[2.2]" />
                <h3 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">
                  Guaranteed Sourcing Standards
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-stone-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span><strong>ASTM / IS 1121 Tested:</strong> Density, absorption &amp; strength reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Dry-Lay Lot Verification:</strong> High-res slab photos sent before packing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span><strong>GST &amp; e-Way Invoicing:</strong> 100% compliant with full Input Tax Credit</span>
                </li>
              </ul>
            </div>

            {/* Direct Commercial Desk Helpline */}
            <div className="rounded-2xl sm:rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-4 sm:p-5 shadow-sm space-y-2.5">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                  Architect &amp; Contractor Desk
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                  Have an Architectural Tender or CAD Drawing?
                </h3>
              </div>
              <div className="space-y-2 text-xs text-stone-800 font-semibold pt-1">
                <a
                  href="tel:+919876543210"
                  className="flex items-center gap-2 hover:text-amber-800 transition-colors p-1 -ml-1 rounded-lg hover:bg-amber-100/50"
                >
                  <Phone className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                  <span>+91 98765 43210 (Direct Commercial Line)</span>
                </a>
                <a
                  href="mailto:commercial@stonesdekho.com"
                  className="flex items-center gap-2 hover:text-amber-800 transition-colors p-1 -ml-1 rounded-lg hover:bg-amber-100/50"
                >
                  <Mail className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                  <span>commercial@stonesdekho.com</span>
                </a>
                <div className="flex items-center gap-1.5 text-[10.5px] text-stone-500 font-normal">
                  <Clock className="h-3 w-3 text-stone-400 shrink-0" />
                  <span>Monday – Saturday (9:00 AM – 7:00 PM IST)</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
