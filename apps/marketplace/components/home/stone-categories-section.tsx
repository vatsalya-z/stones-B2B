import React from "react";
import Link from "next/link";
import Image from "next/image";

export interface StoneCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
}

interface StoneCategoriesSectionProps {
  categories?: StoneCategoryItem[];
}

const DEFAULT_FEATURED_CATEGORIES = [
  {
    name: "Marble",
    slug: "marble",
    image: "/images/categories/marble-macro.jpg",
    subtitle: "Calacatta, Makrana, Carrara & Italian Varieties",
  },
  {
    name: "Granite",
    slug: "granite",
    image: "/images/categories/granite-macro.jpg",
    subtitle: "Black Galaxy, Tan Brown & Flamed Pavers",
  },
  {
    name: "Sandstone",
    slug: "sandstone",
    image: "/images/categories/sandstone-macro.jpg",
    subtitle: "Dholpur Beige, Teakwood & Rainbow Slabs",
  },
  {
    name: "Limestone",
    slug: "limestone",
    image: "/images/categories/limestone-macro.jpg",
    subtitle: "Kota Blue, Tandur & Calibrated Pavers",
  },
  {
    name: "Quartzite",
    slug: "quartzite",
    image: "/images/categories/quartzite-macro.jpg",
    subtitle: "Silver White, Taj Mahal & Hard Quartzite",
  },
  {
    name: "Slate",
    slug: "slate",
    image: "/images/categories/slate-macro.jpg",
    subtitle: "Kund Black, Peacock & Rustic Multi",
  },
];

export function StoneCategoriesSection({ categories }: StoneCategoriesSectionProps) {
  // Use DB categories if available or fall back to standard 6 stone groups
  const displayCategories = DEFAULT_FEATURED_CATEGORIES.map((def) => {
    const dbCat = categories?.find(
      (c) => c.slug.toLowerCase() === def.slug.toLowerCase() || c.name.toLowerCase() === def.name.toLowerCase()
    );
    return {
      ...def,
      image: dbCat?.image_url || def.image,
      slug: dbCat?.slug || def.slug,
    };
  });

  return (
    <section id="categories" className="py-12 sm:py-16 bg-white border-t border-stone-200/70">
      <div className="container-wide">
        {/* Section Header matching reference */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Browse by Stone Categories
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-500 max-w-xl">
              Explore a wide range of natural stones for architectural and commercial projects.
            </p>
          </div>
          <Link
            href="/categories"
            className="text-xs sm:text-sm font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 transition-colors self-start sm:self-auto shrink-0 group"
          >
            <span>View All Categories</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* 6 Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
          {displayCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-stone-200/90 bg-white shadow-2xs hover:shadow-md hover:border-amber-600/30 transition-all"
            >
              {/* Image Box */}
              <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
                <Image
                  src={cat.image}
                  alt={`${cat.name} Natural Stone`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-108"
                  unoptimized
                />
                <div className="absolute inset-0 bg-stone-950/5 group-hover:bg-transparent transition-colors" />
              </div>

              {/* Bottom White Bar */}
              <div className="p-3 sm:p-3.5 flex items-center justify-between bg-white border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-stone-100 group-hover:bg-amber-50 group-hover:text-amber-800 text-stone-600 flex items-center justify-center transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                    {cat.name}
                  </span>
                </div>
                <span className="text-stone-400 group-hover:text-amber-700 transition-colors text-xs font-semibold">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
