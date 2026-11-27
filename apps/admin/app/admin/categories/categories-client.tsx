"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";
import {
  deleteCategoryAction,
  reassignCategoryProductsAction,
} from "@/features/admin/actions";

const MARKETPLACE_BASE_URL =
  process.env.NEXT_PUBLIC_MARKETPLACE_URL || "https://stonesdekho.com";

export interface CategoryWithStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  is_featured?: boolean;
  enabled_form_slugs?: string[];
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
  const [filterScope, setFilterScope] = useState<"all" | "main" | "varieties">("all");
  const [search, setSearch] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    categoryId: string | null;
    categoryName: string;
  }>({
    isOpen: false,
    categoryId: null,
    categoryName: "",
  });

  const [reassignModal, setReassignModal] = useState<{
    isOpen: boolean;
    fromId: string | null;
    fromName: string;
    toId: string;
  }>({
    isOpen: false,
    fromId: null,
    fromName: "",
    toId: "",
  });

  const [feedback, setFeedback] = useState<string | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryWithStats>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((c) => {
      if (filterScope === "main" && c.parent_id !== null) return false;
      if (filterScope === "varieties" && c.parent_id === null) return false;
      if (q) {
        const parentName = c.parent_id ? categoryById.get(c.parent_id)?.name ?? "" : "";
        return (
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          parentName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [categories, filterScope, search, categoryById]);

  const handleDelete = async () => {
    if (!deleteModal.categoryId) return;
    setFeedback(null);

    const res = await deleteCategoryAction({ categoryId: deleteModal.categoryId });
    if (!res.success) {
      setFeedback(res.error || "Failed to delete category.");
      setDeleteModal({ isOpen: false, categoryId: null, categoryName: "" });
      return;
    }

    setFeedback(`Category "${deleteModal.categoryName}" deleted successfully.`);
    setDeleteModal({ isOpen: false, categoryId: null, categoryName: "" });
    router.refresh();
  };

  const handleReassign = async () => {
    if (!reassignModal.fromId || !reassignModal.toId) return;
    setFeedback(null);
    const res = await reassignCategoryProductsAction({
      fromCategoryId: reassignModal.fromId,
      toCategoryId: reassignModal.toId,
    });
    if (!res.success) {
      setFeedback(res.error || "Failed to reassign products.");
      return;
    }
    setFeedback(
      `Reassigned ${res.data?.movedCount ?? 0} product(s) from "${reassignModal.fromName}".`,
    );
    setReassignModal({ isOpen: false, fromId: null, fromName: "", toId: "" });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category or variety..."
            className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
          />
          <div className="inline-flex rounded-lg border border-stone-800 bg-stone-950 p-0.5 text-[11px]">
            {(
              [
                { id: "all", label: `All (${categories.length})` },
                {
                  id: "main",
                  label: `Main (${categories.filter((c) => !c.parent_id).length})`,
                },
                {
                  id: "varieties",
                  label: `Varieties (${categories.filter((c) => Boolean(c.parent_id)).length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterScope(tab.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterScope === tab.id
                    ? "bg-amber-600 text-black font-semibold"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/admin/categories/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-amber-500 transition-colors"
        >
          <span>+ Add Category / Variety</span>
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
                <th className="py-3.5 px-4 font-semibold">Category / Variety</th>
                <th className="py-3.5 px-4 font-semibold">Parent</th>
                <th className="py-3.5 px-4 font-semibold">Allowed Forms</th>
                <th className="py-3.5 px-4 font-semibold">Order</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Products</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-stone-500">
                    No matching categories or varieties found.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const parent = cat.parent_id ? categoryById.get(cat.parent_id) : null;
                  const previewHref = parent
                    ? `${MARKETPLACE_BASE_URL.replace(/\/+$/, "")}/categories/${parent.slug}/${cat.slug}`
                    : `${MARKETPLACE_BASE_URL.replace(/\/+$/, "")}/categories/${cat.slug}`;
                  const forms = cat.enabled_form_slugs ?? ["slabs", "tiles", "blocks"];

                  return (
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
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-white">{cat.name}</p>
                              {cat.is_featured && (
                                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 font-mono">/{cat.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-400">
                        {parent ? parent.name : "— (Main Category)"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {forms.map((f) => (
                            <span
                              key={f}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                                f === "articles"
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  : "bg-stone-800 text-stone-300"
                              }`}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
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
                        <span className="text-stone-500 text-[11px]">
                          {" "}
                          ({cat.approved_products} live)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={previewHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-stone-700 bg-stone-900 px-2 py-1 text-[11px] font-medium text-stone-300 hover:text-white"
                          >
                            Preview ↗
                          </a>
                          <Link
                            href={`/admin/categories/${cat.id}/edit`}
                            className="rounded-lg border border-stone-700 bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-200 hover:text-white"
                          >
                            Edit
                          </Link>

                          {cat.total_products > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setReassignModal({
                                  isOpen: true,
                                  fromId: cat.id,
                                  fromName: cat.name,
                                  toId: "",
                                })
                              }
                              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20"
                            >
                              Move Products
                            </button>
                          )}

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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reassignModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-stone-800 bg-stone-900 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Reassign Products from &ldquo;{reassignModal.fromName}&rdquo;
            </h3>
            <p className="text-xs text-stone-400">
              Select a target category or variety before deleting or retiring this entry.
            </p>
            <select
              value={reassignModal.toId}
              onChange={(e) =>
                setReassignModal((prev) => ({ ...prev, toId: e.target.value }))
              }
              className="w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200"
            >
              <option value="">— Select Target Category / Variety —</option>
              {categories
                .filter((c) => c.id !== reassignModal.fromId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (/{c.slug})
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setReassignModal({ isOpen: false, fromId: null, fromName: "", toId: "" })
                }
                className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-xs text-stone-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reassignModal.toId}
                onClick={handleReassign}
                className="rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
              >
                Reassign Products
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, categoryId: null, categoryName: "" })}
        onConfirm={handleDelete}
        title={`Delete Category "${deleteModal.categoryName}"`}
        description="Are you sure you want to delete this category? If any products or child varieties reference it, deletion will be blocked until reassigned."
        confirmLabel="Delete Category"
        isDestructive={true}
      />
    </div>
  );
}
