"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@stone/ui";
import { slugify } from "@stone/utils";
import { PRODUCT_FORM_SLUGS, type ProductFormSlug } from "@stone/validation";
import { saveCategoryAction } from "@/features/admin/actions";

const MARKETPLACE_BASE_URL =
  process.env.NEXT_PUBLIC_MARKETPLACE_URL || "https://stonesdekho.com";

const FORM_LABELS: Record<ProductFormSlug, { label: string; hint: string }> = {
  slabs: { label: "Slabs", hint: "Gangsaw & cutter slabs" },
  tiles: { label: "Tiles", hint: "Calibrated floor/wall tiles" },
  blocks: { label: "Blocks", hint: "Rough & dressed quarry blocks" },
  articles: { label: "Articles", hint: "Carvings, jaali, pillars & craftwork" },
};

interface CategoryFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    image_alt?: string | null;
    parent_id: string | null;
    display_order: number;
    is_active: boolean;
    is_featured?: boolean;
    seo_title?: string | null;
    seo_description?: string | null;
    enabled_form_slugs?: string[];
  };
  availableParents: { id: string; name: string; slug?: string }[];
}

export function CategoryForm({ initialData, availableParents }: CategoryFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");
  const [imageAlt, setImageAlt] = useState(initialData?.image_alt || "");
  const [parentId, setParentId] = useState(initialData?.parent_id || "");
  const [displayOrder, setDisplayOrder] = useState(initialData?.display_order ?? 0);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(initialData?.is_featured ?? false);
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || "");
  const [seoDescription, setSeoDescription] = useState(initialData?.seo_description || "");
  const [enabledForms, setEnabledForms] = useState<ProductFormSlug[]>(() => {
    const initial = (initialData?.enabled_form_slugs ?? ["slabs", "tiles", "blocks"]).filter(
      (f): f is ProductFormSlug => PRODUCT_FORM_SLUGS.includes(f as ProductFormSlug),
    );
    return initial.length > 0 ? initial : ["slabs", "tiles", "blocks"];
  });

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedParent = availableParents.find((p) => p.id === parentId);
  const previewPath = selectedParent?.slug && slug
    ? `/categories/${selectedParent.slug}/${slug}`
    : slug
      ? `/categories/${slug}`
      : "/categories";
  const previewUrl = `${MARKETPLACE_BASE_URL.replace(/\/+$/, "")}${previewPath}`;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!initialData) {
      setSlug(slugify(val));
    }
  };

  const toggleForm = (formSlug: ProductFormSlug) => {
    setEnabledForms((prev) =>
      prev.includes(formSlug)
        ? prev.filter((item) => item !== formSlug)
        : [...prev, formSlug],
    );
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
        imageAlt: imageAlt.trim() || undefined,
        parentId: parentId || undefined,
        displayOrder: Number(displayOrder) || 0,
        isActive,
        isFeatured,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        enabledFormSlugs: enabledForms,
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Core Identity */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 className="text-sm font-semibold text-white">Category / Variety Identity</h2>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            Preview Public Page ↗
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300">
              Name <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Agra Red, Indian White Marble"
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-300">
                Canonical Slug <span className="text-amber-500">*</span>
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
              placeholder="e.g. agra-red"
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs font-mono text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300">Parent Category</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">— None (Main Top-Level Stone Category) —</option>
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
            placeholder="Brief architectural and quarry description..."
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Image Upload / URL + Alt Text */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-stone-300">
            Category / Variety Image
          </label>
          <div className="flex items-center gap-4">
            {imageUrl && (
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-stone-700 bg-stone-950 flex-shrink-0">
                <Image
                  src={imageUrl}
                  alt={imageAlt || name || "Category preview"}
                  fill
                  className="object-cover"
                  unoptimized
                />
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
                placeholder="Or paste an image URL or /images/... path"
                className="w-full rounded-lg border border-stone-700 bg-stone-950 p-2 text-xs text-stone-300 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
          <input
            type="text"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            placeholder="Descriptive image alt text (e.g. Agra Red natural sandstone slab texture)"
            className="w-full rounded-lg border border-stone-700 bg-stone-950 p-2 text-xs text-stone-300 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs font-medium text-stone-200">Featured Highlight</span>
            </label>
          </div>
        </div>
      </div>

      {/* Product Forms Configuration */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Allowed Product Forms</h2>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Configure which forms sellers can list and buyers can browse for this variety (Articles should only be enabled where approved).
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {PRODUCT_FORM_SLUGS.map((formSlug) => {
            const checked = enabledForms.includes(formSlug);
            const meta = FORM_LABELS[formSlug];
            return (
              <label
                key={formSlug}
                className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                  checked
                    ? "border-amber-500/60 bg-amber-500/10 text-white"
                    : "border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleForm(formSlug)}
                    className="h-4 w-4 rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-semibold">{meta.label}</span>
                </div>
                <span className="text-[10px] text-stone-400">{meta.hint}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* SEO Metadata */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">SEO &amp; Search Metadata</h2>
        <div>
          <label className="block text-xs font-semibold text-stone-300">SEO Title</label>
          <input
            type="text"
            maxLength={160}
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="e.g. Agra Red Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho"
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-300">SEO Meta Description</label>
          <textarea
            rows={2}
            maxLength={320}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            placeholder="Unique meta description (120-160 chars recommended)..."
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 p-2.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
          />
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
          {initialData ? "Update Category / Variety" : "Create Category / Variety"}
        </Button>
      </div>
    </form>
  );
}
