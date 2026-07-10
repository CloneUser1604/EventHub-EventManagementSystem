# Design System: Event Management System (EMS)

## 1. Visual Theme & Atmosphere
A restrained, gallery-airy interface with confident structured layouts and precise motion. The atmosphere is clinical yet warm — like a well-lit architecture studio. It prioritizes clarity, data legibility, and high-agency interaction without relying on flashy generic UI tropes.

## 2. Color Palette & Roles
- **Canvas White** (`#F9FAFB`) — Primary background surface.
- **Pure Surface** (`#FFFFFF`) — Card and container fill.
- **Charcoal Ink** (`#18181B`) — Primary text, headings, and high-contrast elements.
- **Muted Steel** (`#71717A`) — Secondary text, descriptions, metadata, and disabled states.
- **Whisper Border** (`rgba(226,232,240,0.6)`) — Card borders, 1px structural lines, subtle dividers.
- **Onyx Accent** (`#27272A`) — Single neutral accent for primary CTAs, active states, and focus rings.

*(Note: Maximum 1 accent color used. Saturation is near zero. No purple, blue, or neon gradients.)*

## 3. Typography Rules
- **Display/Headlines:** `Geist` — Track-tight, controlled scale. Hierarchy is driven by weight and contrast rather than massive size.
- **Body:** `Geist` — Relaxed leading, maximum 65 characters per line. Neutral secondary color.
- **Mono:** `Geist Mono` — Used for code, metadata, IDs, timestamps, and high-density numbers.
- **Banned:** `Inter`, `Times New Roman`, generic system fonts, and all serif fonts for this software UI context.

## 4. Component Stylings
- **Buttons:** Flat, solid fill (`#27272A` for primary, transparent with outline for secondary). No outer glow. Tactile -1px translateY on active/hover state with subtle shadow (`0 2px 8px rgba(0,0,0,0.08)`).
- **Cards:** Generously rounded corners (`16px`). Diffused whisper shadow (`0 1px 3px rgba(0,0,0,0.04)`). High-density lists replace cards with border-top dividers.
- **Inputs:** Label above, helper text optional, error below. Focus ring in Onyx Accent (`#27272A`). No floating labels.
- **Tags/Badges:** Minimalist, rounded (`6px`), light background with subdued text colors. No oversaturated fills.

## 5. Layout Principles
- Clean spatial separation. No overlapping elements.
- Grid-first responsive architecture.
- Max-width containment (e.g., 1400px centered) for large screens.
- Strict single-column collapse below 768px viewports. No horizontal scroll overflow.
- Generous internal padding (`32px` to `48px` for major sections).

## 6. Motion & Interaction
- **Micro-Interactions:** Subtle scale and transform (`translateY(-2px)`) on hover.
- **Physics:** Spring physics feeling, snappy but not linear. CSS transition `all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)`.
- **Performance:** Hardware-accelerated transforms and opacities only. No animation on width/height or layout properties.

## 7. Anti-Patterns (Banned)
- ❌ No emojis in the core UI.
- ❌ No `Inter` font.
- ❌ No pure black (`#000000`).
- ❌ No neon glows, outer glows, or heavy drop shadows.
- ❌ No gradient text on headings or buttons.
- ❌ No 3-column equal card layouts (prefer asymmetrical or list views).
- ❌ No generic UI placeholder names ("John Doe", "Acme").
- ❌ No AI copywriting clichés ("Elevate", "Seamless", "Unleash").
