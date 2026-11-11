import Link from "next/link";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminCategories } from "@/features/admin/queries";
import { CategoryForm } from "../category-form";

export const dynamic = "force-dynamic";

export default async function AdminNewCategoryPage() {
  const ctx = await getAdminContext();
  const allCategories = await getAdminCategories(ctx);

  const availableParents = allCategories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Categories
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">Add New Natural Stone Category</h1>
      </div>

      <CategoryForm availableParents={availableParents} />
    </div>
  );
}

