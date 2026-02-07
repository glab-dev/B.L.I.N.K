---
name: ui-design
description: Design a UI change for B.L.I.N.K. with HTML structure, CSS plan, responsive behavior, and accessibility notes, following the comic-book theme and existing style patterns
---

# UI Design — Design Plan Before Implementation

## Goal

Create a complete design specification for a UI change that follows the existing comic-book theme and coding patterns.

## Instructions

1. Understand the UI change requested
2. Read existing patterns:
   - `styles.css` — theme colors, CSS variables, font usage, component patterns
   - `CSS-NOTES.md` — button override checklist, specificity gotchas
   - `index.html` — existing HTML structure, class naming conventions
3. Design the HTML structure: elements, DOM placement, IDs, classes
4. Plan the CSS approach:
   - Which existing classes to reuse (`.section-card`, `.text-outline-black`, `.section-title`)
   - What new CSS rules are needed
   - CSS variable usage (use existing `var(--primary)`, `var(--secondary)`, etc.)
   - Font assignments (Bangers for headers, Roboto Condensed for body)
5. If buttons are involved: list EVERY property that must be overridden from the global button rule
6. Responsive behavior: mobile (< 768px) vs desktop, touch targets (44x44px minimum)
7. Accessibility: contrast, labels, focus indicators, ARIA attributes

## Output Format

### UI Design: [feature]

#### HTML Structure
```html
<!-- Element hierarchy -->
```

#### CSS Plan
```css
/* New rules + notes on reused classes */
```

#### Button Overrides (if applicable)
```css
/* Full override list */
```

#### Responsive Notes
- **Mobile:** [description]
- **Desktop:** [description]

#### Accessibility
- [notes]

## Constraints

- Comic-book theme is NON-NEGOTIABLE — do not suggest modern/minimal redesigns
- All styles go in `styles.css` — no separate CSS files
- Follow existing naming conventions and patterns
- Check the button override checklist for ANY new buttons
