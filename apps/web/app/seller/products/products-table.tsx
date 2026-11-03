"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardBody, EmptyState } from "@stone/ui";
import {
  formatPriceTypeShort,
  formatSellerPrice,
  formatShortDate,
  ModerationStatusBadge,
  StockStatusBadge,
} from "@/components/seller/status-badges";
import {
  changeProductStatusAction,
  deleteSellerProductAction,
  duplicateSellerProductAction,
} from "@/features/seller/actions";
import { UNIT_LABELS } from "@/features/seller/seller-meta";
import type { SellerProductListItem } from "@/features/seller/queries";

export interface SellerProductsTableProps {
  products: SellerProductListItem[];
  isFiltered: boolean;
}

export function SellerProductsTable({ products, isFiltered }: SellerProductsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<SellerProductListItem | null>(null);

  const handleArchiveToggle = (id: string, nextStatus: "archived" | "draft") => {
    setActionError(null);
    startTransition(async () => {
      const res = await changeProductStatusAction(id, nextStatus);
      if (!res.success) {
        setActionError(res.error || "Unable to update product status.");
        return;
      }
      router.refresh();
    });
  };

  const handleDuplicate = (id: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await duplicateSellerProductAction(id);
      if (!res.success || !res.data) {
        setActionError(res.error || "Unable to duplicate product.");
        return;
      }
      router.push(`/seller/products/${res.data.newProductId}/edit`);
    });
  };

  const handleDeleteDraft = (item: SellerProductListItem) => {
    if (item.moderationStatus !== "draft") return;
    if (
      !window.confirm(
        `Permanently delete draft product "${item.name}" and any uploaded images?`,
      )
    ) {
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const res = await deleteSellerProductAction(item.id);
      if (!res.success) {
        setActionError(res.error || "Failed to delete draft product.");
        return;
      }
      router.refresh();
    });
  };

  if (products.length === 0) {
    return (
      <EmptyState
        title={isFiltered ? "No products match your filters" : "Your stone catalogue is empty"}
        description={
          isFiltered
            ? "Try clearing your search query or switching the moderation status tab."
            : "Add your first marble, granite, sandstone, or architectural stone listing."
        }
        action={
          isFiltered ? (
            <Link href="/seller/products" className="btn-secondary !py-2 !text-xs">
              Reset Filters
            </Link>
          ) : (
            <Link href="/seller/products/new" className="btn-primary !py-2 !text-xs">
              + Add First Product
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {actionError}
        </div>
      )}

      {/* Desktop Rich Table (xl and above) */}
      <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs xl:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3.5">Product</th>
                <th className="px-3 py-3.5">SKU</th>
                <th className="px-3 py-3.5">Category</th>
                <th className="px-3 py-3.5">Pricing</th>
                <th className="px-3 py-3.5">MOQ</th>
                <th className="px-3 py-3.5">Stock</th>
                <th className="px-3 py-3.5">Moderation</th>
                <th className="px-3 py-3.5">Updated</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {products.map((item) => {
                const unitLabel =
                  UNIT_LABELS[item.unit as keyof typeof UNIT_LABELS] ?? item.unit;
                return (
                  <tr key={item.id} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                          {item.thumbnailUrl ? (
                            <Image
                              src={item.thumbnailUrl}
                              alt={item.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-medium text-stone-400">
                              No Img
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[230px]">
                          <Link
                            href={`/seller/products/${item.id}/edit`}
                            className="block truncate font-semibold text-stone-900 hover:text-amber-700"
                          >
                            {item.name}
                          </Link>
                          <p className="truncate text-xs text-stone-500">
                            {item.materialType || "Natural Stone"} • {item.imageCount} photo
                            {item.imageCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-stone-600">
                      {item.sku || "—"}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-stone-700">
                      {item.categoryName || "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-xs font-semibold text-stone-900">
                        {formatSellerPrice(
                          item.priceType,
                          item.price,
                          item.currency,
                          item.unit,
                        )}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {formatPriceTypeShort(item.priceType)}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-stone-700">
                      {item.minimumOrderQuantity
                        ? `${Number(item.minimumOrderQuantity).toLocaleString("en-IN")} ${unitLabel}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <StockStatusBadge status={item.stockStatus} />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="space-y-1">
                        <ModerationStatusBadge status={item.moderationStatus} />
                        {item.moderationStatus === "rejected" && item.rejectionReason && (
                          <p
                            className="max-w-[160px] truncate text-[11px] text-red-600"
                            title={item.rejectionReason}
                          >
                            {item.rejectionReason}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-stone-500">
                      {formatShortDate(item.updatedAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                        >
                          Preview
                        </button>
                        <Link
                          href={`/seller/products/${item.id}/edit`}
                          className="rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-800"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDuplicate(item.id)}
                          className="rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                          title="Duplicate as Draft"
                        >
                          Duplicate
                        </button>
                        {item.moderationStatus !== "archived" ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleArchiveToggle(item.id, "archived")}
                            className="rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleArchiveToggle(item.id, "draft")}
                            className="rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                          >
                            Restore
                          </button>
                        )}
                        {item.moderationStatus === "draft" && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDeleteDraft(item)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile & Tablet Responsive Cards (below xl) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:hidden">
        {products.map((item) => {
          const unitLabel = UNIT_LABELS[item.unit as keyof typeof UNIT_LABELS] ?? item.unit;
          return (
            <Card key={item.id}>
              <CardBody className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-stone-400">
                        No Img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ModerationStatusBadge status={item.moderationStatus} />
                      <StockStatusBadge status={item.stockStatus} />
                    </div>
                    <Link
                      href={`/seller/products/${item.id}/edit`}
                      className="mt-1 block truncate text-sm font-bold text-stone-900 hover:text-amber-700"
                    >
                      {item.name}
                    </Link>
                    <p className="truncate text-xs text-stone-500">
                      SKU: {item.sku || "—"} • {item.categoryName || "Uncategorized"}
                    </p>
                  </div>
                </div>

                {item.moderationStatus === "rejected" && item.rejectionReason && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    <strong>Rejected:</strong> {item.rejectionReason}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 rounded-lg bg-stone-50 p-2.5 text-xs">
                  <div>
                    <span className="text-stone-500">Price:</span>{" "}
                    <span className="font-semibold text-stone-900">
                      {formatSellerPrice(item.priceType, item.price, item.currency, item.unit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">MOQ:</span>{" "}
                    <span className="font-semibold text-stone-900">
                      {item.minimumOrderQuantity
                        ? `${Number(item.minimumOrderQuantity).toLocaleString("en-IN")} ${unitLabel}`
                        : "—"}
                    </span>
                  </div>
                  <div className="col-span-2 text-[11px] text-stone-500">
                    {formatPriceTypeShort(item.priceType)} • Updated{" "}
                    {formatShortDate(item.updatedAt)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2.5">
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Preview
                  </button>
                  <Link
                    href={`/seller/products/${item.id}/edit`}
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDuplicate(item.id)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Duplicate
                  </button>
                  {item.moderationStatus !== "archived" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleArchiveToggle(item.id, "archived")}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleArchiveToggle(item.id, "draft")}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                    >
                      Restore
                    </button>
                  )}
                  {item.moderationStatus === "draft" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeleteDraft(item)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Quick Product Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900">Product Preview</h3>
                <ModerationStatusBadge status={previewItem.moderationStatus} />
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                {previewItem.thumbnailUrl ? (
                  <Image
                    src={previewItem.thumbnailUrl}
                    alt={previewItem.name}
                    fill
                    sizes="500px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-stone-400">
                    No Primary Photograph Uploaded
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  {previewItem.categoryName || previewItem.materialType || "Natural Stone"}
                </p>
                <h4 className="mt-1 text-lg font-bold text-stone-900">{previewItem.name}</h4>
                <p className="mt-1 text-base font-semibold text-stone-800">
                  {formatSellerPrice(
                    previewItem.priceType,
                    previewItem.price,
                    previewItem.currency,
                    previewItem.unit,
                  )}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-3.5 text-xs">
                <div>
                  <dt className="text-stone-500">SKU</dt>
                  <dd className="font-semibold text-stone-900">{previewItem.sku || "—"}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Material / Finish</dt>
                  <dd className="font-semibold text-stone-900">
                    {[previewItem.materialType, previewItem.finish].filter(Boolean).join(" • ") ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Primary Colour</dt>
                  <dd className="font-semibold text-stone-900">{previewItem.colour || "—"}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">MOQ</dt>
                  <dd className="font-semibold text-stone-900">
                    {previewItem.minimumOrderQuantity
                      ? `${previewItem.minimumOrderQuantity} ${
                          UNIT_LABELS[previewItem.unit as keyof typeof UNIT_LABELS] ??
                          previewItem.unit
                        }`
                      : "—"}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                {previewItem.moderationStatus === "approved" && (
                  <Link
                    href={`/products/${previewItem.slug}`}
                    className="btn-secondary !py-2 !text-xs"
                  >
                    Open Public Page ↗
                  </Link>
                )}
                <Link
                  href={`/seller/products/${previewItem.id}/edit`}
                  className="btn-primary !py-2 !text-xs"
                >
                  Edit Listing
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

