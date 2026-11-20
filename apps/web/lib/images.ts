/**
 * Central Image Asset Configuration for StonesDekho Marketplace
 *
 * Provides typed mappings and fallback logic for all stone imagery:
 * - Hero & backgrounds
 * - Stone categories
 * - Product cards & detail galleries
 * - Supplier covers & logos
 */

// ─── Hero & Backgrounds ───────────────────────────────────────────────────────

export const HERO_IMAGES = {
  quarry: "/images/hero/stone-quarry-hero.jpg",
  showroom: "/images/hero/luxurious-symmetrical-marble-showroom.webp",
  showroomJpg: "/images/hero/luxurious-symmetrical-marble-showroom.jpg",
  showroomPng: "/images/hero/luxurious-symmetrical-marble-showroom.png",
  showroomMobile: "/images/hero/luxurious-symmetrical-marble-gallery.webp",
  showroomMobileJpg: "/images/hero/luxurious-symmetrical-marble-gallery.jpg",
  showroomMobilePng: "/images/hero/luxurious-symmetrical-marble-gallery.png",
  symmetricalShowroom: "/images/hero/luxurious-symmetrical-marble-showroom.jpg",
  symmetricalGallery: "/images/hero/luxurious-symmetrical-marble-gallery.jpg",
  factory: "/images/hero/stone-factory-hero.jpg",
  texture: "/images/backgrounds/stone-texture.jpg",
  procurement: "/images/backgrounds/stone-showroom-cta-desktop.jpg",
  procurementMobile: "/images/backgrounds/stone-showroom-cta-mobile.jpg",
} as const;

// ─── Categories ──────────────────────────────────────────────────────────────

