import { getAdminContext } from "@/features/admin/guard";
import { getAdminCategories } from "@/features/admin/queries";
import { CategoriesClient } from "./categories-client";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const ctx = await getAdminContext();
  const categories = await getAdminCategories(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Natural Stone Categories</h1>
        <p className="mt-1 text-xs text-stone-400">
          Manage product hierarchy, category banners, display ordering and marketplace visibility.
        </p>
      </div>

      <CategoriesClient categories={categories} isSuperAdmin={ctx.isSuperAdmin} />
    </div>
  );
}

