```markdown
# Design System Specification: The Industrial Aesthetic

## 1. Overview & Creative North Star
**Creative North Star: "The Tactile Mainframe"**

This design system rejects the ephemeral flatness of modern web design in favor of the "Beige Box" era's heavy, intentional, and mechanical soul. We are not just building an interface; we are constructing a professional workstation from 1994. The aesthetic moves beyond mere nostalgia to embrace "Organic Industrialism"—where the warmth of aged plastic (Ivory/Tan) meets the rigid precision of high-end lab equipment.

To break the "template" look, we utilize **Physicality as Hierarchy**. Instead of flat grids, the UI is treated as a single molded chassis. Content is either "extruded" (outset bevels) to indicate interactability or "milled" (inset recesses) to indicate data housing. Layouts should feel intentionally asymmetrical, mimicking the placement of ports, vents, and drives on industrial hardware.

---

## 2. Colors & Surface Logic

The palette is a sophisticated study in warm neutrals. It avoids the sterile "Apple White" in favor of a lived-in, professional patina.

*   **Surface Hierarchy:** 
    *   **Base Chassis (`surface` / `#fef9f0`):** The primary "plastic" housing of the application.
    *   **Recessed Bays (`surface-container-high` / `#eee8d8`):** Used for content areas that should feel "set into" the hardware.
    *   **Raised Modules (`surface-container-lowest` / `#ffffff`):** Used for high-priority interactive components that need to feel "plugged in."

*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for layout sectioning. Separation is achieved through **Tonal Stepping**. To separate a sidebar from a main view, shift from `surface` to `surface-dim`. The boundary is defined by the color change, mimicking the natural shadow of a molded plastic seam.

*   **Signature Textures & Accents:**
    *   **Functional Orange (`primary` / `#9a442d`):** Used for critical actions, mimicking a physical "Power" or "Reset" button.
    *   **Indicator Green (`secondary` / `#4b654e`):** Used for "System Ready" or active states, reminiscent of a low-glow LED.
    *   **The "Vents" Texture:** Use repetitive 2px wide vertical bars of `outline-variant` to create "cooling vent" patterns in empty header spaces or footers.

---

## 3. Typography: The Technical Spec

The typography is designed to look like high-resolution screen-printing on a hardware chassis.

*   **Technical Precision (Space Grotesk):** Used for all `display`, `headline`, and `label` roles. Its monospaced-adjacent proportions provide the "Lab Equipment" feel.
    *   *Editorial Tip:* Use `label-sm` in all-caps with 10% letter spacing for "Model Numbers" or section headers to mimic industrial stamping.
*   **The Content Workhorse (Inter):** Used for `body` and `title` scales. Inter provides the necessary legibility for dense data, acting as the "Instruction Manual" text that accompanies the hardware.
*   **Hierarchy via Scale:** Use extreme contrast. A `display-lg` headline should sit unapologetically next to a `label-sm` metadata string, emphasizing the "Professional Tool" aesthetic over a generic "Marketing Page" look.

---

## 4. Elevation & Depth (The 3D Bevel)

In this system, "Elevation" is not a shadow; it is a **Physical Molding**.

*   **The Outset (Raised):** Used for buttons and cards. 
    *   Top/Left edge: 1px "highlight" (use `surface-container-lowest`).
    *   Bottom/Right edge: 1px "shadow" (use `outline-variant`).
    *   *Result:* A subtle 3D "pop" that feels like a mechanical keycap.
*   **The Inset (Recessed):** Used for input fields and data containers.
    *   Top/Left edge: 1px "shadow" (use `outline-variant`).
    *   Bottom/Right edge: 1px "highlight" (use `surface-container-lowest`).
    *   *Result:* The element looks carved into the beige chassis.
*   **Ambient Shadows:** Avoid standard shadows unless an element is "Floating" (like a Modal). For floating elements, use a 24px blur at 6% opacity using the `on-surface` color. It should feel like a soft glow of light hitting a physical object, not a digital effect.

---

## 5. Components

### Buttons
*   **Primary:** High-contrast `primary` background. Features a 1px outset bevel. On click, the bevel insets (reverses colors) to simulate a physical mechanical travel.
*   **Secondary:** `surface-container-low` with a subtle bevel. Text in `on-surface`.
*   **Tertiary:** No background, `label-md` typography. Use a small `secondary` (Green) dot next to the text to indicate "Active" status.

### Inputs & Fields
*   **The Data Bay:** All inputs must be "Inset" into the page. Use `surface-container-highest` as the background color to provide a "dimmed" feel to the trough.
*   **Focus State:** Instead of a blue glow, use a 2px `outline` in `primary` (Orange) to mimic a physical warning or selection light.

### Cards & Containers
*   **The Module Rule:** Forbid dividers. Separate content modules using a 0.5rem gap and a slight shift in surface tone (e.g., a `surface-container-low` card on a `surface` background).
*   **Header Strips:** Every major card should have a "Header Strip"—a top-aligned area in `surface-dim` with `label-sm` text, looking like an identification plate.

### Additional Component: "The LED Indicator"
*   A small 8px circle using `secondary` (Green) or `error` (Red). Place these next to list items or in headers to denote system status. They should have a subtle inner-glow (1px blur) to look like a powered-on bulb.

---

## 6. Do's and Don'ts

### Do:
*   **Do** embrace sharp corners. The `roundedness` scale is set to `0px`. Everything is a hard-milled edge.
*   **Do** use asymmetrical spacing. A wider margin on the left than the right mimics the "weighted" feel of industrial machinery.
*   **Do** use the `surface-container` tiers to create "nested boxes" within boxes.

### Don't:
*   **Don't** use pure black (#000). Use `on-surface` (#363226) for text to maintain the "warm plastic" feel.
*   **Don't** use standard "Material Design" shadows. If it doesn't look like it was manufactured in a factory, it doesn't belong.
*   **Don't** use vibrant, saturated blues or purples. Stay within the "Functional" spectrum of Orange, Green, and Beige.

---

## 7. Spacing & Density
This system thrives on **High Density**. Industrial equipment is often cramped with controls. Use the `1` (0.2rem) and `2` (0.4rem) spacing tokens for internal component padding to create a "tight," professional tool feel. Use larger `16` (3.5rem) and `20` (4.5rem) tokens for major section breaks to allow the "chassis" to breathe.```