export const CATEGORY_IMAGES: Record<string, string> = {
  // Main Categories
  sandstone: "/images/categories/sandstone.jpg",
  marble: "/images/categories/marble.jpg",
  granite: "/images/categories/granite.jpg",
  onyx: "/images/categories/onyx.jpg",
  "semi-precious-stone": "/images/categories/semi-precious-stones.jpg",
  "semi-precious-stones": "/images/categories/semi-precious-stones.jpg",
  travertine: "/images/categories/travertine.jpg",
  slate: "/images/categories/slate.jpg",
  "slate-stone": "/images/categories/slate.jpg",
  limestone: "/images/categories/limestone.jpg",
  pebbles: "/images/categories/decorative-stone.jpg",
  quartzite: "/images/categories/quartzite.jpg",
  "natural-stone-slabs": "/images/categories/natural-stone-slabs.jpg",
  "stone-tiles": "/images/categories/stone-tiles.jpg",
  "stone-blocks": "/images/categories/stone-blocks.jpg",
  "decorative-stone": "/images/categories/decorative-stone.jpg",
  "custom-stone-products": "/images/categories/custom-stone-products.jpg",

  // Sandstone Subcategories
  "agra-red": "/images/products/agra-red-sandstone.jpg",
  "dholpur-beige": "/images/products/dholpur-beige-sandstone.jpg",
  "dholpur-pink": "/images/categories/sandstone.jpg",
  chocolate: "/images/categories/sandstone-macro.jpg",
  "bansi-pink": "/images/categories/sandstone.jpg",
  mint: "/images/categories/sandstone-macro.jpg",
  "mint-fossil": "/images/categories/sandstone.jpg",
  "lalitpur-yellow": "/images/categories/sandstone-macro.jpg",
  "lalitpur-grey": "/images/categories/sandstone.jpg",
  "sagar-black": "/images/products/kund-black-slate.jpg",
  "kandla-grey": "/images/categories/sandstone.jpg",
  "autumn-brown": "/images/categories/sandstone-macro.jpg",
  "raj-green": "/images/products/rajasthan-green-marble.jpg",
  "slate-grey": "/images/categories/slate.jpg",
  teak: "/images/categories/sandstone.jpg",
  rainbow: "/images/categories/sandstone-macro.jpg",
  "jodhpur-pink": "/images/categories/sandstone.jpg",
  "jaisalmer-yellow": "/images/products/dholpur-beige-sandstone.jpg",

  // Marble Subcategories
  "indian-white-marble": "/images/products/makrana-white-marble.jpg",
  "indian-colored-marble": "/images/products/rajasthan-green-marble.jpg",
  "imported-marble": "/images/categories/marble.jpg",

  // Granite Subcategories
  "north-india-granite": "/images/categories/granite-macro.jpg",
  "south-india-granite": "/images/products/black-galaxy-granite.jpg",
  "imported-granite": "/images/categories/granite.jpg",

  // Onyx Subcategories
  "indian-onyx": "/images/products/honey-onyx-translucent.jpg",
  "imported-onyx": "/images/categories/onyx.jpg",

  // Semi Precious Stone Subcategories
  agate: "/images/categories/semi-precious-stones.jpg",
  carnelian: "/images/categories/semi-precious-stones.jpg",
  jasper: "/images/categories/semi-precious-stones.jpg",
  "lapis-lazuli": "/images/categories/semi-precious-stones.jpg",
  quartz: "/images/products/silver-white-quartzite.jpg",
  amethyst: "/images/categories/semi-precious-stones.jpg",
  "petrified-wood": "/images/categories/semi-precious-stones.jpg",
  pyrite: "/images/categories/semi-precious-stones.jpg",

  // Travertine Subcategories
  "classic-cream-travertine": "/images/products/classic-travertine-slab.jpg",
  "walnut-travertine": "/images/categories/travertine.jpg",
  "silver-travertine": "/images/categories/travertine.jpg",
  "imported-travertine": "/images/products/classic-travertine-slab.jpg",

  // Slate Subcategories
  "kund-black-slate": "/images/products/kund-black-slate.jpg",
  "peacock-slate": "/images/categories/slate-macro.jpg",
  "copper-slate": "/images/categories/slate.jpg",
  "multi-slate": "/images/categories/slate-macro.jpg",
  "silver-shine-slate": "/images/categories/slate.jpg",

  // Limestone Subcategories
  "kota-blue": "/images/products/kota-blue-limestone.jpg",
  "kota-brown": "/images/categories/limestone.jpg",
  "jaisalmer-yellow-limestone": "/images/categories/limestone-macro.jpg",
  "tandur-yellow": "/images/categories/limestone.jpg",
  "tandur-blue": "/images/products/kota-blue-limestone.jpg",
  "kadapa-black": "/images/categories/limestone-macro.jpg",

  // Pebbles Subcategories
  "river-pebbles": "/images/categories/decorative-stone.jpg",
  "white-pebbles": "/images/categories/decorative-stone.jpg",
  "black-pebbles": "/images/categories/decorative-stone.jpg",
  "coloured-pebbles": "/images/categories/decorative-stone.jpg",
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const PRODUCT_IMAGES: Record<string, string> = {
  "makrana-white-marble": "/images/products/makrana-white-marble.jpg",
  "black-galaxy-granite": "/images/products/black-galaxy-granite.jpg",
  "dholpur-beige-sandstone": "/images/products/dholpur-beige-sandstone.jpg",
  "rajasthan-green-marble": "/images/products/rajasthan-green-marble.jpg",
  "kota-blue-limestone": "/images/products/kota-blue-limestone.jpg",
  "agra-red-sandstone": "/images/products/agra-red-sandstone.jpg",
  "classic-travertine-slab": "/images/products/classic-travertine-slab.jpg",
  "honey-onyx-translucent": "/images/products/honey-onyx-translucent.jpg",
  "silver-white-quartzite": "/images/products/silver-white-quartzite.jpg",
  "kund-black-slate": "/images/products/kund-black-slate.jpg",
  "raw-quarry-granite-blocks": "/images/products/raw-quarry-granite-blocks.jpg",
  "hand-carved-sandstone-jaali": "/images/products/hand-carved-sandstone-jaali.jpg",
};

// ─── Material Gallerie Mappings ──────────────────────────────────────────────

export const MATERIAL_GALLERIES: Record<
  string,
  Array<{ src: string; altText: string }>
> = {
  marble: [
    { src: "/images/products/makrana-white-marble.jpg", altText: "Full Gangsaw Marble Slab" },
    { src: "/images/product-gallery/marble-detail-vein.jpg", altText: "Macro Crystalline Veining Detail" },
    { src: "/images/product-gallery/marble-install-living.jpg", altText: "Architectural Interior Slab Flooring" },
    { src: "/images/categories/natural-stone-slabs.jpg", altText: "Warehouse Slab Bundles" },
  ],
  granite: [
    { src: "/images/products/black-galaxy-granite.jpg", altText: "Black Galaxy Mirror Polished Slab" },
    { src: "/images/categories/granite.jpg", altText: "Mineral Crystal Composition Macro" },
    { src: "/images/suppliers/granite-processing-factory.jpg", altText: "Multi-wire Gangsaw Cutting" },
    { src: "/images/categories/stone-blocks.jpg", altText: "Quarry Granite Blocks" },
  ],
  sandstone: [
    { src: "/images/products/dholpur-beige-sandstone.jpg", altText: "Dholpur Beige Natural Cleft Slab" },
    { src: "/images/products/agra-red-sandstone.jpg", altText: "Agra Red Sandstone Texture" },
    { src: "/images/categories/decorative-stone.jpg", altText: "Architectural Carved Jali" },
    { src: "/images/hero/stone-quarry-hero.jpg", altText: "Sandstone Quarry Origin" },
  ],
  limestone: [
    { src: "/images/products/kota-blue-limestone.jpg", altText: "Kota Blue Honed Limestone Slab" },
    { src: "/images/categories/limestone.jpg", altText: "Matte Natural Surface Detail" },
    { src: "/images/suppliers/seaworthy-crate-packaging.jpg", altText: "Seaworthy Export Packing" },
  ],
  quartzite: [
    { src: "/images/categories/quartzite.jpg", altText: "Silver White Quartzite Crystalline Slab" },
    { src: "/images/categories/natural-stone-slabs.jpg", altText: "Slab Showroom Display" },
  ],
  slate: [
    { src: "/images/categories/slate.jpg", altText: "Kund Black Natural Cleft Slate Slab" },
    { src: "/images/categories/stone-tiles.jpg", altText: "Natural Slate Tiles" },
  ],
  travertine: [
    { src: "/images/products/classic-travertine-slab.jpg", altText: "Vein-Cut Cream Travertine Slab" },
    { src: "/images/categories/travertine.jpg", altText: "Porous Cross-Cut Honed Texture" },
  ],
  onyx: [
    { src: "/images/products/honey-onyx-translucent.jpg", altText: "Backlit Honey Amber Onyx Slab" },
    { src: "/images/categories/onyx.jpg", altText: "Translucent Caramel Veining Detail" },
  ],
};

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const SUPPLIER_ASSETS: Record<
  string,
  { cover: string; logo: string }
> = {
  "royal-makrana-marbles": {
    cover: "/images/hero/stone-quarry-hero.jpg",
    logo: "/images/products/makrana-white-marble.jpg",
  },
  "galaxy-granite-exports": {
    cover: "/images/suppliers/granite-processing-factory.jpg",
    logo: "/images/products/black-galaxy-granite.jpg",
  },
  "thar-sandstone-industries": {
    cover: "/images/hero/stone-quarry-hero.jpg",
    logo: "/images/products/dholpur-beige-sandstone.jpg",
  },
  "deccan-limestone-processors": {
    cover: "/images/suppliers/marble-processing-factory.jpg",
    logo: "/images/products/kota-blue-limestone.jpg",
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getCategoryFallbackImage(slug: string): string {
  return CATEGORY_IMAGES[slug] || "/images/categories/marble.jpg";
}

export function getProductFallbackImage(slug: string, materialType?: string | null): string {
  if (PRODUCT_IMAGES[slug]) return PRODUCT_IMAGES[slug];
  if (materialType) {
    const key = materialType.toLowerCase();
    if (CATEGORY_IMAGES[key]) return CATEGORY_IMAGES[key];
  }
  return "/images/products/makrana-white-marble.jpg";
}

export function getProductGalleryImages(
  slug: string,
  materialType?: string | null,
  primaryImage?: string | null,
): Array<{ src: string; altText: string | null; isPrimary?: boolean }> {
  const images: Array<{ src: string; altText: string | null; isPrimary?: boolean }> = [];

  const main = primaryImage || getProductFallbackImage(slug, materialType);
  images.push({ src: main, altText: "Primary Product Slab", isPrimary: true });

  const matKey = materialType?.toLowerCase() || "marble";
  const matchedGallery = MATERIAL_GALLERIES[matKey] || MATERIAL_GALLERIES.marble;

  if (matchedGallery) {
    matchedGallery.forEach((item) => {
      if (item.src !== main) {
        images.push({ src: item.src, altText: item.altText, isPrimary: false });
      }
    });
  }

  return images;
}

export function getSupplierFallbackCover(slug: string, businessType?: string | null): string {
  if (SUPPLIER_ASSETS[slug]?.cover) return SUPPLIER_ASSETS[slug].cover;
  if (businessType?.includes("granite")) return "/images/suppliers/granite-processing-factory.jpg";
  if (businessType?.includes("quarry")) return "/images/hero/stone-quarry-hero.jpg";
  return "/images/suppliers/marble-processing-factory.jpg";
}

export function getSupplierFallbackLogo(slug: string): string | null {
  if (SUPPLIER_ASSETS[slug]?.logo) return SUPPLIER_ASSETS[slug].logo;
  return null;
}

