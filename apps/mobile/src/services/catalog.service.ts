import { supabase } from "../lib/supabase";
import { CANONICAL_STONE_CATEGORIES, getLocalStoneImageByMaterial, resolveStorageImageUrl } from "../theme/assets";
import { decodeSellerDescription } from "../lib/domain-meta";
import type { StoneProductCardItem } from "../components/stone/StoneProductCard";
import type { CategoryCardItem } from "../components/stone/CategoryCard";
import type { SupplierCardItem } from "../components/stone/SupplierCard";

export interface ProductFilterOptions {
  search?: string;
  categorySlug?: string;
  material?: string;
  colour?: string;
  finish?: string;
  origin?: string;
  thicknessMin?: number;
  thicknessMax?: number;
  dimensionsQuery?: string;
  locationQuery?: string;
  verifiedOnly?: boolean;
  priceMax?: number;
  sortBy?: "relevant" | "recent" | "price_asc" | "price_desc";
  limit?: number;
}

export interface ProductDetailData {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  materialType: string | null;
  stoneOrigin: string | null;
  colour: string | null;
  finish: string | null;
  thickness: number | null;
  length: number | null;
  width: number | null;
  minimumOrderQuantity: number | null;
  unit: string;
  priceType: string;
  price: number | null;
  currency: string;
  stockStatus: string;
  leadTime: number | null;
  images: Array<{ id: string; url: string; isPrimary: boolean }>;
  specifications: Array<{ name: string; value: string }>;
  supplier: SupplierCardItem | null;
  similarProducts: StoneProductCardItem[];
}

export async function fetchCategoriesWithCounts(): Promise<CategoryCardItem[]> {
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, parent_id, name, slug, description, image_url, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("products")
      .select("category_id, material_type")
      .eq("moderation_status", "approved")
      .not("published_at", "is", null),
  ]);

  const catList = categories ?? [];
  const prodList = products ?? [];

  if (catList.length === 0) {
    return CANONICAL_STONE_CATEGORIES.map((c) => {
      const count = prodList.filter(
        (p) => (p.material_type ?? "").toLowerCase().includes(c.name.toLowerCase()),
      ).length;
      return {
        slug: c.slug,
        name: c.name,
        description: c.shortDescription,
        imageSource: c.image,
        productCount: count,
      };
    });
  }

  // Group child categories under root parents for accurate category totals
  const parentById = new Map<string, string>();
  for (const c of catList) {
    if (c.parent_id) parentById.set(c.id, c.parent_id);
  }

  const countsByRoot = new Map<string, number>();
  for (const p of prodList) {
    if (!p.category_id) continue;
    const rootId = parentById.get(p.category_id) ?? p.category_id;
    countsByRoot.set(rootId, (countsByRoot.get(rootId) ?? 0) + 1);
  }

  const roots = catList.filter((c) => !c.parent_id);
  return roots.map((c) => {
    const resolved = resolveStorageImageUrl(c.image_url, "category-images");
    const fallback = getLocalStoneImageByMaterial(c.name);
    const matchingCanonical = CANONICAL_STONE_CATEGORIES.find(
      (can) => can.slug === c.slug || can.name.toLowerCase() === c.name.toLowerCase(),
    );
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description:
        c.description ||
        matchingCanonical?.shortDescription ||
        "Architectural natural stone lots from verified quarries.",
      imageSource: resolved || fallback,
      productCount: countsByRoot.get(c.id) ?? 0,
    };
  });
}

