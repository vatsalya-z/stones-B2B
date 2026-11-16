import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bed,
  Building2,
  ShoppingBag,
  Home,
} from "lucide-react";

interface ProjectApplicationItem {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const APPLICATIONS: ProjectApplicationItem[] = [
  {
    id: "hotels-resorts",
    title: "Hotels & Resorts",
    description: "Premium stone for luxury spaces",
    imageSrc: "/images/applications/hospitality-hotels.jpg",
    href: "/products?usage=hospitality",
    icon: Bed,
  },
  {
    id: "office-buildings",
    title: "Office Buildings",
    description: "Durable & elegant stone solutions",
    imageSrc: "/images/applications/commercial-buildings.jpg",
    href: "/products?usage=commercial",
    icon: Building2,
  },
  {
    id: "shopping-malls",
    title: "Shopping Malls",
    description: "High-traffic, long-lasting stone",
    imageSrc: "/images/applications/public-spaces-infra.jpg",
    href: "/products?usage=public-spaces",
    icon: ShoppingBag,
  },
  {
    id: "villas-residential",
    title: "Villas & Residential",
    description: "Natural stone for timeless homes",
    imageSrc: "/images/applications/residential-projects.jpg",
    href: "/products?usage=residential",
    icon: Home,
  },
];

export function ProjectApplicationGrid() {
  return (
    <section className="py-8 sm:py-10">
      <div className="container-wide">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-5 sm:pb-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#211D1A] tracking-tight">
            Popular Project Applications
          </h2>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#E87500] hover:text-[#C95D00] transition-colors group shrink-0"
          >
            <span>View All Projects</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {APPLICATIONS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex flex-col rounded-2xl border border-[#EAE3DB] bg-white overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300"
              >
                {/* Image Frame */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-900">
                  <Image
                    src={item.imageSrc}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>

                {/* Bottom Information Panel */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF6F0] text-[#E87500] shrink-0 border border-[#EAE3DB]/80 transition-colors group-hover:bg-[#FFF2E5]">
                      <Icon className="h-4.5 w-4.5 stroke-[2]" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="text-sm font-bold text-[#211D1A] group-hover:text-[#E87500] transition-colors truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#716A64] truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Circular Arrow Button */}
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-400 group-hover:border-[#E87500] group-hover:bg-[#E87500] group-hover:text-white transition-all duration-300 shrink-0">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
