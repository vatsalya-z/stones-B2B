# StoneB2B Marketplace — Complete Website Image Audit

This document details the image audit conducted for all public routes, components, and templates across the StoneB2B platform.

## 1. Executive Summary

- **Existing Image Assets in `apps/web/public`**: 0
- **Total Public Routes Audited**: 10
- **Identified Image Placeholders**:
  - Hero background: missing texture asset `/images/stone-texture.jpg`
  - Category cards: letter-initial fallback (`CategoryFallback`)
  - Product cards: grey placeholder with "No image" text
  - Supplier cards: letter-initial fallback (`LogoFallback`)
  - Supplier storefront banners: dark fallback background
  - Product detail gallery: single-state placeholder SVG
- **Target Photography Standard**: Ultra-photorealistic, editorial natural stone and architectural photography, 4K/UHD source quality, true-to-material mineral textures, no watermarks, no CGI artifacts.

---

## 2. Route-by-Route Image Audit

| Route | Page / Section | Current Asset State | Required Images | Recommended Dimensions | Aspect Ratio | Implementation Target |
|---|---|---|---|---|---|---|
| `/` | Hero Section | Missing `/images/stone-texture.jpg` | 1x Wide Quarry / Showroom Hero Photograph | 2560 × 1440 px | 16:9 | `public/images/hero/stone-quarry-hero.webp` |
| `/` | Featured Categories | Monogram initial fallback | 8x High-res stone category slabs (Marble, Granite, Sandstone, Limestone, Quartzite, Slate, Travertine, Onyx) | 800 × 600 px | 4:3 | `public/images/categories/{slug}.webp` |
| `/` | Popular Stone Products | "No image" grey container | 6x Unique commercial product photographs | 1200 × 800 px | 3:2 | `public/images/products/{product-slug}.webp` |
| `/` | Featured Suppliers | Initial letter avatars | 4x Industrial stone processing factories & export facilities | 400 × 400 px (Logo) + 1200 × 800 px (Facility) | 1:1 / 3:2 | `public/images/suppliers/{name}.webp` |
| `/categories` | Category Grid | Monogram initial fallbacks | 14x Full category taxonomy images (including Slabs, Tiles, Blocks, Custom Stone) | 800 × 600 px | 4:3 | `public/images/categories/{slug}.webp` |
| `/categories/[slug]` | Category Detail Hero & Products | Empty hero + grey product blocks | 1x Category banner + dynamic product cards | 1920 × 600 px (Banner) + 1200 × 800 px (Cards) | 3:1 / 3:2 | `public/images/categories/` & `public/images/products/` |
| `/products` | Product Catalogue Grid | Blank grey cards when no DB image | 12x Unique product photos covering major Indian stone varieties | 1200 × 800 px | 3:2 | `public/images/products/{product-slug}.webp` |
| `/products/[slug]` | Product Detail Gallery | Empty SVG box | 5-6x Multi-angle gallery per stone type (Full slab, Macro veining, Architectural install, Edge profile, Warehouse stack) | 1600 × 1066 px | 3:2 | `public/images/product-gallery/{material}/{index}.webp` |
| `/products/[slug]/enquiry` | RFQ Product Snapshot | "No image" placeholder | 1x Product thumbnail snapshot | 400 × 300 px | 4:3 | Linked from primary product asset |
| `/suppliers` | Supplier Directory | Initial letter avatars | 8x Factory, quarry, processing line, and packaging photos | 600 × 400 px | 3:2 | `public/images/suppliers/{supplier-slug}.webp` |
| `/suppliers/[slug]` | Factory Storefront Banner & Logo | Grey container & initials | 1x Panoramic factory cover image + 1x Official factory logo | 2400 × 800 px (Cover) + 400 × 400 px (Logo) | 3:1 / 1:1 | `public/images/suppliers/{supplier-slug}-cover.webp` |
| `/about` | Company Background | Text only | 1x Stone architectural showroom / heritage quarry | 1600 × 900 px | 16:9 | `public/images/hero/marble-showroom-hero.webp` |

