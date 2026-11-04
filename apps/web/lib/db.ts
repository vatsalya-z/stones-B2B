import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { parsePagination, DEFAULT_PAGE_SIZE } from "@stone/utils";
import { decodeSellerDescription } from "@/features/seller/seller-meta";

/**
 * Checks whether Supabase is configured with a live project URL.
 */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes("placeholder.supabase.co") || key.includes("placeholder")) return false;
  return true;
}

/**
 * Resolves a public Supabase Storage URL from a stored path or existing URL.
 */
export function resolveStorageUrl(
  path: string | null | undefined,
  bucket: "product-images" | "seller-logos" | "seller-cover-images" | "category-images",
): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  // Already a full external URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Local static public assets (e.g. /images/products/...)
  if (trimmed.startsWith("/images/") || trimmed.startsWith("/icons/") || trimmed.startsWith("/favicon")) {
    return trimmed;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!supabaseUrl) return null;

  // Clean path of leading slashes
  let cleanPath = trimmed.replace(/^\/+/, "");

  // If path already starts with storage/v1/object/public/
  if (cleanPath.startsWith("storage/v1/object/public/")) {
    return `${supabaseUrl}/${cleanPath}`;
  }

  // If path already starts with bucket name (e.g. product-images/...)
  if (cleanPath.startsWith(`${bucket}/`)) {
    cleanPath = cleanPath.slice(bucket.length + 1);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

function cleanPublicDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = decodeSellerDescription(raw).cleanDescription;
  return cleaned || null;
}

// ─── Default Stone Categories (mirroring supabase/seed.sql) ───────────────────

const SEED_CATEGORIES: CategoryItem[] = [
  { id: "cat-1", parent_id: null, name: "Marble", slug: "marble", description: "Natural marble slabs, tiles and blocks", image_url: null, display_order: 10, seo_title: "Marble Suppliers & Exporters", seo_description: null },
  { id: "cat-2", parent_id: null, name: "Granite", slug: "granite", description: "Granite slabs, tiles and countertops", image_url: null, display_order: 20, seo_title: "Granite Suppliers & Exporters", seo_description: null },
  { id: "cat-3", parent_id: null, name: "Sandstone", slug: "sandstone", description: "Sandstone paving, cladding and carvings", image_url: null, display_order: 30, seo_title: "Sandstone Suppliers", seo_description: null },
  { id: "cat-4", parent_id: null, name: "Limestone", slug: "limestone", description: "Limestone tiles, slabs and blocks", image_url: null, display_order: 40, seo_title: "Limestone Suppliers", seo_description: null },
  { id: "cat-5", parent_id: null, name: "Quartzite", slug: "quartzite", description: "Quartzite slabs and surfaces", image_url: null, display_order: 50, seo_title: "Quartzite Suppliers", seo_description: null },
  { id: "cat-6", parent_id: null, name: "Slate", slug: "slate", description: "Slate roofing, flooring and cladding", image_url: null, display_order: 60, seo_title: "Slate Suppliers", seo_description: null },
  { id: "cat-7", parent_id: null, name: "Travertine", slug: "travertine", description: "Travertine tiles and slabs", image_url: null, display_order: 70, seo_title: "Travertine Suppliers", seo_description: null },
  { id: "cat-8", parent_id: null, name: "Onyx", slug: "onyx", description: "Onyx slabs and decorative panels", image_url: null, display_order: 80, seo_title: "Onyx Suppliers", seo_description: null },
  { id: "cat-9", parent_id: null, name: "Semi-Precious Stones", slug: "semi-precious-stones", description: "Semi-precious stone products and inlay", image_url: null, display_order: 90, seo_title: "Semi-Precious Stone Suppliers", seo_description: null },
  { id: "cat-10", parent_id: null, name: "Natural Stone Slabs", slug: "natural-stone-slabs", description: "Polished and honed natural stone slabs", image_url: null, display_order: 100, seo_title: "Natural Stone Slabs", seo_description: null },
  { id: "cat-11", parent_id: null, name: "Stone Tiles", slug: "stone-tiles", description: "Natural stone tiles for floors and walls", image_url: null, display_order: 110, seo_title: "Stone Tiles", seo_description: null },
  { id: "cat-12", parent_id: null, name: "Stone Blocks", slug: "stone-blocks", description: "Raw stone blocks from quarries", image_url: null, display_order: 120, seo_title: "Stone Blocks", seo_description: null },
  { id: "cat-13", parent_id: null, name: "Decorative Stone", slug: "decorative-stone", description: "Decorative and landscaping stone", image_url: null, display_order: 130, seo_title: "Decorative Stone", seo_description: null },
  { id: "cat-14", parent_id: null, name: "Custom Stone Products", slug: "custom-stone-products", description: "Made-to-order stone products", image_url: null, display_order: 140, seo_title: "Custom Stone Products", seo_description: null },
];

// ─── Categories ──────────────────────────────────────────────────────────────

export interface CategoryItem {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  seo_title: string | null;
  seo_description: string | null;
  productCount?: number;
}

function countProductsForCategory(slug: string): number {
  return SEED_PRODUCTS.filter((p) => {
    const s = slug.toLowerCase();
    if (p.category?.slug === s) return true;
    if (p.material_type?.toLowerCase() === s) return true;
    if (s === "natural-stone-slabs" && (p.unit === "sq_ft" || p.name.toLowerCase().includes("slab"))) return true;
    if (s === "stone-tiles" && p.name.toLowerCase().includes("tile")) return true;
    if (s === "stone-blocks" && (p.unit === "metric_ton" || p.name.toLowerCase().includes("block"))) return true;
    if (s === "decorative-stone" && (p.name.toLowerCase().includes("jaali") || p.name.toLowerCase().includes("carved"))) return true;
    if (s === "custom-stone-products" && p.stock_status === "made_to_order") return true;
    return false;
  }).length;
}

export async function getActiveCategories(parentId?: string | null): Promise<CategoryItem[]> {
  if (!isSupabaseConfigured()) {
    return parentId
      ? []
      : SEED_CATEGORIES.map((c) => ({
          ...c,
          productCount: countProductsForCategory(c.slug),
        }));
  }

  try {
    const supabase = await getSupabaseServerClient();
    let query = supabase
      .from("categories")
      .select("id, parent_id, name, slug, description, image_url, display_order, seo_title, seo_description")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (parentId === null) {
      query = query.is("parent_id", null);
    } else if (parentId !== undefined) {
      query = query.eq("parent_id", parentId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return parentId
        ? []
        : SEED_CATEGORIES.map((c) => ({
            ...c,
            productCount: countProductsForCategory(c.slug),
          }));
    }

    const { data: prods } = await supabase
      .from("products")
      .select("category_id")
      .eq("moderation_status", "approved")
      .not("published_at", "is", null)
      .not("slug", "ilike", "test-%")
      .not("name", "ilike", "[TEST]%");

    const counts: Record<string, number> = {};
    if (prods && prods.length > 0) {
      prods.forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });
    }

    return ((data ?? []) as unknown as CategoryItem[]).map((cat) => ({
      ...cat,
      image_url: resolveStorageUrl(cat.image_url, "category-images"),
      productCount: counts[cat.id] ?? countProductsForCategory(cat.slug),
    }));
  } catch {
    return parentId
      ? []
      : SEED_CATEGORIES.map((c) => ({
          ...c,
          productCount: countProductsForCategory(c.slug),
        }));
  }
}

export async function getCategoryBySlug(slug: string): Promise<CategoryItem | null> {
  if (!isSupabaseConfigured()) {
    return SEED_CATEGORIES.find((c) => c.slug === slug) ?? null;
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, parent_id, name, slug, description, image_url, display_order, seo_title, seo_description")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return SEED_CATEGORIES.find((c) => c.slug === slug) ?? null;
    }

    const cat = data as unknown as CategoryItem;
    return {
      ...cat,
      image_url: resolveStorageUrl(cat.image_url, "category-images"),
    };
  } catch {
    return SEED_CATEGORIES.find((c) => c.slug === slug) ?? null;
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  primaryImage: string | null;
  materialType: string | null;
  colour: string | null;
  finish: string | null;
  stoneOrigin: string | null;
  priceType: "fixed" | "starting" | "on_request" | "negotiable" | "range";
  price: number | null;
  currency: string;
  unit: string;
  sellerId: string;
  sellerName: string;
  sellerSlug: string;
  sellerCity: string | null;
  sellerState: string | null;
  isVerifiedSeller: boolean;
  thickness?: number | null;
  length?: number | null;
  width?: number | null;
  minimumOrderQuantity?: number | null;
  stockStatus?: string | null;
  leadTime?: number | null;
}

// ─── Default Sellers & Products (Curated Showcase Seed Data) ──────────────────

