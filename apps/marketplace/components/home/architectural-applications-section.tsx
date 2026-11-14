import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface ApplicationItem {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  href: string;
}

const APPLICATIONS: ApplicationItem[] = [
  {
    id: 'commercial',
    title: 'Commercial Buildings',
    description: 'Rainscreen facades, grand corporate lobbies, elevator lobbies & plaza paving.',
    imageSrc: '/images/applications/commercial-buildings.jpg',
    href: '/products?usage=commercial',
  },
  {
    id: 'hospitality',
    title: 'Hospitality & Hotels',
    description: 'Bookmatched feature walls, luxury suites, bar counters & pool decks.',
    imageSrc: '/images/applications/hospitality-hotels.jpg',
    href: '/products?usage=hospitality',
  },
  {
    id: 'residential',
    title: 'Residential Projects',
    description: 'Bespoke marble flooring, kitchen quartz countertops & luxury bath cladding.',
    imageSrc: '/images/applications/residential-projects.jpg',
    href: '/products?usage=residential',
  },
  {
    id: 'public-infra',
    title: 'Public Spaces & Infra',
    description: 'Flamed granite transit concourses, monument pillars & high-traffic walkways.',
    imageSrc: '/images/applications/public-spaces-infra.jpg',
    href: '/products?usage=public-spaces',
  },
];

export function ArchitecturalApplicationsSection() {
  return (
    <section className="py-14 sm:py-18 bg-white border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-serif">
              Architectural Project Applications
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-stone-600">
              See how natural stone elevates real-world commercial, residential and infrastructure projects.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors whitespace-nowrap self-start sm:self-auto group"
          >
            <span>View All Applications</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {APPLICATIONS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-200/90 aspect-[4/3] sm:aspect-[4/3] lg:aspect-[4/3] block bg-stone-900"
            >
              <Image
                src={item.imageSrc}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                unoptimized
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-opacity group-hover:from-black/90" />

              {/* Title & Subtle Info at bottom */}
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col justify-end text-white">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90 mb-1">
                  Architecture
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-amber-200 transition-colors flex items-center justify-between">
                  <span>{item.title}</span>
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-amber-300" />
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
