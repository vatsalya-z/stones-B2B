# StonesDekho Mobile Design System — Nature Luxe (Architectural Luxury)

## 1. Brand Identity
StonesDekho embodies **Nature Luxe — Architectural Luxury**: a serene, tactile palette inspired by Indian quarries, honed marble slabs, warm limestone, oxidized copper hardware, and deep architectural greens.

## 2. Color Tokens
| Token | Hex | Role |
|---|---|---|
| `primary` | `#0F6245` | Forest Green — primary CTAs, active tabs, verified trust accents |
| `secondary` | `#1F8A67` | Jade Green — secondary interactive highlights, subtle positive status |
| `accent` | `#D9A344` | Copper Gold — architectural trim, editorial overlines, pro badges |
| `deepGreen` | `#08302E` | Deep Green — immersive dark headers, full-screen gallery backdrop, splash |
| `background` | `#F8F5EE` | Warm Ivory — primary screen canvas |
| `surface` | `#FFFFFF` | Pure Surface — elevated architectural cards, sheets, inputs |
| `stoneBeige` | `#EFE6D6` | Stone Beige — soft specification chips, table headers, subtle containers |
| `textPrimary` | `#1F1F1F` | Obsidian Charcoal — primary copy and titles |
| `textSecondary` | `#6B6B65` | Warm Slate — metadata, captions, secondary labels |
| `border` | `#E4DAC8` | Travertine Hairline — crisp `1px` card & divider lines |
| `success` | `#16A34A` | Verified / Approved / Delivered |
| `info` | `#0EA5E9` | Under Review / Processing / In Transit |
| `warning` | `#F59E0B` | Pending Payment / Pending Review |
| `error` | `#EF4444` | Validation Errors / Rejected / Cancelled |

## 3. Typography
- **Editorial Headings:** `Playfair Display` (`SemiBold` 600, `Bold` 700) for screen titles, stone category banners, hero greetings, and empty-state headlines.
- **Functional UI:** `Inter` (`Regular` 400, `Medium` 500, `SemiBold` 600, `Bold` 700) for specifications, forms, buttons, tabular pricing, and metadata.

## 4. Spatial Grid & Interaction Standards
- **8pt Grid:** `4, 8, 12, 16, 24, 32, 48` px spacing rhythm.
- **Restrained Geometry:** `8px` inputs/buttons, `12px` cards, `16px` hero banners/modals (avoids bubbly generic rounded cards).
- **Touch Targets:** Minimum `44pt` (`48pt` standard for primary buttons and inputs) for comfortable one-handed quarry/site usage.
- **Imagery:** Real natural stone slabs, quarry blocks, and architectural interiors rendered via `expo-image` with `contentFit="cover"` and subtle aspect framing (`4:3` cards, `16:10` category tiles, full-bleed product galleries).
- **Truthful Data Rules:** Verified seals, stock status, and commercial prices render **only** from authoritative database records. "Price on Request" is shown when `price_type === 'on_request'` or `price === null`.
