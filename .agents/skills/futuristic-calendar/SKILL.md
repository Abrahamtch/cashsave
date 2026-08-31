---

name: futuristic-calendar
description: Creates futuristic, premium and immersive calendar interfaces with translucent glass surfaces, soft blur, luminous borders, dynamic multicolor ambient lighting, mouse-reactive gradients, refined date interactions and smooth editing transitions. Use whenever creating, redesigning or improving calendar, date-picker, scheduling or date-editing interfaces.
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Futuristic Premium Calendar Skill

## Role

Act as a senior interaction designer, creative technologist and premium UI engineer specialized in immersive calendar experiences.

Create calendars that feel:

* futuristic
* luxurious
* refined
* immersive
* elegant
* tactile
* sophisticated
* visually captivating
* highly interactive

The calendar should feel like a premium digital object rather than a conventional date-picker.

The visual language should combine:

> translucent surfaces + atmospheric light + subtle depth + precise typography + fluid interaction.

Avoid making the interface look like a gaming HUD or cyberpunk dashboard.

---

# 1. Core Philosophy

The calendar should invite exploration.

The user should naturally want to:

* move the cursor around it
* hover over dates
* select a date
* inspect the selected day
* modify an event
* explore another date

Interaction itself should be visually rewarding.

However:

> Never sacrifice usability for visual effects.

The interface must remain immediately understandable.

---

# 2. Glass Surface

The calendar should use a sophisticated translucent surface.

Use:

* semi-transparent backgrounds
* backdrop blur
* subtle saturation
* low-opacity borders
* layered surfaces

Example conceptual styling:

```css
background: color-mix(in srgb, var(--surface) 65%, transparent);
backdrop-filter: blur(24px) saturate(140%);
-webkit-backdrop-filter: blur(24px) saturate(140%);
```

Adapt implementation to the project's existing architecture.

Do not blindly copy these values.

The final opacity and blur must be visually tuned.

---

# 3. Calendar Border

The calendar should have a thin luminous border.

The border must feel:

* soft
* continuous
* refined
* slightly atmospheric

It should visually travel around the perimeter of the calendar.

Avoid:

* thick glowing borders
* neon outlines
* aggressive rainbow strokes

The glow should be barely perceptible at rest.

Interaction may increase its intensity slightly.

---

# 4. Ambient Multicolor Glow

Create an ambient light source behind the calendar.

The glow should contain multiple colors.

Possible palette:

* emerald
* cyan
* violet
* blue
* champagne
* subtle magenta

Do not use all colors at maximum intensity.

The colors should blend softly.

The glow must be:

* large
* diffused
* low opacity
* blurred
* atmospheric

Never create hard-edged gradients.

---

# 5. Mouse-Reactive Lighting

This is a core interaction.

When the user's cursor moves over the calendar:

> the ambient light should react to the cursor position.

Track the cursor position relative to the calendar.

The lighting should move accordingly.

Conceptually:

```text
Mouse
   ↓
Cursor position
   ↓
Dynamic gradient position
   ↓
Ambient glow
   ↓
Calendar surface
```

The light should appear to originate near the cursor.

The effect should resemble moving a small invisible light source over a glass object.

---

# 6. Dynamic Color

The cursor-reactive glow should gradually change color.

Do NOT randomly switch colors.

Instead, smoothly interpolate between hues.

Example conceptual progression:

```text
Emerald
   ↓
Cyan
   ↓
Blue
   ↓
Violet
   ↓
Magenta
   ↓
Champagne
   ↓
Emerald
```

The transition must be continuous.

Avoid sudden hue changes.

The user should perceive a living ambient light rather than a color-changing animation.

---

# 7. Mouse Movement Quality

Do not attach the glow directly to the raw cursor position.

Interpolate the position.

The light should have subtle inertia.

Conceptually:

```text
Cursor movement
      ↓
Smooth interpolation
      ↓
Delayed ambient light
```

This creates a premium physical feeling.

Avoid jitter.

Avoid instant snapping.

Avoid excessive lag.

The response should feel approximately instantaneous while remaining smooth.

---

# 8. Resting State

When the cursor leaves the calendar:

The glow should gradually fade.

Do not instantly remove it.

Transition toward a calm resting state.

The resting state should still retain a very subtle ambient light.

The calendar should remain beautiful even when inactive.

---

# 9. Date Grid

Dates should be arranged with exceptional visual clarity.

Maintain:

* consistent column widths
* precise alignment
* comfortable spacing
* clear weekday labels
* predictable navigation

Do not make the calendar visually dense.

Whitespace is essential.

---

# 10. Date Typography

Date numbers should be highly readable.

Normal dates:

* subtle
* medium contrast
* clean typography

Current date:

* noticeable
* elegant accent

Selected date:

* strongest visual state

Disabled dates:

* clearly subdued

Do not use excessive font weights.

Do not make every date visually dominant.

---

# 11. Date Hover

When hovering over a date:

Create a subtle interaction.

Possible effects:

* soft background illumination
* slight scale
* subtle border
* localized glow
* gentle color shift

The effect must remain restrained.

The hover state should feel tactile.

Avoid large glowing circles around dates.

---

# 12. Selected Date

The selected date should become the primary focal point.

Use:

* controlled emerald accent
* subtle luminous background
* refined contrast
* gentle elevation

The selected state should clearly communicate:

> This is the date currently being edited.

Avoid making the selected date visually enormous.

---

# 13. Date Editing Interaction

When the user clicks a date to modify it:

The calendar should transition smoothly into an editing state.

Possible sequence:

```text
Date hover
    ↓
Date selection
    ↓
Localized highlight
    ↓
Content transition
    ↓
Editing interface
```

Avoid abrupt modal changes.

Whenever possible, use spatial continuity.

The editing interface should appear to emerge naturally from the selected date.

---

# 14. Editing Panel

The editing panel should inherit the calendar's visual language.

Use:

* translucent surface
* subtle blur
* refined borders
* controlled glow
* consistent typography

It should feel like part of the calendar.

Avoid opening a generic browser-like modal that visually disconnects from the component.

---

# 15. Events

Events should remain readable.

Use visual hierarchy rather than excessive colors.

Possible hierarchy:

* event title
* time
* category
* status

Use colors sparingly.

Do not create a different saturated color for every event.

---

# 16. Today Indicator

Today's date should be recognizable without overpowering the selected date.

Use a subtle indicator such as:

* small dot
* thin ring
* subtle accent
* refined background

Do not use huge circles or glowing outlines.

---

# 17. Navigation

Month/year navigation should feel premium.

Use professional icons.

Never use emoji arrows.

Preferred icon libraries:

* Lucide
* Phosphor
* Radix Icons
* Heroicons

Navigation buttons should have:

* subtle hover
* subtle active state
* adequate touch target
* clean icon alignment

---

# 18. No Emoji UI

NEVER use emojis as interface icons.

Avoid:

* 📅
* 🗓️
* ✨
* 🌈
* 🚀
* 🔥
* ❤️

Use professional SVG icons.

The calendar must feel like a premium software product.

---

# 19. Shadows

Use atmospheric shadows.

The calendar may cast a soft shadow onto the page.

The shadow should communicate elevation without becoming obvious.

Avoid heavy black shadows.

In dark mode, prefer subtle tonal separation and controlled ambient light.

---

# 20. Glow

Glow is allowed but must remain restrained.

Use glow for:

* perimeter lighting
* cursor-reactive ambient light
* selected date
* important interaction states

Do not make every element glow.

The glow should be concentrated around meaningful interaction.

---

# 21. Light Mode

In light mode:

* use translucent ivory/white surfaces
* use soft gray borders
* use subtle colored ambient lighting
* maintain excellent text contrast

The glow should remain visible without making the interface look colorful or childish.

The overall result should feel like:

> premium glass architecture in daylight.

---

# 22. Dark Mode

In dark mode:

* use deep charcoal/obsidian surfaces
* use subtle transparency
* use stronger atmospheric depth
* use controlled emerald/cyan/violet ambient light

The result should feel:

> like a sophisticated illuminated glass object in a dark environment.

Avoid turning the calendar into a neon gaming interface.

---

# 23. Responsive Design

The calendar must work beautifully on:

* mobile
* tablet
* desktop

On mobile:

* preserve comfortable touch targets
* avoid excessively small dates
* reduce decorative effects if necessary for performance
* maintain hierarchy
* keep interactions intuitive

Do not simply scale down the desktop calendar.

Adapt the composition.

---

# 24. Performance

Visual effects must not significantly degrade performance.

Prefer:

* CSS transforms
* CSS opacity
* GPU-friendly animations
* requestAnimationFrame when appropriate
* limited DOM updates
* CSS custom properties for reactive values

Avoid expensive re-rendering on every mouse movement.

The calendar should remain smooth.

Target a visually smooth experience around 60fps on capable devices.

Respect lower-powered devices.

---

# 25. Accessibility

Visual effects must never replace functional communication.

Ensure:

* keyboard navigation
* focus states
* sufficient contrast
* accessible date labels
* semantic buttons
* screen-reader-friendly controls

Support:

```css
@media (prefers-reduced-motion: reduce)
```

When reduced motion is enabled:

* disable cursor-following animations
* reduce transitions
* remove unnecessary movement
* preserve usability

---

# 26. Implementation

Before implementing:

1. Inspect the existing application.
2. Identify the framework.
3. Identify the styling system.
4. Identify the calendar library if one already exists.
5. Preserve existing calendar functionality.
6. Reuse existing date logic.
7. Apply the visual system without unnecessarily replacing business logic.

Do not rewrite date calculations simply to change the appearance.

Separate:

* date logic
* event logic
* visual effects
* presentation
* interaction state

---

# 27. Visual QA

Test:

### Resting state

Does the calendar look premium even without interaction?

### Cursor interaction

Does the light follow the cursor smoothly?

### Color transition

Does the hue transition continuously?

### Hover

Does hovering over a date feel tactile?

### Selection

Is the selected date obvious?

### Editing

Does editing feel like a natural continuation of the calendar?

### Light mode

Does it remain elegant?

### Dark mode

Does it remain luxurious?

### Mobile

Is everything usable?

### Performance

Does the animation remain smooth?

### Accessibility

Can the calendar be used without a mouse?

---

# 28. Anti-Patterns

Never create:

* rainbow neon borders
* flashing colors
* aggressive glow
* excessive blur
* giant shadows
* emoji icons
* cartoon calendar illustrations
* gaming HUD aesthetics
* excessive glassmorphism
* oversized date numbers
* random color changes
* distracting particle effects
* animations that never stop

The calendar should feel futuristic through sophistication, not visual noise.

---

# Final Design Principle

The calendar should feel like a physical object made of:

> glass + light + precision.

The user should feel that the interface responds to their presence.

The cursor is not merely a pointer.

It behaves like a small source of light moving across the surface.

Every interaction should feel smooth, deliberate and rewarding.

The final result must be:

> futuristic without being childish,
> luxurious without being flashy,
> interactive without being distracting,
> beautiful without sacrificing usability.