function mapProductRow(
  row: {
    id: string;
    seller_id: string;
    name: string;
    material_type: string | null;
    colour: string | null;
    finish: string | null;
    thickness: number | null;
    length: number | null;
    width: number | null;
    stone_origin: string | null;
    price_type: string;
    price: number | null;
    currency: string;
    unit: string;
    stock_status: string;
    product_images?: Array<{ storage_path: string; is_primary: boolean; display_order: number }>;
  },
  sellerMap: Map<string, { business_name: string; city: string | null; state: string | null; verified: boolean }>,
): StoneProductCardItem {
  const imgs = [...(row.product_images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.display_order - b.display_order;
  });
  const firstImg = imgs[0]?.storage_path ?? null;
  const seller = sellerMap.get(row.seller_id);

  return {
    id: row.id,
    name: row.name,
    materialType: row.material_type,
    colour: row.colour,
    finish: row.finish,
    thickness: row.thickness,
    length: row.length,
    width: row.width,
    origin: row.stone_origin,
    priceType: row.price_type,
    price: row.price,
    currency: row.currency,
    unit: row.unit,
    stockStatus: row.stock_status,
    imageUrl: resolveStorageImageUrl(firstImg, "product-images"),
    supplierName: seller?.business_name ?? null,
    supplierLocation: [seller?.city, seller?.state].filter(Boolean).join(", ") || null,
    supplierVerified: Boolean(seller?.verified),
  };
}

export async function fetchCatalogProducts(
  filters: ProductFilterOptions = {},
): Promise<StoneProductCardItem[]> {
  let categoryIdsFilter: string[] | null = null;
  if (filters.categorySlug) {
    const { data: catRows } = await supabase
      .from("categories")
      .select("id, parent_id, slug")
      .eq("is_active", true);
    const target = (catRows ?? []).find((c) => c.slug === filters.categorySlug);
    if (target) {
      categoryIdsFilter = [
        target.id,
        ...(catRows ?? []).filter((c) => c.parent_id === target.id).map((c) => c.id),
      ];
    }
  }

  let query = supabase
    .from("products")
    .select(
      "id, seller_id, category_id, name, material_type, colour, finish, thickness, length, width, stone_origin, price_type, price, currency, unit, stock_status, published_at",
    )
    .eq("moderation_status", "approved")
    .not("published_at", "is", null);

  if (categoryIdsFilter && categoryIdsFilter.length > 0) {
    query = query.in("category_id", categoryIdsFilter);
  }
  if (filters.material) {
    query = query.ilike("material_type", `%${filters.material}%`);
  }
  if (filters.colour) {
    query = query.ilike("colour", `%${filters.colour}%`);
  }
  if (filters.finish) {
    query = query.ilike("finish", `%${filters.finish}%`);
  }
  if (filters.origin) {
    query = query.ilike("stone_origin", `%${filters.origin}%`);
  }
  if (typeof filters.thicknessMin === "number") {
    query = query.gte("thickness", filters.thicknessMin);
  }
  if (typeof filters.thicknessMax === "number") {
    query = query.lte("thickness", filters.thicknessMax);
  }
  if (typeof filters.priceMax === "number" && filters.priceMax > 0) {
    query = query.lte("price", filters.priceMax).neq("price_type", "on_request");
  }

  if (filters.sortBy === "price_asc") {
    query = query.neq("price_type", "on_request").not("price", "is", null).order("price", { ascending: true });
  } else if (filters.sortBy === "price_desc") {
    query = query.neq("price_type", "on_request").not("price", "is", null).order("price", { ascending: false });
  } else {
    query = query.order("published_at", { ascending: false });
  }

  query = query.limit(filters.limit ?? 60);

  const [{ data: products, error }, { data: publicSellers }] = await Promise.all([
    query,
    supabase
      .from("public_seller_profiles")
      .select("id, business_name, city, state, verified_at"),
  ]);

  if (error) {
    throw new Error(error.message || "Unable to fetch stone catalogue.");
  }

  const sellerMap = new Map<
    string,
    { business_name: string; city: string | null; state: string | null; verified: boolean }
  >();
  for (const s of publicSellers ?? []) {
    sellerMap.set(s.id, {
      business_name: s.business_name,
      city: s.city,
      state: s.state,
      verified: Boolean(s.verified_at),
    });
  }

  const productList = products ?? [];
  const productIds = productList.map((p) => p.id);
  const { data: productImages } =
    productIds.length > 0
      ? await supabase
          .from("product_images")
          .select("product_id, storage_path, is_primary, display_order")
          .in("product_id", productIds)
      : { data: [] as Array<{ product_id: string; storage_path: string; is_primary: boolean; display_order: number }> };

  const imagesByProductId = new Map<
    string,
    Array<{ storage_path: string; is_primary: boolean; display_order: number }>
  >();
  for (const img of productImages ?? []) {
    const arr = imagesByProductId.get(img.product_id) ?? [];
    arr.push(img);
    imagesByProductId.set(img.product_id, arr);
  }

  let mapped = productList.map((row) =>
    mapProductRow(
      { ...row, product_images: imagesByProductId.get(row.id) ?? [] },
      sellerMap,
    ),
  );

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    mapped = mapped.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.materialType ?? "").toLowerCase().includes(q) ||
        (p.colour ?? "").toLowerCase().includes(q) ||
        (p.origin ?? "").toLowerCase().includes(q) ||
        (p.supplierName ?? "").toLowerCase().includes(q),
    );
  }

  if (filters.verifiedOnly) {
    mapped = mapped.filter((p) => p.supplierVerified);
  }

  if (filters.locationQuery?.trim()) {
    const locQ = filters.locationQuery.trim().toLowerCase();
    mapped = mapped.filter(
      (p) =>
        (p.supplierLocation ?? "").toLowerCase().includes(locQ) ||
        (p.origin ?? "").toLowerCase().includes(locQ),
    );
  }

  if (filters.dimensionsQuery?.trim()) {
    const dimQ = filters.dimensionsQuery.trim().toLowerCase();
    mapped = mapped.filter((p) => {
      const dim = `${p.length ?? ""}x${p.width ?? ""}`.toLowerCase();
      return dim.includes(dimQ);
    });
  }

  return mapped;
}

