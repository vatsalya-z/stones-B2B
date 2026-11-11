import Link from "next/link";
import Image from "next/image";
import { cn } from "@stone/ui";
import { getCategoryFallbackImage } from "@/lib/images";

export interface CategoryCardProps {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount?: number;
}

function CategoryFallback({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-200">
      <span className="text-2xl font-bold text-stone-400">{initials}</span>
    </div>
  );
}

export function CategoryCard({
  name,
  slug,
  description,
  imageUrl,
  productCount,
}: CategoryCardProps) {
  const resolvedImage = imageUrl || getCategoryFallbackImage(slug);

  return (
    <Link
      href={`/categories/${slug}`}
      className={cn(
        "group block overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card",
        "transition-all duration-300 hover:shadow-card-hover hover:scale-[1.01]",
      )}
      aria-label={`Browse ${name} category`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        {resolvedImage ? (
          <Image
            src={resolvedImage}
            alt={`${name} natural stone`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            unoptimized={!resolvedImage.includes(".supabase.co")}
          />
        ) : (
          <CategoryFallback name={name} />
        )}

        {/* Product count badge */}
        {productCount !== undefined && productCount > 0 && (
          <div className="absolute right-2.5 top-2.5">
            <span className="inline-flex items-center rounded-full bg-stone-900/75 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              {productCount.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-stone-900/0 transition-colors duration-300 group-hover:bg-stone-900/10" />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-stone-900 transition-colors group-hover:text-amber-700">
          {name}
        </h3>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs text-stone-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}
