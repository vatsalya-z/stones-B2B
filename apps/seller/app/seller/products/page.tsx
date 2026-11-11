import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, cn } from "@stone/ui";
import { Pagination } from "@/components/ui/pagination";
import { getSellerContext, getSellerProducts } from "@/features/seller/queries";
import { SellerProductsTable } from "./products-table";

export const metadata: Metadata = {
  title: "Product Management",
};

interface SellerProductsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "approved", label: "Published" },
  { key: "pending_review", label: "Pending Review" },
  { key: "draft", label: "Drafts" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
] as const;

export default async function SellerProductsPage({
  searchParams,
}: SellerProductsPageProps) {
  const sp = await searchParams;
  const ctx = await getSellerContext();
  const seller = ctx.sellerProfile;

  const listing = seller
    ? await getSellerProducts(seller.id, {
        q: sp.q,
        status: sp.status,
        sort: sp.sort,
        page: sp.page,
      })
    : {
        products: [],
        total: 0,
        totalPages: 0,
        page: 1,
        statusCounts: {
          all: 0,
          draft: 0,
          pending_review: 0,
          approved: 0,
          rejected: 0,
          archived: 0,
        },
      };

  const activeStatus = sp.status && sp.status !== "all" ? sp.status : "all";
  const activeSort = sp.sort || "updated_desc";
  const isFiltered = Boolean(sp.q?.trim() || activeStatus !== "all");

  const buildTabHref = (tabKey: string) => {
    const params = new URLSearchParams();
    if (sp.q?.trim()) params.set("q", sp.q.trim());
    if (tabKey !== "all") params.set("status", tabKey);
    if (sp.sort) params.set("sort", sp.sort);
    const qs = params.toString();
    return qs ? `/seller/products?${qs}` : "/seller/products";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Catalogue
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Product Management
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Manage stone slabs, tiles, blocks, pricing, and Ultra-HD photography across your
            catalogue.
          </p>
        </div>

        <Link href="/seller/products/new" className="btn-primary self-start sm:self-auto">
          + Add New Product
        </Link>
      </div>

      {!seller ? (
        <Card>
          <CardBody className="py-12 text-center">
            <h2 className="text-base font-semibold text-stone-900">
              Complete Seller Onboarding to Add Products
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-600">
              Save your business profile once to start building your stone catalogue.
            </p>
            <div className="mt-5">
              <Link href="/seller/profile" className="btn-primary">
                Setup Seller Profile →
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Status Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_TABS.map((tab) => {
              const selected = activeStatus === tab.key;
              const count = listing.statusCounts[tab.key] ?? 0;
              return (
                <Link
                  key={tab.key}
                  href={buildTabHref(tab.key)}
                  className={cn(
                    "inline-flex flex-shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    selected
                      ? "bg-stone-900 text-white"
                      : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[11px]",
                      selected ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600",
                    )}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <form
            method="GET"
            action="/seller/products"
            className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center"
          >
            {activeStatus !== "all" && (
              <input type="hidden" name="status" value={activeStatus} />
            )}

            <div className="relative flex-1">
              <input
                type="search"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Search by product name, SKU, or stone material…"
                className="input-base !py-2"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                name="sort"
                defaultValue={activeSort}
                aria-label="Sort products"
                className="input-base !w-auto !py-2"
              >
                <option value="updated_desc">Recently Updated</option>
                <option value="created_desc">Newest Created</option>
                <option value="name_asc">Name (A–Z)</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="price_desc">Price (High to Low)</option>
              </select>

              <button type="submit" className="btn-secondary !py-2 !text-xs">
                Apply
              </button>

              {isFiltered && (
                <Link href="/seller/products" className="btn-ghost !py-2 !text-xs">
                  Clear
                </Link>
              )}
            </div>
          </form>

          {/* Products Table & Mobile Cards */}
          <SellerProductsTable products={listing.products} isFiltered={isFiltered} />

          {/* Pagination */}
          <Pagination
            page={listing.page}
            totalPages={listing.totalPages}
            baseUrl="/seller/products"
            searchParams={{
              q: sp.q,
              status: activeStatus !== "all" ? activeStatus : undefined,
              sort: sp.sort,
            }}
          />
        </>
      )}
    </div>
  );
}

