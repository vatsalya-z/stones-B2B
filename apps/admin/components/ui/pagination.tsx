import Link from "next/link";
import { cn } from "@stone/ui";

export interface PaginationProps {
  page: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string | string[] | undefined>;
}

function buildHref(
  baseUrl: string,
  page: number,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page") continue; // we'll set this ourselves
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  baseUrl,
  searchParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);
  const prevHref = page > 1 ? buildHref(baseUrl, page - 1, searchParams) : null;
  const nextHref = page < totalPages ? buildHref(baseUrl, page + 1, searchParams) : null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      {/* Previous */}
      {prevHref ? (
        <Link
          href={prevHref}
          rel="prev"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white",
            "text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:border-stone-400",
          )}
          aria-label="Previous page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      ) : (
        <span
          className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-400"
          aria-disabled="true"
          aria-label="Previous page (unavailable)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}

      {/* Page numbers */}
      {pageNumbers.map((p, i) => {
        if (p === "ellipsis") {
          return (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex h-9 w-9 items-center justify-center text-sm text-stone-400"
              aria-hidden="true"
            >
              &hellip;
            </span>
          );
        }

        const isCurrent = p === page;
        return isCurrent ? (
          <span
            key={p}
            aria-current="page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-900 bg-stone-900 text-sm font-medium text-white"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(baseUrl, p, searchParams)}
            aria-label={`Go to page ${p}`}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white",
              "text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:border-stone-400",
            )}
          >
            {p}
          </Link>
        );
      })}

      {/* Next */}
      {nextHref ? (
        <Link
          href={nextHref}
          rel="next"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white",
            "text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:border-stone-400",
          )}
          aria-label="Next page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      ) : (
        <span
          className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-400"
          aria-disabled="true"
          aria-label="Next page (unavailable)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </nav>
  );
}
