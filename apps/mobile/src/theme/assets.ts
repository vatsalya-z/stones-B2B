import { PUBLIC_ENV } from "../lib/env";

export type LocalStoneSource = number;

export const STONE_ASSETS = {
  categories: {
    marble: require("../../assets/images/marble.jpg") as number,
    granite: require("../../assets/images/granite.jpg") as number,
    sandstone: require("../../assets/images/sandstone.jpg") as number,
    limestone: require("../../assets/images/limestone.jpg") as number,
    slate: require("../../assets/images/slate.jpg") as number,
    quartzite: require("../../assets/images/quartzite.jpg") as number,
    travertine: require("../../assets/images/travertine.jpg") as number,
    onyx: require("../../assets/images/onyx.jpg") as number,
  },
  applications: {
    commercial: require("../../assets/images/commercial-buildings.jpg") as number,
    hospitality: require("../../assets/images/hospitality-hotels.jpg") as number,
    infrastructure: require("../../assets/images/public-spaces-infra.jpg") as number,
    residential: require("../../assets/images/residential-projects.jpg") as number,
  },
  hero: {
    slabs: require("../../assets/images/hero-marble-slabs-display.jpg") as number,
    quarry: require("../../assets/images/stone-quarry-hero.jpg") as number,
    showroom: require("../../assets/images/marble-showroom-hero.jpg") as number,
    factory: require("../../assets/images/stone-factory-hero.jpg") as number,
  },
} as const;

export const CANONICAL_STONE_CATEGORIES = [
  {
    slug: "marble",
    name: "Marble",
    shortDescription: "Makrana, Italian Statuario & luxury architectural slabs",
    image: STONE_ASSETS.categories.marble,
  },
  {
    slug: "granite",
    name: "Granite",
    shortDescription: "Black Galaxy, Imperial Red & heavy-duty structural blocks",
    image: STONE_ASSETS.categories.granite,
  },
  {
    slug: "sandstone",
    name: "Sandstone",
    shortDescription: "Agra Red, Dholpur, Mint & Jodhpur architectural cladding",
    image: STONE_ASSETS.categories.sandstone,
  },
  {
    slug: "limestone",
    name: "Limestone",
    shortDescription: "Kota Blue, Tandur & honed exterior facade stone",
    image: STONE_ASSETS.categories.limestone,
  },
  {
    slug: "slate",
    name: "Slate",
    shortDescription: "Natural cleft roofing, wall cladding & rustic paving",
    image: STONE_ASSETS.categories.slate,
  },
  {
    slug: "quartzite",
    name: "Quartzite",
    shortDescription: "High-density sparkling quartzitic tiles & countertops",
    image: STONE_ASSETS.categories.quartzite,
  },
  {
    slug: "travertine",
    name: "Travertine",
    shortDescription: "Roman & Persian honed travertine for feature elevations",
    image: STONE_ASSETS.categories.travertine,
  },
  {
    slug: "onyx",
    name: "Onyx",
    shortDescription: "Translucent backlit slabs for hospitality & feature walls",
    image: STONE_ASSETS.categories.onyx,
  },
] as const;

export const ARCHITECTURAL_APPLICATIONS = [
  {
    key: "commercial",
    title: "Commercial Towers",
    subtitle: "Ventilated facades & lobbies",
    materialQuery: "Granite",
    image: STONE_ASSETS.applications.commercial,
  },
  {
    key: "hospitality",
    title: "Hospitality & Hotels",
    subtitle: "Bookmatched marble & backlit onyx",
    materialQuery: "Marble",
    image: STONE_ASSETS.applications.hospitality,
  },
  {
    key: "infrastructure",
    title: "Public Spaces & Infra",
    subtitle: "Cobbles, kerbs & heavy paving",
    materialQuery: "Sandstone",
    image: STONE_ASSETS.applications.infrastructure,
  },
  {
    key: "residential",
    title: "Luxury Residences",
    subtitle: "Cut-to-size flooring & landscapes",
    materialQuery: "Travertine",
    image: STONE_ASSETS.applications.residential,
  },
] as const;

export function getLocalStoneImageByMaterial(
  materialOrSlug?: string | null,
): LocalStoneSource {
  const key = (materialOrSlug ?? "").trim().toLowerCase();
  if (key.includes("granite")) return STONE_ASSETS.categories.granite;
  if (key.includes("sandstone")) return STONE_ASSETS.categories.sandstone;
  if (key.includes("limestone") || key.includes("kota")) return STONE_ASSETS.categories.limestone;
  if (key.includes("slate")) return STONE_ASSETS.categories.slate;
  if (key.includes("quartz")) return STONE_ASSETS.categories.quartzite;
  if (key.includes("travertine")) return STONE_ASSETS.categories.travertine;
  if (key.includes("onyx")) return STONE_ASSETS.categories.onyx;
  return STONE_ASSETS.categories.marble;
}

export type PublicStorageBucket =
  | "product-images"
  | "seller-logos"
  | "seller-cover-images"
  | "category-images";

/**
 * Resolves a stored Supabase Storage path into a full public HTTPS CDN URL.
 * Mirrors apps/marketplace/lib/db.ts conventions.
 */
export function resolveStorageImageUrl(
  path: string | null | undefined,
  bucket: PublicStorageBucket,
): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Relative web paths like /images/... resolve against the public marketplace domain
  if (trimmed.startsWith("/images/")) {
    return `${PUBLIC_ENV.siteUrl}${trimmed}`;
  }

  const base = PUBLIC_ENV.supabaseUrl.replace(/\/+$/, "");
  const cleanPath = trimmed.replace(/^\/+/, "");

  if (cleanPath.startsWith("storage/v1/object/public/")) {
    return `${base}/${cleanPath}`;
  }
  if (cleanPath.startsWith(`${bucket}/`)) {
    return `${base}/storage/v1/object/public/${cleanPath}`;
  }
  return `${base}/storage/v1/object/public/${bucket}/${cleanPath}`;
}
