---

name: cash-save-brand
description: Applies the official Cash Save visual identity to web interfaces. Cash Save is a premium financial management, productivity and habit-building application. Use this skill whenever designing, redesigning, styling, refactoring or visually improving any Cash Save interface.
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Cash Save Brand & Design System

## Brand

Cash Save is a premium digital product combining:

* personal finance management
* savings
* productivity
* task management
* habit building
* personal progress

The product must feel like a sophisticated financial and personal-growth tool.

The visual identity is:

> Luxury Financial Productivity.

The experience should communicate:

* control
* progress
* confidence
* clarity
* discipline
* intelligence
* calm
* achievement

The interface must feel premium without becoming flashy.

---

# 1. Core Design Principle

Follow:

> Quiet luxury, not visual excess.

Cash Save should feel expensive because of:

* excellent spacing
* typography
* hierarchy
* restrained colors
* precise alignment
* subtle depth
* refined motion
* consistent components

Do NOT attempt to create a premium appearance by adding excessive:

* gradients
* shadows
* glassmorphism
* glow
* borders
* animations
* decorative shapes
* cards

When in doubt, simplify.

---

# 2. Brand Color Palette

## Primary

Emerald Luxe:

`#0E9F6E`

Use for:

* primary actions
* positive financial states
* progress
* selected states
* important highlights

## Primary Dark

Deep Emerald:

`#087A56`

Use for:

* hover states
* active states
* darker accents

## Premium Accent

Champagne Gold:

`#D6B36A`

Use sparingly.

The gold represents:

* achievement
* milestones
* premium moments
* completed goals
* important rewards

Never use gold as the dominant interface color.

Never use bright yellow or metallic-looking gradients to simulate luxury.

---

# 3. Light Theme

Background:

`#F7F7F3`

Primary surface:

`#FFFFFF`

Primary text:

`#171A19`

Secondary text:

`#737A76`

Borders:

Use extremely subtle neutral borders.

Light mode should feel:

* clean
* warm
* sophisticated
* spacious
* calm

Do not create a sterile white interface.

Avoid pure white as the background of every section.

---

# 4. Dark Theme

Background:

`#0B0E0D`

Primary surface:

`#131817`

Elevated surface:

`#1A201E`

Primary text:

`#F2F4F1`

Secondary text:

`#929A96`

Dark mode must NOT be created by simply inverting light mode.

Create depth through tonal layering.

Use emerald accents carefully.

Use champagne gold only for meaningful premium or achievement states.

Dark mode should feel:

* immersive
* sophisticated
* calm
* luxurious
* technologically advanced

It must NOT feel like a gaming interface or cyberpunk UI.

---

# 5. Semantic Tokens

Do not hardcode brand colors throughout components.

Create semantic design tokens such as:

```css
--background
--surface
--surface-elevated
--surface-hover
--text-primary
--text-secondary
--text-muted
--border
--border-subtle
--primary
--primary-hover
--primary-foreground
--accent
--accent-muted
--success
--warning
--danger
```

The tokens must support both light and dark themes.

Components must consume semantic tokens.

Avoid directly using raw hex values inside individual components unless there is a strong reason.

---

# 6. Typography

Preferred fonts:

1. Manrope
2. Geist
3. Inter

Use one primary typeface consistently.

Prioritize readability because Cash Save displays:

* monetary values
* dates
* percentages
* statistics
* task information
* habit streaks
* financial charts

Use strong typographic hierarchy rather than decorative effects.

Large financial values should have visual prominence.

Example:

```text
1 250 000 FCFA
```

should be immediately recognizable as the primary metric.

Do not decorate financial numbers unnecessarily.

---

# 7. Iconography

NEVER use emojis as interface icons.

Do not use:

* emoji
* cartoon icons
* childish illustrations
* inconsistent icon packs
* random SVG icons

Preferred icon system:

**Lucide Icons**

Use one coherent icon family throughout the application.

Maintain consistency in:

* stroke width
* size
* optical weight
* alignment
* spacing

Typical icon sizes:

16px
18px
20px
24px

Icons should support comprehension.

They should never dominate the interface unnecessarily.

---

# 8. Layout

Use a strong grid system.

Prioritize:

* alignment
* rhythm
* whitespace
* hierarchy
* predictable navigation

Avoid dashboards overloaded with information.

Do not automatically convert every piece of information into a card.

Use open layouts where appropriate.

The interface should breathe.

---

# 9. Cards

Cards should have a purpose.

Avoid the generic AI pattern:

```text
Icon
Title
Description
Button
Shadow
Rounded rectangle
```

repeated dozens of times.

Prefer:

* subtle surfaces
* restrained borders
* minimal shadows
* 16–24px radius
* generous internal spacing

Use cards primarily for:

* grouped information
* metrics
* financial summaries
* goals
* interactive modules

---

# 10. Buttons

Primary buttons use the Cash Save emerald.

Buttons must be:

* clear
* refined
* compact
* readable
* responsive

Avoid excessive pill-shaped buttons.

Do not use emojis inside buttons.

Icons are optional and should only be used when they improve comprehension.

Hover and active states should be subtle.

---

# 11. Financial Data

Financial information must be visually prioritized.

Use hierarchy for:

* balance
* income
* expenses
* savings
* budgets
* goals
* financial trends

Positive financial progress should generally use the Cash Save emerald.

Negative financial states should use a restrained semantic danger color.

Do not turn financial dashboards into colorful charts.

Charts must remain elegant and readable.

Use color sparingly.

---

# 12. Productivity

Productivity interfaces should feel focused.

Avoid excessive decoration.

Tasks should communicate:

* status
* priority
* due date
* completion

Use subtle state changes.

Completed tasks should feel satisfying without becoming visually noisy.

---

# 13. Habits

Habit tracking should visually communicate progression.

Use:

* streak indicators
* progress rings
* calendars
* completion states
* subtle milestones

Do not rely on excessive gamification.

Cash Save should feel mature and sophisticated.

When a milestone is reached, champagne gold may be used as a subtle reward accent.

---

# 14. Progress

Progress is a central concept of Cash Save.

Use elegant:

* progress bars
* rings
* charts
* counters
* percentage indicators

Progress components should feel precise.

Avoid oversized glowing progress bars.

Use animation carefully when progress changes.

---

# 15. Motion Design

Motion should be subtle and purposeful.

Use motion for:

* state transitions
* progress
* navigation
* feedback
* hierarchy
* confirmation

Preferred patterns:

* fade
* translate
* subtle scale
* progressive reveal
* smooth progress animation

Avoid:

* bouncing
* spinning
* aggressive zooming
* excessive parallax
* constant movement
* unnecessary particle effects

Motion should communicate quality, not spectacle.

Always respect:

```css
prefers-reduced-motion
```

---

# 16. Theme Switching

Cash Save must support both Light and Dark Mode as first-class experiences.

Do not simply invert colors.

Use semantic tokens.

Theme switching should:

* be fast
* feel smooth
* preserve hierarchy
* avoid flashes
* preserve readability
* respect system preference when appropriate
* remember the user's preference when appropriate

The same components must feel native in both themes.

---

# 17. Premium Moments

Use Champagne Gold strategically.

Appropriate use cases:

* savings goal completed
* major milestone
* achievement
* exceptional progress
* premium feature
* important celebration

Avoid using gold for:

* ordinary buttons
* every icon
* all headings
* every card
* ordinary navigation

Gold must feel rare.

---

# 18. Visual Effects

Allowed:

* subtle gradients
* restrained blur
* soft shadows
* low-opacity borders
* subtle background transitions

Avoid:

* neon glow
* heavy glassmorphism
* excessive blur
* strong drop shadows
* rainbow gradients
* excessive noise
* unnecessary decorative blobs

The interface should remain elegant without visual effects.

---

# 19. Responsive Design

Cash Save must be designed intentionally for:

* mobile
* tablet
* desktop
* large desktop

Mobile is not a compressed desktop version.

Prioritize:

* touch-friendly controls
* readable financial values
* accessible navigation
* clear hierarchy
* appropriate spacing
* comfortable forms

Never sacrifice usability for visual density.

---

# 20. Accessibility

Premium design must remain accessible.

Ensure:

* sufficient color contrast
* visible focus states
* keyboard navigation
* semantic HTML
* readable typography
* accessible controls
* appropriate touch targets
* reduced-motion support

Never use color alone to communicate important financial states.

---

# 21. Anti-Patterns

NEVER produce the following unless explicitly requested:

* emoji-based UI
* childish icons
* cartoon illustrations
* generic SaaS dashboards
* excessive cards
* purple-blue AI gradients
* neon green interfaces
* cyberpunk dark mode
* excessive glassmorphism
* giant glowing buttons
* excessive rounded pills
* excessive shadows
* excessive gradients
* random decorative blobs
* unnecessary animations
* visually noisy dashboards

---

# 22. Existing Codebase

Before modifying Cash Save:

1. Inspect the project architecture.
2. Identify the framework.
3. Identify the styling solution.
4. Identify existing design tokens.
5. Identify existing components.
6. Identify the current theme implementation.
7. Preserve existing business logic.
8. Preserve existing functionality.
9. Reuse components when appropriate.
10. Refactor only when necessary.

Do not rewrite the application simply to apply the visual identity.

---

# 23. Design Review

Before considering a UI complete, inspect both Light and Dark Mode.

Ask:

### Brand

Does this look unmistakably like Cash Save?

### Luxury

Does it feel refined rather than flashy?

### Hierarchy

Can the user immediately identify the important information?

### Color

Is emerald dominant but controlled?

Is champagne gold rare enough to remain special?

### Typography

Are financial numbers immediately readable?

### Icons

Are all icons professional and consistent?

Are there any emojis?

### Spacing

Does the interface breathe?

### Motion

Are animations subtle and purposeful?

### Responsive

Does mobile feel intentionally designed?

### Consistency

Do all components feel like parts of one product?

### Simplification

Can anything be removed without hurting the experience?

If yes, remove it.

---

# 24. Final Standard

The final Cash Save interface should feel like a product that could belong in the premium tier of modern fintech and productivity software.

The emotional response should be:

> "This feels sophisticated."

not:

> "This has lots of effects."

The interface should communicate that managing money, productivity and habits is an intelligent and empowering activity.

---

# Golden Rule

> Cash Save should look expensive without trying to look expensive.