---

## 3. Directory Layout Plan

```
apps/web/public/images/
├── hero/
│   ├── stone-quarry-hero.webp
│   ├── marble-showroom-hero.webp
│   └── stone-factory-hero.webp
├── categories/
│   ├── marble.webp
│   ├── granite.webp
│   ├── sandstone.webp
│   ├── limestone.webp
│   ├── quartzite.webp
│   ├── slate.webp
│   ├── travertine.webp
│   ├── onyx.webp
│   ├── semi-precious-stones.webp
│   ├── natural-stone-slabs.webp
│   ├── stone-tiles.webp
│   ├── stone-blocks.webp
│   ├── decorative-stone.webp
│   └── custom-stone-products.webp
├── products/
│   ├── makrana-white-marble.webp
│   ├── black-galaxy-granite.webp
│   ├── dholpur-beige-sandstone.webp
│   ├── rajasthan-green-marble.webp
│   ├── kota-blue-limestone.webp
│   ├── agra-red-sandstone.webp
│   ├── classic-travertine-slab.webp
│   ├── honey-onyx-translucent.webp
│   ├── silver-grey-quartzite.webp
│   ├── kund-black-slate.webp
│   ├── raw-granite-quarry-block.webp
│   └── carved-sandstone-jaali.webp
├── suppliers/
│   ├── royal-marble-craft-cover.webp
│   ├── royal-marble-craft-logo.webp
│   ├── galaxy-granite-exports-cover.webp
│   ├── galaxy-granite-exports-logo.webp
│   ├── thar-sandstone-industries-cover.webp
│   ├── thar-sandstone-industries-logo.webp
│   ├── deccan-limestone-processors-cover.webp
│   ├── deccan-limestone-processors-logo.webp
│   ├── stone-gangsaw-factory.webp
│   └── seaworthy-crate-packaging.webp
├── product-gallery/
│   ├── marble/ (slab, macro-vein, interior-floor, edge-20mm, bundle-stack)
│   ├── granite/ (slab, macro-crystal, kitchen-island, edge-30mm, factory-crane)
│   ├── sandstone/ (slab, natural-cleft, exterior-cladding, honed-edge, palette)
│   ├── limestone/ (slab, honed-texture, pool-coping, calibrated-tile)
│   ├── quartzite/ (slab, crystalline-detail, feature-wall, bookmatch)
│   ├── slate/ (slab, cleft-texture, wall-elevation, paving-stack)
│   ├── travertine/ (slab, porous-crosscut, bathroom-vanity, vein-cut)
│   └── onyx/ (slab, backlit-amber, luxury-bar-counter, bookmatched-slabs)
└── backgrounds/
    ├── stone-texture.jpg
    ├── marble-pattern-subtle.webp
    └── dark-quarry-overlay.webp
```

---

## 4. Central Asset Mapping Architecture

To ensure seamless operation whether Supabase is connected or operating in local demo/fallback mode:
- Create `apps/web/lib/images.ts` defining typed constant maps for categories, products, galleries, and suppliers.
- Update `apps/web/lib/db.ts` to integrate this mapping as graceful fallbacks when live database `product_images` or `logo_url` records are empty or point to offline buckets.
- Update Next.js `<Image>` usage to ensure explicit sizes, zero CLS, and priority loading for the hero image.

---

## 5. Implementation Status

- [x] Phase 1: Image Audit complete (`docs/image-audit.md`).
- [ ] Phase 2: High-resolution asset generation.
- [ ] Phase 3: Central asset mapping integration in `apps/web/lib/images.ts`.
- [ ] Phase 4: Page component integrations (Homepage, Products, Categories, Suppliers, Storefront, Details).
- [ ] Phase 5: Verification (TypeScript, tests, responsive testing, production build).
- [ ] Phase 6: Final Report (`docs/image-generation-report.md`).

