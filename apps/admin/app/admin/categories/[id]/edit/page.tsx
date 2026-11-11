import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/features/admin/guard";
import { getAdminCategories, getAdminCategoryById } from "@/features/admin/queries";
import { CategoryForm } from "../../category-form";

export const dynamic = "force-dynamic";

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditCategoryPage({ params }: EditCategoryPageProps) {
  const ctx = await getAdminContext();
  const { id } = await params;

  const [category, allCategories] = await Promise.all([
    getAdminCategoryById(id, ctx),
    getAdminCategories(ctx),
  ]);

  if (!category) {
    notFound();
  }

  // Prevent selecting self as parent
  const availableParents = allCategories
    .filter((c) => c.id !== id)
    .map((c) => ({ id: c.id, name: c.name }));

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
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
          Edit Category: {category.name}
        </h1>
      </div>

      <CategoryForm
        initialData={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image_url: category.image_url,
          parent_id: category.parent_id,
          display_order: category.display_order,
          is_active: category.is_active,
        }}
        availableParents={availableParents}
      />
    </div>
  );
}