export async function fetchProductsByIds(ids: string[]): Promise<StoneProductCardItem[]> {
  if (ids.length === 0) return [];
  const [{ data: products }, { data: publicSellers }, { data: productImages }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, seller_id, name, material_type, colour, finish, thickness, length, width, stone_origin, price_type, price, currency, unit, stock_status",
      )
      .eq("moderation_status", "approved")
      .not("published_at", "is", null)
      .in("id", ids),
    supabase.from("public_seller_profiles").select("id, business_name, city, state, verified_at"),
    supabase
      .from("product_images")
      .select("product_id, storage_path, is_primary, display_order")
      .in("product_id", ids),
  ]);

  const sellerMap = new Map<
    string,
    { business_name: string; city: string | null; state: string | null; verified: boolean }
  >();
  for (const s of publicSellers ?? []) {
    sellerMap.set(s.id, {
      business_name: s.business_name,
      city: s.city,
      state: s.state,
      verified: Boolean(s.verified_at),
    });
  }

  const imagesByProductId = new Map<
    string,
    Array<{ storage_path: string; is_primary: boolean; display_order: number }>
  >();
  for (const img of productImages ?? []) {
    const arr = imagesByProductId.get(img.product_id) ?? [];
    arr.push(img);
    imagesByProductId.set(img.product_id, arr);
  }

  const byId = new Map(
    (products ?? []).map((row) => [
      row.id,
      mapProductRow({ ...row, product_images: imagesByProductId.get(row.id) ?? [] }, sellerMap),
    ]),
  );
  return ids.map((id) => byId.get(id)).filter((item): item is StoneProductCardItem => Boolean(item));
}