const SEED_SELLERS: PublicSeller[] = [
  {
    id: "seller-1",
    slug: "royal-makrana-marbles",
    businessName: "Royal Makrana Marbles",
    businessType: "Manufacturer & Exporter",
    city: "Makrana",
    state: "Rajasthan",
    country: "India",
    yearsInBusiness: 35,
    description:
      "Generations of quarrying and precision gangsaw processing of premium Makrana white marble, Dungri, and Kumari varieties.",
    logoUrl: "/images/products/makrana-white-marble.jpg",
    coverImageUrl: "/images/hero/stone-quarry-hero.jpg",
    verifiedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "seller-2",
    slug: "galaxy-granite-exports",
    businessName: "Galaxy Granite Exports",
    businessType: "Processor & Exporter",
    city: "Ongole",
    state: "Andhra Pradesh",
    country: "India",
    yearsInBusiness: 22,
    description:
      "Export-oriented gangsaw unit specializing in Black Galaxy, Steel Grey, and Tan Brown granite slabs and cut-to-size tiles.",
    logoUrl: "/images/products/black-galaxy-granite.jpg",
    coverImageUrl: "/images/suppliers/granite-processing-factory.jpg",
    verifiedAt: "2024-02-10T00:00:00Z",
  },
  {
    id: "seller-3",
    slug: "thar-sandstone-industries",
    businessName: "Thar Sandstone Industries",
    businessType: "Quarry Owner & Fabricator",
    city: "Dholpur",
    state: "Rajasthan",
    country: "India",
    yearsInBusiness: 18,
    description:
      "Direct quarry extraction and computerized CNC carving of Dholpur Beige, Red Sandstone, and intricate architectural jaalis.",
    logoUrl: "/images/products/dholpur-beige-sandstone.jpg",
    coverImageUrl: "/images/hero/stone-quarry-hero.jpg",
    verifiedAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "seller-4",
    slug: "deccan-limestone-processors",
    businessName: "Deccan Limestone Processors",
    businessType: "Manufacturer",
    city: "Kota",
    state: "Rajasthan",
    country: "India",
    yearsInBusiness: 15,
    description:
      "Large-capacity production of Kota Blue and Kota Brown natural cleft and mirror-polished limestone tiles for major infrastructure projects.",
    logoUrl: "/images/products/kota-blue-limestone.jpg",
    coverImageUrl: "/images/suppliers/marble-processing-factory.jpg",
    verifiedAt: "2024-03-20T00:00:00Z",
  },
];

