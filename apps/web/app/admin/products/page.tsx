import { getAdminContext } from "@/features/admin/guard";
import { getAdminProducts, getAdminCategories } from "@/features/admin/queries";
import { AdminFilters } from "@/components/admin/admin-filters";
import { Pagination } from "@/components/ui/pagination";
import { ProductsListClient, type AdminProductRow } from "./products-list-client";

export const dynamic = "force-dynamic";

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    categoryId?: string;
    sellerId?: string;
    search?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const ctx = await getAdminContext();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = params.status || "all";
  const categoryId = params.categoryId || "all";
  const sellerId = params.sellerId || undefined;
  const search = params.search || "";

  const [productsData, categories] = await Promise.all([
    getAdminProducts({ page, limit: 15, status, categoryId, sellerId, search }, ctx),
    getAdminCategories(ctx),
  ]);

  const categoryOptions = [
    { label: "All Categories", value: "all" },
    ...categories.map((c) => ({ label: c.name, value: c.id })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Product Catalogue Moderation</h1>
          <p className="mt-1 text-xs text-stone-400">
            Enforce natural stone quality guidelines, technical specification accuracy, and bulk approvals.
          </p>
        </div>
        <div className="text-xs text-stone-400 font-mono">
          Total Products: <span className="text-white font-bold">{productsData.total}</span>
        </div>
      </div>

      {/* Filter bar */}
      <AdminFilters
        searchPlaceholder="Search product name or stone type..."
        filters={[
          {
            key: "status",
            label: "Moderation Status",
            defaultValue: "all",
            options: [
              { label: "All Moderation States", value: "all" },
              { label: "Pending Review", value: "pending_review" },
              { label: "Approved", value: "approved" },
              { label: "Rejected", value: "rejected" },
              { label: "Archived", value: "archived" },
              { label: "Draft", value: "draft" },
            ],
          },
          {
            key: "categoryId",
            label: "Category",
            defaultValue: "all",
            options: categoryOptions,
          },
        ]}
      />

      {/* Interactive Products List (with bulk action toolbar) */}
      <ProductsListClient products={productsData.products as unknown as AdminProductRow[]} />

      {/* Pagination */}
      {productsData.totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} totalPages={productsData.totalPages} baseUrl="/admin/products" />
        </div>
      )}
    </div>
  );
}