export async function fetchProductDetail(productId: string): Promise<ProductDetailData | null> {
  const [{ data: product, error }, { data: rawImages }, { data: rawSpecs }] = await Promise.all([
    supabase.from("products").select("*").eq("id", productId).maybeSingle(),
    supabase
      .from("product_images")
      .select("id, storage_path, is_primary, display_order")
      .eq("product_id", productId),
    supabase
      .from("product_specifications")
      .select("specification_name, specification_value, display_order")
      .eq("product_id", productId),
  ]);

  if (error || !product) return null;

  const [{ data: supplierRow }, similar] = await Promise.all([
    supabase
      .from("public_seller_profiles")
      .select("*")
      .eq("id", product.seller_id)
      .maybeSingle(),
    fetchCatalogProducts({
      material: product.material_type ?? undefined,
      limit: 8,
    }),
  ]);

  const images = [...(rawImages ?? [])]
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.display_order - b.display_order;
    })
    .map((img) => ({
      id: img.id,
      url: resolveStorageImageUrl(img.storage_path, "product-images") ?? "",
      isPrimary: img.is_primary,
    }))
    .filter((i) => Boolean(i.url));

  const specs = [...(rawSpecs ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => ({ name: s.specification_name, value: s.specification_value }));

  const supplier: SupplierCardItem | null = supplierRow
    ? {
        id: supplierRow.id,
        businessName: supplierRow.business_name,
        businessType: supplierRow.business_type,
        city: supplierRow.city,
        state: supplierRow.state,
        country: supplierRow.country,
        yearsInBusiness: supplierRow.years_in_business,
        logoUrl: resolveStorageImageUrl(supplierRow.logo_url, "seller-logos"),
        verified: Boolean(supplierRow.verified_at),
      }
    : null;

  return {
    id: product.id,
    sellerId: product.seller_id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description,
    materialType: product.material_type,
    stoneOrigin: product.stone_origin,
    colour: product.colour,
    finish: product.finish,
    thickness: product.thickness,
    length: product.length,
    width: product.width,
    minimumOrderQuantity: product.minimum_order_quantity,
    unit: product.unit,
    priceType: product.price_type,
    price: product.price,
    currency: product.currency,
    stockStatus: product.stock_status,
    leadTime: product.lead_time,
    images,
    specifications: specs,
    supplier,
    similarProducts: similar.filter((p) => p.id !== product.id).slice(0, 6),
  };
}

export async function fetchVerifiedSuppliers(limit = 12): Promise<SupplierCardItem[]> {
  const { data, error } = await supabase
    .from("public_seller_profiles")
    .select("*")
    .order("verified_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((s) => {
    const meta = decodeSellerDescription(s.description);
    const caps: string[] = [];
    if (meta.hasQuarry) caps.push("Quarry");
    if (meta.hasManufacturing) caps.push("Processing Unit");
    if (meta.hasExport) caps.push("Exporter");
    return {
      id: s.id,
      businessName: s.business_name,
      businessType: s.business_type,
      city: s.city,
      state: s.state,
      country: s.country,
      yearsInBusiness: s.years_in_business,
      logoUrl: resolveStorageImageUrl(s.logo_url, "seller-logos"),
      verified: Boolean(s.verified_at),
      capabilities: caps,
    };
  });
}

export async function fetchSupplierStorefront(sellerId: string) {
  const [{ data: supplier }, allProducts] = await Promise.all([
    supabase.from("public_seller_profiles").select("*").eq("id", sellerId).maybeSingle(),
    fetchCatalogProducts({ limit: 80 }),
  ]);

  if (!supplier) return null;
  const meta = decodeSellerDescription(supplier.description);

  // Filter strictly to this seller's approved products
  const { data: sellerProds } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", sellerId)
    .eq("moderation_status", "approved")
    .not("published_at", "is", null);

  const ownedIds = new Set((sellerProds ?? []).map((p) => p.id));

  return {
    id: supplier.id,
    businessName: supplier.business_name,
    businessType: supplier.business_type,
    city: supplier.city,
    state: supplier.state,
    country: supplier.country,
    website: supplier.website,
    yearsInBusiness: supplier.years_in_business,
    logoUrl: resolveStorageImageUrl(supplier.logo_url, "seller-logos"),
    coverUrl: resolveStorageImageUrl(supplier.cover_image_url, "seller-cover-images"),
    verified: Boolean(supplier.verified_at),
    meta,
    products: allProducts.filter((p) => ownedIds.has(p.id)),
  };
}