const SEED_PRODUCTS: ProductDetail[] = [
  {
    id: "prod-1",
    seller_id: "seller-1",
    category_id: "cat-1",
    name: "Makrana Pure White Marble Gangsaw Slab",
    slug: "makrana-white-marble",
    sku: "MKR-WHT-001",
    description:
      "World-renowned Makrana pure white calcite marble with delicate grey veining. High calcium carbonate purity ensures crystalline translucency, negligible porosity, and lifetime luster without synthetic resin fills.",
    material_type: "Marble",
    stone_origin: "Makrana, Rajasthan",
    colour: "White",
    finish: "Polished",
    thickness: 18,
    length: 2800,
    width: 1700,
    minimum_order_quantity: 500,
    unit: "sq_ft",
    price_type: "fixed",
    price: 650,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 7,
    published_at: "2024-04-12T00:00:00Z",
    category: { id: "cat-1", name: "Marble", slug: "marble" },
    seller: {
      id: "seller-1",
      business_name: "Royal Makrana Marbles",
      slug: "royal-makrana-marbles",
      business_type: "Manufacturer & Exporter",
      city: "Makrana",
      state: "Rajasthan",
      country: "India",
      description:
        "Generations of quarrying and precision gangsaw processing of premium Makrana white marble, Dungri, and Kumari varieties.",
      logo_url: "/images/products/makrana-white-marble.jpg",
      cover_image_url: "/images/hero/stone-quarry-hero.jpg",
      years_in_business: 35,
      verification_status: "verified",
    },
    images: [
      { id: "img-1", storage_path: "", src: "/images/products/makrana-white-marble.jpg", alt_text: "Makrana Pure White Marble Slab", is_primary: true, display_order: 1 },
      { id: "img-2", storage_path: "", src: "/images/product-gallery/marble-detail-vein.jpg", alt_text: "Micro Crystalline Calcite Veining", is_primary: false, display_order: 2 },
      { id: "img-3", storage_path: "", src: "/images/product-gallery/marble-install-living.jpg", alt_text: "Architectural Villa Living Room Installation", is_primary: false, display_order: 3 },
      { id: "img-4", storage_path: "", src: "/images/categories/natural-stone-slabs.jpg", alt_text: "Gangsaw Slabs Warehouse Lot", is_primary: false, display_order: 4 },
    ],
    specifications: [
      { id: "sp-1", specification_name: "Compressive Strength", specification_value: "142 MPa", display_order: 1 },
      { id: "sp-2", specification_name: "Water Absorption", specification_value: "0.12%", display_order: 2 },
      { id: "sp-3", specification_name: "Density", specification_value: "2.71 g/cm³", display_order: 3 },
      { id: "sp-4", specification_name: "Hardness (Mohs)", specification_value: "3.5 - 4.0", display_order: 4 },
    ],
  },
  {
    id: "prod-2",
    seller_id: "seller-2",
    category_id: "cat-2",
    name: "Black Galaxy Mirror Polished Granite Slab",
    slug: "black-galaxy-granite",
    sku: "BG-GRN-002",
    description:
      "Deep obsidian black gabbroic granite richly embedded with reflective golden and bronze bronzite spangles (Star Galaxy). Cut on multi-wire gangsaw with high-gloss automated resin polish.",
    material_type: "Granite",
    stone_origin: "Ongole, Andhra Pradesh",
    colour: "Black",
    finish: "Polished",
    thickness: 20,
    length: 3000,
    width: 1800,
    minimum_order_quantity: 1000,
    unit: "sq_ft",
    price_type: "fixed",
    price: 420,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 10,
    published_at: "2024-04-11T00:00:00Z",
    category: { id: "cat-2", name: "Granite", slug: "granite" },
    seller: {
      id: "seller-2",
      business_name: "Galaxy Granite Exports",
      slug: "galaxy-granite-exports",
      business_type: "Processor & Exporter",
      city: "Ongole",
      state: "Andhra Pradesh",
      country: "India",
      description:
        "Export-oriented gangsaw unit specializing in Black Galaxy, Steel Grey, and Tan Brown granite slabs and cut-to-size tiles.",
      logo_url: "/images/products/black-galaxy-granite.jpg",
      cover_image_url: "/images/suppliers/granite-processing-factory.jpg",
      years_in_business: 22,
      verification_status: "verified",
    },
    images: [
      { id: "img-21", storage_path: "", src: "/images/products/black-galaxy-granite.jpg", alt_text: "Black Galaxy Mirror Polished Granite Slab", is_primary: true, display_order: 1 },
      { id: "img-22", storage_path: "", src: "/images/categories/granite.jpg", alt_text: "Golden Bronzite Specks Macro", is_primary: false, display_order: 2 },
      { id: "img-23", storage_path: "", src: "/images/suppliers/granite-processing-factory.jpg", alt_text: "Multi-wire Gangsaw Cutting", is_primary: false, display_order: 3 },
    ],
    specifications: [
      { id: "sp-21", specification_name: "Compressive Strength", specification_value: "210 MPa", display_order: 1 },
      { id: "sp-22", specification_name: "Water Absorption", specification_value: "0.04%", display_order: 2 },
      { id: "sp-23", specification_name: "Density", specification_value: "2.98 g/cm³", display_order: 3 },
    ],
  },
  {
    id: "prod-3",
    seller_id: "seller-3",
    category_id: "cat-3",
    name: "Dholpur Beige Sandstone Architectural Slabs",
    slug: "dholpur-beige-sandstone",
    sku: "DLP-SND-003",
    description:
      "Fine-grained quartzitic sandstone in uniform warm buff and cream tones. Excellent thermal resistance, non-slip natural cleft texture, ideal for exterior cladding, paving, and heritage restorations.",
    material_type: "Sandstone",
    stone_origin: "Dholpur, Rajasthan",
    colour: "Beige",
    finish: "Natural Cleft",
    thickness: 25,
    length: 2400,
    width: 1200,
    minimum_order_quantity: 2000,
    unit: "sq_ft",
    price_type: "fixed",
    price: 110,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 14,
    published_at: "2024-04-10T00:00:00Z",
    category: { id: "cat-3", name: "Sandstone", slug: "sandstone" },
    seller: {
      id: "seller-3",
      business_name: "Thar Sandstone Industries",
      slug: "thar-sandstone-industries",
      business_type: "Quarry Owner & Fabricator",
      city: "Dholpur",
      state: "Rajasthan",
      country: "India",
      description:
        "Direct quarry extraction and computerized CNC carving of Dholpur Beige, Red Sandstone, and intricate architectural jaalis.",
      logo_url: "/images/products/dholpur-beige-sandstone.jpg",
      cover_image_url: "/images/hero/stone-quarry-hero.jpg",
      years_in_business: 18,
      verification_status: "verified",
    },
    images: [
      { id: "img-31", storage_path: "", src: "/images/products/dholpur-beige-sandstone.jpg", alt_text: "Dholpur Beige Sandstone Architectural Slabs", is_primary: true, display_order: 1 },
      { id: "img-32", storage_path: "", src: "/images/products/agra-red-sandstone.jpg", alt_text: "Natural Sandstone Surface Grain", is_primary: false, display_order: 2 },
      { id: "img-33", storage_path: "", src: "/images/hero/stone-quarry-hero.jpg", alt_text: "Quarry Extraction Site", is_primary: false, display_order: 3 },
    ],
    specifications: [
      { id: "sp-31", specification_name: "Compressive Strength", specification_value: "95 MPa", display_order: 1 },
      { id: "sp-32", specification_name: "Water Absorption", specification_value: "1.4%", display_order: 2 },
      { id: "sp-33", specification_name: "Density", specification_value: "2.35 g/cm³", display_order: 3 },
    ],
  },
  {
    id: "prod-4",
    seller_id: "seller-1",
    category_id: "cat-1",
    name: "Rajasthan Forest Green Marble Slab",
    slug: "rajasthan-green-marble",
    sku: "RAJ-GRN-004",
    description:
      "Deep serpentine green natural marble laced with intricate dark and light calcite network veining. Known globally as Verde Guatemala / Verde India, offering exceptional durability and rich organic presence.",
    material_type: "Marble",
    stone_origin: "Udaipur, Rajasthan",
    colour: "Green",
    finish: "Polished",
    thickness: 18,
    length: 2700,
    width: 1600,
    minimum_order_quantity: 600,
    unit: "sq_ft",
    price_type: "fixed",
    price: 380,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 7,
    published_at: "2024-04-09T00:00:00Z",
    category: { id: "cat-1", name: "Marble", slug: "marble" },
    seller: {
      id: "seller-1",
      business_name: "Royal Makrana Marbles",
      slug: "royal-makrana-marbles",
      business_type: "Manufacturer & Exporter",
      city: "Makrana",
      state: "Rajasthan",
      country: "India",
      description:
        "Generations of quarrying and precision gangsaw processing of premium Makrana white marble, Dungri, and Kumari varieties.",
      logo_url: "/images/products/makrana-white-marble.jpg",
      cover_image_url: "/images/hero/stone-quarry-hero.jpg",
      years_in_business: 35,
      verification_status: "verified",
    },
    images: [
      { id: "img-41", storage_path: "", src: "/images/products/rajasthan-green-marble.jpg", alt_text: "Rajasthan Forest Green Marble Slab", is_primary: true, display_order: 1 },
      { id: "img-42", storage_path: "", src: "/images/product-gallery/marble-detail-vein.jpg", alt_text: "Detailed Serpentine Green Vein Structure", is_primary: false, display_order: 2 },
    ],
    specifications: [
      { id: "sp-41", specification_name: "Compressive Strength", specification_value: "135 MPa", display_order: 1 },
      { id: "sp-42", specification_name: "Water Absorption", specification_value: "0.18%", display_order: 2 },
    ],
  },
  {
    id: "prod-5",
    seller_id: "seller-4",
    category_id: "cat-4",
    name: "Kota Blue Natural Honed Limestone",
    slug: "kota-blue-limestone",
    sku: "KT-BLU-005",
    description:
      "Extremely compact, fine-grained argillaceous limestone in uniform blue-grey tones. Smooth honed finish, naturally non-porous and cool underfoot, ideal for high-traffic corridors and exterior landscaping.",
    material_type: "Limestone",
    stone_origin: "Kota, Rajasthan",
    colour: "Grey",
    finish: "Honed",
    thickness: 22,
    length: 2200,
    width: 1100,
    minimum_order_quantity: 1500,
    unit: "sq_ft",
    price_type: "fixed",
    price: 85,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 7,
    published_at: "2024-04-08T00:00:00Z",
    category: { id: "cat-4", name: "Limestone", slug: "limestone" },
    seller: {
      id: "seller-4",
      business_name: "Deccan Limestone Processors",
      slug: "deccan-limestone-processors",
      business_type: "Manufacturer",
      city: "Kota",
      state: "Rajasthan",
      country: "India",
      description:
        "Large-capacity production of Kota Blue and Kota Brown natural cleft and mirror-polished limestone tiles for major infrastructure projects.",
      logo_url: "/images/products/kota-blue-limestone.jpg",
      cover_image_url: "/images/suppliers/marble-processing-factory.jpg",
      years_in_business: 15,
      verification_status: "verified",
    },
    images: [
      { id: "img-51", storage_path: "", src: "/images/products/kota-blue-limestone.jpg", alt_text: "Kota Blue Natural Honed Limestone", is_primary: true, display_order: 1 },
      { id: "img-52", storage_path: "", src: "/images/suppliers/seaworthy-crate-packaging.jpg", alt_text: "Export Packaging Lot", is_primary: false, display_order: 2 },
    ],
    specifications: [
      { id: "sp-51", specification_name: "Compressive Strength", specification_value: "185 MPa", display_order: 1 },
      { id: "sp-52", specification_name: "Water Absorption", specification_value: "0.35%", display_order: 2 },
    ],
  },
  {
    id: "prod-6",
    seller_id: "seller-1",
    category_id: "cat-7",
    name: "Classic Vein-Cut Cream Travertine Slabs",
    slug: "classic-travertine-slab",
    sku: "TRV-CRM-006",
    description:
      "Warm honey and walnut linear banded travertine. Carefully cross-cut and vein-cut options with unfilled natural micro-cavities or epoxy resin-filled and honed surfaces.",
    material_type: "Travertine",
    stone_origin: "Rajasthan",
    colour: "Beige",
    finish: "Honed",
    thickness: 18,
    length: 2500,
    width: 1500,
    minimum_order_quantity: 500,
    unit: "sq_ft",
    price_type: "fixed",
    price: 550,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 14,
    published_at: "2024-04-07T00:00:00Z",
    category: { id: "cat-7", name: "Travertine", slug: "travertine" },
    seller: {
      id: "seller-1",
      business_name: "Royal Makrana Marbles",
      slug: "royal-makrana-marbles",
      business_type: "Manufacturer & Exporter",
      city: "Makrana",
      state: "Rajasthan",
      country: "India",
      description:
        "Generations of quarrying and precision gangsaw processing of premium Makrana white marble, Dungri, and Kumari varieties.",
      logo_url: "/images/products/makrana-white-marble.jpg",
      cover_image_url: "/images/hero/stone-quarry-hero.jpg",
      years_in_business: 35,
      verification_status: "verified",
    },
    images: [
      { id: "img-61", storage_path: "", src: "/images/products/classic-travertine-slab.jpg", alt_text: "Classic Vein-Cut Cream Travertine Slabs", is_primary: true, display_order: 1 },
      { id: "img-62", storage_path: "", src: "/images/categories/travertine.jpg", alt_text: "Travertine Texture Close-Up", is_primary: false, display_order: 2 },
    ],
    specifications: [
      { id: "sp-61", specification_name: "Compressive Strength", specification_value: "80 MPa", display_order: 1 },
      { id: "sp-62", specification_name: "Water Absorption", specification_value: "1.2%", display_order: 2 },
    ],
  },
  {
    id: "prod-7",
    seller_id: "seller-3",
    category_id: "cat-3",
    name: "Agra Red Heritage Sandstone Calibrated Slabs",
    slug: "agra-red-sandstone",
    sku: "AGR-RED-007",
    description:
      "Iconic terracotta-red quartz sandstone prized for monumental facades, courtyards, and weatherproof external wall cladding. Machine-calibrated thickness with natural cleft or sandblasted finish.",
    material_type: "Sandstone",
    stone_origin: "Tantpur / Agra Belt, Rajasthan",
    colour: "Red",
    finish: "Sandblasted",
    thickness: 25,
    length: 2400,
    width: 1200,
    minimum_order_quantity: 1500,
    unit: "sq_ft",
    price_type: "fixed",
    price: 125,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 10,
    published_at: "2024-04-06T00:00:00Z",
    category: { id: "cat-3", name: "Sandstone", slug: "sandstone" },
    seller: {
      id: "seller-3",
      business_name: "Thar Sandstone Industries",
      slug: "thar-sandstone-industries",
      business_type: "Quarry Owner & Fabricator",
      city: "Dholpur",
      state: "Rajasthan",
      country: "India",
      description:
        "Direct quarry extraction and computerized CNC carving of Dholpur Beige, Red Sandstone, and intricate architectural jaalis.",
      logo_url: "/images/products/dholpur-beige-sandstone.jpg",
      cover_image_url: "/images/hero/stone-quarry-hero.jpg",
      years_in_business: 18,
      verification_status: "verified",
    },
    images: [
      { id: "img-71", storage_path: "", src: "/images/products/agra-red-sandstone.jpg", alt_text: "Agra Red Heritage Sandstone Slab", is_primary: true, display_order: 1 },
      { id: "img-72", storage_path: "", src: "/images/categories/sandstone.jpg", alt_text: "Calibrated Red Sandstone Grain", is_primary: false, display_order: 2 },
    ],
    specifications: [
      { id: "sp-71", specification_name: "Compressive Strength", specification_value: "110 MPa", display_order: 1 },
      { id: "sp-72", specification_name: "Water Absorption", specification_value: "1.1%", display_order: 2 },
    ],
  },
  {
    id: "prod-8",
    seller_id: "seller-1",
    category_id: "cat-8",
    name: "Backlit Honey Amber Translucent Onyx Slab",
    slug: "honey-onyx-translucent",
    sku: "ONX-HNY-008",
    description:
      "Luxury golden-amber crystalline onyx with dramatic caramel cloud bands. High optical light transmission engineered for backlit reception desks, hospitality feature walls, and bespoke bar counters.",
    material_type: "Onyx",
    stone_origin: "Udaipur Processing Hub, Rajasthan",
    colour: "Yellow",
    finish: "Polished",
    thickness: 18,
    length: 2600,
    width: 1550,
    minimum_order_quantity: 250,
    unit: "sq_ft",
    price_type: "starting",
    price: 1250,
    currency: "INR",
    stock_status: "limited",
    lead_time: 12,
    published_at: "2024-04-05T00:00:00Z",
    category: { id: "cat-8", name: "Onyx", slug: "onyx" },
    seller: {
      id: "seller-1",
      business_name: "Royal Makrana Marbles",
      slug: "royal-makrana-marbles",
      business_type: "Manufacturer & Exporter",
      city: "Makrana",
      state: "Rajasthan",
      country: "India",
      description:
        "Generations of quarrying and precision gangsaw processing of premium Makrana white marble, Dungri, and Kumari varieties.",
      logo_url: "/images/products/makrana-white-marble.jpg",
      cover_image_url: "/images/hero/stone-quarry-hero.jpg",
      years_in_business: 35,
      verification_status: "verified",
    },
    images: [
      { id: "img-81", storage_path: "", src: "/images/products/honey-onyx-translucent.jpg", alt_text: "Backlit Honey Amber Translucent Onyx Slab", is_primary: true, display_order: 1 },
      { id: "img-82", storage_path: "", src: "/images/categories/onyx.jpg", alt_text: "Translucent Onyx Banding Detail", is_primary: false, display_order: 2 },
    ],
    specifications: [
      { id: "sp-81", specification_name: "Light Transmission", specification_value: "High Optical Backlit Grade", display_order: 1 },
      { id: "sp-82", specification_name: "Mesh Backing", specification_value: "Fiberglass Reinforced Clear Resin", display_order: 2 },
    ],
  },
  {
    id: "prod-9",
    seller_id: "seller-2",
    category_id: "cat-5",
    name: "Silver White Crystalline Quartzite Countertop Slab",
    slug: "silver-white-quartzite",
    sku: "QTZ-SLV-009",
    description:
      "Ultra-hard metamorphic natural quartzite combining the refined aesthetic of white Italian marble with Mohs 7 scratch and acid resistance exceeding granite. Ideal for luxury kitchen islands.",
    material_type: "Quartzite",
    stone_origin: "Rajasthan",
    colour: "White",
    finish: "Leathered",
    thickness: 20,
    length: 2950,
    width: 1800,
    minimum_order_quantity: 500,
    unit: "sq_ft",
    price_type: "fixed",
    price: 580,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 10,
    published_at: "2024-04-04T00:00:00Z",
    category: { id: "cat-5", name: "Quartzite", slug: "quartzite" },
    seller: {
      id: "seller-2",
      business_name: "Galaxy Granite Exports",
      slug: "galaxy-granite-exports",
      business_type: "Processor & Exporter",
      city: "Ongole",
      state: "Andhra Pradesh",
      country: "India",
      description:
        "Export-oriented gangsaw unit specializing in Black Galaxy, Steel Grey, and Tan Brown granite slabs and cut-to-size tiles.",
      logo_url: "/images/products/black-galaxy-granite.jpg",
      cover_image_url: "/images/suppliers/granite-processing-factory.jpg",
      years_in_business: 22,
      verification_status: "verified",
    },
    images: [
      { id: "img-91", storage_path: "", src: "/images/products/silver-white-quartzite.jpg", alt_text: "Silver White Crystalline Quartzite Slab", is_primary: true, display_order: 1 },
      { id: "img-92", storage_path: "", src: "/images/categories/quartzite.jpg", alt_text: "Quartzite Crystalline Structure", is_primary: false, display_order: 2 },
    ],
    specifications: [
      { id: "sp-91", specification_name: "Hardness (Mohs)", specification_value: "7.0", display_order: 1 },
      { id: "sp-92", specification_name: "Water Absorption", specification_value: "0.08%", display_order: 2 },
    ],
  },
  {
    id: "prod-10",
    seller_id: "seller-4",
    category_id: "cat-6",
    name: "Kund Charcoal Black Natural Cleft Slate Tiles",
    slug: "kund-black-slate",
    sku: "SLT-KND-010",
    description:
      "Dense, frost-resistant charcoal black slate riven along natural foliation planes and machine-gauged on the underside for rapid architectural roofing, pool decks, and contemporary facade cladding.",
    material_type: "Slate",
    stone_origin: "Kund / Rewari Belt",
    colour: "Black",
    finish: "Natural Cleft",
    thickness: 12,
    length: 600,
    width: 300,
    minimum_order_quantity: 2000,
    unit: "sq_ft",
    price_type: "fixed",
    price: 78,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 7,
    published_at: "2024-04-03T00:00:00Z",
    category: { id: "cat-6", name: "Slate", slug: "slate" },
    seller: {
      id: "seller-4",
      business_name: "Deccan Limestone Processors",
      slug: "deccan-limestone-processors",
      business_type: "Manufacturer",
      city: "Kota",
      state: "Rajasthan",
      country: "India",
      description:
        "Large-capacity production of Kota Blue and Kota Brown natural cleft and mirror-polished limestone tiles for major infrastructure projects.",
      logo_url: "/images/products/kota-blue-limestone.jpg",
      cover_image_url: "/images/suppliers/marble-processing-factory.jpg",
      years_in_business: 15,
      verification_status: "verified",
    },
    images: [
      { id: "img-101", storage_path: "", src: "/images/products/kund-black-slate.jpg", alt_text: "Kund Charcoal Black Natural Cleft Slate", is_primary: true, display_order: 1 },
      { id: "img-102", storage_path: "", src: "/images/categories/slate.jpg", alt_text: "Riven Slate Foliation Detail", is_primary: false, display_order: 2 },
    ],
    specifications: [
      { id: "sp-101", specification_name: "Frost Resistance", specification_value: "EN 12326 Certified Freeze-Thaw Safe", display_order: 1 },
      { id: "sp-102", specification_name: "Water Absorption", specification_value: "0.28%", display_order: 2 },
    ],
  },
  {
    id: "prod-11",
    seller_id: "seller-2",
    category_id: "cat-12",
    name: "Export-Grade Raw Gangsaw Granite Quarry Blocks",
    slug: "raw-quarry-granite-blocks",
    sku: "BLK-GRN-011",
    description:
      "Wire-saw dressed, defect-inspected rectangular gangsaw granite blocks directly from Ongole quarry benches. Ready for container or break-bulk vessel loading for international slab processing plants.",
    material_type: "Granite",
    stone_origin: "Ongole, Andhra Pradesh",
    colour: "Grey",
    finish: "Flamed",
    thickness: 1600,
    length: 2900,
    width: 1750,
    minimum_order_quantity: 27,
    unit: "metric_ton",
    price_type: "on_request",
    price: null,
    currency: "INR",
    stock_status: "in_stock",
    lead_time: 15,
    published_at: "2024-04-02T00:00:00Z",
    category: { id: "cat-12", name: "Stone Blocks", slug: "stone-blocks" },
    seller: {
      id: "seller-2",
      business_name: "Galaxy Granite Exports",
      slug: "galaxy-granite-exports",
      business_type: "Processor & Exporter",
      city: "Ongole",
      state: "Andhra Pradesh",
      country: "India",
      description:
        "Export-oriented gangsaw unit specializing in Black Galaxy, Steel Grey, and Tan Brown granite slabs and cut-to-size tiles.",
      logo_url: "/images/products/black-galaxy-granite.jpg",
      cover_image_url: "/images/suppliers/granite-processing-factory.jpg",
      years_in_business: 22,
      verification_status: "verified",
    },
    images: [
      { id: "img-111", storage_path: "", src: "/images/products/raw-quarry-granite-blocks.jpg", alt_text: "Export-Grade Raw Gangsaw Granite Quarry Blocks", is_primary: true, display_order: 1 },
      { id: "img-112", storage_path: "", src: "/images/categories/stone-blocks.jpg", alt_text: "Dressed Quarry Blocks Yard", is_primary: false, display_order: 2 },
    ],
    specifications: [
      { id: "sp-111", specification_name: "Block Dressing", specification_value: "6-Side Diamond Wire-Saw Squared", display_order: 1 },
      { id: "sp-112", specification_name: "Average Block Weight", specification_value: "22 - 27 Metric Tons", display_order: 2 },
    ],
  },
  {
    id: "prod-12",
    seller_id: "seller-3",
    category_id: "cat-13",
    name: "CNC & Hand-Carved Architectural Sandstone Jaali Panel",
    slug: "hand-carved-sandstone-jaali",
    sku: "JAL-SND-012",
    description:
      "Precision 5-axis CNC routed and master-artisan hand-finished Dholpur sandstone architectural lattice (Jaali) screens for luxury hotels, heritage resorts, and ventilated facade shading.",
    material_type: "Sandstone",
    stone_origin: "Dholpur, Rajasthan",
    colour: "Beige",
    finish: "Honed",
    thickness: 50,
    length: 1800,
    width: 900,
    minimum_order_quantity: 100,
    unit: "sq_ft",
    price_type: "negotiable",
    price: 890,
    currency: "INR",
    stock_status: "made_to_order",
    lead_time: 21,
    published_at: "2024-04-01T00:00:00Z",
    category: { id: "cat-13", name: "Decorative Stone", slug: "decorative-stone" },
    seller: {
      id: "seller-3",
      business_name: "Thar Sandstone Industries",
      slug: "thar-sandstone-industries",
      business_type: "Quarry Owner & Fabricator",
      city: "Dholpur",
      state: "Rajasthan",
      country: "India",
      description:
        "Direct quarry extraction and computerized CNC carving of Dholpur Beige, Red Sandstone, and intricate architectural jaalis.",
      logo_url: "/images/products/dholpur-beige-sandstone.jpg",
      cover_image_url: "/images/hero/stone-quarry-hero.jpg",
      years_in_business: 18,
      verification_status: "verified",
    },
    images: [
      { id: "img-121", storage_path: "", src: "/images/products/hand-carved-sandstone-jaali.jpg", alt_text: "Architectural Carved Sandstone Jaali Panel", is_primary: true, display_order: 1 },
      { id: "img-122", storage_path: "", src: "/images/categories/decorative-stone.jpg", alt_text: "Geometric Sandstone Lattice Detail", is_primary: false, display_order: 2 },
    ],
    specifications: [
      { id: "sp-121", specification_name: "Fabrication Tolerance", specification_value: "± 0.5 mm 5-Axis CNC Precision", display_order: 1 },
      { id: "sp-122", specification_name: "Custom CAD Support", specification_value: "DXF / DWG Custom Pattern Execution", display_order: 2 },
    ],
  },
];

