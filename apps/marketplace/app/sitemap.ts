import type { MetadataRoute } from "next";
import { createClient } from "@stone/database/server";

function getSitemapSupabaseClient() {
  try {
    return createClient({ getAll: () => [], setAll: () => {} });
  } catch {
    return null;
  }
}

const FALLBACK_CATEGORIES = [
  "sandstone",
  "marble",
  "granite",
  "onyx",
  "semi-precious-stone",
  "travertine",
  "slate",
  "limestone",
  "basalt",
  "pebbles-and-cobbles",
];

const FALLBACK_PRODUCTS = [
  "makrana-white-marble",
  "black-galaxy-granite",
  "dholpur-beige-sandstone",
  "kota-blue-limestone",
  "silver-white-quartzite",
  "kund-black-slate",
  "classic-travertine-slab",
  "agra-red-sandstone",
  "honey-onyx-translucent",
  "raw-quarry-granite-blocks",
  "hand-carved-sandstone-jaali",
];

const FALLBACK_SELLERS = [
  "royal-makrana-marbles",
  "galaxy-granite-exports",
  "thar-sandstone-industries",
  "deccan-limestone-processors",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://stonesdekho.com";

  let categories: { id?: string; parent_id?: string | null; slug: string; updated_at?: string }[] = [];
  let products: { slug: string; updated_at?: string }[] = [];
  let sellers: { slug: string }[] = [];
  const enabledFormsByCategoryId = new Map<string, string[]>();

  try {
    const supabase = getSitemapSupabaseClient();
    if (supabase) {
      const [catRes, prodRes, sellRes, cpfRes, formsRes] = await Promise.all([
        supabase.from("categories").select("id, parent_id, slug, updated_at").eq("is_active", true),
        supabase
          .from("products")
          .select("slug, updated_at")
          .eq("moderation_status", "approved")
          .not("published_at", "is", null)
          .not("slug", "ilike", "test-%")
          .not("name", "ilike", "[TEST]%"),
        supabase
          .from("public_seller_profiles")
          .select("slug")
          .not("slug", "ilike", "%-test")
          .not("business_name", "ilike", "%[TEST]%"),
        supabase
          .from("category_product_forms")
          .select("category_id, form_id")
          .eq("is_enabled", true),
        supabase
          .from("product_forms")
          .select("id, slug")
          .eq("is_active", true),
      ]);

      categories = (catRes.data ?? []) as typeof categories;
      products = (prodRes.data ?? []) as typeof products;
      sellers = (sellRes.data ?? []) as typeof sellers;

      const formSlugById = new Map<string, string>();
      for (const f of (formsRes.data ?? []) as { id: string; slug: string }[]) {
        formSlugById.set(f.id, f.slug);
      }
      for (const link of (cpfRes.data ?? []) as { category_id: string; form_id: string }[]) {
        const formSlug = formSlugById.get(link.form_id);
        if (!formSlug) continue;
        const list = enabledFormsByCategoryId.get(link.category_id) ?? [];
        list.push(formSlug);
        enabledFormsByCategoryId.set(link.category_id, list);
      }
    }
  } catch (err) {
    console.error("[sitemap] failed to fetch dynamic entities:", err);
  }

  // Fallbacks if live database has no approved records yet
  if (categories.length === 0) {
    categories = FALLBACK_CATEGORIES.map((slug) => ({ slug }));
  }
  if (products.length === 0) {
    products = FALLBACK_PRODUCTS.map((slug) => ({ slug }));
  }
  if (sellers.length === 0) {
    sellers = FALLBACK_SELLERS.map((slug) => ({ slug }));
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/suppliers`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/request-quote`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryById = new Map(categories.filter((c) => c.id).map((c) => [c.id!, c]));
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => {
    const parent = cat.parent_id ? categoryById.get(cat.parent_id) : null;
    const urlPath = parent ? `/categories/${parent.slug}/${cat.slug}` : `/categories/${cat.slug}`;
    return {
      url: `${base}${urlPath}`,
      lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: parent ? 0.75 : 0.8,
    };
  });

  const varietyFormRoutes: MetadataRoute.Sitemap = [];
  for (const cat of categories) {
    const parent = cat.parent_id ? categoryById.get(cat.parent_id) : null;
    if (!parent || !cat.id) continue;
    const forms = enabledFormsByCategoryId.get(cat.id) ?? [];
    for (const formSlug of forms) {
      varietyFormRoutes.push({
        url: `${base}/categories/${parent.slug}/${cat.slug}/${formSlug}`,
        lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  const productRoutes: MetadataRoute.Sitemap = products.map((prod) => ({
    url: `${base}/products/${prod.slug}`,
    lastModified: prod.updated_at ? new Date(prod.updated_at) : new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const supplierRoutes: MetadataRoute.Sitemap = sellers.map((seller) => ({
    url: `${base}/suppliers/${seller.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...varietyFormRoutes, ...productRoutes, ...supplierRoutes];
}
