# CSS Conventions

## Theme

- **Comic-book theme is non-negotiable** — do NOT suggest "cleaner" or "modern" designs
- Fonts: **Bangers** (headers/titles), **Roboto Condensed** (body text, inputs, data, nav labels)
- Black text outlines via `.text-outline-black` class
- Colored borders on containers
- Dark backgrounds with bright accent colors

## All styles go in `styles.css`

- No separate CSS files per module
- No CSS-in-JS or styled components
- No inline styles unless dynamically calculated (canvas positioning, computed widths)

## Responsive Design

- Mobile-first approach
- Primary breakpoint: 768px
- Fixed header + bottom nav with safe-area-inset padding
- Test in both mobile and desktop viewports
- Buttons in flex containers: use `flex: 0 0 auto` to prevent stretching

## Button Override Checklist (CRITICAL)

The global `button` rule (~line 595 in styles.css) applies `width: 100%`, green background, padding, shadows, and more to ALL `<button>` elements. Any non-standard button MUST explicitly override ALL of these properties:

```
background, border, border-radius, padding, min-height, width,
margin-bottom, box-shadow, text-shadow, font-size, font-weight,
color, letter-spacing, -webkit-tap-highlight-color, touch-action
```

If even one property is missed, the global rule bleeds through. Always read the global `button` rule before adding new buttons.

## CSS Variables

Use existing CSS variables: `var(--primary)`, `var(--secondary)`, etc. Check `styles.css` for the full list before creating new colors.
