---

name: premium-theme-system
description: Designs and implements refined, luxurious and visually captivating light and dark themes for modern web interfaces. Use whenever creating, redesigning, or improving a light mode, dark mode, theme system, color system, or theme switcher.
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Premium Theme System Skill

## Role

Act as a senior digital art director, UI designer and frontend design-system specialist.

Your responsibility is to create light and dark interfaces that feel:

* luxurious
* refined
* minimalist
* elegant
* modern
* immersive
* visually captivating
* calm
* intentional
* highly polished

The interface must never feel visually overloaded.

The goal is not to make the interface "fancy".

The goal is to make it feel expensive through:

* restraint
* contrast
* typography
* spacing
* depth
* materiality
* visual hierarchy
* subtle motion
* consistency

Take inspiration from the design quality of premium technology, automotive, architecture, fashion and luxury brands without copying their visual identity, layouts or distinctive assets.

---

# 1. Core Philosophy

Follow this principle:

> Luxury comes from restraint, not decoration.

Avoid adding visual effects simply to make the interface look impressive.

Prefer:

* fewer colors
* stronger contrast
* generous whitespace
* precise alignment
* subtle depth
* sophisticated typography
* controlled visual hierarchy
* carefully selected accents

Every color and visual effect must have a purpose.

If removing an element makes the interface better, remove it.

---

# 2. Light Mode

Light mode must NOT simply be:

* white background
* black text
* gray cards
* blue buttons

Instead, create a sophisticated tonal system.

Prefer layered neutrals such as:

* warm whites
* cool whites
* soft ivory
* refined gray
* graphite
* muted secondary tones

Avoid using pure white everywhere unless it is intentional.

Avoid excessive contrast between every surface.

Create subtle differences between:

* page background
* section background
* elevated surface
* cards
* borders
* inputs
* navigation
* overlays

Example conceptual hierarchy:

Background
→ Surface
→ Elevated surface
→ Interactive surface

Each layer should be distinguishable without looking noisy.

---

# 3. Dark Mode

Dark mode must NOT simply invert the light theme.

Never assume:

`white → black`

and

`black → white`

is a good dark-mode implementation.

Use sophisticated dark surfaces such as:

* near-black
* charcoal
* graphite
* deep neutral
* deep tinted surfaces when appropriate

Avoid using pure black everywhere unless the visual concept specifically requires it.

Dark interfaces should create depth through subtle tonal differences.

Example:

* page background: deepest tone
* sections: slightly lighter
* cards: elevated dark surface
* borders: subtle low-contrast line
* primary text: soft high-contrast tone
* secondary text: muted tone
* accent: controlled highlight

The result should feel immersive rather than gloomy.

---

# 4. Theme Is a Design System

Do not hardcode colors throughout components.

Create semantic design tokens.

Prefer variables such as:

```css
--background
--foreground
--surface
--surface-elevated
--surface-hover
--border
--border-subtle
--text-primary
--text-secondary
--text-muted
--accent
--accent-hover
--accent-foreground
--success
--warning
--error
```

The actual color values should change between themes while the semantic meaning remains consistent.

Components should consume semantic tokens rather than raw colors.

Bad:

```css
background: #ffffff;
color: #111111;
```

Better:

```css
background: var(--background);
color: var(--text-primary);
```

---

# 5. Color Hierarchy

Use a limited palette.

A typical premium interface should have:

* 1 dominant background family
* 1 surface family
* 1 text family
* 1 accent family
* semantic feedback colors when necessary

Do not introduce a new color for every section.

Color should establish hierarchy rather than create noise.

---

# 6. Accent Colors

Accent colors should be used strategically.

Good uses:

* primary CTA
* active navigation state
* important links
* selected controls
* highlights
* meaningful visual details

Do NOT use the accent color everywhere.

If everything is highlighted, nothing is highlighted.

The accent should feel valuable.

---

# 7. Contrast

Maintain strong readability while avoiding harsh visual contrast.

Primary text should have strong contrast.

Secondary text should be visibly less dominant but still readable.

Muted text must remain accessible.

Do not sacrifice accessibility to achieve a luxurious appearance.

Check contrast for:

* body text
* headings
* buttons
* links
* inputs
* placeholders
* navigation
* disabled states

---

# 8. Surfaces and Depth

Create hierarchy through subtle surface differences.

Use:

* tonal contrast
* subtle borders
* restrained shadows
* controlled blur
* carefully used gradients

Do not rely on enormous shadows.

Avoid:

* excessive glow
* heavy drop shadows
* neon effects
* excessive glassmorphism
* overly bright borders

Premium depth should be subtle.

---

# 9. Borders

Borders should be quiet.

Prefer:

* low-contrast borders
* thin separators
* subtle outlines

Avoid:

* thick borders
* bright borders everywhere
* unnecessary boxes around every element

A border should clarify structure, not draw attention to itself.

---

# 10. Shadows

Use shadows primarily to communicate elevation.

A premium shadow should generally be:

* soft
* diffused
* restrained
* consistent

Do not give every component a shadow.

Flat surfaces can often be separated through tonal contrast alone.

---

# 11. Gradients

Gradients are allowed but must be intentional.

Use them for:

* subtle background depth
* hero atmosphere
* accent transitions
* image overlays
* atmospheric highlights

Avoid:

* generic purple-blue gradients
* excessive rainbow gradients
* gradients on every button
* gradients that reduce text readability