function mapSeedProductSummary(p: ProductDetail): ProductSummary {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    primaryImage: p.images[0]?.src ?? null,
    materialType: p.material_type,
    colour: p.colour,
    finish: p.finish,
    stoneOrigin: p.stone_origin,
    priceType: p.price_type,
    price: p.price,
    currency: p.currency,
    unit: p.unit,
    sellerId: p.seller.id,
    sellerName: p.seller.business_name,
    sellerSlug: p.seller.slug,
    sellerCity: p.seller.city,
    sellerState: p.seller.state,
    isVerifiedSeller: p.seller.verification_status === "verified",
    thickness: p.thickness,
    length: p.length,
    width: p.width,
    minimumOrderQuantity: p.minimum_order_quantity,
    stockStatus: p.stock_status,
    leadTime: p.lead_time,
  };
}

function filterSeedProducts(params: ProductFilterParams = {}): {
  products: ProductSummary[];
  total: number;
  totalPages: number;
  page: number;
} {
  const { page, pageSize, from, to } = parsePagination(
    params.page,
    params.pageSize ?? DEFAULT_PAGE_SIZE,
  );

  let list = SEED_PRODUCTS.slice();

  if (params.category) {
    const slug = params.category.toLowerCase();
    list = list.filter(
      (p) =>
        p.category?.slug === slug ||
        p.material_type?.toLowerCase() === slug ||
        (slug === "natural-stone-slabs" && (p.unit === "sq_ft" || p.name.toLowerCase().includes("slab"))) ||
        (slug === "stone-tiles" && p.name.toLowerCase().includes("tile")) ||
        (slug === "custom-stone-products" && p.stock_status === "made_to_order"),
    );
  }

  if (params.material) {
    const mats = (Array.isArray(params.material) ? params.material : [params.material]).map((m) =>
      m.toLowerCase(),
    );
    list = list.filter((p) => p.material_type && mats.includes(p.material_type.toLowerCase()));
  }

  if (params.colour) {
    const cols = (Array.isArray(params.colour) ? params.colour : [params.colour]).map((c) =>
      c.toLowerCase(),
    );
    list = list.filter((p) => p.colour && cols.includes(p.colour.toLowerCase()));
  }

  if (params.finish) {
    const fins = (Array.isArray(params.finish) ? params.finish : [params.finish]).map((f) =>
      f.toLowerCase(),
    );
    list = list.filter((p) => p.finish && fins.includes(p.finish.toLowerCase()));
  }

  if (params.origin) {
    const origs = (Array.isArray(params.origin) ? params.origin : [params.origin]).map((o) =>
      o.toLowerCase(),
    );
    list = list.filter((p) => p.stone_origin && origs.some((orig) => p.stone_origin!.toLowerCase().includes(orig)));
  }

  if (params.stockStatus) {
    const stats = Array.isArray(params.stockStatus) ? params.stockStatus : [params.stockStatus];
    list = list.filter((p) => p.stock_status && stats.includes(p.stock_status));
  }

  if (params.thickness) {
    const thicks = (Array.isArray(params.thickness) ? params.thickness : [params.thickness])
      .map((t) => Number(t))
      .filter((t) => !isNaN(t));
    list = list.filter((p) => p.thickness !== null && thicks.includes(p.thickness));
  }

  if (params.verified === "true" || params.verified === true) {
    list = list.filter((p) => p.seller.verification_status === "verified");
  }

  if (params.minPrice) {
    const min = Number(params.minPrice);
    if (!Number.isNaN(min)) {
      list = list.filter((p) => p.price !== null && p.price >= min);
    }
  }

  if (params.maxPrice) {
    const max = Number(params.maxPrice);
    if (!Number.isNaN(max)) {
      list = list.filter((p) => p.price !== null && p.price <= max);
    }
  }

  if (params.q?.trim()) {
    const query = params.q.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.material_type?.toLowerCase().includes(query) ||
        p.stone_origin?.toLowerCase().includes(query) ||
        p.colour?.toLowerCase().includes(query) ||
        p.finish?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query),
    );
  }

  if (params.sort === "price_asc") {
    list.sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
  } else if (params.sort === "price_desc") {
    list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
  }

  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const paged = list.slice(from, to + 1).map(mapSeedProductSummary);

  return { products: paged, total, totalPages, page };
}

