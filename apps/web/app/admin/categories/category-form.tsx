"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@stone/ui";
import { slugify } from "@stone/utils";
import { saveCategoryAction } from "@/features/admin/actions";

interface CategoryFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    parent_id: string | null;
    display_order: number;
    is_active: boolean;
  };
  availableParents: { id: string; name: string }[];
}

export function CategoryForm({ initialData, availableParents }: CategoryFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");
  const [parentId, setParentId] = useState(initialData?.parent_id || "");
  const [displayOrder, setDisplayOrder] = useState(initialData?.display_order ?? 0);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!initialData) {
      setSlug(slugify(val));
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/categories/image", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Image upload failed.");
      }

      setImageUrl(json.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await saveCategoryAction({
        id: initialData?.id,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        parentId: parentId || undefined,
        displayOrder: Number(displayOrder) || 0,
        isActive,
      });

      if (!res.success) {
        setError(res.error || "Failed to save category.");
        return;
      }

      router.push("/admin/categories");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-300">
            Category Name <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Makrana Marble, Granites, Sandstones"
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-stone-300">
              URL Slug <span className="text-amber-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setSlug(slugify(name))}
              className="text-[11px] text-amber-500 hover:text-amber-400"
            >
              Generate from Name
            </button>
          </div>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. makrana-marble"
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs font-mono text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300">Parent Category</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">— None (Top Level Category) —</option>
            {availableParents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this natural stone category..."
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Image Upload / URL */}
        <div>
          <label className="block text-xs font-semibold text-stone-300">Category Banner / Thumbnail</label>
          <div className="mt-2 flex items-center gap-4">
            {imageUrl && (
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-stone-700 bg-stone-950 flex-shrink-0">
                <Image src={imageUrl} alt="Category preview" fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageFileChange}
                disabled={uploading}
                className="block w-full text-xs text-stone-400 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-stone-200 hover:file:bg-stone-700"
              />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste an image URL..."
                className="w-full rounded-lg border border-stone-700 bg-stone-950 p-2 text-xs text-stone-300 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-stone-300">Display Order</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs font-mono text-stone-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs font-medium text-stone-200">Active on Marketplace</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/admin/categories"
          className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-2 text-xs font-medium text-stone-300 hover:bg-stone-700"
        >
          Cancel
        </Link>
        <Button variant="accent" size="md" loading={submitting || uploading}>
          {initialData ? "Update Category" : "Create Category"}
        </Button>
      </div>
    </form>
  );
}

