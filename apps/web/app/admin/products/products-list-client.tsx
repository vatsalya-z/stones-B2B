"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@stone/ui";
import { ConfirmationModal } from "@/components/admin/confirmation-modal";
import { bulkModerateProductsAction } from "@/features/admin/actions";
import { ProductModerationBadge } from "@/components/admin/status-badges";

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  stone_type: string | null;
  primary_color: string | null;
  price_per_unit: number;
  currency: string;
  unit_of_measure: string;
  moderation_status: string;
  rejection_reason: string | null;
  created_at: string;
  seller: { id: string; business_name: string; verification_status: string } | null;
  category: { id: string; name: string } | null;
  product_images: { id: string; storage_path: string; is_primary: boolean }[];
}

export function ProductsListClient({ products }: { products: AdminProductRow[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: "approve" | "reject" | null;
    title: string;
    description: string;
    requiresReason: boolean;
  }>({
    isOpen: false,
    action: null,
    title: "",
    description: "",
    requiresReason: false,
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const openBulkModal = (action: "approve" | "reject") => {
    if (selectedIds.size === 0) return;
    setBulkFeedback(null);
    setModalState({
      isOpen: true,
      action,
      title: `Bulk ${action.toUpperCase()} (${selectedIds.size} Products)`,
      description: `Apply this moderation action to ${selectedIds.size} selected products simultaneously.`,
      requiresReason: action === "reject",
    });
  };

  const handleBulkConfirm = async (reason?: string) => {
    if (!modalState.action) return;
    setIsBulkLoading(true);
    setBulkFeedback(null);

    try {
      const res = await bulkModerateProductsAction({
        productIds: Array.from(selectedIds),
        action: modalState.action,
        reason,
      });

      if (res.data) {
        setBulkFeedback(
          `Moderated ${res.data.succeeded} products successfully.${
            res.data.failed > 0 ? ` (${res.data.failed} failed)` : ""
          }`,
        );
      }
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setIsBulkLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-300">{selectedIds.size} products selected</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-stone-400 hover:text-white underline"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              size="sm"
              disabled={isBulkLoading}
              onClick={() => openBulkModal("approve")}
            >
              Bulk Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isBulkLoading}
              onClick={() => openBulkModal("reject")}
            >
              Bulk Reject
            </Button>
          </div>
        </div>
      )}

      {bulkFeedback && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {bulkFeedback}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={toggleSelectAll}
                    className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500"
                  />
                </th>
                <th className="py-3.5 px-4 font-semibold">Product Name</th>
                <th className="py-3.5 px-4 font-semibold">Category / Stone</th>
                <th className="py-3.5 px-4 font-semibold">Seller</th>
                <th className="py-3.5 px-4 font-semibold">Price per Unit</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-stone-500">
                    No products match the filter criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isSelected = selectedIds.has(p.id);
                  const primaryImg = p.product_images?.find((img) => img.is_primary) || p.product_images?.[0];

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-stone-800/40 transition-colors ${isSelected ? "bg-amber-500/5" : ""}`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(p.id)}
                          className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-stone-800 bg-stone-950">
                            {primaryImg ? (
                              <Image
                                src={primaryImg.storage_path}
                                alt={p.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[9px] text-stone-600">
                                No Img
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="font-medium text-white hover:text-amber-400 transition-colors"
                            >
                              {p.name}
                            </Link>
                            <p className="text-[11px] text-stone-500 font-mono">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{p.category?.name || "Uncategorized"}</div>
                        <div className="text-[11px] text-stone-500">{p.stone_type || "Natural Stone"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.seller ? (
                          <Link
                            href={`/admin/sellers/${p.seller.id}`}
                            className="text-stone-300 hover:text-amber-400 underline decoration-stone-700"
                          >
                            {p.seller.business_name}
                          </Link>
                        ) : (
                          "Unknown"
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        ₹{Number(p.price_per_unit).toLocaleString("en-IN")} / {p.unit_of_measure}
                      </td>
                      <td className="py-3.5 px-4">
                        <ProductModerationBadge status={p.moderation_status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="inline-flex items-center rounded-lg border border-stone-700 bg-stone-800 px-3 py-1 text-xs font-medium text-stone-200 hover:border-amber-500/50 hover:bg-stone-700 hover:text-white transition-colors"
                        >
                          Moderate →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleBulkConfirm}
        title={modalState.title}
        description={modalState.description}
        requiresReason={modalState.requiresReason}
        isDestructive={modalState.action === "reject"}
        confirmLabel="Apply Bulk Action"
      />
    </div>
  );
}
