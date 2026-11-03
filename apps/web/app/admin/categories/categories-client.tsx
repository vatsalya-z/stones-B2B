"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";
import { deleteCategoryAction } from "@/features/admin/actions";

export interface CategoryWithStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  total_products: number;
  approved_products: number;
  total_enquiries: number;
}

export function CategoriesClient({
  categories,
  isSuperAdmin,
}: {
  categories: CategoryWithStats[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    categoryId: string | null;
    categoryName: string;
  }>({
    isOpen: false,
    categoryId: null,
    categoryName: "",
  });

  const [feedback, setFeedback] = useState<string | null>(null);

  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  const handleDelete = async () => {
    if (!deleteModal.categoryId) return;
    setFeedback(null);

    const res = await deleteCategoryAction({ categoryId: deleteModal.categoryId });
    if (!res.success) {
      setFeedback(res.error || "Failed to delete category.");
      return;
    }

    setFeedback(`Category "${deleteModal.categoryName}" deleted successfully.`);
    setDeleteModal({ isOpen: false, categoryId: null, categoryName: "" });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400">
          Showing <span className="text-white font-bold">{categories.length}</span> natural stone categories.
        </p>

        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-amber-500 transition-colors"
        >
          <span>+ Add New Category</span>
        </Link>
      </div>

      {feedback && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          {feedback}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Parent Category</th>
                <th className="py-3.5 px-4 font-semibold">Order</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Products</th>
                <th className="py-3.5 px-4 font-semibold">Enquiries</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-stone-500">
                    No categories defined yet.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-stone-800 bg-stone-950">
                          {cat.image_url ? (
                            <Image
                              src={cat.image_url}
                              alt={cat.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-stone-600">
                              No Img
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{cat.name}</p>
                          <p className="text-[11px] text-stone-500 font-mono">/{cat.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-400">
                      {cat.parent_id ? categoryMap.get(cat.parent_id) || "Parent" : "— (Top Level)"}
                    </td>
                    <td className="py-3.5 px-4 font-mono">{cat.display_order}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          cat.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-stone-500/10 text-stone-400 border-stone-500/30"
                        }`}
                      >
                        {cat.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-semibold text-white">{cat.total_products}</span>
                      <span className="text-stone-500 text-[11px]"> ({cat.approved_products} approved)</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-300">
                      {cat.total_enquiries}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/categories/${cat.id}/edit`}
                          className="rounded-lg border border-stone-700 bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-200 hover:text-white"
                        >
                          Edit
                        </Link>

                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteModal({
                                isOpen: true,
                                categoryId: cat.id,
                                categoryName: cat.name,
                              })
                            }
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, categoryId: null, categoryName: "" })}
        onConfirm={handleDelete}
        title={`Delete Category "${deleteModal.categoryName}"`}
        description="Are you sure you want to delete this category? If any products or subcategories reference this category, PostgreSQL FK constraints will prevent deletion."
        confirmLabel="Delete Category"
        isDestructive={true}
      />
    </div>
  );
}

