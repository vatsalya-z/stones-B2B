import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, PhoneCall, ShieldCheck } from 'lucide-react';

export function ProjectCtaSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-stone-950 text-white border-t border-stone-800">
      {/* Background Architectural Showroom with Balanced Visibility Scrim */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/images/hero/luxurious-symmetrical-marble-showroom.jpg"
          alt="Natural stone architectural showroom"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-110 contrast-105"
          unoptimized
        />
        {/* Soft Ambient Scrim: Highly luminous original showroom background with crisp text contrast */}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/45" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Subtle Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-950/70 backdrop-blur-md border border-white/20 text-amber-300 text-xs font-semibold mb-6 shadow-md">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Enterprise Sourcing Desk</span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white font-serif max-w-3xl mx-auto leading-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
          Have a Specific Architectural or Bulk Requirement?
        </h2>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-stone-100 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
          Share your project details and get customized quotes from verified quarries, processors, and exporters across India.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/rfq"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-black/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Request a Project Quote</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-stone-950/85 hover:bg-stone-900 text-stone-100 border border-stone-600 font-semibold text-sm sm:text-base backdrop-blur-md transition-all hover:border-stone-400 shadow-lg"
          >
            <PhoneCall className="w-4 h-4 text-amber-400" />
            <span>Talk to Our Sourcing Team</span>
          </Link>
        </div>

        {/* Micro guarantees */}
        <div className="mt-10 pt-8 border-t border-stone-700/60 flex flex-wrap items-center justify-center gap-y-2 gap-x-8 text-xs text-stone-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Zero Commission for Buyers
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Verified Quarries & Processors
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Direct Factory & Export Pricing
          </span>
        </div>
      </div>
    </section>
  );
}
