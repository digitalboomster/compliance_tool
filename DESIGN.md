# Design System Specification: The Architectural Fintech Standard

> **Product / legal source of truth:** `SavvyBee_Compliance_ProductSpec.pdf` (SB-COMP-SPEC-2026-001). This file covers UI only; engineering scope is implemented in `server/` + `web/` against that PDF.


## 1. Overview & Creative North Star
**Creative North Star: The Sovereign Ledger**
This design system moves beyond the generic "SaaS Dashboard" look to embrace an editorial, high-trust fintech identity. We treat data not as a commodity, but as a prestigious asset. By prioritizing **Organic Brutalism**—the intersection of rigid financial structure and soft, human-centric whitespace—we create an environment of absolute authority and calm.

To break the "template" feel, we reject the grid-locked box. Instead, we use **intentional asymmetry** (e.g., expansive left-aligned headers offset by condensed right-aligned utility panels) and **tonal depth** to guide the eye. The UI should feel like a custom-tailored suit: precise, understated, and undeniably premium.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a "cool-neutral" foundation to maintain an enterprise-grade focus, with a singular, commanding accent to drive action.

### The Palette (Material Design Tokens)
*   **Primary (Action):** `#2b4bb9` (The "Trust Indigo")
*   **Surface:** `#f9f9ff` (The Base Canvas)
*   **On-Surface:** `#141b2b` (Deep Charcoal for high-contrast legibility)
*   **Attention / amber (warnings):** `#b45309` or `#c2410c` (SLA due, medium risk — use sparingly).
*   **Success / safe:** `#0d9488` or `#047857` (passed checks — never use rust/brown for success).
*   **Destructive:** `#b91c1c` (reject, critical risk — text and focus rings, not giant red panels).