function filterSeedSellers(params: SellerFilterParams = {}): {
  sellers: PublicSeller[];
  total: number;
  totalPages: number;
  page: number;
} {
  const { page, pageSize, from, to } = parsePagination(
    params.page,
    params.pageSize ?? DEFAULT_PAGE_SIZE,
  );
  let list = SEED_SELLERS.slice();
  if (params.type) {
    const t = params.type.toLowerCase().replace(/_/g, " ");
    list = list.filter((s) => s.businessType.toLowerCase().includes(t));
  }
  if (params.state) {
    list = list.filter((s) => s.state === params.state);
  }
  if (params.verified === true || params.verified === "true") {
    list = list.filter((s) => Boolean(s.verifiedAt));
  }
  if (params.q?.trim()) {
    const q = params.q.toLowerCase().trim();
    list = list.filter(
      (s) =>
        s.businessName.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.state?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const paged: PublicSeller[] = list.slice(from, to + 1).map((s) => {
    const sellerProds = SEED_PRODUCTS.filter((p) => p.seller_id === s.id);
    const materials = Array.from(
      new Set(sellerProds.map((p) => p.material_type).filter((m): m is string => Boolean(m))),
    );
    return {
      ...s,
      country: s.country || "India",
      productCount: sellerProds.length,
      materialCapabilities: materials,
      isVerified: Boolean(s.verifiedAt),
    };
  });
  return { sellers: paged, total, totalPages, page };
}

export interface ProductFilterParams {
  q?: string;
  category?: string;
  material?: string | string[];
  colour?: string | string[];
  finish?: string | string[];
  origin?: string | string[];
  thickness?: string | string[];
  stockStatus?: string | string[];
  minPrice?: string;
  maxPrice?: string;
  verified?: boolean | string;
  sort?: string;
  page?: number | string;
  pageSize?: number;
}

interface PublicSellerRow {
  id: string;
  business_name: string;
  slug: string;
  business_type: string;
  city: string | null;
  state: string | null;
  country: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  years_in_business: number | null;
  verified_at: string | null;
}

export async function getProducts(params: ProductFilterParams = {}): Promise<{
  products: ProductSummary[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const { page, pageSize, from, to } = parsePagination(params.page, params.pageSize ?? DEFAULT_PAGE_SIZE);

  if (!isSupabaseConfigured()) {
    return filterSeedProducts(params);
  }

  try {
    const supabase = await getSupabaseServerClient();

    const hasFilters = Boolean(
      params.q?.trim() ||
        params.category ||
        (Array.isArray(params.material) ? params.material.length > 0 : params.material) ||
        (Array.isArray(params.colour) ? params.colour.length > 0 : params.colour) ||
        (Array.isArray(params.finish) ? params.finish.length > 0 : params.finish) ||
        params.minPrice ||
        params.maxPrice,
    );

    let categoryId: string | null = null;
    if (params.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", params.category)
        .maybeSingle();
      if (cat) {
        categoryId = cat.id;
      }
    }

    // Note: Do NOT join `seller_profiles!inner(...)` here because `public.seller_profiles`
    // is owner/admin-only under RLS (`anon` has no SELECT grant on `seller_profiles`).
    // `products_select_public` RLS already guarantees `moderation_status = 'approved'`
    // AND `public.is_seller_verified(seller_id)`, and public seller metadata lives in
    // `public.public_seller_profiles`.
    let query = supabase
      .from("products")
      .select(
        `
        id, seller_id, category_id, name, slug, description, material_type,
        stone_origin, colour, finish, thickness, length, width, minimum_order_quantity, unit,
        price_type, price, currency, stock_status, published_at,
        product_images(id, storage_path, alt_text, is_primary)
        `,
        { count: "exact" },
      )
      .eq("moderation_status", "approved")
      .not("published_at", "is", null)
      .not("slug", "ilike", "test-%")
      .not("slug", "ilike", "%-test")
      .not("slug", "ilike", "%-test-%")
      .not("name", "ilike", "[TEST]%");

    // Allow public visibility of live approved records (including synthetic test products marked with QA disclosures)
    if (params.q?.trim()) {
      query = query.textSearch("search_vector", params.q.trim(), {
        type: "plain",
        config: "simple",
      });
    }

    if (params.category) {
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      } else {
        // Category slug hasn't been seeded into live DB yet — check if DB has any approved products at all
        const { count: liveTotal } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("moderation_status", "approved")
          .not("slug", "ilike", "test-%")
          .not("name", "ilike", "[TEST]%");
        if (!liveTotal || liveTotal === 0) {
          return filterSeedProducts(params);
        }
        return { products: [], total: 0, totalPages: 0, page };
      }
    }

    const materials = Array.isArray(params.material)
      ? params.material
      : params.material
        ? [params.material]
        : [];
    if (materials.length > 0) {
      query = query.in("material_type", materials);
    }

    const colours = Array.isArray(params.colour)
      ? params.colour
      : params.colour
        ? [params.colour]
        : [];
    if (colours.length > 0) {
      query = query.in("colour", colours);
    }

    const finishes = Array.isArray(params.finish)
      ? params.finish
      : params.finish
        ? [params.finish]
        : [];
    if (finishes.length > 0) {
      query = query.in("finish", finishes);
    }

    const origins = Array.isArray(params.origin)
      ? params.origin
      : params.origin
        ? [params.origin]
        : [];
    if (origins.length > 0) {
      // stone_origin contains strings like "Makrana, Rajasthan", "Ongole, Andhra Pradesh"
      // using ilike or in
      query = query.in("stone_origin", origins);
    }

    const stockStatuses = Array.isArray(params.stockStatus)
      ? params.stockStatus
      : params.stockStatus
        ? [params.stockStatus]
        : [];
    if (stockStatuses.length > 0) {
      query = query.in(
        "stock_status",
        stockStatuses as ("out_of_stock" | "in_stock" | "limited" | "made_to_order")[],
      );
    }

    const thicknesses = Array.isArray(params.thickness)
      ? params.thickness
      : params.thickness
        ? [params.thickness]
        : [];
    if (thicknesses.length > 0) {
      const validThicks = thicknesses.map((t) => Number(t)).filter((t) => !isNaN(t));
      if (validThicks.length > 0) {
        query = query.in("thickness", validThicks);
      }
    }

    if (params.minPrice) {
      const min = Number(params.minPrice);
      if (!isNaN(min)) query = query.gte("price", min);
    }

    if (params.maxPrice) {
      const max = Number(params.maxPrice);
      if (!isNaN(max)) query = query.lte("price", max);
    }

    if (params.sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (params.sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("published_at", { ascending: false });
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      return filterSeedProducts(params);
    }

    const total = count ?? 0;

    // If the live Supabase database has zero approved public products yet,
    // gracefully display the curated stone showcase catalog (consistent with getActiveCategories).
    if (total === 0) {
      if (!hasFilters) {
        return filterSeedProducts(params);
      }
      const { count: liveCatalogTotal } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("moderation_status", "approved")
        .not("slug", "ilike", "test-%")
        .not("name", "ilike", "[TEST]%");
      if (!liveCatalogTotal || liveCatalogTotal === 0) {
        return filterSeedProducts(params);
      }
      return { products: [], total: 0, totalPages: 0, page };
    }

    const rawRows = (data ?? []) as unknown as Array<{
      id: string;
      seller_id: string;
      category_id: string | null;
      name: string;
      slug: string;
      description: string | null;
      material_type: string | null;
      stone_origin: string | null;
      colour: string | null;
      finish: string | null;
      thickness: number | null;
      length: number | null;
      width: number | null;
      minimum_order_quantity: number | null;
      unit: string;
      price_type: "fixed" | "starting" | "on_request" | "negotiable" | "range";
      price: number | null;
      currency: string;
      stock_status: string;
      published_at: string | null;
      product_images?: Array<{
        id: string;
        storage_path: string;
        alt_text: string | null;
        is_primary: boolean;
      }>;
    }>;

    const sellerIds = Array.from(new Set(rawRows.map((r) => r.seller_id)));
    const sellerMap = new Map<string, PublicSellerRow>();

    if (sellerIds.length > 0) {
      const { data: sellerRows } = await supabase
        .from("public_seller_profiles")
        .select("*")
        .in("id", sellerIds);

      for (const s of (sellerRows ?? []) as unknown as PublicSellerRow[]) {
        sellerMap.set(s.id, s);
      }
    }

    const products: ProductSummary[] = rawRows
      .filter((r) => sellerMap.has(r.seller_id))
      .map((r) => {
        const seller = sellerMap.get(r.seller_id)!;
        const primaryImg =
          r.product_images?.find((img) => img.is_primary) ?? r.product_images?.[0];
        return {
          id: r.id,
          slug: r.slug,
          name: r.name,
          primaryImage: resolveStorageUrl(primaryImg?.storage_path, "product-images"),
          materialType: r.material_type,
          colour: r.colour,
          finish: r.finish,
          stoneOrigin: r.stone_origin,
          priceType: r.price_type,
          price: r.price,
          currency: r.currency ?? "INR",
          unit: r.unit ?? "sq_ft",
          sellerId: seller.id,
          sellerName: seller.business_name,
          sellerSlug: seller.slug,
          sellerCity: seller.city,
          sellerState: seller.state,
          isVerifiedSeller: Boolean(seller.verified_at),
          thickness: r.thickness,
          length: r.length,
          width: r.width,
          minimumOrderQuantity: r.minimum_order_quantity,
          stockStatus: r.stock_status,
        };
      });

    const totalPages = Math.ceil(total / pageSize);

    return { products, total, totalPages, page };
  } catch {
    return filterSeedProducts(params);
  }
}

export interface ProductDetail {
  id: string;
  seller_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  material_type: string | null;
  stone_origin: string | null;
  colour: string | null;
  finish: string | null;
  thickness: number | null;
  length: number | null;
  width: number | null;
  minimum_order_quantity: number | null;
  unit: string;
  price_type: "fixed" | "starting" | "on_request" | "negotiable" | "range";
  price: number | null;
  currency: string;
  stock_status: string;
  lead_time: number | null;
  published_at: string | null;
  category: { id: string; name: string; slug: string } | null;
  seller: {
    id: string;
    business_name: string;
    slug: string;
    business_type: string;
    city: string | null;
    state: string | null;
    country: string;
    description: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    years_in_business: number | null;
    verification_status: string;
  };
  images: Array<{
    id: string;
    storage_path: string;
    src: string;
    alt_text: string | null;
    is_primary: boolean;
    display_order: number;
  }>;
  specifications: Array<{
    id: string;
    specification_name: string;
    specification_value: string;
    display_order: number;
  }>;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  if (!isSupabaseConfigured()) {
    return SEED_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id, seller_id, category_id, name, slug, sku, description, material_type,
        stone_origin, colour, finish, thickness, length, width,
        minimum_order_quantity, unit, price_type, price, currency,
        stock_status, lead_time, moderation_status, published_at,
        categories(id, name, slug),
        product_images(id, storage_path, alt_text, is_primary, display_order),
        product_specifications(id, specification_name, specification_value, display_order)
        `,
      )
      .eq("slug", slug)
      .eq("moderation_status", "approved")
      .not("published_at", "is", null)
      .maybeSingle();

    if (error || !data) {
      return SEED_PRODUCTS.find((p) => p.slug === slug) ?? null;
    }

    const r = data as unknown as {
      id: string;
      seller_id: string;
      category_id: string | null;
      name: string;
      slug: string;
      sku: string | null;
      description: string | null;
      material_type: string | null;
      stone_origin: string | null;
      colour: string | null;
      finish: string | null;
      thickness: number | null;
      length: number | null;
      width: number | null;
      minimum_order_quantity: number | null;
      unit: string;
      price_type: "fixed" | "starting" | "on_request" | "negotiable" | "range";
      price: number | null;
      currency: string;
      stock_status: string;
      lead_time: number | null;
      published_at: string | null;
      categories: { id: string; name: string; slug: string } | null;
      product_images?: Array<{
        id: string;
        storage_path: string;
        alt_text: string | null;
        is_primary: boolean;
        display_order: number;
      }>;
      product_specifications?: Array<{
        id: string;
        specification_name: string;
        specification_value: string;
        display_order: number;
      }>;
    };

    const { data: sellerData } = await supabase
      .from("public_seller_profiles")
      .select("*")
      .eq("id", r.seller_id)
      .maybeSingle();

    if (!sellerData) {
      return SEED_PRODUCTS.find((p) => p.slug === slug) ?? null;
    }

    const seller = sellerData as unknown as PublicSellerRow;

    const images = (r.product_images ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((img) => ({
        ...img,
        src: resolveStorageUrl(img.storage_path, "product-images") ?? "",
      }));

    const specs = (r.product_specifications ?? []).sort(
      (a, b) => a.display_order - b.display_order,
    );

    return {
      id: r.id,
      seller_id: r.seller_id,
      category_id: r.category_id,
      name: r.name,
      slug: r.slug,
      sku: r.sku,
      description: r.description,
      material_type: r.material_type,
      stone_origin: r.stone_origin,
      colour: r.colour,
      finish: r.finish,
      thickness: r.thickness,
      length: r.length,
      width: r.width,
      minimum_order_quantity: r.minimum_order_quantity,
      unit: r.unit,
      price_type: r.price_type,
      price: r.price,
      currency: r.currency,
      stock_status: r.stock_status,
      lead_time: r.lead_time,
      published_at: r.published_at,
      category: r.categories,
      seller: {
        id: seller.id,
        business_name: seller.business_name,
        slug: seller.slug,
        business_type: seller.business_type,
        city: seller.city,
        state: seller.state,
        country: seller.country,
        description: cleanPublicDescription(seller.description),
        logo_url: resolveStorageUrl(seller.logo_url, "seller-logos"),
        cover_image_url: resolveStorageUrl(seller.cover_image_url, "seller-cover-images"),
        years_in_business: seller.years_in_business,
        verification_status: "verified",
      },
      images,
      specifications: specs,
    };
  } catch {
    return SEED_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }
}

export async function getFeaturedProducts(limit = 6): Promise<ProductSummary[]> {
  const { products } = await getProducts({ pageSize: limit, page: 1 });
  return products;
}

export async function getRelatedProducts(
  categoryId: string | null | undefined,
  excludeId: string,
  limit = 4,
  criteria?: {
    materialType?: string | null;
    finish?: string | null;
    stoneOrigin?: string | null;
  },
): Promise<ProductSummary[]> {
  const seedFallback = () => {
    const scored = SEED_PRODUCTS.filter((p) => p.id !== excludeId).map((p) => {
      let score = 0;
      if (criteria?.materialType && p.material_type?.toLowerCase() === criteria.materialType.toLowerCase()) {
        score += 4;
      }
      if (categoryId && p.category_id === categoryId) {
        score += 3;
      }
      if (criteria?.finish && p.finish?.toLowerCase() === criteria.finish.toLowerCase()) {
        score += 2;
      }
      if (criteria?.stoneOrigin && p.stone_origin && criteria.stoneOrigin.toLowerCase().includes(p.stone_origin.toLowerCase())) {
        score += 1;
      }
      return { product: p, score };
    });

    // Sort by relevance score descending; if tied, preserve natural catalogue order
    scored.sort((a, b) => b.score - a.score);

    return scored
      .slice(0, limit)
      .map((item) => mapSeedProductSummary(item.product));
  };

  if (!isSupabaseConfigured() || excludeId.startsWith("prod-")) {
    return seedFallback();
  }

  try {
    const supabase = await getSupabaseServerClient();
    let query = supabase
      .from("products")
      .select(
        `
        id, seller_id, category_id, name, slug, material_type, stone_origin,
        colour, finish, thickness, length, width, minimum_order_quantity,
        stock_status, lead_time, unit, price_type, price, currency,
        product_images(id, storage_path, alt_text, is_primary)
        `,
      )
      .neq("id", excludeId)
      .eq("moderation_status", "approved")
      .not("published_at", "is", null)
      .not("slug", "ilike", "test-%")
      .not("name", "ilike", "[TEST]%");

    if (criteria?.materialType) {
      query = query.eq("material_type", criteria.materialType);
    } else if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return seedFallback();
    }

    const rawRows = data as unknown as Array<{
      id: string;
      seller_id: string;
      category_id: string | null;
      name: string;
      slug: string;
      material_type: string | null;
      stone_origin: string | null;
      colour: string | null;
      finish: string | null;
      thickness: number | null;
      length: number | null;
      width: number | null;
      minimum_order_quantity: number | null;
      stock_status: string | null;
      lead_time: number | null;
      unit: string;
      price_type: "fixed" | "starting" | "on_request" | "negotiable" | "range";
      price: number | null;
      currency: string;
      product_images?: Array<{
        id: string;
        storage_path: string;
        alt_text: string | null;
        is_primary: boolean;
      }>;
    }>;

    const sellerIds = Array.from(new Set(rawRows.map((r) => r.seller_id)));
    const { data: sellerRows } = await supabase
      .from("public_seller_profiles")
      .select("*")
      .in("id", sellerIds);

    const sellerMap = new Map<string, PublicSellerRow>();
    for (const s of (sellerRows ?? []) as unknown as PublicSellerRow[]) {
      sellerMap.set(s.id, s);
    }

    return rawRows
      .filter((r) => sellerMap.has(r.seller_id))
      .map((r) => {
        const seller = sellerMap.get(r.seller_id)!;
        const primaryImg =
          r.product_images?.find((img) => img.is_primary) ?? r.product_images?.[0];
        return {
          id: r.id,
          slug: r.slug,
          name: r.name,
          primaryImage: resolveStorageUrl(primaryImg?.storage_path, "product-images"),
          materialType: r.material_type,
          colour: r.colour,
          finish: r.finish,
          stoneOrigin: r.stone_origin,
          priceType: r.price_type,
          price: r.price,
          currency: r.currency ?? "INR",
          unit: r.unit ?? "sq_ft",
          sellerId: seller.id,
          sellerName: seller.business_name,
          sellerSlug: seller.slug,
          sellerCity: seller.city,
          sellerState: seller.state,
          isVerifiedSeller: Boolean(seller.verified_at),
          thickness: r.thickness,
          length: r.length,
          width: r.width,
          minimumOrderQuantity: r.minimum_order_quantity,
          stockStatus: r.stock_status,
          leadTime: r.lead_time,
        };
      });
  } catch {
    return seedFallback();
  }
}

export async function getProductsBySellerId(
  sellerId: string,
  limit = 12,
): Promise<ProductSummary[]> {
  if (!isSupabaseConfigured() || sellerId.startsWith("seller-")) {
    return SEED_PRODUCTS.filter((p) => p.seller_id === sellerId || p.seller.id === sellerId)
      .slice(0, limit)
      .map(mapSeedProductSummary);
  }

  try {
    const supabase = await getSupabaseServerClient();
    const [productsRes, sellerRes] = await Promise.all([
      supabase
        .from("products")
        .select(
          `
          id, seller_id, category_id, name, slug, material_type, stone_origin,
          colour, finish, unit, price_type, price, currency,
          product_images(id, storage_path, alt_text, is_primary)
          `,
        )
        .eq("seller_id", sellerId)
        .eq("moderation_status", "approved")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(limit),
      supabase
        .from("public_seller_profiles")
        .select("*")
        .eq("id", sellerId)
        .maybeSingle(),
    ]);

    if (productsRes.error || !sellerRes.data) {
      return [];
    }

    const seller = sellerRes.data as unknown as PublicSellerRow;
    const rawRows = (productsRes.data ?? []) as unknown as Array<{
      id: string;
      seller_id: string;
      category_id: string | null;
      name: string;
      slug: string;
      material_type: string | null;
      stone_origin: string | null;
      colour: string | null;
      finish: string | null;
      unit: string;
      price_type: "fixed" | "starting" | "on_request" | "negotiable" | "range";
      price: number | null;
      currency: string;
      product_images?: Array<{
        id: string;
        storage_path: string;
        alt_text: string | null;
        is_primary: boolean;
      }>;
    }>;

    return rawRows.map((r) => {
      const primaryImg =
        r.product_images?.find((img) => img.is_primary) ?? r.product_images?.[0];
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        primaryImage: resolveStorageUrl(primaryImg?.storage_path, "product-images"),
        materialType: r.material_type,
        colour: r.colour,
        finish: r.finish,
        stoneOrigin: r.stone_origin,
        priceType: r.price_type,
        price: r.price,
        currency: r.currency ?? "INR",
        unit: r.unit ?? "sq_ft",
        sellerId: seller.id,
        sellerName: seller.business_name,
        sellerSlug: seller.slug,
        sellerCity: seller.city,
        sellerState: seller.state,
        isVerifiedSeller: Boolean(seller.verified_at),
      };
    });
  } catch {
    return [];
  }
}

// ─── Sellers ──────────────────────────────────────────────────────────────────

export interface PublicSeller {
  id: string;
  businessName: string;
  slug: string;
  businessType: string;
  city: string | null;
  state: string | null;
  country: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  yearsInBusiness: number | null;
  verifiedAt: string | null;
  productCount?: number;
  materialCapabilities?: string[];
  isVerified?: boolean;
}

export interface SellerFilterParams {
  q?: string;
  type?: string;
  state?: string;
  verified?: boolean | string;
  page?: number | string;
  pageSize?: number;
  fallback?: boolean;
}

export async function getPublicSellers(params: SellerFilterParams = {}): Promise<{
  sellers: PublicSeller[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const { page, pageSize, from, to } = parsePagination(params.page, params.pageSize ?? DEFAULT_PAGE_SIZE);

  if (!isSupabaseConfigured()) {
    if (params.fallback === false) {
      return { sellers: [], total: 0, totalPages: 0, page };
    }
    return filterSeedSellers(params);
  }

  try {
    const supabase = await getSupabaseServerClient();

    let query = supabase
      .from("public_seller_profiles")
      .select("*", { count: "exact" });

    try {
      if (typeof (query as unknown as { not?: unknown }).not === "function") {
        query = query
          .not("slug", "ilike", "test-%")
          .not("slug", "ilike", "%-test")
          .not("slug", "ilike", "%-test-%")
          .not("business_name", "ilike", "%[TEST]%");
      }
    } catch {
      // Mock resilience
    }

    if (params.q?.trim()) {
      const cleanQ = params.q.trim().replace(/[%_,]/g, " ");
      if (cleanQ.length > 0) {
        query = query.or(
          `business_name.ilike.%${cleanQ}%,city.ilike.%${cleanQ}%,state.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%`,
        );
      }
    }

    if (params.type) {
      if (params.type === "quarry_owner") {
        query = query.in("business_type", ["mine_owner", "quarry_owner"]);
      } else if (params.type === "processor") {
        query = query.in("business_type", ["manufacturer", "stone_supplier", "processor"]);
      } else {
        query = query.eq("business_type", params.type);
      }
    }

    if (params.state) {
      query = query.eq("state", params.state);
    }

    if (params.verified === true || params.verified === "true") {
      query = query.not("verified_at", "is", null);
    }

    const { data, count, error } = await query
      .order("business_name", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("[getPublicSellers] Database query error:", error);
      if (params.fallback === false) {
        return { sellers: [], total: 0, totalPages: 0, page };
      }
      return filterSeedSellers(params);
    }

    const total = count ?? 0;
    if (total === 0) {
      if (params.fallback === false) {
        return { sellers: [], total: 0, totalPages: 0, page };
      }
      const hasFilters = Boolean(params.q?.trim() || params.type || params.state || params.verified);
      if (!hasFilters) {
        return filterSeedSellers(params);
      }
      return { sellers: [], total: 0, totalPages: 0, page };
    }

    const rows = (data ?? []) as unknown as PublicSellerRow[];
    const sellerIds = rows.map((r) => r.id);

    // Single batch query for product counts & material capabilities for these sellers
    const countsBySeller: Record<string, number> = {};
    const materialsBySeller: Record<string, Set<string>> = {};

    if (sellerIds.length > 0) {
      try {
        let prodQuery = supabase
          .from("products")
          .select("seller_id, material_type")
          .in("seller_id", sellerIds)
          .eq("moderation_status", "approved")
          .not("published_at", "is", null);

        try {
          if (typeof prodQuery.not === "function") {
            prodQuery = prodQuery.not("slug", "ilike", "test-%");
          }
        } catch {
          // Mock resilience
        }

        const { data: prodRows } = await prodQuery;

        for (const p of prodRows ?? []) {
          if (p.seller_id) {
            countsBySeller[p.seller_id] = (countsBySeller[p.seller_id] || 0) + 1;
            if (p.material_type) {
              const set = materialsBySeller[p.seller_id] ?? new Set();
              set.add(p.material_type);
              materialsBySeller[p.seller_id] = set;
            }
          }
        }
      } catch (err) {
        console.error("[getPublicSellers] Error fetching seller products summary:", err);
      }
    }

    const sellers: PublicSeller[] = rows.map((s) => ({
      id: s.id,
      businessName: s.business_name,
      slug: s.slug,
      businessType: s.business_type,
      city: s.city,
      state: s.state,
      country: s.country,
      description: cleanPublicDescription(s.description),
      logoUrl: resolveStorageUrl(s.logo_url, "seller-logos"),
      coverImageUrl: resolveStorageUrl(s.cover_image_url, "seller-cover-images"),
      yearsInBusiness: s.years_in_business,
      verifiedAt: s.verified_at,
      productCount: countsBySeller[s.id] ?? 0,
      materialCapabilities: Array.from(materialsBySeller[s.id] ?? []),
      isVerified: Boolean(s.verified_at),
    }));

    const totalPages = Math.ceil(total / pageSize);

    return { sellers, total, totalPages, page };
  } catch {
    if (params.fallback === false) {
      return { sellers: [], total: 0, totalPages: 0, page };
    }
    return filterSeedSellers(params);
  }
}

export async function getFeaturedSellers(limit = 4): Promise<PublicSeller[]> {
  const { sellers } = await getPublicSellers({ pageSize: limit, page: 1 });
  return sellers;
}

export async function getSellerBySlug(slug: string): Promise<PublicSeller | null> {
  const seedMatch = () => {
    const s = SEED_SELLERS.find((seller) => seller.slug === slug);
    return s ? { ...s, country: s.country || "India" } : null;
  };

  if (!isSupabaseConfigured()) {
    return seedMatch();
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("public_seller_profiles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return seedMatch();
    }

    const s = data as unknown as PublicSellerRow;

    return {
      id: s.id,
      businessName: s.business_name,
      slug: s.slug,
      businessType: s.business_type,
      city: s.city,
      state: s.state,
      country: s.country,
      description: cleanPublicDescription(s.description),
      logoUrl: resolveStorageUrl(s.logo_url, "seller-logos"),
      coverImageUrl: resolveStorageUrl(s.cover_image_url, "seller-cover-images"),
      yearsInBusiness: s.years_in_business,
      verifiedAt: s.verified_at,
    };
  } catch {
    return seedMatch();
  }
}