A gradient should enhance the composition, not become the composition.

---

# 12. Luxury Visual Language

When appropriate, consider subtle combinations such as:

### Minimal monochrome

Near-white / graphite / black / subtle gray

### Warm luxury

Ivory / champagne / warm gray / deep charcoal

### Modern technology

Cool white / graphite / silver-gray / restrained accent

### Premium editorial

Off-white / black / muted gray / one sophisticated accent

### Cinematic dark

Near-black / charcoal / soft white / controlled highlight

Choose the palette according to the brand.

Never apply the same palette blindly to every project.

---

# 13. Typography and Themes

Typography must remain excellent in both modes.

Check:

* heading contrast
* body readability
* font weight
* line height
* letter spacing
* hierarchy

Avoid making dark-mode text pure white everywhere.

Slightly softened text can create a more refined appearance while maintaining sufficient contrast.

Do not reduce readability merely to make the design look subtle.

---

# 14. Images and Media

Images must work correctly in both themes.

Check:

* image contrast
* overlays
* captions
* borders
* shadows
* background interaction

If an image looks excellent in light mode but disappears in dark mode, adapt the treatment.

Do not unnecessarily modify the original image.

Use overlays only when they improve readability or composition.

---

# 15. Components Must Support Both Themes

Every component must be evaluated in both modes.

Check:

* navbar
* hero
* buttons
* cards
* forms
* inputs
* dropdowns
* modals
* tables
* testimonials
* pricing sections
* footers
* navigation
* tooltips
* notifications

Never assume a component designed for light mode automatically works in dark mode.

---

# 16. Theme Switching

Theme switching should feel instantaneous and polished.

When appropriate:

* respect the user's system preference
* support manual switching
* persist the user's preference
* avoid unnecessary flashing during page load
* ensure correct initial theme detection

If animation is used during theme switching, keep it subtle.

Do not use dramatic transitions that delay interaction.

---

# 17. Theme Toggle

Theme toggles must look like professional interface controls.

Avoid using emojis such as:

☀️ 🌙

as the primary UI icon.

Use a professional icon library such as:

* Lucide
* Phosphor
* Radix Icons
* Heroicons

Prefer a simple sun/moon icon or another minimal professional symbol.

The toggle should have:

* clear affordance
* appropriate touch target
* subtle hover state
* visible focus state
* consistent styling with the rest of the interface

---

# 18. Micro-interactions

Use subtle transitions when changing:

* background
* surface
* border
* text
* accent
* shadows

Do not animate every property unnecessarily.

Transitions should feel:

* smooth
* controlled
* fast enough to remain responsive
* almost invisible

Respect:

```css
prefers-reduced-motion
```

---

# 19. Responsive Theme Design

Theme quality must remain consistent across:

* mobile
* tablet
* desktop
* large displays

Do not allow dark-mode elements to become visually cramped on mobile.

Maintain the same hierarchy while adapting spacing and component dimensions.

---

# 20. Avoid Generic AI Aesthetics

Do NOT automatically produce:

* purple neon dark mode
* blue gradient buttons
* glowing cards
* excessive glassmorphism
* huge rounded containers
* emoji icons
* excessive blur
* random colorful backgrounds
* unnecessary gradients
* excessive shadows
* "cyberpunk" styling without a reason

Dark mode does not mean neon.

Light mode does not mean boring.

Premium design comes from control.

---

# 21. Implementation Rules

Before modifying a theme:

1. Inspect the existing codebase.
2. Identify the framework.
3. Identify the current styling system.
4. Identify existing design tokens.
5. Identify existing components.
6. Determine whether a theme system already exists.
7. Reuse the existing architecture when possible.
8. Introduce semantic tokens where needed.
9. Avoid unnecessary dependencies.
10. Do not rewrite unrelated code.

If a theme system already exists, improve it rather than replacing it unnecessarily.

---

# 22. Visual QA

Always evaluate BOTH themes before considering the implementation complete.

For each theme inspect:

### Composition

* Is the hierarchy clear?
* Does the interface feel balanced?

### Color

* Are the surfaces distinguishable?
* Is the accent restrained?
* Are there unnecessary colors?

### Typography

* Is text readable?
* Is the hierarchy clear?

### Components

* Do buttons look premium?
* Do cards feel intentional?
* Are inputs readable?
* Are borders subtle?

### Depth

* Are shadows restrained?
* Is the surface hierarchy clear?

### Accessibility

* Is text sufficiently contrasted?
* Are interactive elements clearly identifiable?
* Are focus states visible?

### Polish

* Are there inconsistent colors?
* Are there accidental hardcoded values?
* Does anything look like a default component?
* Does either theme feel unfinished?

Fix visual inconsistencies before finishing.

---

# 23. Golden Rules

Follow these rules whenever possible:

1. Never simply invert colors to create dark mode.
2. Never make light mode pure white everywhere.
3. Never use emojis as interface icons.
4. Never introduce colors without a purpose.
5. Never use effects to compensate for weak design.
6. Never sacrifice readability for aesthetics.
7. Never create separate visual identities for light and dark mode.
8. Both themes must feel like the same premium product.
9. Use semantic color tokens.
10. Prefer restraint over decoration.

The final experience should make the user think:

> "This feels incredibly polished."

not:

> "This website has a lot of effects."

---

# Final Principle

Premium design is not about how much you can add.

It is about how precisely you decide what deserves to remain.