### The "No-Line" Rule
**Borders are a failure of hierarchy.** Designers are prohibited from using `1px solid` borders to define sections. Instead, boundaries must be established through:
1.  **Background Color Shifts:** A sidebar in `surface_container_low` sitting against a `surface` canvas.
2.  **Tonal Transitions:** Using `surface_container_highest` for a header to create a natural "shelf" without a stroke line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium cardstock.
*   **Level 0 (Base):** `surface` (#f9f9ff) - The desk.
*   **Level 1 (Section):** `surface_container_low` (#f1f3ff) - Large layout regions.
*   **Level 2 (Interaction):** `surface_container_highest` (#dce2f7) - Active cards or hover states.
*   **Level 3 (Floating):** `surface_container_lowest` (#ffffff) - Modals or popovers, elevated via tonal contrast.

### Signature Textures
To add "soul," primary CTAs should use a subtle linear gradient from `primary` (#2b4bb9) to `primary_container` (#4865d3) at a 135° angle. This provides a tactile depth that flat hex codes cannot replicate.

---

## 3. Typography: Corporate utility (revised)
**IBM Plex Sans** for all UI and headings — neutral, enterprise-appropriate, no display serif. **IBM Plex Mono** only for case IDs and technical references where scanability matters.

*   **Page titles:** ~1.25–1.5rem, semibold, tight tracking — not oversized “editorial” display type.
*   **Body:** 0.875rem workhorse; secondary copy uses `on_surface_variant` (#434655).
*   **Table headers:** small caps / uppercase label style with letter spacing.

---

## 4. Elevation & Depth
In this system, depth is a function of light and layering, not "drop shadows."

*   **The Layering Principle:** Place a `surface_container_lowest` card on top of a `surface_container_low` background. The 2-step jump in lightness creates a "lift" that is felt, not seen.
*   **Ambient Shadows:** For floating elements (Modals/Dropdowns), use an extra-diffused shadow: `box-shadow: 0px 12px 32px rgba(20, 27, 43, 0.04)`. Note the use of `on_surface` (Charcoal) at 4% opacity; never use pure black for shadows.
*   **The Glassmorphism Rule:** Global navigation (Sidebar/Top Bar) should use a backdrop-blur (12px) with 80% opacity on the surface color. This allows the "wealth" of the data behind it to bleed through, softening the interface.
*   **Ghost Borders:** If a boundary is required for accessibility (e.g., Input fields), use `outline_variant` at 20% opacity. 

---

## 5. Components
### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `DEFAULT` radius (4px), white text.
*   **Secondary:** No background. `outline_variant` (20% opacity) border.
*   **State:** Hovering a button should never change the color—it should increase the "Surface Tint" overlay by 8%.

### Structured Data Tables
*   **No Dividers:** Rows are separated by 12px of vertical whitespace (Spacing Scale `3.5`).
*   **Zebra Toning:** Use `surface_container_low` for alternating rows if density is extremely high.
*   **High-Trust Alignment:** Numerical data is always tabular-lined and right-aligned. Labels are left-aligned.

### Input Fields
*   **Focus State:** A 2px solid `primary` ring with an additional 4px "glow" (Primary color at 10% opacity).
*   **Radius:** Always `md` (6px) for a slightly softer, more modern interactive feel than the layout cards.

### Navigation Sidebar
*   **Width:** Fixed at 260px. 
*   **Active State:** No "pills." Use a 3px vertical "accent bar" on the far left using the `primary` token and a subtle `surface_container_high` background shift.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use the Spacing Scale religiously. A `3.5` (1.2rem) gap is fundamentally different from a `3` (1rem).
*   **Do** embrace "Negative Space as Luxury." If a screen feels crowded, increase the padding to scale `8` (2.75rem).
*   **Do** use **teal success** tokens for “passed / safe” — muted, not neon; reserve **indigo** for primary actions only.

### Don't:
*   **Don't** use 100% black (#000000). Use `on_surface` (#141b2b) for all "black" text.
*   **Don't** use lines to separate list items. Use the `1.5` spacing increment and background shifts.
*   **Don't** use Title Case. "Submit Application" (Sentence Case) is the standard; "Submit Application" (Title Case) is a legacy error.

---

## 7. Post-Stitch review — gaps & v2 direction (March 2026)

### What drifted from this spec
- **Screens look like default SaaS**, not “no-line” tonal layering or glass nav. Heavy cards + borders read closer to a generic admin shell (similar in *structure* to multi-workspace apps like Cordros Nautilus: left rail + top bar + content outlet).
- **Typography:** Spec asks for editorial hierarchy; mocks default to a single utility sans (reads as Inter-like). That flattens the “prestigious asset” story.
- **Color bug to fix:** `#943700` is a rust/brown — do **not** label it “Success.” Reserve **green** or **teal** for pass/safe; use **amber** for attention; keep **indigo** for primary actions.
- **Inconsistent chrome:** Mix of “Compliance OS,” case headers, and modals without one **canonical page frame** (same sidebar width, same header height, same sticky decision pattern everywhere).

### Screens / flows still missing or weak
- **Queue → case** transition (clear selected row / breadcrumb / keyboard affordance).
- **Bulk actions** and **assign / reassign** on the queue (even if MVP is single-select).
- **Checks tab** fully designed (not only a right-rail summary); include **false-positive workflow** (“clear hit,” “escalate”).
- **Audit export** preview (what regulators/partners actually receive — redacted PDF mock).
- **Mobile / narrow** breakpoint for “approve on the go” (at least a simplified view).
- **Dark or dim “focus mode”** for long review sessions (optional but differentiating).

### Three “groundbreaking” tracks (pick one for Stitch v2)

**A — Investigation canvas (recommended)**  
Drop the equal-weight card grid. One **wide narrative column** (timeline + story of the case) + one **evidence strip** (documents as filmstrip/thumbnails) + **floating command bar** (Approve / Reject / Request info). Feels like a **case file**, not a billing dashboard.

**B — Command-first / minimal chrome**  
Oversized **⌘K-style search** as the hero; sidebar **icon-only** or hidden; content is **full bleed**. Power-user, Linear/Vercel-adjacent but with compliance-specific density toggles.

**C — Editorial “report” layout**  
Large **display type** for case ID; body copy and pull-quotes for **risk narrative**; table is **secondary** (appendix feel). Feels like a **published brief**, not a database UI.

### Typography (product direction)
**IBM Plex Sans** for UI; **IBM Plex Mono** only for case IDs. No display serifs — keeps the tool corporate and operational rather than “editorial.”

### Stitch v2 prompt (paste into Stitch)
Use the block in the project chat / README handoff: ask explicitly for **no traditional four-KPI row**, **asymmetric layout**, **filmstrip documents**, **single sticky decision surface**, and **typography pair** named above. Require **empty**, **loading**, and **reject-validation** states for the **same** frame.